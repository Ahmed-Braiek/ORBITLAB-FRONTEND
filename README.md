# OrbitLab — Phase 4

Local Angular 20 + Three.js renderer with NASA/JPL Horizons planetary positions supplied by Java Spring Boot.

## Run
```powershell
npm install
npm run assets:download
npm start
```

The Java backend must be running at http://localhost:8080. For real ephemerides, the computer must be online when the backend fetches Horizons vectors. The backend caches the results. No API key needed.

## Scientific interpretation
- Choose a UTC date with the date picker or step one day backward/forward.
- Java returns 3 daily samples for all 8 planets in Sun-centered ecliptic J2000 AU coordinates.
- The renderer uses the sampled vectors and linear interpolation between the selected date and following UTC midnight; 1x/10x/100x are *visualization rates*, not literal physical time. Animation stops at the end of the loaded day to avoid inventing future positions.
- The renderer uses **nonlinear radial compression** to keep the Solar System navigable, while preserving heliocentric directions. Planet diameters are also exaggerated.
- Circular orbit lines are hidden when JPL data is loaded. They would be scientifically misleading.
- If JPL is offline, OrbitLab explicitly labels the old illustrative fallback.
- Asset textures: Solar System Scope / INOVE CC BY 4.0, https://www.solarsystemscope.com/textures/ .

Backend endpoint: `GET http://localhost:8080/api/ephemerides?date=2026-11-24` .
