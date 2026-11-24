/* Percy Did It - physics.js
   A compact 2D rigid body toy for the values panel: convex polygons, SAT contacts,
   impulse solver, cursor repulsion and drag. No libraries. */
(function () {
  'use strict';

  function poly(points) { return points; }
  function ellipse(rx, ry, n) { var p = []; for (var i = 0; i < n; i++) { var a = i / n * Math.PI * 2; p.push([Math.cos(a) * rx, Math.sin(a) * ry]); } return poly(p); }
  function pill(w, h) {
    var r = Math.min(w, h) / 2, p = [], i, a, dx = w / 2 - r, dy = h / 2 - r;
    for (i = 0; i < 16; i++) { a = i / 16 * Math.PI * 2 + Math.PI / 16; p.push([Math.cos(a) * r + (Math.cos(a) > 0 ? dx : -dx), Math.sin(a) * r + (Math.sin(a) > 0 ? dy : -dy)]); }
    return p;
  }
  function box(w, h) { return [[w / 2, -h / 2], [w / 2, h / 2], [-w / 2, h / 2], [-w / 2, -h / 2]]; }

  function Body(x, y, pts, o) {
    this.x = x; this.y = y; this.a = o.a || 0; this.vx = 0; this.vy = 0; this.w = 0; this.p = pts; this.o = o;
    var A = 0, I = 0, n = pts.length, i, r = 0;
    for (i = 0; i < n; i++) {
      var u = pts[i], v = pts[(i + 1) % n], c = u[0] * v[1] - u[1] * v[0];
      A += c / 2; I += c * (u[0] * u[0] + u[0] * v[0] + v[0] * v[0] + u[1] * u[1] + u[1] * v[1] + v[1] * v[1]) / 12;
      r = Math.max(r, Math.hypot(u[0], u[1]));
    }
    this.r = r;
    this.m = Math.abs(A) * 0.001; this.im = o.fixed ? 0 : 1 / this.m; this.ii = o.fixed ? 0 : 1 / (Math.abs(I) * 0.001);
    this.t = pts.map(function () { return [0, 0]; });
    this.n = pts.map(function () { return [0, 0]; });
    this.sync();
  }
  Body.prototype.sync = function () {
    var c = Math.cos(this.a), s = Math.sin(this.a), p = this.p, n = p.length, i;
    for (i = 0; i < n; i++) { this.t[i][0] = this.x + p[i][0] * c - p[i][1] * s; this.t[i][1] = this.y + p[i][0] * s + p[i][1] * c; }
    for (i = 0; i < n; i++) {
      var u = this.t[i], v = this.t[(i + 1) % n], ex = v[0] - u[0], ey = v[1] - u[1], l = Math.hypot(ex, ey) || 1;
      this.n[i][0] = ey / l; this.n[i][1] = -ex / l;
    }
  };

  function axis(A, B) { /* least penetration along A's face normals */
    var best = -Infinity, bi = 0;
    for (var i = 0; i < A.t.length; i++) {
      var nx = A.n[i][0], ny = A.n[i][1], px = A.t[i][0], py = A.t[i][1], min = Infinity;
      for (var j = 0; j < B.t.length; j++) { var d = (B.t[j][0] - px) * nx + (B.t[j][1] - py) * ny; if (d < min) min = d; }
      if (min > 0) return null;
      if (min > best) { best = min; bi = i; }
    }
    return { d: best, i: bi };
  }
  function collide(A, B) {
    var dx = B.x - A.x, dy = B.y - A.y, rr = A.r + B.r;
    if (dx * dx + dy * dy > rr * rr) return null;
    var a = axis(A, B); if (!a) return null;
    var b = axis(B, A); if (!b) return null;
    var flip = b.d > a.d + 0.5, R = flip ? B : A, I = flip ? A : B, f = flip ? b.i : a.i, nx = R.n[f][0], ny = R.n[f][1], k, m = 0, md = Infinity;
    for (k = 0; k < I.n.length; k++) { var d = I.n[k][0] * nx + I.n[k][1] * ny; if (d < md) { md = d; m = k; } }
    var s = [I.t[m].slice(), I.t[(m + 1) % I.t.length].slice()], v1 = R.t[f], v2 = R.t[(f + 1) % R.t.length], tx = -ny, ty = nx;
    function clip(s, cx, cy, o) {
      var out = [], d0 = s[0][0] * cx + s[0][1] * cy - o, d1 = s[1][0] * cx + s[1][1] * cy - o;
      if (d0 <= 0) out.push(s[0]); if (d1 <= 0) out.push(s[1]);
      if (d0 * d1 < 0) { var q = d0 / (d0 - d1); out.push([s[0][0] + (s[1][0] - s[0][0]) * q, s[0][1] + (s[1][1] - s[0][1]) * q]); }
      return out;
    }
    s = clip(s, -tx, -ty, -(v1[0] * tx + v1[1] * ty)); if (s.length < 2) return null;
    s = clip(s, tx, ty, v2[0] * tx + v2[1] * ty); if (s.length < 2) return null;
    var off = v1[0] * nx + v1[1] * ny, c = [], pen = 0;
    s.forEach(function (q) { var d = q[0] * nx + q[1] * ny - off; if (d <= 0) { c.push(q); pen = Math.max(pen, -d); } });
    if (!c.length) return null;
    return { A: A, B: B, nx: flip ? -nx : nx, ny: flip ? -ny : ny, c: c, pen: pen };
  }

  window.Phys = function (host) {
    var cv = host && host.querySelector('canvas');
    if (!cv) return;
    var ctx = cv.getContext('2d'), data = JSON.parse(cv.getAttribute('data-values')), css = getComputedStyle(document.documentElement);
    var col = function (n) { return css.getPropertyValue(n).trim(); };
    var W, H, bodies, walls, dpr, mx = -9999, my = -9999, drag = null, running = false, inited = false;

    function setup() {
      W = host.offsetWidth; H = host.offsetHeight; dpr = Math.min(2, window.devicePixelRatio || 1);
      if (!W || !H) return;
      cv.width = W * dpr; cv.height = H * dpr;
      bodies = []; inited = true;
      var fix = { fixed: true };
      walls = [new Body(W / 2, H + 100, box(W + 800, 200), fix), new Body(-100, H / 2 - H, box(200, H * 4), fix), new Body(W + 100, H / 2 - H, box(200, H * 4), fix)];
      var lw = W * 0.42, lh = H * 0.2, pos = [[.25, .05], [.73, .04], [.2, .27], [.71, .24], [.44, .5]];
      if (lh > lw * 0.48) lh = lw * 0.48;
      data.forEach(function (d, i) { bodies.push(new Body(pos[i][0] * W, pos[i][1] * H, pill(lw, lh), { c: col(d.c), tc: col(d.t), text: d.l, fs: lh * 0.21, e: .3, a: (Math.random() - .5) * .4, kind: 'pill', w: lw, h: lh })); });
      var cols = ['--c2', '--c3', '--c1', '--light', '--body'].map(col), S = Math.min(W, H * 1.1) * 0.15;
      for (var i = 0; i < 18; i++) {
        var z = S * (.4 + Math.random() * .75), x = z + Math.random() * (W - 2 * z), y = Math.random() * H * .55, q = Math.random(), o = { c: cols[i % 5], e: .4, a: Math.random() * 6 };
        if (q < .25) bodies.push(new Body(x, y, ellipse(z / 2, z / 2, 18), Object.assign(o, { kind: 'ell', rx: z / 2, ry: z / 2 })));
        else if (q < .5) bodies.push(new Body(x, y, box(z, z), Object.assign(o, { kind: 'box', w: z, h: z })));
        else if (q < .75) bodies.push(new Body(x, y, pill(z * 1.7, z * .6), Object.assign(o, { kind: 'pill', w: z * 1.7, h: z * .6 })));
        else bodies.push(new Body(x, y, ellipse(z * .85, z * .48, 20), Object.assign(o, { kind: 'ell', rx: z * .85, ry: z * .48 })));
      }
    }

    function step(dt) {
      var all = bodies.concat(walls), i, j, k, b, G = 1500, RR = W * .5;
      for (i = 0; i < bodies.length; i++) {
        b = bodies[i];
        b.vy += G * dt;
        if (b !== drag && mx > -999) {
          var dx = b.x - mx, dy = b.y - my, d = Math.hypot(dx, dy);
          if (d < RR && d > 1) { var f = (RR - d) / RR * 3600 * dt; b.vx += dx / d * f; b.vy += dy / d * f; }
        }
        if (b === drag) { b.vx += (mx - b.x) * 60 * dt; b.vy += (my - b.y) * 60 * dt - G * dt; b.vx *= .86; b.vy *= .86; b.w *= .92; }
        var fr = Math.exp(-dt * 1.6); b.vx *= fr; b.vy *= fr; b.w *= fr;
      }
      var cs = [];
      for (i = 0; i < all.length; i++) for (j = i + 1; j < all.length; j++) {
        if (!all[i].im && !all[j].im) continue;
        var m = collide(all[i], all[j]); if (m) cs.push(m);
      }
      for (k = 0; k < 8; k++) cs.forEach(function (c) {
        var A = c.A, B = c.B, e = Math.min(A.o.e === undefined ? B.o.e : A.o.e, B.o.e === undefined ? A.o.e : B.o.e);
        c.c.forEach(function (p) {
          var ax = p[0] - A.x, ay = p[1] - A.y, bx = p[0] - B.x, by = p[1] - B.y;
          var rvx = B.vx - B.w * by - A.vx + A.w * ay, rvy = B.vy + B.w * bx - A.vy - A.w * ax, vn = rvx * c.nx + rvy * c.ny;
          if (vn < 0) {
            var an = ax * c.ny - ay * c.nx, bn = bx * c.ny - by * c.nx, im = A.im + B.im + an * an * A.ii + bn * bn * B.ii;
            var J = -(1 + (vn < -90 && k === 0 ? e : 0)) * vn / im / c.c.length * 1.2;
            imp(A, B, c.nx * J, c.ny * J, ax, ay, bx, by);
            rvx = B.vx - B.w * by - A.vx + A.w * ay; rvy = B.vy + B.w * bx - A.vy - A.w * ax;
            var tx = -c.ny, ty = c.nx, vt = rvx * tx + rvy * ty, at = ax * ty - ay * tx, bt = bx * ty - by * tx, it = A.im + B.im + at * at * A.ii + bt * bt * B.ii;
            var F = Math.max(-J * .12, Math.min(J * .12, -vt / it / c.c.length));
            imp(A, B, tx * F, ty * F, ax, ay, bx, by);
          }
        });
      });
      bodies.forEach(function (b) { b.w = Math.max(-9, Math.min(9, b.w)); b.x += b.vx * dt; b.y += b.vy * dt; b.a += b.w * dt; });
      cs.forEach(function (c) {
        var q = Math.max(0, c.pen - .6) * .35 / (c.A.im + c.B.im);
        c.A.x -= c.nx * q * c.A.im; c.A.y -= c.ny * q * c.A.im; c.B.x += c.nx * q * c.B.im; c.B.y += c.ny * q * c.B.im;
      });
      bodies.forEach(function (b) {
        if (b.y > H + 200 || b.x < -300 || b.x > W + 300) { b.x = W / 2; b.y = 0; b.vx = b.vy = 0; }
        b.sync();
      });
    }
    function imp(A, B, x, y, ax, ay, bx, by) {
      A.vx -= x * A.im; A.vy -= y * A.im; A.w -= (ax * y - ay * x) * A.ii;
      B.vx += x * B.im; B.vy += y * B.im; B.w += (bx * y - by * x) * B.ii;
    }
    function rr(w, h, r) { ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(-w / 2, -h / 2, w, h, r); else ctx.rect(-w / 2, -h / 2, w, h); ctx.fill(); }
    function draw() {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      bodies.slice().reverse().forEach(function (b) {
        var o = b.o; ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.a); ctx.fillStyle = o.c;
        if (o.kind === 'ell') { ctx.beginPath(); ctx.ellipse(0, 0, o.rx, o.ry, 0, 0, 7); ctx.fill(); }
        else rr(o.w, o.h, o.kind === 'box' ? 6 : Math.min(o.w, o.h) / 2);
        if (o.text) {
          ctx.fillStyle = o.tc; ctx.font = o.fs * 1.15 + 'px Display'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          var L = o.text.split('\n'); L.forEach(function (l, i) { ctx.fillText(l, 0, (i - (L.length - 1) / 2) * o.fs * 1.3); });
        }
        ctx.restore();
      });
    }
    var last = 0;
    function loop(now) {
      if (!running) return;
      var dt = Math.min(.033, (now - last) / 1000 || .016); last = now;
      for (var i = 0; i < 3; i++) step(dt / 3);
      draw(); requestAnimationFrame(loop);
    }
    function pt(e) { var r = cv.getBoundingClientRect(); mx = e.clientX - r.left; my = e.clientY - r.top; }
    cv.addEventListener('pointermove', function (e) { if (e.pointerType === 'mouse' || drag) pt(e); });
    cv.addEventListener('pointerleave', function () { mx = my = -9999; drag = null; });
    cv.addEventListener('pointerdown', function (e) {
      pt(e);
      for (var i = 0; i < bodies.length; i++) { var b = bodies[i]; if (b.n.every(function (n, k) { return (mx - b.t[k][0]) * n[0] + (my - b.t[k][1]) * n[1] < 0; })) { drag = b; cv.setPointerCapture(e.pointerId); break; } }
    });
    function up() { drag = null; }
    cv.addEventListener('pointerup', function (e) { up(); if (e.pointerType !== 'mouse') mx = my = -9999; });
    cv.addEventListener('pointercancel', function () { up(); mx = my = -9999; });

    if (window.M && window.M.reduced) { setup(); for (var q = 0; q < 900; q++) step(.011); draw(); return; }
    new IntersectionObserver(function (en) {
      var on = en[0].isIntersecting;
      if (on && !inited) setup();
      if (on && !running && inited) { running = true; last = performance.now(); requestAnimationFrame(loop); }
      if (!on) running = false;
    }, { rootMargin: '0px' }).observe(host);
    var rw = window.innerWidth;
    window.addEventListener('resize', function () { if (window.innerWidth !== rw) { rw = window.innerWidth; if (inited) setup(); } });
  };
})();
