# Chroma · A study in light

An interactive Three.js stained-glass installation. Move your pointer, drag on a touch screen, or focus the canvas and use arrow keys to manipulate the glass. The circular arrow restores its resting angle.

## Develop

Requires Node.js 20.19+ or 22.12+.

```sh
npm ci
npm run dev
```

`npm run build` produces the standalone production site in `dist`. `npm run preview` serves that build.

## Rendering

81 irregular Voronoi panes use beveled, thick physical glass geometry, procedural surface normals, and a metal frame. A separate additive GPU pass traces 145,000–310,000 samples through a corrugated glass normal field. The refracted rays intersect the ground and accumulate in a half-float texture. The receiver reconstructs saturated light, soft spill, and concentrated highlights from that density field. Changing the sculpture's world transform changes the ray intersections every frame; the projection is never a static image.

This is an artistic real-time caustic approximation, not a spectral path tracer. Pane-boundary attenuation approximates lead shadows. The sampling budget is smaller on mobile, pixel ratio is capped, and persistently slow rendering lowers resolution. 60 FPS depends on GPU and viewport; it is not guaranteed. WebGL2 is required. All fonts are bundled locally; runtime needs no remote assets or credentials.

## Browser validation

With the dev server running, run `npm test`. The test uses system Chromium when available. Otherwise install Chromium using `npx playwright install chromium`, or set `CHROMIUM_PATH`. Tests verify populated GPU caustics, their response to rotation, reset, keyboard controls, mobile touch, layout, and browser errors. `TEST_URL` can target a preview server.
