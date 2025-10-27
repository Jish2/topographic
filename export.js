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

  const EPS = 0.75;
  const Q = 100;
  const quantize = (p) => ({
    x: Math.round(p.x * Q) / Q,
    y: Math.round(p.y * Q) / Q,
  });
  const key = (p) => `${Math.round(p.x * Q)}:${Math.round(p.y * Q)}`;

  function interp(x1, y1, v1, x2, y2, v2, level) {
    const t = (level - v1) / (v2 - v1);
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  }

  function chaikin(points, iterations = 2, closed = false) {
    let pts = points.slice();
    for (let k = 0; k < iterations; k++) {
      if (pts.length < 2) break;
      const result = [];
      const N = pts.length;
      const limit = closed ? N : N - 1;
      for (let i = 0; i < limit; i++) {
        const p0 = pts[i];
        const p1 = pts[(i + 1) % N];
        const Qp = {
          x: 0.75 * p0.x + 0.25 * p1.x,
          y: 0.75 * p0.y + 0.25 * p1.y,
        };
        const Rp = {
          x: 0.25 * p0.x + 0.75 * p1.x,
          y: 0.25 * p0.y + 0.75 * p1.y,
        };
        result.push(Qp, Rp);
      }
      if (!closed && result.length > 0) {
        result.unshift(pts[0]);
        result.push(pts[pts.length - 1]);
      }
      pts = result;
    }
    return pts;
  }

  let svgPaths = "";

  for (let li = 0; li <= numContours; li++) {
    const level = li / numContours;
    const segs = [];

    // collect segments with asymptotic decider
    for (let y = 0; y < gridH - 1; y++) {
      for (let x = 0; x < gridW - 1; x++) {
        const v00 = heightMap[y][x];
        const v10 = heightMap[y][x + 1];
        const v01 = heightMap[y + 1][x];
        const v11 = heightMap[y + 1][x + 1];
        const center = (v00 + v10 + v01 + v11) / 4;

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

        const eTop = interp(x0, y0, v00, x1, y0, v10, level);
        const eRight = interp(x1, y0, v10, x1, y1, v11, level);
        const eBottom = interp(x0, y1, v01, x1, y1, v11, level);
        const eLeft = interp(x0, y0, v00, x0, y1, v01, level);

        switch (code) {
          case 1:
          case 14:
            segs.push({ a: quantize(eLeft), b: quantize(eBottom) });
            break;
          case 2:
          case 13:
            segs.push({ a: quantize(eBottom), b: quantize(eRight) });
            break;
          case 3:
          case 12:
            segs.push({ a: quantize(eLeft), b: quantize(eRight) });
            break;
          case 4:
          case 11:
            segs.push({ a: quantize(eTop), b: quantize(eRight) });
            break;
          case 5:
          case 10: {
            const connectAcross = center > level;
            if (connectAcross) {
              segs.push({ a: quantize(eTop), b: quantize(eRight) });
              segs.push({ a: quantize(eLeft), b: quantize(eBottom) });
            } else {
              segs.push({ a: quantize(eTop), b: quantize(eLeft) });
              segs.push({ a: quantize(eRight), b: quantize(eBottom) });
            }
            break;
          }
          case 6:
          case 9:
            segs.push({ a: quantize(eTop), b: quantize(eBottom) });
            break;
          case 7:
          case 8:
            segs.push({ a: quantize(eTop), b: quantize(eLeft) });
            break;
        }
      }
    }

    // adjacency chaining
    const adjacency = new Map();
    for (const s of segs) {
      const ka = key(s.a);
      const kb = key(s.b);
      if (!adjacency.has(ka)) adjacency.set(ka, []);
      if (!adjacency.has(kb)) adjacency.set(kb, []);
      adjacency.get(ka).push(s.b);
      adjacency.get(kb).push(s.a);
    }

    const visitedEdge = new Set();
    const polylines = [];
    const edgeId = (a, b) => `${key(a)}|${key(b)}`;

    for (const [kStart, neighbors] of adjacency.entries()) {
      for (const nb of neighbors) {
        const a = {
          x: parseInt(kStart.split(":")[0]) / Q,
          y: parseInt(kStart.split(":")[1]) / Q,
        };
        const b = nb;
        const eid = edgeId(a, b);
        if (visitedEdge.has(eid)) continue;
        visitedEdge.add(eid);

        const poly = [a, b];
        // forward
        let curr = b;
        let prevKey = key(a);
        while (true) {
          const neigh = adjacency.get(key(curr)) || [];
          let next = null;
          for (const t of neigh) {
            const e2 = edgeId(curr, t);
            if (key(t) === prevKey) continue;
            if (visitedEdge.has(e2)) continue;
            next = t;
            visitedEdge.add(e2);
            break;
          }
          if (!next) break;
          poly.push(next);
          prevKey = key(curr);
          curr = next;
          if (Math.hypot(curr.x - a.x, curr.y - a.y) < EPS) {
            poly[poly.length - 1] = a; // close
            break;
          }
        }

        polylines.push(poly);
      }
    }

    // smooth and emit paths
    for (const line of polylines) {
      const isClosed =
        Math.hypot(
          line[0].x - line[line.length - 1].x,
          line[0].y - line[line.length - 1].y
        ) < EPS;
      const pts = chaikin(line, 2, isClosed);
      if (!pts || pts.length < 2) continue;
      let d = `M ${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
      for (let i = 1; i < pts.length; i++) {
        d += ` L ${pts[i].x.toFixed(2)} ${pts[i].y.toFixed(2)}`;
      }
      if (isClosed) d += " Z";
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
