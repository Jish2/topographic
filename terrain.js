// Generate height map using Perlin noise
function generateHeightMap(width, height, offsetX = 0, offsetY = 0) {
  const perlin = new PerlinNoise(Math.random() * 1000);
  const map = [];
  // slightly lower frequency for broader, smoother features
  const scale = 0.02;

  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      const nx = (x + offsetX) * scale;
      const ny = (y + offsetY) * scale;

      // layered noise for smooth terrain without axis-aligned artifacts
      let value = perlin.octaveNoise(nx, ny, 5, 0.55);

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
