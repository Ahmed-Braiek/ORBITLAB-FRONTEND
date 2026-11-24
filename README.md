# OrbitLab — Phase 7: Performance and demo readiness

Local-only Java SOA university project. Angular/Three.js at http://localhost:4200, Spring Boot REST services at http://localhost:8080, MySQL on localhost.

## Launch order

1. Start local MySQL. Create the `orbitlab` database as documented in the backend README.
2. Start Java: `mvn clean test` then `mvn spring-boot:run` with your local database environment variables.
3. Start Angular: `npm install`, `npm run build`, `npm start`.
4. Open http://localhost:4200.

## Controls

- Drag: orbit camera; scroll: zoom; click a planet: focus.
- **O**: Solar System overview; **F**: focus selected planet; **Space**: pause/resume; **Esc**: close Observatory and Asteroids panels.
- Graphics LOW (pixel ratio 1, clouds hidden), BALANCED (1.5), HIGH (2). The FPS display is a local rendering diagnostic, not a GPU benchmark.
- If labels or controls overlap on small screens, the toolbar scrolls horizontally.

## Academic demonstration

1. Open the planetary REST endpoint and explain Angular consuming Java.
2. Choose a date and verify the JPL Horizons endpoint; explain coordinates, radial compression and interpolation.
3. Open NASA Asteroids and explain the external public API integration through Spring Boot.
4. Save Earth as a favorite, create an observation list, add Mars, reload and prove MySQL persistence.
5. Show graphics quality controls, camera navigation and responsive behavior.

## Scientific disclaimers

JPL provides real heliocentric positions, but scale is compressed. Planet sizes are exaggerated; textures and atmosphere are artistic renderings. Never present approximated orbital paths, planetary spin or rings as validated scientific measurements.

## Security

Single-user local-only profile without authorization. Do not expose the Java service or database to the internet. Credentials must stay outside Git. Texture credits: Solar System Scope / INOVE CC BY 4.0, https://www.solarsystemscope.com/textures/.
