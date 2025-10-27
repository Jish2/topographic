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

  const EPS = 0.75; // pixel tolerance for joining
  const Q = 100; // quantization for stable keys

  function quantizePoint(p) {
    return { x: Math.round(p.x * Q) / Q, y: Math.round(p.y * Q) / Q };
  }
  function key(p) {
    return `${Math.round(p.x * Q)}:${Math.round(p.y * Q)}`;
  }

  // helper: interpolate between two grid points
  function interp(x1, y1, v1, x2, y2, v2, level) {
    const t = (level - v1) / (v2 - v1);
    return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t };
  }

  // helper: smooth a polyline using Chaikin's algorithm (supports closed)
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
        // keep endpoints for open curves
        result.unshift(pts[0]);
        result.push(pts[pts.length - 1]);
      }
      pts = result;
    }
    return pts;
  }

  for (let li = 0; li <= numContours; li++) {
    const level = li / numContours;

    // build segments using marching squares with asymptotic decider
    const segs = [];
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
            segs.push({ a: quantizePoint(eLeft), b: quantizePoint(eBottom) });
            break;
          case 2:
          case 13:
            segs.push({ a: quantizePoint(eBottom), b: quantizePoint(eRight) });
            break;
          case 3:
          case 12:
            segs.push({ a: quantizePoint(eLeft), b: quantizePoint(eRight) });
            break;
          case 4:
          case 11:
            segs.push({ a: quantizePoint(eTop), b: quantizePoint(eRight) });
            break;
          case 5: // ambiguous
          case 10: {
            const connectAcross = center > level; // asymptotic decider
            if (connectAcross) {
              segs.push({ a: quantizePoint(eTop), b: quantizePoint(eRight) });
              segs.push({ a: quantizePoint(eLeft), b: quantizePoint(eBottom) });
            } else {
              segs.push({ a: quantizePoint(eTop), b: quantizePoint(eLeft) });
              segs.push({
                a: quantizePoint(eRight),
                b: quantizePoint(eBottom),
              });
            }
            break;
          }
          case 6:
          case 9:
            segs.push({ a: quantizePoint(eTop), b: quantizePoint(eBottom) });
            break;
          case 7:
          case 8:
            segs.push({ a: quantizePoint(eTop), b: quantizePoint(eLeft) });
            break;
        }
      }
    }

    // chain segments into polylines using adjacency map
    const adjacency = new Map();
    for (const s of segs) {
      const ka = key(s.a);
      const kb = key(s.b);
      if (!adjacency.has(ka)) adjacency.set(ka, []);
      if (!adjacency.has(kb)) adjacency.set(kb, []);
      adjacency.get(ka).push({ pt: s.b, otherKey: kb });
      adjacency.get(kb).push({ pt: s.a, otherKey: ka });
    }

    const visitedEdge = new Set();
    const polylines = [];

    function edgeId(a, b) {
      return `${key(a)}|${key(b)}`;
    }

    for (const [kStart, neighbors] of adjacency.entries()) {
      for (const n of neighbors) {
        const a = quantizePoint({
          x: parseInt(kStart.split(":")[0]) / Q,
          y: parseInt(kStart.split(":")[1]) / Q,
        });
        const b = quantizePoint(n.pt);
        const eid = edgeId(a, b);
        if (visitedEdge.has(eid)) continue;
        visitedEdge.add(eid);

        const poly = [a, b];
        // forward walk
        let curr = b;
        let prevKey = key(a);
        while (true) {
          const neigh = adjacency.get(key(curr)) || [];
          let next = null;
          for (const nb of neigh) {
            const e2 = edgeId(curr, nb.pt);
            if (key(nb.pt) === prevKey) continue;
            if (visitedEdge.has(e2)) continue;
            next = nb.pt;
            visitedEdge.add(e2);
            break;
          }
          if (!next) break;
          poly.push(next);
          prevKey = key(curr);
          curr = next;
          if (Math.hypot(curr.x - a.x, curr.y - a.y) < EPS) {
            // close loop
            poly[poly.length - 1] = a;
            break;
          }
        }

        polylines.push(poly);
      }
    }

    // draw smoothed polylines (close paths when ends meet)
    for (const line of polylines) {
      const isClosed =
        Math.hypot(
          line[0].x - line[line.length - 1].x,
          line[0].y - line[line.length - 1].y
        ) < EPS;
      const pts = chaikin(line, 2, isClosed);
      if (pts.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(pts[i].x, pts[i].y);
      }
      if (isClosed) ctx.closePath();
      ctx.stroke();
    }
  }
}
