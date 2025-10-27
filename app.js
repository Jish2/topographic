// Global state
let canvas = null;
let ctx = null;
let heightMap = [];
let animationId = null;
let animationTime = 0;

// Initialize canvas size
function updateResolution() {
  if (!canvas || !ctx) return;
  const size = parseInt(document.getElementById("resolution").value);
  document.getElementById("resolutionValue").textContent = size;
  canvas.width = size;
  canvas.height = size;
  generateTopo();
}

// Generate new topographic map
function generateTopo() {
  if (!canvas || !ctx) {
    console.error("Canvas not initialized");
    return;
  }
  const width = canvas.width;
  const height = canvas.height;

  heightMap = generateHeightMap(150, 150);
  renderTopographic(width, height, heightMap);
}

// Animation loop
function animate() {
  if (!canvas || !ctx) return;
  animationTime += 0.02;
  const width = canvas.width;
  const height = canvas.height;

  // Generate height map with time offset for animation
  const offsetX = Math.sin(animationTime) * 10;
  const offsetY = Math.cos(animationTime) * 10;

  heightMap = generateHeightMap(150, 150, offsetX, offsetY);
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
  updateResolution(); // Initial setup

  // Update contour value display
  document.getElementById("contours").addEventListener("input", function () {
    document.getElementById("contoursValue").textContent = this.value;
  });
});
