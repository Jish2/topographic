// Render topographic map on canvas
function renderTopographic(width, height, heightMap) {
  const numContours = parseInt(document.getElementById("contours").value);

  // Clear canvas with dark background
  ctx.fillStyle = "#222222";
  ctx.fillRect(0, 0, width, height);

  const cellWidth = width / heightMap[0].length;
  const cellHeight = height / heightMap.length;

  // Draw contour lines
  ctx.strokeStyle = "rgba(204, 204, 204, 0.6)";
  ctx.lineWidth = 1;

  for (let level = 0; level <= numContours; level++) {
    const threshold = level / numContours;
    ctx.beginPath();

    for (let y = 0; y < heightMap.length - 1; y++) {
      for (let x = 0; x < heightMap[y].length - 1; x++) {
        const topLeft = heightMap[y][x];
        const topRight = heightMap[y][x + 1];
        const bottomLeft = heightMap[y + 1][x];
        const bottomRight = heightMap[y + 1][x + 1];

        const cellX = x * cellWidth;
        const cellY = y * cellHeight;

        // Marching squares algorithm for contour lines
        if (
          (topLeft < threshold && topRight >= threshold) ||
          (topLeft >= threshold && topRight < threshold)
        ) {
          const t = (threshold - topLeft) / (topRight - topLeft);
          ctx.moveTo(cellX + t * cellWidth, cellY);
          ctx.lineTo(cellX + t * cellWidth, cellY + cellHeight);
        }

        if (
          (topLeft < threshold && bottomLeft >= threshold) ||
          (topLeft >= threshold && bottomLeft < threshold)
        ) {
          const t = (threshold - topLeft) / (bottomLeft - topLeft);
          ctx.moveTo(cellX, cellY + t * cellHeight);
          ctx.lineTo(cellX + cellWidth, cellY + t * cellHeight);
        }
      }
    }

    ctx.stroke();
  }
}
