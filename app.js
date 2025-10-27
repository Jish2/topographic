// Global state
let canvas = null;
let ctx = null;
let heightMap = [];
let animationId = null;
let animationTime = 0;

// Initialize canvas size
function updateResolution() {
  if (!canvas || !ctx) return;
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  const w = Math.max(100, Math.min(8192, parseInt(widthInput.value || 600)));
  const h = Math.max(100, Math.min(8192, parseInt(heightInput.value || 600)));
  widthInput.value = w;
  heightInput.value = h;
  canvas.width = w;
  canvas.height = h;
  generateTopo();
}

function computeGridSamples(canvasW, canvasH) {
  // aim for ~4px per cell; clamp to reasonable bounds
  const targetCellSizePx = 4; // smaller = higher detail
  const gridW = Math.max(50, Math.round(canvasW / targetCellSizePx));
  const gridH = Math.max(50, Math.round(canvasH / targetCellSizePx));
  return { gridW, gridH };
}

// Generate new topographic map
function generateTopo() {
  if (!canvas || !ctx) {
    console.error("Canvas not initialized");
    return;
  }
  const width = canvas.width;
  const height = canvas.height;

  const { gridW, gridH } = computeGridSamples(width, height);
  heightMap = generateHeightMap(gridW, gridH);
  renderTopographic(width, height, heightMap);
}

// Animation loop
function animate() {
  if (!canvas || !ctx) return;
  animationTime += 0.02;
  const width = canvas.width;
  const height = canvas.height;

  const { gridW, gridH } = computeGridSamples(width, height);

  // Generate height map with time offset for animation
  const offsetX = Math.sin(animationTime) * 10;
  const offsetY = Math.cos(animationTime) * 10;

  heightMap = generateHeightMap(gridW, gridH, offsetX, offsetY);
  renderTopographic(width, height, heightMap);

  if (animationId) {
    requestAnimationFrame(animate);
  }
}

function toggleAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    document.querySelector(".btn-secondary").textContent = "Start Animation";
  } else {
    animationId = true;
    animate();
    document.querySelector(".btn-secondary").textContent = "Stop Animation";
  }
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// Wait for DOM to be ready
document.addEventListener("DOMContentLoaded", function () {
  canvas = document.getElementById("canvas");
  ctx = canvas.getContext("2d");

  // set defaults if empty
  const widthInput = document.getElementById("widthInput");
  const heightInput = document.getElementById("heightInput");
  if (!widthInput.value) widthInput.value = 600;
  if (!heightInput.value) heightInput.value = 600;

  updateResolution();

  // Update contour value display
  document.getElementById("contours").addEventListener("input", function () {
    document.getElementById("contoursValue").textContent = this.value;
  });
});
