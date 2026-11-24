# OrbitLab Phase 5 — Photorealistic rendering improvements

Run `git pull origin main`, `npm install`, `npm run assets:download`, `npm run build`, and `npm start` in that order. Backend still runs locally at http://localhost:8080.

Earth now uses a day/night sunlight terminator shader, an optional local night-lights map, cloud shell, and light-aware atmospheric rim. Saturn rings use layered procedural bands with an approximate Cassini Division; star brightness and density are reduced. Visual effects approximate appearance, not time-specific NASA measurements or physical radiative transfer. Planet positions still come from JPL when available, and display distances are compressed.

Textures: Solar System Scope / INOVE, CC BY 4.0; https://www.solarsystemscope.com/textures/ . Night map is optional; if the source is unavailable Earth renders a dark night side.
