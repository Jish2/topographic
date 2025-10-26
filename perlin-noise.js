// Perlin Noise Implementation
class PerlinNoise {
  constructor(seed = Math.random() * 1000) {
    this.seed = seed;
    this.permutation = this.generatePermutation();
  }

  generatePermutation() {
    const p = [];
    for (let i = 0; i < 256; i++) {
      p[i] = i;
    }

    // Fisher-Yates shuffle
    for (let i = 255; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [p[i], p[j]] = [p[j], p[i]];
    }

    // Duplicate the permutation array
    for (let i = 0; i < 256; i++) {
      p[256 + i] = p[i];
    }
    return p;
  }

  fade(t) {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  lerp(a, b, t) {
    return a + t * (b - a);
  }

  grad(hash, x, y) {
    const h = hash & 3;
    return h === 0 ? x + y : h === 1 ? -x + y : h === 2 ? x - y : -x - y;
  }

  noise(x, y) {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;

    x -= Math.floor(x);
    y -= Math.floor(y);

    const u = this.fade(x);
    const v = this.fade(y);

    const A = this.permutation[X] + Y;
    const AA = this.permutation[A];
    const AB = this.permutation[A + 1];

    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B];
    const BB = this.permutation[B + 1];

    return this.lerp(
      this.lerp(
        this.grad(this.permutation[AA], x, y),
        this.grad(this.permutation[BA], x - 1, y),
        u
      ),
      this.lerp(
        this.grad(this.permutation[AB], x, y - 1),
        this.grad(this.permutation[BB], x - 1, y - 1),
        u
      ),
      v
    );
  }

  octaveNoise(x, y, octaves = 4, persistence = 0.5) {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < octaves; i++) {
      value += this.noise(x * frequency, y * frequency) * amplitude;
      maxValue += amplitude;
      amplitude *= persistence;
      frequency *= 2;
    }

    return value / maxValue;
  }
}
