// Render topographic map on canvas
function renderTopographic(width, height, heightMap) {
  const numContours = parseInt(document.getElementById("contours").value);

  // background
  ctx.fillStyle = "#222222";
  ctx.fillRect(0, 0, width, height);

  const gridH = heightMap.length;
  const gridW = heightMap[0].length;
  const cellWidth = width / gridW;
  const cellHeight = height / gridH;

  ctx.strokeStyle = "rgba(255, 255, 255, 0.75)";
  ctx.lineWidth = 1;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  // helper: interpolate between two grid points
  function interp(x1, y1, v1, x2, y2, v2, level) {
    const t = (level - v1) / (v2 - v1);
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  }

  // helper: smooth a polyline using Chaikin's algorithm
  function chaikin(points, iterations = 2) {
    let pts = points;
    for (let k = 0; k < iterations; k++) {
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
      if (pts.length < 2) break;
    }
    return pts;
  }

  for (let li = 0; li <= numContours; li++) {
    const level = li / numContours;

    // build segments using marching squares cases
    const segs = [];
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

        // gather intersections per case
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
          // ambiguous case: split into two segments
          segs.push({ a: edges[0], b: edges[1] });
          segs.push({ a: edges[2], b: edges[3] });
        }
      }
    }

    // chain segments into polylines
    const polylines = [];
    const used = new Array(segs.length).fill(false);
    const key = (p) => `${Math.round(p.x)}:${Math.round(p.y)}`;
    const startMap = new Map();
    const endMap = new Map();

    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      const ks = key(s.a);
      const ke = key(s.b);
      if (!startMap.has(ks)) startMap.set(ks, []);
      if (!endMap.has(ke)) endMap.set(ke, []);
      startMap.get(ks).push({ i, end: false });
      endMap.get(ke).push({ i, end: true });
    }

    function findNext(currentPoint) {
      const k = key(currentPoint);
      for (let i = 0; i < segs.length; i++) {
        if (used[i]) continue;
        const s = segs[i];
        if (Math.hypot(s.a.x - currentPoint.x, s.a.y - currentPoint.y) < 0.5) {
          used[i] = true;
          return { nextPoint: s.b, idx: i };
        }
        if (Math.hypot(s.b.x - currentPoint.x, s.b.y - currentPoint.y) < 0.5) {
          used[i] = true;
          return { nextPoint: s.a, idx: i };
        }
      }
      return null;
    }

    for (let i = 0; i < segs.length; i++) {
      if (used[i]) continue;
      used[i] = true;
      const poly = [segs[i].a, segs[i].b];

      // extend forward
      while (true) {
        const tail = poly[poly.length - 1];
        const next = findNext(tail);
        if (!next) break;
        poly.push(next.nextPoint);
      }

      // extend backward
      while (true) {
        const head = poly[0];
        const next = findNext(head);
        if (!next) break;
        poly.unshift(next.nextPoint);
      }

      if (poly.length > 1) polylines.push(poly);
    }

    // draw smoothed polylines
    for (const line of polylines) {
      const smooth = chaikin(line, 2);
      if (smooth.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(smooth[0].x, smooth[0].y);
      for (let i = 1; i < smooth.length; i++) {
        ctx.lineTo(smooth[i].x, smooth[i].y);
      }
      ctx.stroke();
    }
  }
}
