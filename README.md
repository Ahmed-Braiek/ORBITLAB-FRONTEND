# OrbitLab Phase 6 — Personal Observatory

Angular + Three.js runs locally at http://localhost:4200 and calls Spring Boot on http://localhost:8080.

## Setup
1. Start MySQL and create the orbitlab database as described in the backend README.
2. Run Java Spring Boot.
3. In frontend directory: `git pull origin main`, `npm install`, `npm run build`, `npm start`.
4. Select a planet, click **OPEN MY OBSERVATORY**, save it to favorites, create an observation list, and add the selected planet.

## Phase 6 scope
- Local **single-profile** favorites and observation-list CRUD.
- Every mutation is sent to the Java REST API and persisted to local MySQL.
- No authentication yet: do not expose port 8080 publicly.
- Real JPL Horizons date-based positions and 3D textures remain supported.
- Planet imagery and advanced shaders are visualizations, not navigation-grade measurements.

NASA-derived planetary texture credits: Solar System Scope / INOVE CC BY 4.0, https://www.solarsystemscope.com/textures/
