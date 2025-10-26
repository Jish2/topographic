// Generate height map using Perlin noise
function generateHeightMap(width, height, offsetX = 0, offsetY = 0) {
  const perlin = new PerlinNoise(Math.random() * 1000);
  const map = [];
  const scale = 0.05;

  for (let y = 0; y < height; y++) {
    map[y] = [];
    for (let x = 0; x < width; x++) {
      const nx = (x + offsetX) * scale;
      const ny = (y + offsetY) * scale;

      // Use octave noise for more interesting terrain
      let value = perlin.octaveNoise(nx, ny, 4, 0.5);

      // Add some ridges and valleys
      value += Math.sin(nx * 2) * 0.1;
      value += Math.sin(ny * 2) * 0.1;

      // Normalize to 0-1 range
      value = (value + 1) / 2;

      map[y][x] = value;
    }
  }

  return map;
}
