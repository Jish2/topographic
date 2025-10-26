// Export canvas as PNG
function exportPNG() {
  if (!canvas) {
    console.error("Canvas not initialized");
    return;
  }
  const link = document.createElement("a");
  link.download = `topographic_${Date.now()}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

// Export as SVG
async function exportSVG() {
  if (!canvas || !heightMap || heightMap.length === 0) {
    console.error("Canvas not initialized or no height map generated");
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const numContours = parseInt(document.getElementById("contours").value);

  // Create SVG paths for contours
  let svgPaths = "";

  for (let level = 0; level <= numContours; level++) {
    const threshold = level / numContours;
    let path = `<path fill="none" stroke="#cccccc" stroke-width="1" stroke-opacity="0.6" d="`;

    const cellWidth = width / heightMap[0].length;
    const cellHeight = height / heightMap.length;

    for (let y = 0; y < heightMap.length - 1; y++) {
      for (let x = 0; x < heightMap[y].length - 1; x++) {
        const topLeft = heightMap[y][x];
        const topRight = heightMap[y][x + 1];
        const bottomLeft = heightMap[y + 1][x];
        const bottomRight = heightMap[y + 1][x + 1];

        const cellX = x * cellWidth;
        const cellY = y * cellHeight;

        // Simplified contour line drawing for SVG
        if (Math.abs(topLeft - threshold) < 0.05) {
          path += ` M${cellX},${cellY}`;
        }
        if (Math.abs(bottomLeft - threshold) < 0.05) {
          path += ` L${cellX},${cellY + cellHeight}`;
        }
      }
    }

    path += `"/>`;
    svgPaths += path;
  }

  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#222222"/>
  ${svgPaths}
</svg>
  `.trim();

  const blob = new Blob([svg], { type: "image/svg+xml" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.download = `topographic_${Date.now()}.svg`;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}
