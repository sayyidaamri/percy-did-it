/* Percy Did It - site.js
   Shared chrome (preloader, header, menus, page exit), reveals and hovers,
   then one block per page. Needs motion.js. */
(function () {
  'use strict';
  var M = window.M, $ = M.one, $$ = M.list;
  var skip = document.documentElement.classList.contains('skip');
  var fine = window.matchMedia('(pointer: fine)').matches;
  var DESK = '(min-width: 992px)', TAB = '(max-width: 991px)';
  var preDelay = 0;

  function tl() { return M.tl(); }
  function ss(k, v) { try { if (v === undefined) return sessionStorage.getItem(k); sessionStorage.setItem(k, v); } catch (e) { return null; } }

  /* ---------- preloader ---------- */
  (function () {
    var pre = $('.pre');
    if (!pre || skip || M.reduced) { if (pre) pre.hidden = true; return; }
    var first = !ss('pdi_seen'); ss('pdi_seen', '1');
    var D = first ? 2.9 : 2.2, n = $('.pre-n'), from = first ? 0 : 53, box = $('.pre-box');
    preDelay = D;
    var off = window.innerWidth < 992 ? 50 : 25;
    var t = tl();
    [['.pre-fruit.p1,.pre-fruit.p3', -off], ['.pre-fruit.p2,.pre-fruit.p4', off]].forEach(function (g) {
      $$(g[0]).forEach(function (el) { el.style.visibility = 'visible'; });
      t.add(g[0], { x: [g[1] + 'vw', null], r: [0, null] }, { d: 1, ease: 'back.inOut(2.2)' });
      t.add(g[0], { x: g[1] + 'vw', r: 0 }, { at: D - 0.8, d: 0.8, ease: 'back.inOut(2.2)' });
    });
    t.add(n, { s: 0 }, { at: D - 0.5, d: 0.5, ease: 'back.inOut(2.2)' });
    t.add(pre, { o: 0 }, { at: D + 0.8, d: 0.3, ease: 'sine.in' });
    t.seek(0).play({ done: function () { pre.hidden = true; } });
    /* the two curtains shrink to the header bar */
    var t0 = performance.now(), H = box.offsetHeight, P = pre.offsetHeight, e1 = M.ease('power3.out'), e2 = M.ease('sine.in');
    var steps = [], acc = 0, i;
    for (i = 0; i < 4; i++) { acc += 0.6 + Math.random() * 0.8; steps.push(acc); }
    (function count(now) {
      var s = (now - t0) / 1000;
      var total = D - 0.5, p = Math.max(0, Math.min(1, s / total)), seg = Math.min(3, Math.floor(p * 4)), q = Math.min(1, (p * 4 - seg) / 0.8);
      q = q < 0.5 ? 2 * q * q : 1 - Math.pow(2 - 2 * q, 2) / 2;
      var a = seg ? steps[seg - 1] : 0;
      n.textContent = Math.round(from + (100 - from) * (a + (steps[seg] - a) * q) / acc) + '%';
      if (s >= D) {
        var k = Math.min(1, (s - D) / 0.8);
        box.style.height = (H + (65 - H) * e1(k)) + 'px';
        pre.style.height = (P * (1 - e2(k))) + 'px';
      }
      if (s < D + 0.85) requestAnimationFrame(count);
    })(t0);
  })();

  /* ---------- page exit ---------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a[href]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target === '_blank') return;
    var h = a.getAttribute('href');
    if (!h || h[0] === '#' || /^(mailto|tel|https?):/.test(h)) return;
    e.preventDefault();
    ss('pdi_skip', '1');
    if (M.reduced) { location.href = h; return; }
    $('.exit').style.setProperty('--exit', a.getAttribute('data-exit') || '');
    document.documentElement.classList.add('leaving');
    var y = window.scrollY, pg = $('.page');
    if (pg) pg.style.transformOrigin = '50% ' + (y + window.innerHeight / 2) + 'px';
    setTimeout(function () { location.href = h; }, 800);
  });
  window.addEventListener('pageshow', function (e) { if (e.persisted) document.documentElement.classList.remove('leaving'); });
  $$('[data-back]').forEach(function (b) {
    b.addEventListener('click', function (e) { if (history.length > 1 && document.referrer) { e.preventDefault(); e.stopPropagation(); history.back(); } });
  });

  /* ---------- reveals: data-ix="chars|lines|fade|image|scale" ---------- */
  function reveal() {
    var groups = {};
    $$('[data-ix]').forEach(function (el) {
      var k = el.getAttribute('data-ix');
      if (k === 'chars' || k === 'lines') {
        var s = M.split(el, k), t = tl();
        t.add(s.units, { y: ['100%', null] }, { d: 0.5, ease: 'back.inOut(2.2)', stagger: 0.2 });
        t.seek(0);
        el.style.visibility = 'visible';
        M.onEnter(el, 'top bottom', function () { t.play({ delay: wait(0.5) }); });
        return;
      }
      var g = el.getAttribute('data-g') || 'i' + Math.random();
      (groups[g] = groups[g] || []).push(el);
    });
    Object.keys(groups).forEach(function (g) {
      var els = groups[g], el = els[0], k = el.getAttribute('data-ix'), t = tl();
      var d = +el.getAttribute('data-d') || (k === 'scale' ? 0.6 : 0.5), st = el.hasAttribute('data-st') ? +el.getAttribute('data-st') : 0.5;
      var p = k === 'scale' ? { o: [0, null], s: [0, null] } : k === 'image' ? { y: ['120vh', null] } : { y: ['200%', null], r: [el.hasAttribute('data-r') ? +el.getAttribute('data-r') : 20, null] };
      t.add(els, p, { d: d, ease: el.getAttribute('data-e') || 'back.inOut(2.2)', stagger: st });
      t.seek(0);
      els.forEach(function (x) { x.style.visibility = 'visible'; });
      var delay = +el.getAttribute('data-delay') || 0;
      M.onEnter(k === 'image' ? document.body : el, 'top bottom', function () { t.play({ delay: wait(0.5 + delay) }); });
    });
  }
  function wait(x) { return Math.max(0, preDelay + x - performance.now() / 1000 + bootAt); }
  var bootAt = performance.now() / 1000;

  /* chars / lines / scale on enter, reversed never */
  function enter(trigger, start, build) {
    trigger = $(trigger);
    if (!trigger) return;
    var t = tl(); build(t, trigger); t.seek(0);
    M.onEnter(trigger, start, function () { t.play(); });
  }
  function within(el, s) { return Array.prototype.slice.call(el.querySelectorAll(s)); }
  function unitsOf(els, type) { return els.reduce(function (a, el) { return a.concat(M.split(el, type).units); }, []); }

  /* ---------- hovers ---------- */
  function hover(sel, build, opts) {
    if (!fine) return;
    $$(sel).forEach(function (el) {
      var t;
      el.addEventListener('mouseenter', function () { if (!t) { t = tl(); build(t, el); } if (opts && opts.restart) t.seek(0); t.play(); });
      el.addEventListener('mouseleave', function () { if (t) t.reverse(opts && opts.back); });
    });
  }
  function hovers() {
    hover('.nl > span, .pl span', function (t, el) {
      t.add(M.split(el, 'chars', false).units, { y: el.closest('.pl') ? '-133%' : '-100%' }, { d: 0.45, ease: 'back.inOut(2)', stagger: 0.12 });
    });
    $$('.round').forEach(function (el) {
      var f = getComputedStyle(el).getPropertyValue('--f').trim() || '--c1', swap = el.classList.contains('swap');
      hover(el, function (t) {
        t.add(el, { r: 375, bg: swap ? f : '--light', color: swap ? '--light' : '--dark' }, { d: 0.5, ease: 'back.inOut(2.5)' });
      });
    });
    hover('.send', function (t, el) { t.add(el, { r: 345, bg: '--c1', color: '--light', border: '--c1' }, { d: 0.5, ease: 'back.inOut(2.5)' }); });
    hover('.cta', function (t, el) { t.add(el.querySelector('i'), { o: [0, 1], y: ['101%', '0%'], s: [0.5, 1] }, { d: 0.5, ease: 'back.inOut(1.7)' }); });
    $$('.cta i').forEach(function (i) { i.style.opacity = 0; });
    hover('.ft-s a', function (t, el) { t.add(el, { r: 360, bg: '--dark', color: '--body' }, { d: 0.5, ease: 'back.inOut(1.7)' }); });
    hover('.ni', function (t, el) {
      t.add(M.split(el.querySelector('h3'), 'lines').units, { y: ['101%', null] }, { d: 0.5, ease: 'back.out(1.7)', stagger: 0.1 });
      t.add(el.querySelector('i'), { o: 0.3 }, { d: 0.5, ease: 'back.out(1.7)' });
    });
    if (fine && window.innerWidth > 991) $$('.news-g:not(.mob) .ni h3').forEach(function (h) { h.style.visibility = 'hidden'; h.parentNode.addEventListener('mouseenter', function () { h.style.visibility = ''; }); });
    hover('.mega a', function (t, el) { t.add(el.querySelector('.m-fruit'), { r: 7 }, { d: 0.6, ease: 'wiggle' }); }, { restart: true });
    hover('.p-l .star', function (t, el) { t.add(el, { s: 0.9 }, { d: 0.3, ease: 'back.inOut(1.7)' }); });
    hover('.tog', function (t, el) { t.add(el, { s: 0.9, r: 360, bg: '--light', color: '--dark' }, { d: 0.5, ease: 'back.inOut(2.5)' }); });
  }

  /* magnetic pull */
  function magnets() {
    if (!fine) return;
    $$('[data-mag]').forEach(function (z) {
      var k = +z.getAttribute('data-mag') || 0.4, sel = z.getAttribute('data-mag-el'), el = sel ? z.querySelector(sel) : z;
      var base = getComputedStyle(el).transform, tr = base === 'none' ? '' : ' ' + base, x = 0, y = 0, anim;
      function to(nx, ny, dur, e) {
        var x0 = x, y0 = y, t0 = performance.now(), id = anim = {};
        (function step(now) {
          if (anim !== id) return;
          var p = Math.min(1, (now - t0) / dur), q = e(p);
          x = x0 + (nx - x0) * q; y = y0 + (ny - y0) * q;
          el.style.transform = 'translate(' + x.toFixed(2) + 'px,' + y.toFixed(2) + 'px)' + tr;
          if (p < 1) requestAnimationFrame(step);
        })(t0);
      }
      z.addEventListener('mousemove', function (e) {
        var r = z.getBoundingClientRect();
        to((e.clientX - r.left - r.width / 2) * k, (e.clientY - r.top - r.height / 2) * k, 400, M.ease('power2.out'));
      });
      z.addEventListener('mouseleave', function () { to(0, 0, 700, M.ease('elastic')); });
    });
  }

  /* ---------- header ---------- */
  function header() {
    var fade = $('.fade'), mega = $('.mega'), pb = $('.hbtn.products');
    /* mega menu */
    if (pb && mega) {
      var mt = null, open = false;
      pb.querySelector('i').style.opacity = 0;
      var show = function () {
        if (open || window.innerWidth < 992) return;
        open = true;
        mega.style.display = 'grid';
        pb.setAttribute('aria-expanded', 'true');
        var H = mega.scrollHeight;
        mt = tl();
        mt.add(mega, { h: ['0px', H + 'px'] }, { at: 0.06, d: 0.5, ease: 'back.out(1.7)' });
        mt.add('.mega a > i', { h: ['0%', '50%'] }, { at: 0.14, d: 0.5, ease: 'back.inOut(1.7)', stagger: 0.1 });
        mt.add('.m-fruit, .m-chip, .m-cue', { o: [0, 1], s: [0.8, 1] }, { at: 0.5, d: 0.3, ease: 'back.out(1.7)', stagger: 0.3 });
        mt.add(pb.querySelector('i'), { o: [0, 1], y: ['101%', '0%'], s: [0.5, 1] }, { d: 0.5, ease: 'back.inOut(1.7)' });
        mt.seek(0).play();
      };
      var hide = function () {
        if (!open) return;
        open = false;
        pb.setAttribute('aria-expanded', 'false');
        mt.reverse({ speed: 1.5, done: function () { if (!open) mega.style.display = 'none'; } });
      };
      pb.addEventListener('mouseenter', show);
      pb.addEventListener('focus', show);
      pb.addEventListener('click', function (e) { e.preventDefault(); e.stopPropagation(); show(); });
      mega.addEventListener('mouseleave', hide);
      document.addEventListener('mousemove', function (e) { if (open && !e.target.closest('.hdr')) hide(); });
      document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hide(); });
    }
    /* search */
    var sb = $('.sbtn'), sf = $('.search'), res = $('.search-res'), st = tl(), so = false;
    st.add(sf, { o: [0, 1] }, { d: 0.5, ease: 'power1.out' }).add(fade, { o: [0, 0.7] }, { d: 0.5, ease: 'power1.out' });
    function search(on) {
      so = on;
      if (on) { sf.style.display = 'flex'; fade.style.display = 'block'; st.seek(0).play(); $('.search input').focus(); }
      else { res.classList.remove('on'); st.reverse({ done: function () { sf.style.display = 'none'; fade.style.display = 'none'; } }); }
      sb.setAttribute('aria-expanded', on);
    }
    sb.addEventListener('click', function (e) { e.preventDefault(); if (mo) menu(false); search(!so); });
    var INDEX = JSON.parse($('#search-index').textContent);
    $('.search input').addEventListener('input', function () {
      var q = this.value.trim().toLowerCase();
      res.innerHTML = '';
      if (!q) { res.classList.remove('on'); return; }
      var hits = INDEX.filter(function (i) { return (i[0] + ' ' + (i[2] || '')).toLowerCase().indexOf(q) > -1; }).slice(0, 6);
      res.classList.add('on');
      if (!hits.length) { var p = document.createElement('p'); p.textContent = 'No evidence found'; res.appendChild(p); return; }
      hits.forEach(function (h) { var a = document.createElement('a'); a.href = h[1]; a.textContent = h[0]; res.appendChild(a); });
    });
    sf.addEventListener('submit', function (e) { e.preventDefault(); var a = res.querySelector('a'); if (a) a.click(); });
    /* mobile menu */
    var bg = $('.burger'), mm = $('.mmenu'), mo = false, mtl = null, btl = tl();
    btl.add('.burger b:nth-child(1)', { x: '101%' }, { d: 0.5, ease: 'back.inOut(1.7)' })
      .add('.burger b:nth-child(2)', { x: '-101%' }, { d: 0.5, ease: 'back.inOut(1.7)' })
      .add('.burger em', { y: '-20px', r: [20, 0] }, { at: 0.1, d: 0.5, ease: 'back.inOut(3)' });
    function menu(on) {
      mo = on;
      bg.setAttribute('aria-expanded', on);
      if (on) {
        mm.classList.add('on'); fade.style.display = 'block';
        if (!mtl) {
          mtl = tl();
          var order = [1, 2, 3, 4, 5, 6];
          order.forEach(function (i) { mtl.add('.mm > div:nth-child(' + i + ')', { y: [-(i * 100 + 1) + '%', null] }, { at: 0.13 - i * 0.02, d: 0.8, ease: 'back.out(1.7)' }); });
          mtl.add(fade, { o: [0, 0.6] }, { at: 0.01, d: 0.5 });
          mtl.seek(0);
        }
        mtl.play(); btl.play({ delay: 0.1 });
      } else {
        drop(false);
        mtl.reverse({ done: function () { if (!mo) { mm.classList.remove('on'); fade.style.display = 'none'; } } });
        btl.reverse();
      }
    }
    bg.addEventListener('click', function () { if (so) search(false); menu(!mo); });
    var dt = null, dOn = false, db = $('.ml.drk');
    function drop(on) {
      if (dOn === on) return;
      dOn = on;
      db.setAttribute('aria-expanded', on);
      if (!dt) {
        dt = tl();
        dt.add('.mm .sub', { h: ['0px', '260px'] }, { d: 0.8, ease: 'back.out(1.7)' });
        $$('.mm .sub a').forEach(function (a, i) { dt.add(a, { y: [-65 * (i + 1) + 'px', '0px'] }, { d: 0.8, ease: 'back.out(1.7)' }); });
        dt.add('.ml.drk i', { r: 180 }, { d: 0.8, ease: 'back.inOut(1.7)' });
      }
      if (on) dt.play(); else dt.reverse();
    }
    db.addEventListener('click', function () { drop(!dOn); });
    fade.addEventListener('click', function () { if (so) search(false); if (mo) menu(false); });
    mm.addEventListener('click', function (e) { if (e.target === mm && mo) menu(false); });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { if (so) search(false); if (mo) menu(false); } });
  }

  /* ---------- floating fruit: drift, parallax and repulsion ---------- */
  function floats() {
    var box = $('.floats');
    if (!box || M.reduced) return;
    var items = $$('.floats img').map(function (el) {
      var R = Math.random, P = Math.PI * 2;
      return { el: el, l: +el.getAttribute('data-l'), a: R() * P, b: R() * P, c: R() * P, d: R() * P, kx: 0.85 + R() * 0.3, ky: 0.85 + R() * 0.3, q: 0.75 + R() * 0.55, rx: 0, ry: 0 };
    });
    var tx = 0, ty = 0, cx = 0, cy = 0, mx = -9999, my = -9999, t = 0, last = 0;
    if (fine) {
      document.addEventListener('mousemove', function (e) { tx = e.clientX / innerWidth - 0.5; ty = e.clientY / innerHeight - 0.5; mx = e.clientX; my = e.clientY; });
      document.addEventListener('mouseleave', function () { tx = ty = 0; mx = my = -9999; });
    }
    (function loop(now) {
      requestAnimationFrame(loop);
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      if (window.scrollY > innerHeight * 2) return;
      t += dt; cx += (tx - cx) * 0.055; cy += (ty - cy) * 0.055;
      items.forEach(function (i) {
        var f = t * 0.3 * i.q, r = i.el.getBoundingClientRect(), dx = mx - r.left - r.width / 2, dy = my - r.top - r.height / 2, ds = Math.sqrt(dx * dx + dy * dy), fx = 0, fy = 0;
        if (ds < 1000 && ds > 0) { var k = (1 - ds / 1000) * 34; fx = -dx / ds * k; fy = -dy / ds * k; }
        i.rx += (fx - i.rx) * 0.035; i.ry += (fy - i.ry) * 0.035;
        var X = cx * -150 * i.l * i.kx + Math.sin(f * 0.6 + i.a) * 8.5 + i.rx, Y = cy * -105 * i.l * i.ky + Math.sin(f + i.b) * 10 + i.ry;
        i.el.style.transform = 'translate(' + X.toFixed(2) + 'px,' + Y.toFixed(2) + 'px) rotate(' + (Math.sin(f * 0.5 + i.d) * 4 + (cx * 3.5 + cy * 2.1) * i.l).toFixed(2) + 'deg) scale(' + (1 + Math.sin(f * 0.35 + i.c) * 0.013).toFixed(4) + ')';
      });
    })(0);
  }

  /* mascots that pop in, show off and swap: cut-out "footage" loop */
  function mascots(box, hold) {
    box = $(box);
    if (!box) return;
    var imgs = within(box, 'img'), i = 0, first = true;
    if (M.reduced) { imgs[0].style.visibility = 'visible'; imgs[0].style.transform = 'translateX(-50%)'; return; }
    imgs.forEach(function (m) { m.style.transform = 'translateX(-50%)'; });
    function show() {
      var el = imgs[i], t = tl();
      el._m = null; el.style.transform = 'none';
      el._m = { x: { n: -50, u: '%' } }; el._base = { x: { n: -50, u: '%' } };
      el.style.visibility = 'visible';
      t.add(el, { y: ['110%', '0%'] }, { d: 0.9, ease: 'back.out(1.4)' })
        .add(el, { r: [-14, 0] }, { d: 1.1, ease: 'back.out(2.4)' })
        .add(el, { s: [0.92, 1] }, { d: 0.9, ease: 'back.out(2)' })
        .add(el, { r: 7 }, { at: 1.8, d: 0.35, ease: 'back.inOut(1.7)' })
        .add(el, { r: -7 }, { at: 2.15, d: 0.4, ease: 'back.inOut(1.7)' })
        .add(el, { r: 0 }, { at: 2.55, d: 0.5, ease: 'back.out(2.5)' })
        .add(el, { s: 1.04 }, { at: 1.8, d: 0.4, ease: 'back.out(1.7)' })
        .add(el, { s: 1 }, { at: 2.6, d: 0.5, ease: 'back.out(1.7)' });
      if (imgs.length > 1) t.add(el, { y: '115%' }, { at: hold, d: 0.6, ease: 'back.in(1.7)' });
      else t.pad(hold);
      t.seek(0).play({ delay: first ? wait(0.9) : 0, done: function () {
        if (imgs.length > 1) { el.style.visibility = 'hidden'; i = (i + 1) % imgs.length; show(); }
        else bob();
      } });
      first = false;
    }
    function bob() {
      var el = imgs[0], t = tl();
      t.add(el, { r: 7 }, { at: 3, d: 0.35, ease: 'back.inOut(1.7)' }).add(el, { r: -7 }, { at: 3.35, d: 0.4, ease: 'back.inOut(1.7)' }).add(el, { r: 0 }, { at: 3.75, d: 0.5, ease: 'back.out(2.5)' })
        .add(el, { y: '-4%' }, { at: 3.2, d: 0.35, ease: 'power2.out' }).add(el, { y: '0%' }, { at: 3.55, d: 0.5, ease: 'back.out(3)' });
      t.play({ done: bob });
    }
    show();
  }

  /* ---------- home ---------- */
  function home() {
    if (!$('.flav')) return;
    floats();
    mascots('.hero-mascot', 5.2);

    M.scrub('.hero', { start: 'top bottom', end: 'bottom top', scrub: 1.4 }, function (t) {
      t.add('.hero-t, .hero-mascot, .floats', { s: 0.9 }, { d: 0.5, ease: 'back.out(1.2)' }).add('.hero-shade', { o: 0.6 }, { d: 0.5 });
    });

    M.scrub('.flav', { start: 'top top', end: 'bottom bottom', scrub: 1.4 }, function (t) {
      var B = 'back.inOut(1.7)', O = 'back.out(1.7)', I = 'back.in(1.7)', S = 'sine.out';
      var W = [1, 2, 3, 4].map(function (i) { return M.units('.flav-words .w' + i + ' h2', 'chars'); });
      var L = [1, 2, 3, 4].map(function (i) { return M.units('.flav-txt .t' + i, 'lines'); });
      var ui = [1, 2, 3, 4].map(function (i) { return $$('.tags.t' + i + ' span, .round.r' + i); });
      function out(i, at) { t.add(ui[i], { s: 0, o: 0.5 }, { at: at, d: 0.32, ease: I, stagger: 0.1 }); }
      function inn(i, at) { t.add(ui[i], { o: [0.5, null], s: [0, null] }, { at: at, d: 0.7, ease: O, stagger: 0.2 }); }
      out(0, 0);
      t.add(W[0], { y: '101%' }, { at: 0.2, d: 1.56, stagger: 0.5, ease: B });
      t.add(W[1], { y: ['-101%', null] }, { at: 0.64, d: 1.56, stagger: 0.15, ease: B });
      t.add('.cans .c1', { y: '100vh', x: '30vw', r: -180 }, { at: 0.2, d: 2, ease: S });
      t.add('.flav-in', { bg: ['--c1', '--c2'] }, { at: 0.2, d: 2.02 });
      t.add('.cans .c2', { x: ['-30vw', null], y: ['-100vh', null], r: [180, null] }, { at: 0.2, d: 2, ease: S });
      t.add(L[0], { y: '-101%' }, { at: 0.71, d: 2, stagger: 0.5, ease: O });
      t.add(L[1], { y: ['101%', null] }, { at: 0.71, d: 2, stagger: 0.5, ease: O });
      inn(1, 2.35); out(1, 4);
      t.add('.flav-words > div', { x: '-50%' }, { at: 4.32, d: 2.37, ease: 'power2.out' });
      t.add(W[1], { y: '-100%' }, { at: 4.32, d: 1.56, stagger: 0.5, ease: I });
      t.add(W[2], { y: ['101%', null] }, { at: 5.14, d: 1.56, stagger: 0.5, ease: B });
      t.add('.cans .c2', { y: '-100vh', x: '-70vw', r: 180 }, { at: 4.32, d: 2.31, ease: S });
      t.add('.flav-in', { bg: ['--c2', '--c3'] }, { at: 4.32, d: 2.02 });
      t.add('.cans .c3', { x: ['80vw', null], y: ['100vh', null], r: [-180, null] }, { at: 4.32, d: 2.31, ease: S });
      t.add(L[1], { y: '-101%' }, { at: 4.83, d: 2, stagger: 0.5, ease: O });
      t.add(L[2], { y: ['101%', null] }, { at: 4.83, d: 2, stagger: 0.5, ease: O });
      inn(2, 6.35); out(2, 7.82);
      t.add('.flav-words .w3, .flav-words .w4', { x: '100%' }, { at: 8.14, d: 3.19, ease: B });
      t.add('.cans .c3', { y: '15vh', x: '80vw', r: 180 }, { at: 8.6, d: 2, ease: S });
      t.add('.pop-in .mover', { x: ['-80vw', null], y: ['-15vh', null], r: [180, null] }, { at: 8.6, d: 2, ease: S });
      t.add('.flav-in', { bg: ['--c3', '--c4'] }, { at: 8.14, d: 2.02 });
      t.add(L[2], { y: '-101%' }, { at: 8.64, d: 2, stagger: 0.5, ease: O });
      t.add(L[3], { y: ['101%', null] }, { at: 8.64, d: 2, stagger: 0.5, ease: O });
      inn(3, 10.17);
      [[0, 1.81], [4.24, 6.12], [8.11, 9.81]].forEach(function (a) {
        t.add('.can-sh', { o: 0, s: 0.6 }, { at: a[0], d: 0.5 }).add('.can-sh', { o: [0, 0.4], s: [0.6, 1] }, { at: a[1], d: 0.5 });
      });
      t.add(W[3], { y: '-101%' }, { at: 11.55, d: 1.6, stagger: 0.5, ease: I });
      t.add(L[3], { y: '-101%' }, { at: 11.82, d: 1.62, stagger: 0.5, ease: I });
      t.add($$('.tags.t4 span').concat($$('.can-sh')), { o: 0.5, s: 0 }, { at: 11.82, d: 1.64, ease: I });
      t.add('.round.r4', { o: 0.5, s: 0 }, { at: 11.84, d: 1.62, ease: O });
      t.call(8.32, function (on) { $('.pop').style.zIndex = on ? 4 : 1; });
    });

    function benefits(mob) {
      return function (t) {
        var B = 'back.inOut(1.7)', O = 'back.out(1.7)';
        t.add(M.units('.ben-title h2', 'chars'), { y: ['105%', null] }, { at: 0.21, stagger: 0.2, ease: O });
        t.add('.ben-title .chip', { o: [0.5, null], s: [0, null] }, { at: 0.49, d: 0.4, ease: O });
        t.add(M.units('.ben-title p', 'lines'), { y: ['101%', null] }, { at: 0.21, d: 0.72, stagger: 0.1, ease: O });
        var P = $$('.bp'), k = mob ? 0.78 : 0;
        t.add(P, mob ? { y: ['101%', null] } : { x: ['101%', null] }, { at: mob ? 0.9 : 0.12, stagger: 0.2, from: 'end', ease: B });
        [2, 3, 4, 5, 6].forEach(function (i, n) {
          t.add('.bp.b' + i, mob ? { y: '-30dvh' } : { x: ['-67%', '-73%', '-79%', '-85%', '-80%'][n] }, { at: 0.85 + k + n * 0.505, ease: B });
        });
        t.pad(mob ? 4.24 : 3.46);
        if (mob) {
          t.add('.pop-in', { s: 0.9, y: '5%' }, { at: 0.21, ease: B });
          t.call(0.81, function (on) { $('.ben').style.zIndex = on ? 5 : 2; });
        }
      };
    }
    M.scrub('.ben', { start: 'top top', end: 'bottom 120%', scrub: 1.4, mq: DESK }, benefits(false));
    M.scrub('.ben', { start: 'top top', end: 'bottom 120%', scrub: 1.4, mq: TAB }, benefits(true));

    M.scrub('.tst', { start: 'top top', end: 'bottom bottom', scrub: 1.4 }, function (t) {
      var O = 'back.out(0.5)', B = 'back.inOut(1.7)', phone = window.innerWidth < 480;
      t.add('.card.k2', { y: ['200%', '0%'], r: [-10, 5] }, { at: 0.5, ease: O });
      t.add('.card.k3', { y: ['200%', '0%'], r: [10, -5] }, { at: 1.2, ease: O });
      t.add('.card.k4', { y: ['200%', '0%'], r: [-12, 7] }, { at: 1.9, ease: O });
      t.add('.card', { r: 0 }, { at: 2.43, d: 0.2, ease: O });
      t.add('.card.k1, .card.k2, .card.k3', { o: 0 }, { at: 2.61, d: 0.001 });
      t.add('.flip', { ry: 180 }, { at: 2.63, ease: B });
      t.add('.clear-in', { s: [phone ? 0.6 : 0.4, null] }, { at: 3.13, ease: B });
      t.add('.card.k4', { y: phone ? '-17dvh' : '-25dvh' }, { at: 3.13, ease: B });
      t.call(3.54, function (on) { $('.clear').classList.toggle('sq', on); });
      t.call(2.9, function (on) { $('.flip').style.pointerEvents = on ? 'auto' : ''; });
      t.pad(4.13);
    });

    enter('.arc', 'top 50%', function (t) {
      t.add('.af.l', { x: ['-20vw', null], r: [0, null] }, { ease: 'back.out(1.7)' }).add('.af.r', { x: ['20vw', null], r: [0, null] }, { at: 0.1, ease: 'back.out(1.7)' });
    });
    enter('.tst-h', 'top 80%', function (t, el) {
      t.add(unitsOf(within(el, 'h2'), 'chars'), { y: ['101%', null] }, { stagger: 0.2, ease: 'back.out(1.7)' }).add(within(el, '.chip'), { o: [0.5, null], s: [0, null] }, { at: 0.3, ease: 'back.out(1.7)' });
    });
    enter('.shelf-in', 'top 50%', function (t, el) {
      t.add(unitsOf(within(el, 'h2'), 'chars'), { y: ['101%', null] }, { stagger: 0.2, ease: 'back.out(1.7)' }).add(within(el, '.cens-b, .round'), { o: [0.5, null], s: [0, null] }, { at: 0.2, ease: 'back.out(1.7)' });
    });
    arc();
    pop();
  }

  /* text on a curve, pushed by scroll velocity */
  function arc() {
    var tp = $('#arc-tp');
    if (!tp) return;
    var text = tp.parentNode, rep = 900, off = 0, v = 0, raf = 0, lastY = window.scrollY, mob = window.innerWidth < 992;
    function calc() { try { rep = text.getComputedTextLength() / 8 || rep; } catch (e) {} }
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(calc);
    window.addEventListener('resize', calc);
    function tick() {
      v *= 0.96; off = ((off + v) % rep + rep) % rep;
      tp.setAttribute('startOffset', -off + 'px');
      raf = Math.abs(v) > 0.01 ? requestAnimationFrame(tick) : 0;
    }
    function push(d) { v = Math.max(-300, Math.min(300, v + d)); if (!raf) raf = requestAnimationFrame(tick); }
    if (mob) window.addEventListener('scroll', function () { var d = window.scrollY - lastY; lastY = window.scrollY; push(d * 0.015); }, { passive: true });
    else window.addEventListener('wheel', function (e) { push(e.deltaY * 0.01); }, { passive: true });
  }

  /* scroll driven can: lifts, pops its tab and throws fruit, ice and bubbles */
  function pop() {
    var cv = $('#pop'), ctx = cv.getContext('2d'), sec = $('.pop');
    var can = new Image(), bits = [], cur = 0, target = 0, time = 0, dpr = Math.min(2, window.devicePixelRatio || 1), W, H;
    can.src = cv.getAttribute('data-can');
    var srcs = cv.getAttribute('data-bits').split(',').map(function (s) { var i = new Image(); i.src = s; return i; });
    var seed = 7;
    function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
    for (var i = 0; i < 26; i++) {
      var a = -Math.PI / 2 + (rnd() - 0.5) * 1.9;
      bits.push({ im: srcs[i % srcs.length], a: a, d: 0.16 + rnd() * 0.3, s: 0.035 + rnd() * 0.05, r: rnd() * 6, w: (rnd() - 0.5) * 8, t: rnd() * 0.35, p: rnd() * 6 });
    }
    var bub = [];
    for (i = 0; i < 70; i++) bub.push({ x: (rnd() - 0.5), y: rnd(), r: 0.002 + rnd() * 0.008, v: 0.15 + rnd() * 0.5, t: rnd() * 0.5, s: rnd() * 6 });
    function size() { var r = cv.getBoundingClientRect(), w = cv.offsetWidth, h = cv.offsetHeight; W = w; H = h; cv.width = w * dpr; cv.height = h * dpr; }
    size();
    window.addEventListener('resize', size);
    function prog() {
      var top = sec.offsetTop + sec.offsetParent.offsetTop, max = sec.offsetHeight - window.innerHeight;
      var p = (window.scrollY - top) / max;
      p = p < 0.12 ? 0 : Math.min(1, (p - 0.12) / 0.88 * 4);
      return p;
    }
    var eo = M.ease('back.out(1.7)'), ei = M.ease('power2.inOut'), po = M.ease('power3.out');
    function seg(p, a, b) { return Math.max(0, Math.min(1, (p - a) / (b - a))); }
    (function loop(now) {
      requestAnimationFrame(loop);
      target = prog();
      cur += (target - cur) * 0.08;
      var r = sec.getBoundingClientRect();
      if (r.top > innerHeight || r.bottom < 0 || !can.naturalWidth) return;
      time = now / 1000;
      var mob = W < 992, ch = mob ? (window.innerWidth < 480 ? 0.5 * innerHeight : 0.55 * innerHeight) : window.innerWidth * 0.295, cw = ch * can.naturalWidth / can.naturalHeight;
      var cx = W / 2, cy = H / 2 + (mob ? 0 : 32.5);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);
      var shake = Math.sin(cur * 150) * 0.05 * ei(seg(cur, 0.08, 0.25)) * (1 - seg(cur, 0.3, 0.42));
      var lift = eo(seg(cur, 0.32, 0.6)), burst = po(seg(cur, 0.36, 1));
      var s = 1 - 0.14 * ei(seg(cur, 0.3, 0.6)), oy = cy + lift * H * 0.1, tilt = shake + Math.sin(time * 1.3) * 0.02 * burst;
      var topY = oy - ch * s * 0.49;
      /* spray behind */
      if (burst > 0.001) {
        ctx.save();
        var g = ctx.createRadialGradient(cx, topY, 0, cx, topY, W * 0.16);
        g.addColorStop(0, 'rgba(240,236,249,' + (0.75 * (1 - seg(cur, 0.55, 1) * 0.65)) + ')'); g.addColorStop(1, 'rgba(240,236,249,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(cx, topY, W * 0.11 * burst + cw * 0.3, W * 0.13 * burst, 0, 0, 7); ctx.fill();
        ctx.restore();
        bits.forEach(function (b, k) {
          if (k % 2) return; drawBit(b);
        });
      }
      ctx.save(); ctx.translate(cx, oy); ctx.rotate(tilt); ctx.scale(s, s);
      ctx.drawImage(can, -cw / 2, -ch / 2, cw, ch); ctx.restore();
      if (burst > 0.001) {
        bits.forEach(function (b, k) { if (k % 2) drawBit(b); });
        bub.forEach(function (b) {
          var q = seg(cur, 0.36 + b.t * 0.4, 0.7 + b.t * 0.5);
          if (!q) return;
          var life = (time * b.v * 0.4 + b.y) % 1, bx = cx + b.x * cw * (0.7 + life * 2.2) + Math.sin(time * 2 + b.s) * 6, by = topY + 8 - life * H * 0.34 * q;
          ctx.globalAlpha = (1 - life) * 0.9 * q;
          ctx.strokeStyle = '#f0ecf9'; ctx.lineWidth = 1.5; ctx.fillStyle = 'rgba(240,236,249,.35)';
          ctx.beginPath(); ctx.arc(bx, by, Math.max(1.5, b.r * W * 0.8), 0, 7); ctx.fill(); ctx.stroke();
        });
        ctx.globalAlpha = 1;
      }
      function drawBit(b) {
        var q = po(seg(cur, 0.38 + b.t * 0.3, 0.95));
        if (!q || !b.im.naturalWidth) return;
        var R = Math.min(W, H * 1.1), d = b.d * R * q, f = Math.sin(time * 0.9 + b.p) * 8;
        var x = cx + Math.cos(b.a) * d * 1.05, y = topY + Math.sin(b.a) * d * 0.72 + f + (1 - q) * 10, w = b.s * R * (0.3 + 0.7 * q), h = w * b.im.naturalHeight / b.im.naturalWidth;
        ctx.save(); ctx.translate(x, y); ctx.rotate(b.r + b.w * q * 0.5 + Math.sin(time * 0.6 + b.p) * 0.12); ctx.drawImage(b.im, -w / 2, -h / 2, w, h); ctx.restore();
      }
    })(0);
  }

  /* ---------- footer title ---------- */
  function footer() {
    enter('.ft', 'top 50%', function (t, el) { t.add(unitsOf(within(el, 'h2'), 'chars'), { y: ['101%', null] }, { stagger: 0.2, ease: 'back.out(1.7)' }); });
  }

  /* ---------- product ---------- */
  function product() {
    if (!$('.p-c')) return;
    var c = tl();
    c.add('.cover i', { y: '-101%' }, { d: 0.9, ease: 'back.out(1.7)', stagger: 0.2 });
    c.seek(0).play({ delay: wait(0.5), done: function () { $('.cover').hidden = true; } });
    if (M.reduced) $('.cover').hidden = true;
    mascots('.p-fig', 3.2);
    enter('.p-ing', 'top 80%', function (t, el) { t.add(unitsOf(within(el, 'h2'), 'chars'), { y: ['101%', null] }, { stagger: 0.2, ease: 'back.out(1.7)' }); });
    enter('.p-ing > div', 'top 80%', function (t, el) {
      t.add(within(el, '.chip'), { o: [0.5, null], s: [0, null] }, { ease: 'back.out(1.7)' }).add(unitsOf(within(el, '.txt'), 'lines'), { y: ['101%', null] }, { stagger: 0.3, ease: 'back.out(1.7)' });
    });
    enter('.p-past > div', 'top 80%', function (t, el) {
      t.add(within(el, '.chip'), { o: [0.5, null], s: [0, null] }, { ease: 'back.out(1.7)' }).add(unitsOf(within(el, 'h2'), 'chars'), { y: ['101%', null] }, { at: 0.1, stagger: 0.2, ease: 'back.out(1.7)' })
        .add(unitsOf(within(el, '.txt'), 'lines'), { y: ['101%', null] }, { at: 0.2, stagger: 0.3, ease: 'back.out(1.7)' });
    });
    /* size toggle */
    var on = false, tg = $('.tog'), w = window.innerWidth < 992 ? 116 : 35;

    var p1 = $('.pk1'), p2 = $('.pk2');
    function place(k) {
      /* k 0..1 */
      p1.style.transform = 'translateX(calc(-50% - ' + w * k + 'vw)) rotate(' + (-45 * k) + 'deg)';
      p2.style.transform = 'translateX(calc(-50% + ' + w * (1 - k) + 'vw)) rotate(' + (50 * (1 - k)) + 'deg)';
      $$('.tog span').forEach(function (s) { s.style.transform = 'translateX(' + (-100 * k) + '%)'; });
    }
    p1.style.left = p2.style.left = '50%';
    place(0);
    var anim = 0, k = 0, e = M.ease('back.inOut(1.7)');
    tg.addEventListener('click', function (ev) {
      ev.preventDefault(); on = !on; tg.setAttribute('aria-pressed', on);
      var id = ++anim, k0 = k, k1 = on ? 1 : 0, t0 = performance.now();
      (function step(now) { if (id !== anim) return; var p = Math.max(0, Math.min(1, (now - t0) / 500)); k = k0 + (k1 - k0) * e(p); place(k); if (p < 1) requestAnimationFrame(step); })(t0);
    });
    function next(mob) {
      return function (t) {
        $$('.nxt a').forEach(function (a, i) {
          var o = +a.getAttribute('data-o');
          t.add(a, mob ? { x: [i % 2 ? '101%' : '-101%', null] } : { y: ['101%', null] }, { at: mob ? 0.6 : [0, 0.06, 0.14, 0.22][o], d: mob ? 0.5 : 0.8, ease: 'back.inOut(1.7)' });
        });
        t.pad(mob ? 1.7 : 1.2);
      };
    }
    M.scrub('.nxt', { start: 'top bottom', end: 'bottom top', scrub: 1.6, mq: DESK }, next(false));
    M.scrub('.nxt', { start: 'top bottom', end: 'bottom top', scrub: 1.6, mq: TAB }, next(true));
  }

  /* ---------- our story ---------- */
  function story() {
    if (!$('.st-hero')) return;
    var C = {
      desk: { p1: [0, 0], p2: [-33, 11], p3: [37.5, 13], p4: [34.5, -13], s: 1.2, o1: [30, -10], o2: [-45, -14], o3: [64, 25] },
      mob: { p1: [21.5, -13], p2: [-29, 17], p3: [28, 60], p4: [-34, -65], s: 1.5, o1: [110, -10], o2: [-110, -20], o3: [125, 145] }
    };
    function build(c) {
      return function (t) {
        var I = 'back.in(1.7)', B = 'back.inOut(1.7)', v = function (n) { return n + 'vw'; };
        ['p1', 'p2', 'p3', 'p4'].forEach(function (p) { t.add('.pol.' + p, { x: v(c[p][0]), y: v(c[p][1]), r: 0 }, { d: 0.16, ease: I }); });
        t.add(M.units('.st-a h1 span, .st-a .h span', 'chars'), { y: '-101%' }, { d: 0.16, stagger: 0.05, ease: I });
        t.add('.pol', { s: c.s }, { at: 0.16, d: 0.1, ease: 'back.out(1.7)' });
        t.add(M.units('.st-b h2', 'chars'), { y: ['101%', null] }, { at: 0.16, d: 0.1, stagger: 0.05, ease: B });
        t.add(M.units('.st-b .tt p', 'lines'), { y: ['101%', null] }, { at: 0.16, d: 0.1, stagger: 0.07, ease: B });
        t.add('.bub .box, .bub i', { s: [0, null] }, { at: 0.16, d: 0.1, stagger: 0.05, ease: B });
        function swap(p, o, at, a, b) {
          t.add('.pol.' + p, { x: v(o[0]), y: v(o[1]), r: 45 }, { at: at, d: 0.06, ease: 'back.in(1)' });
          t.add('.pol.' + p, { x: v(c[p][0]), y: v(c[p][1]), r: 0 }, { at: at + 0.06, d: 0.06, ease: 'back.out(1)' });
          t.call(at + 0.06, function (on) { $('.pol.' + p).style.zIndex = on ? 6 + [.33, .5, .68].indexOf(at) : ''; });
          t.add(M.units('.bub .q' + a, 'lines'), { y: '-101%' }, { at: at, d: 0.12 });
          t.add(M.units('.bub .q' + b, 'lines'), { y: ['101%', null] }, { at: at, d: 0.12 });
        }
        swap('p1', c.o1, 0.33, 1, 2); swap('p2', c.o2, 0.5, 2, 3); swap('p3', c.o3, 0.68, 3, 4);
        t.pad(1.19);
      };
    }
    M.scrub('.st-hero', { start: 'top bottom', end: 'bottom top', scrub: 1.4, mq: DESK }, build(C.desk));
    M.scrub('.st-hero', { start: 'top bottom', end: 'bottom top', scrub: 1.4, mq: TAB }, build(C.mob));
    M.scrub('.st-sec', { start: 'top bottom', end: 'bottom top', scrub: 0.8 }, function (t) {
      t.add('.st-fix', { s: 0.9 }, { d: 0.25 }).add('.st-shade', { o: 0.5 }, { d: 0.25 }).pad(1);
    });
    M.scrub('.st-sec', { start: 'top 40%', end: 'bottom bottom', scrub: 0.8, mq: DESK }, function (t) {
      t.add(M.units('.st-t.l', 'chars'), { y: ['101%', null] }, { d: 0.21, stagger: 0.05, ease: 'back.inOut(1.7)' });
      t.add('.st-slide', { x: '-100%' }, { at: 0.4, d: 0.56, ease: 'power3.out' });
      t.add(M.units('.st-t.r', 'chars'), { y: ['101%', null] }, { at: 0.6, d: 0.21, stagger: 0.05, ease: 'back.inOut(1.7)' });
      t.pad(1.04);
    });
    M.scrub('.st-sec', { start: 'top 40%', end: 'bottom bottom', scrub: 0.8, mq: TAB }, function (t) {
      t.add(M.units('.st-t.l', 'chars'), { y: ['101%', null] }, { d: 0.21, stagger: 0.05, ease: 'back.inOut(1.7)' });
      t.add(M.units('.st-t.r', 'chars'), { y: ['101%', null] }, { at: 0.6, d: 0.21, stagger: 0.05, ease: 'back.inOut(1.7)' });
      t.pad(1.04);
    });
    if (window.Phys) window.Phys($('.st-phys'));
  }

  /* ---------- case files ---------- */
  function cases() {
    if (!$('.cf-hero')) return;
    var t = tl();
    t.add('.r1', { x: ['15%', null] }, { ease: 'back.inOut(1.7)' }).add('.r2', { x: ['-20%', null] }, { ease: 'back.inOut(1.7)' }).add('.r3', { x: ['20%', null] }, { ease: 'back.inOut(1.7)' }).add('.r4', { x: ['-15%', null] }, { ease: 'back.inOut(1.7)' });
    t.seek(0).play({ delay: wait(0.35) });
    M.scrub('.cf-hero', { start: 'top bottom', end: 'bottom top', scrub: 0.8 }, function (t) {
      t.add('.cf-w.right', { x: '-5%' }, { ease: 'back.inOut(1.7)' }).add('.cf-w.left', { x: '5%' }, { ease: 'back.inOut(1.7)' });
    });
    enter('.ci.psst', 'top 60%', function (t, el) {
      var mob = window.innerWidth < 480;
      t.add(within(el, 'img'), mob ? { y: ['80%', null] } : { x: ['15vw', null], r: [18, null] }, { d: 0.8, ease: 'back.inOut(1.7)' })
        .add(unitsOf(within(el, 'h2'), 'chars'), { y: ['101%', null] }, { stagger: 0.2, ease: 'back.out(1.7)' });
    });
    /* fruit tossed by the cursor */
    var box = $('.cf-drop'), src = box.getAttribute('data-src').split(','), acc = 0, px = null, py = null, n = 0;
    src.forEach(function (s) { new Image().src = s; });
    if (M.reduced || !fine) return;
    box.addEventListener('mousemove', function (e) {
      var r = box.getBoundingClientRect(), x = e.clientX, y = e.clientY - r.top;
      if (px === null) { px = x; py = y; return; }
      acc += Math.abs(x - px) + Math.abs(y - py);
      if (acc > window.innerWidth / 8) { acc = 0; toss(x, y, x - px); }
      px = x; py = y;
    });
    function toss(x, y, dx) {
      var H = window.innerHeight;
      if (y > H - 200) return;
      var im = document.createElement('img');
      im.src = src[n++ % src.length]; im.alt = '';
      box.appendChild(im);
      var ox = -50 + (Math.random() - 0.5) * 80, oy = -50, r0 = (Math.random() - 0.5) * 20, rb = (Math.random() - 0.5) * 2 * (45 + Math.random() * 45);
      var t0 = performance.now(), bi = M.ease('back.in(1.1)'), b2 = M.ease('back.in(' + (1.5 + 1 - y / H).toFixed(2) + ')'), p1 = M.ease('power1.in'), el = M.ease('elastic');
      (function step(now) {
        var s = (now - t0) / 1000;
        if (s >= 0.7) { im.remove(); return; }
        var a = Math.max(0, Math.min(1, s / 0.4)), b = Math.max(0, Math.min(1, (s - 0.4) / 0.3));
        var X = x + dx * 2 * p1(a) + dx * 1.6 * p1(b), Y = y + (H - y) * bi(a), yp = oy + (-95 - oy) * bi(a) + 245 * b2(b);
        var sc = 1.3 - 0.4 * Math.min(1, el(a)), rot = r0 * (1 - p1(a)) + rb * p1(b);
        im.style.transform = 'translate(' + X + 'px,' + Y + 'px) translate(' + ox + '%,' + yp + '%) rotate(' + rot + 'deg) scale(' + sc + ')';
        requestAnimationFrame(step);
      })(t0);
    }
  }

  /* ---------- press ---------- */
  function press() {
    enter('.pr-c', 'top 60%', function (t, el) {
      t.add(unitsOf(within(el, '.ln > span'), 'chars'), { y: ['101%', null] }, { stagger: 0.2, ease: 'back.out(1.7)' })
        .add(within(el, '.ln > b'), { o: [0.5, null], s: [0, null] }, { at: 0.2, stagger: 0.2, ease: 'back.out(1.7)' })
        .add(unitsOf(within(el, 'a > span'), 'lines'), { y: ['101%', null] }, { at: 0.4, d: 0.3, stagger: 0.3, ease: 'back.out(1.7)' });
    });
  }

  /* ---------- contact form (front-end only) ---------- */
  function contact() {
    var f = $('.ct form');
    if (!f) return;
    f.addEventListener('submit', function (e) {
      e.preventDefault();
      var bad = null;
      $$(f.querySelectorAll('[required]')).forEach(function (i) {
        var ok = i.type === 'checkbox' ? i.checked : i.value.trim() && (i.type !== 'email' || /^\S+@\S+\.\S+$/.test(i.value));
        (i.type === 'checkbox' ? i.nextElementSibling : i).classList.toggle('err', !ok);
        i.setAttribute('aria-invalid', !ok);
        if (!ok && !bad) bad = i;
      });
      f.querySelector('.note').textContent = bad ? 'Something is missing. Check the underlined fields.' : '';
      if (bad) { bad.focus(); return; }
      f.hidden = true;
      var d = $('.ct .done'); d.style.display = 'block'; d.focus();
    });
    f.addEventListener('input', function (e) { e.target.classList.remove('err'); if (e.target.type === 'checkbox') e.target.nextElementSibling.classList.remove('err'); });
  }

  function share() {
    $$('.ar-sh button').forEach(function (b) {
      b.addEventListener('click', function () {
        var u = encodeURIComponent(location.href), t = encodeURIComponent(document.title);
        var m = { fb: 'https://www.facebook.com/sharer/sharer.php?u=' + u, x: 'https://twitter.com/intent/tweet?url=' + u + '&text=' + t, in: 'https://www.linkedin.com/sharing/share-offsite/?url=' + u, pin: 'https://pinterest.com/pin/create/button/?url=' + u, rd: 'https://www.reddit.com/submit?url=' + u + '&title=' + t };
        window.open(m[b.getAttribute('data-s')], '_blank', 'noopener');
      });
    });
  }

  function peek404() {
    var el = $('.nf404 .peek');
    if (!el) return;
    var t = tl();
    t.add(el, { x: ['100%', '0%'], r: [0, -20] }, { d: 0.5, ease: 'back.inOut(2.2)' });
    t.seek(0).play({ delay: wait(1.5) });
  }

  function boot() {
    bootAt = performance.now() / 1000;
    preDelay = preDelay ? Math.max(0, preDelay - 0) : 0;
    if (skip) preDelay = 0;
    window.scrollTo(0, window.scrollY);
    M.smooth();
    home(); product(); story(); cases(); press(); contact(); share(); footer(); peek404();
    M.start();
    reveal();
    header(); hovers(); magnets();
    M.measure();
    document.documentElement.classList.add('ready');
  }
  /* wait for fonts so line splitting is right, but never longer than 1.2s */
  var started = false;
  function go() { if (!started) { started = true; boot(); } }
  if (document.fonts && document.fonts.load) {
    Promise.all([document.fonts.load('20px "Display"'), document.fonts.load('20px "Text"')]).then(go, go);
    setTimeout(go, 1200);
  } else go();
})();
