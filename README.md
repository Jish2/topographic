# topographic

my attempt to programatically generate topographic vectors

## goal

create something like this:

![example topographic map](https://t4.ftcdn.net/jpg/03/16/78/11/240_F_316781115_ckiR3eI5AWPu3MUrhAcJkK8hJZFaBQXd.jpg)

but, be able to generate unique versions and animate it.

## preview

[preview.webm](https://github.com/user-attachments/assets/028be2a1-4c33-415e-aa4e-68bad44fefbd)

## usage

start a local server:

```bash
npm start
```

then, open http://localhost:8000

## features

- generates unique topographical patterns using perlin noise
- adjustable contour lines (5-30), default 24
- custom width/height (100-8192)
- export to png, svg, webm, gif
- fluid animation with domain warping and animated bias (birth/death of blobs)
- realtime number inputs to tune everything

## controls

- generate new: create a new random pattern
- export png: download as png
- export svg: download as svg
- toggle animation: start/stop animation
- stop animation: stop and reset the toggle text
- width / height: canvas size in px
- contours: number of contour lines (5-30)
- anim speed: time progression
- drift amp: spatial drift amount
- base scale: feature size (lower = bigger shapes)
- scale var: scale breathing amount
- warp amp: domain warp strength
- warp freq: domain warp frequency
- rotate speed: radians/sec for domain rotation (default 0)
- bias speed: how fast global bias oscillates (creates blob birth/death)
- record webm: duration (s), fps, webm bitrate (mbps)
- record gif (beta): duration (s), fps (≤30), gif quality (1-30), dither

## technical details

uses perlin noise with octaves for terrain generation, time-varying domain warping, optional rotating domain, and an animated global bias. contour lines are extracted via marching squares with an asymptotic decider and smoothed with chaikin. rendering is on canvas. svg export reconstructs polylines. webm is recorded with mediarecorder + canvas.capturestream. gif uses gif.js with a same-origin worker proxy.

## file structure

- `index.html` - main html file
- `perlin-noise.js` - perlin noise implementation
- `terrain.js` - height map generation
- `renderer.js` - canvas rendering
- `export.js` - png/svg export
- `app.js` - main app state and ui controls
- `gif.worker.proxy.js` - same-origin proxy for gif.js worker
