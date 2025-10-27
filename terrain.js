// Persistent Perlin instance for coherent animation across frames
const __globalPerlin = new PerlinNoise(Math.random() * 1000);

// Generate height map using Perlin noise
// Optional time-driven domain warping parameters create fluid morphing
function generateHeightMap(
  width,
  height,
  offsetX = 0,
  offsetY = 0,
  scaleOverride = null,
  time = 0,
  warpAmp = 0,
  warpFreq = 1
) {
  const map = [];
  // slightly lower frequency for broader, smoother features
  const scale = scaleOverride == null ? 0.02 : scaleOverride;

  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      const nx = (x + offsetX) * scale;
      const ny = (y + offsetY) * scale;

      // time-varying domain warp to morph features smoothly
      let wx = nx;
      let wy = ny;
      if (warpAmp > 0) {
        const wf = warpFreq;
        const t1 = time * 0.25;
        const t2 = time * 0.21;
        const u =
          __globalPerlin.octaveNoise(nx * wf + t1, ny * wf - t2, 3, 0.5) * 2 -
          1;
        const v =
          __globalPerlin.octaveNoise(ny * wf + t2, nx * wf + t1, 3, 0.5) * 2 -
          1;
        wx = nx + warpAmp * u;
        wy = ny + warpAmp * v;
      }

      // layered noise for smooth terrain without axis-aligned artifacts
      let value = __globalPerlin.octaveNoise(wx, wy, 5, 0.55);

      // normalize to 0-1 range
      value = (value + 1) / 2;

      map[y][x] = value;
    }
  }

  // light box blur to smooth remaining blockiness
  const smoothed = [];
  for (let y = 0; y < height; y++) {
    smoothed[y] = [];
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const yy = y + dy;
          const xx = x + dx;
          if (yy >= 0 && yy < height && xx >= 0 && xx < width) {
            sum += map[yy][xx];
            count++;
          }
        }
      }
      smoothed[y][x] = sum / count;
    }
  }

  return smoothed;
}
