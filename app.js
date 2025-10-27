// Global state
let canvas = null;
let ctx = null;
let heightMap = [];
let animationId = null;
let animationTime = 0;
let animationSpeed = 0.01626; // lower = slower progression over time
let motionAmplitude = 3.35; // lower = smaller spatial shift per frame
let baseScale = 0.0172; // terrain base frequency
let scaleVariance = 0.0042; // how much the scale can vary around base
let lastFrameTs = null; // ms timestamp from rAF
let warpAmplitude = 0.06; // domain warp strength in noise units
let warpFrequency = 0.75; // domain warp frequency multiplier
let rotateSpeed = 0.0; // radians per second for domain rotation
let biasSpeed = 0.35; // speed multiplier for animated global bias
let recording = false;
let recordStopTimeout = null;

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
function animate(ts) {
  if (!canvas || !ctx) return;
  if (lastFrameTs == null) lastFrameTs = ts;
  const dt = Math.max(0, Math.min(1 / 20, (ts - lastFrameTs) / 1000)); // clamp to avoid jumps
  lastFrameTs = ts;
  animationTime += animationSpeed + dt * animationSpeed; // time advances with frame time
  const width = canvas.width;
  const height = canvas.height;

  const { gridW, gridH } = computeGridSamples(width, height);

  // Generate height map with time offset for animation
  const offsetX = Math.sin(animationTime * 0.8) * motionAmplitude;
  const offsetY = Math.cos(animationTime * 0.6) * motionAmplitude;

  // very slow, smooth undulation of feature scale for fluid growth/shrink
  const scaleMod =
    baseScale + scaleVariance * 0.5 * (1 + Math.sin(animationTime * 0.25));

  // animate global bias slowly to create births/deaths of blobs
  const animatedBias = 0.06 * Math.sin(animationTime * biasSpeed);

  heightMap = generateHeightMap(
    gridW,
    gridH,
    offsetX,
    offsetY,
    scaleMod,
    animationTime,
    warpAmplitude,
    warpFrequency,
    animationTime * rotateSpeed,
    animatedBias
  );
  renderTopographic(width, height, heightMap);

  if (animationId) {
    requestAnimationFrame(animate);
  }
}

function toggleAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
    const btn = document.getElementById("toggleBtn");
    if (btn) btn.textContent = "Start Animation";
  } else {
    animationId = true;
    lastFrameTs = null;
    requestAnimationFrame(animate);
    const btn = document.getElementById("toggleBtn");
    if (btn) btn.textContent = "Stop Animation";
  }
}

function stopAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

// Export animation as WebM using MediaRecorder
async function exportWebM() {
  if (!canvas) return;
  const durationSec = Math.max(
    1,
    parseInt(document.getElementById("recDuration").value || 10)
  );
  const fps = Math.max(
    1,
    Math.min(60, parseInt(document.getElementById("recFps").value || 30))
  );
  const stream = canvas.captureStream(fps);
  const chunks = [];
  const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
    ? "video/webm;codecs=vp9"
    : "video/webm";
  const mbps = Math.max(
    1,
    parseInt(document.getElementById("webmBitrate").value || 12)
  );
  const bps = mbps * 1_000_000;
  const rec = new MediaRecorder(stream, {
    mimeType: mime,
    videoBitsPerSecond: bps,
  });
  rec.ondataavailable = (e) => e.data.size && chunks.push(e.data);
  rec.onstop = () => {
    const blob = new Blob(chunks, { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `topographic_${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ensure animation is running during record
  if (!animationId) toggleAnimation();
  recording = true;
  rec.start();
  recordStopTimeout && clearTimeout(recordStopTimeout);
  recordStopTimeout = setTimeout(() => {
    rec.stop();
    recording = false;
  }, durationSec * 1000);
}

// Export animation as GIF using gif.js (best-effort, slower)
async function exportGIF() {
  if (!canvas) return;
  const statusEl = document.getElementById("recordStatus");
  const gifBtn = document.getElementById("recordGifBtn");
  const webmBtn = document.getElementById("recordWebmBtn");
  if (typeof GIF === "undefined") {
    alert("GIF library not loaded. Check network connectivity.");
    return;
  }
  const durationSec = Math.max(
    1,
    parseInt(document.getElementById("recDuration").value || 10)
  );
  const fps = Math.max(
    1,
    Math.min(30, parseInt(document.getElementById("recFps").value || 15))
  );
  const totalFrames = Math.floor(durationSec * fps);

  // start animation if needed
  if (!animationId) toggleAnimation();

  // read quality/dither if present
  const q = Math.max(
    1,
    Math.min(30, parseInt(document.getElementById("gifQuality")?.value || 8))
  );
  const dither = !!document.getElementById("gifDither")?.checked;

  const gif = new GIF({
    workers: 2,
    quality: q,
    dither: dither ? "FloydSteinberg" : false,
    workerScript: "gif.worker.proxy.js",
  });

  if (gifBtn) gifBtn.disabled = true;
  if (webmBtn) webmBtn.disabled = true;
  if (statusEl) statusEl.textContent = `Capturing 0/${totalFrames}`;

  gif.on("progress", function (p) {
    if (statusEl)
      statusEl.textContent = `GIF encoding ${(p * 100).toFixed(0)}%`;
  });

  let captured = 0;
  const capture = () => {
    gif.addFrame(canvas, { copy: true, delay: 1000 / fps });
    captured++;
    if (statusEl) statusEl.textContent = `Capturing ${captured}/${totalFrames}`;
    if (captured < totalFrames) {
      requestAnimationFrame(capture);
    } else {
      gif.on("finished", function (blob) {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `topographic_${Date.now()}.gif`;
        a.click();
        URL.revokeObjectURL(url);
        if (statusEl) statusEl.textContent = "";
        if (gifBtn) gifBtn.disabled = false;
        if (webmBtn) webmBtn.disabled = false;
      });
      gif.render();
    }
  };
  requestAnimationFrame(capture);
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

  // Sliders: bind to globals and refresh preview
  function bindSlider(id, stateSetter, valueFormatter) {
    const el = document.getElementById(id);
    const label = document.getElementById(id + "Value");
    if (!el) return;
    const fmt = valueFormatter || ((v) => v);
    const setLabel = () => label && (label.textContent = fmt(el.value));
    setLabel();
    function handle() {
      stateSetter(parseFloat(this.value));
      setLabel();
      // If not animating, refresh the frame to see the change immediately
      if (!animationId) {
        const width = canvas.width;
        const height = canvas.height;
        const { gridW, gridH } = computeGridSamples(width, height);
        const offsetX = 0;
        const offsetY = 0;
        const scaleMod = baseScale;
        heightMap = generateHeightMap(
          gridW,
          gridH,
          offsetX,
          offsetY,
          scaleMod,
          animationTime,
          warpAmplitude,
          warpFrequency
        );
        renderTopographic(width, height, heightMap);
      }
    }
    el.addEventListener("input", handle);
    el.addEventListener("change", handle);
  }

  bindSlider(
    "animationSpeed",
    (v) => (animationSpeed = v),
    (v) => Number(v).toFixed(5)
  );
  bindSlider(
    "motionAmplitude",
    (v) => (motionAmplitude = v),
    (v) => Number(v).toFixed(2)
  );
  bindSlider(
    "baseScale",
    (v) => (baseScale = v),
    (v) => Number(v).toFixed(4)
  );
  bindSlider(
    "scaleVariance",
    (v) => (scaleVariance = v),
    (v) => Number(v).toFixed(4)
  );
  bindSlider(
    "warpAmplitude",
    (v) => (warpAmplitude = v),
    (v) => Number(v).toFixed(2)
  );
  bindSlider(
    "warpFrequency",
    (v) => (warpFrequency = v),
    (v) => Number(v).toFixed(2)
  );
  bindSlider(
    "rotateSpeed",
    (v) => (rotateSpeed = v),
    (v) => Number(v).toFixed(2)
  );
  bindSlider(
    "biasSpeed",
    (v) => (biasSpeed = v),
    (v) => Number(v).toFixed(2)
  );
});
