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

// Export as SVG using marching squares polylines
async function exportSVG() {
  if (!canvas || !heightMap || heightMap.length === 0) {
    console.error("Canvas not initialized or no height map generated");
    return;
  }

  const width = canvas.width;
  const height = canvas.height;
  const numContours = parseInt(document.getElementById("contours").value);

  const gridH = heightMap.length;
  const gridW = heightMap[0].length;
  const cellWidth = width / gridW;
  const cellHeight = height / gridH;

  // helpers
  function interp(x1, y1, v1, x2, y2, v2, level) {
    const t = (level - v1) / (v2 - v1);
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  }

  function chaikin(points, iterations = 2) {
    let pts = points;
    for (let k = 0; k < iterations; k++) {
      if (pts.length < 2) break;
      const result = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const p0 = pts[i];
        const p1 = pts[i + 1];
        const Q = {
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y,
        };
        const R = {
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y,
        };
        result.push(Q, R);
      }
      pts = result;
    }
    return pts;
  }

  // build SVG path data from polylines
  let svgPaths = "";

  for (let li = 0; li <= numContours; li++) {
    const level = li / numContours;
    const segs = [];

    // collect segments via marching squares
    for (let y = 0; y < gridH - 1; y++) {
      for (let x = 0; x < gridW - 1; x++) {
        const v00 = heightMap[y][x];
        const v10 = heightMap[y][x + 1];
        const v01 = heightMap[y + 1][x];
        const v11 = heightMap[y + 1][x + 1];

        const x0 = x * cellWidth;
        const y0 = y * cellHeight;
        const x1 = (x + 1) * cellWidth;
        const y1 = (y + 1) * cellHeight;

        const i0 = v00 > level ? 1 : 0;
        const i1 = v10 > level ? 1 : 0;
        const i2 = v11 > level ? 1 : 0;
        const i3 = v01 > level ? 1 : 0;
        const code = (i0 << 3) | (i1 << 2) | (i2 << 1) | i3;
        if (code === 0 || code === 15) continue;

        const edges = [];
        // top
        if ((code & 0b1100) === 0b1000 || (code & 0b1100) === 0b0100) {
          edges.push(interp(x0, y0, v00, x1, y0, v10, level));
        }
        // right
        if ((code & 0b0110) === 0b0010 || (code & 0b0110) === 0b0100) {
          edges.push(interp(x1, y0, v10, x1, y1, v11, level));
        }
        // bottom
        if ((code & 0b0011) === 0b0001 || (code & 0b0011) === 0b0010) {
          edges.push(interp(x0, y1, v01, x1, y1, v11, level));
        }
        // left
        if ((code & 0b1001) === 0b0001 || (code & 0b1001) === 0b1000) {
          edges.push(interp(x0, y0, v00, x0, y1, v01, level));
        }

        if (edges.length === 2) {
          segs.push({ a: edges[0], b: edges[1] });
        } else if (edges.length === 4) {
          segs.push({ a: edges[0], b: edges[1] });
          segs.push({ a: edges[2], b: edges[3] });
        }
      }
    }

    // chain to polylines
    const polylines = [];
    const used = new Array(segs.length).fill(false);

    function findNext(pt) {
      for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        const s = segs[i];
        if (Math.hypot(s.a.x - pt.x, s.a.y - pt.y) < 0.5) {
          used[i] = true;
          return s.b;
        }
        if (Math.hypot(s.b.x - pt.x, s.b.y - pt.y) < 0.5) {
          used[i] = true;
          return s.a;
        }
      }
      return null;
    }

    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      const poly = [segs[i].a, segs[i].b];

      while (true) {
        const tail = poly[poly.length - 1];
        const n = findNext(tail);
        if (!n) break;
        poly.push(n);
      }
      while (true) {
        const head = poly[0];
        const n = findNext(head);
        if (!n) break;
        poly.unshift(n);
      }

      if (poly.length > 1) polylines.push(poly);
    }

    // optional smoothing
    const smoothedPolys = polylines.map((p) => chaikin(p, 2));

    // build path data
    for (const pts of smoothedPolys) {
      if (!pts || pts.length < 2) continue;
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
      }
      svgPaths += `<path fill="none" stroke="#ffffff" stroke-width="1" stroke-opacity="0.75" d="${d}"/>`;
    }
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
