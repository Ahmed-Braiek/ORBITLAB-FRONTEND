# OrbitLab — Gemini ASTRA Space Guide

New Phase 9 feature: an astronomy-focused, animated AI assistant using the **Gemini 2.5 Flash-Lite** free tier (subject to Google's availability, rate limits and regional rules). The **Java Spring Boot backend** calls Gemini; the browser never receives the API key.

## Setup
1. Get a free-tier API key from https://aistudio.google.com/apikey .
2. In the **same PowerShell session** that starts Java:
   ```powershell
   $env:GEMINI_API_KEY="YOUR_KEY"
   mvn spring-boot:run
   ```
3. Check http://localhost:8080/api/space-guide/status — should show `configured:true`.
4. Start Angular: `npm install`, `npm run build`, `npm start`.
5. Click **ASK ASTRA** near the bottom right of the 3D explorer.

The frontend uses `marked` to format Markdown and `DOMPurify` to sanitize HTML. It reveals the answer progressively, lists verified grounding links only when returned by Gemini, and supports **EXPLORE PLANET** to trigger the existing 3D camera focus.

## Examples
- Why is Mars red?
- Why is Neptune so blue?
- How do Saturn's rings form?
- What is a near-Earth asteroid?
- How is JPL Horizons used in OrbitLab?
- How do I save Earth in My Observatory?

## Safety and accuracy
- Scope limited by backend system instructions to space, science and OrbitLab. Model scope controls are not guaranteed.
- No fabricated citations; sources come from Gemini search grounding metadata, when present.
- Navigation targets are limited to one explicitly mentioned supported planet.
- The chatbot's animation is *display animation*, not token-level server streaming.
- No billing or hosting required for eligible free-tier usage; quota/availability may change.
- Never commit the key or paste it in browser frontend. Free-tier content may be used by Google to improve products.
- Previous Earth/Saturn graphics, Java REST endpoints, NASA/JPL Horizons and MySQL Observatory remain unchanged.
