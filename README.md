# How We Move Through the Cosmos

A standalone, responsive SVG visualization of several motions that are often collapsed into the vague phrase “moving through space.”

The diagram separates four reference frames:

- Earth around the Sun
- the Sun around the center of the Milky Way
- the Milky Way and Andromeda within the Local Group
- the Local Group relative to the cosmic microwave background (CMB)

It also shows why the Local Group’s roughly **627 km/s** CMB velocity and the Sun’s roughly **308 km/s** motion relative to the Local Group produce a Solar System CMB velocity of only about **370 km/s**: the vectors partially oppose one another.

![Preview of the cosmic motion vector visualization](preview.png)

## View it

Open [`index.html`](index.html) in a browser for the interactive 3D + time model. Drag to rotate, scroll to zoom, toggle individual vectors, or play one year of Earth’s orbital velocity.

The original responsive SVG overview remains available as [`explainer.html`](explainer.html). Both pages contain no external assets, web fonts, or tracking.

## Scientific notes

- Values are rounded for an educational overview.
- Arrow lengths and geometry are illustrative, not a shared spatial scale.
- Directions are three-dimensional and expressed in Galactic coordinates where appropriate.
- Earth’s orbital velocity changes the observed CMB dipole slightly throughout the year.
- “The Milky Way is moving at…” is incomplete unless a reference frame is named.

## Sources

- [NASA LAMBDA: CMB Solar Dipole Amplitude and Direction](https://lambda.gsfc.nasa.gov/education/lambda_graphics/cmb_dipole.html)
- [ESA Gaia: Galactic acceleration and the Sun’s motion](https://www.cosmos.esa.int/web/gaia/edr3-startrails)
- [NASA: Basics of Space Flight — The Solar System](https://science.nasa.gov/learn/basics-of-space-flight/chapter1-1/)
- [NASA/IPAC: Density and Peculiar Velocity Fields of Nearby Galaxies](https://ned.ipac.caltech.edu/level5/March01/Strauss/Strauss7.html)
- [van der Marel et al. (2012): The M31 Velocity Vector II](https://arxiv.org/abs/1205.6864)

## Publishing

This folder can be served directly with GitHub Pages.

## License

Licensed under [Creative Commons Attribution 4.0 International](LICENSE.md). You may share and adapt it, including commercially, with appropriate credit.
