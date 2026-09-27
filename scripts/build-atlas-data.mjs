import { mkdir, writeFile } from "node:fs/promises";

const EPOCH = "2026-09-27";
const VIZIER = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv";
const HORIZONS = "https://ssd.jpl.nasa.gov/api/horizons.api";

async function fetchText(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const response = await fetch(url, { headers: { "user-agent": "cosmic-motion-vectors data builder" } });
      if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);
      return await response.text();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) await new Promise(resolve => setTimeout(resolve, attempt * 800));
    }
  }
  throw lastError;
}

function vizierUrl(source, fields) {
  const url = new URL(VIZIER);
  url.searchParams.set("-source", source);
  url.searchParams.set("-out.max", "unlimited");
  url.searchParams.set("-out", fields.join(","));
  return url;
}

function parseTsv(text, firstHeader) {
  const lines = text.split(/\r?\n/);
  const headerIndex = lines.findIndex(line => line.startsWith(`${firstHeader}\t`));
  if (headerIndex < 0) throw new Error(`Could not find ${firstHeader} TSV header`);
  const headers = lines[headerIndex].split("\t");
  return lines.slice(headerIndex + 3)
    .filter(line => line.trim() && !line.startsWith("#"))
    .map(line => Object.fromEntries(headers.map((header, index) => [header, (line.split("\t")[index] ?? "").trim()])));
}

function number(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRa(value) {
  const [hours, minutes, seconds] = value.trim().split(/\s+/).map(Number);
  return 15 * (hours + minutes / 60 + seconds / 3600);
}

function parseDec(value) {
  const sign = value.trim().startsWith("-") ? -1 : 1;
  const [degrees, minutes, seconds] = value.trim().replace(/^[+-]/, "").split(/\s+/).map(Number);
  return sign * (degrees + minutes / 60 + seconds / 3600);
}

function cleanName(row) {
  const familiar = {
    "244": "Sirius (GJ 244)", "280": "Procyon (GJ 280)", "406": "Wolf 359 (GJ 406)",
    "411": "Lalande 21185 (GJ 411)", "551": "Proxima Centauri (GJ 551)",
    "559": "Alpha Centauri (GJ 559)", "699": "Barnard's Star (GJ 699)"
  };
  if (familiar[row.GJ]) return familiar[row.GJ];
  if (row.SimbadName && !row.SimbadName.startsWith("CNS5")) return row.SimbadName;
  if (row.GJ) return `GJ ${row.GJ}`;
  if (row.HIP) return `HIP ${row.HIP}`;
  return `CNS5 ${row.CNS5}`;
}

async function fetchStars() {
  const fields = ["CNS5", "GJ", "HIP", "RAJ2000", "DEJ2000", "plx", "e_plx", "Gmag", "BPmag", "RPmag", "SimbadName"];
  const rows = parseTsv(await fetchText(vizierUrl("J/A+A/670/A19/cns5", fields)), "CNS5");
  return rows.map(row => {
    const parallax = number(row.plx);
    const bp = number(row.BPmag);
    const rp = number(row.RPmag);
    return [cleanName(row), number(row.RAJ2000), number(row.DEJ2000), 1000 / parallax, number(row.Gmag), bp !== null && rp !== null ? bp - rp : null, parallax, number(row.e_plx)];
  }).filter(row => row.slice(1, 4).every(Number.isFinite) && row[3] <= 25.1);
}

async function fetchGalaxies() {
  const fields = ["Name", "RAJ2000", "DEJ2000", "Dist", "f_Dist", "BMag", "A26", "Ti1", "MD"];
  const rows = parseTsv(await fetchText(vizierUrl("J/AJ/145/101/catalog", fields)), "Name");
  return rows.map(row => [row.Name, parseRa(row.RAJ2000), parseDec(row.DEJ2000), number(row.Dist), row.f_Dist, number(row.BMag), number(row.A26), number(row.Ti1), row.MD])
    .filter(row => row.slice(1, 4).every(Number.isFinite) && row[3] <= 11.1);
}

function normalizedName(value) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function deriveGroups(galaxies) {
  const positions = new Map(galaxies.map(galaxy => [normalizedName(galaxy[0]), galaxy]));
  const members = new Map();
  for (const galaxy of galaxies) {
    const mainDisturber = galaxy[8];
    if (!mainDisturber || galaxy[7] === null || galaxy[7] <= 0) continue;
    const key = normalizedName(mainDisturber);
    if (!members.has(key)) members.set(key, { name: mainDisturber, galaxies: [] });
    members.get(key).galaxies.push(galaxy[0]);
  }
  return [...members.values()].map(group => {
    const center = positions.get(normalizedName(group.name));
    if (!center) return null;
    return [`${group.name} tidal association`, center[1], center[2], center[3], group.galaxies.length, group.galaxies];
  }).filter(Boolean).filter(group => group[4] >= 3).sort((a, b) => b[4] - a[4]);
}

const BODIES = [
  ["Mercury", "199", 2439.7, "#9ca3af"], ["Venus", "299", 6051.8, "#e7c77e"],
  ["Earth", "399", 6371, "#69a7ff"], ["Moon", "301", 1737.4, "#d4d7dc"],
  ["Mars", "499", 3389.5, "#dc7654"], ["Jupiter", "599", 69911, "#d9b38c"],
  ["Saturn", "699", 58232, "#ead69d"], ["Uranus", "799", 25362, "#9fd8df"],
  ["Neptune", "899", 24622, "#668be0"], ["Pluto", "999", 1188.3, "#cbbba5"]
];

async function fetchPlanet([name, command, radius, color]) {
  const url = new URL(HORIZONS);
  const params = {
    format: "json", COMMAND: command, OBJ_DATA: "NO", MAKE_EPHEM: "YES", EPHEM_TYPE: "VECTORS",
    CENTER: "500@10", START_TIME: EPOCH, STOP_TIME: "2026-09-28", STEP_SIZE: "1d",
    VEC_TABLE: "2", CSV_FORMAT: "YES", OUT_UNITS: "AU-D"
  };
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  const payload = JSON.parse(await fetchText(url));
  const block = payload.result.match(/\$\$SOE\s*\n([^\n]+)/);
  if (!block) throw new Error(`No Horizons vector returned for ${name}`);
  const values = block[1].split(",").map(value => value.trim());
  return [name, Number(values[2]), Number(values[3]), Number(values[4]), radius, color];
}

async function fetchPlanets() {
  const planets = [];
  for (const body of BODIES) {
    planets.push(await fetchPlanet(body));
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  return planets;
}

const [stars, galaxies, planets] = await Promise.all([fetchStars(), fetchGalaxies(), fetchPlanets()]);
const groups = deriveGroups(galaxies);

const catalog = {
  generated: new Date().toISOString(), epoch: `${EPOCH} 00:00 TDB`,
  sources: {
    planets: "NASA/JPL Horizons DE441 geometric heliocentric vectors, ecliptic J2000",
    stars: "Fifth Catalogue of Nearby Stars (CNS5), corrected 2023-12-13, via VizieR",
    galaxies: "Updated Nearby Galaxy Catalog (Karachentsev et al. 2013), via VizieR",
    groups: "Derived tidal associations: galaxies with positive Theta_1 grouped by catalog main disturber"
  },
  planets: [["Sun", 0, 0, 0, 695700, "#ffd166"], ...planets], stars, galaxies, groups
};

await mkdir(new URL("../data/", import.meta.url), { recursive: true });
await writeFile(new URL("../data/atlas-data.js", import.meta.url), `window.ATLAS_DATA=${JSON.stringify(catalog)};\n`);
console.log(JSON.stringify({ epoch: catalog.epoch, planets: catalog.planets.length, stars: stars.length, galaxies: galaxies.length, groups: groups.length }, null, 2));
