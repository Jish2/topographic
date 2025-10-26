# topographic

my attempt to programatically generate topographic vectors

## goal

create something like this:

![example topographic map](https://t4.ftcdn.net/jpg/03/16/78/11/240_F_316781115_ckiR3eI5AWPu3MUrhAcJkK8hJZFaBQXd.jpg)

but, be able to generate unique versions and animate it.

## usage

start a local server:

```bash
npm start
```

then, open http://localhost:8000

## features

- generates unique topographical patterns using perlin noise
- adjustable contour lines (5-30)
- resolution from 200px to 800px
- export to png or svg
- toggle animation to see elevation changes
- automatic color bands based on elevation

## controls

- generate new: creates a random topographical pattern
- export png: download as png image
- export svg: download as svg vector
- toggle animation: animate the landscape to show elevation changes
- resolution slider: adjust export size (200-800px)
- contours slider: control number of contour lines (5-30)

## technical details

uses perlin noise with octaves for terrain generation, marching squares for contour lines, canvas for rendering, and can export to svg for scalable output.

## file structure

- `index.html` - main html file
- `perlin-noise.js` - perlin noise implementation
- `terrain.js` - height map generation
- `renderer.js` - canvas rendering
- `export.js` - png/svg export
- `app.js` - main app state and ui controls
