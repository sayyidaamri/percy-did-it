/* Percy Did It - motion.js
   Small dependency-free motion kit: easings, timelines (time or scroll driven),
   text splitting and inertial smooth scrolling. Exposed as window.M */
(function () {
  'use strict';

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- easings ---------- */
  function pow(n) {
    return {
      in: function (t) { return Math.pow(t, n); },
      out: function (t) { return 1 - Math.pow(1 - t, n); },
      inOut: function (t) { return t < 0.5 ? Math.pow(t * 2, n) / 2 : 1 - Math.pow((1 - t) * 2, n) / 2; }
    };
  }
  function back(s) {
    var i = function (t) { return t * t * ((s + 1) * t - s); };
    return {
      in: i,
      out: function (t) { return 1 - i(1 - t); },
      inOut: function (t) { return t < 0.5 ? i(t * 2) / 2 : 1 - i((1 - t) * 2) / 2; }
    };
  }
  var sine = {
    in: function (t) { return 1 - Math.cos(t * Math.PI / 2); },
    out: function (t) { return Math.sin(t * Math.PI / 2); },
    inOut: function (t) { return (1 - Math.cos(t * Math.PI)) / 2; }
  };
  function elasticOut(a, p) {
    var s = p / (2 * Math.PI) * Math.asin(1 / a);
    return function (t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : a * Math.pow(2, -10 * t) * Math.sin((t - s) * 2 * Math.PI / p) + 1;
    };
  }
  var wiggle = function (t) { return Math.sin(t * Math.PI * 5) * (1 - t); };
  var none = function (t) { return t; };

  /* 'back.out(1.7)', 'power3.out', 'sine.in', 'none', 'elastic' */
  function ease(name) {
    if (typeof name === 'function') return name;
    if (!name || name === 'none') return none;
    if (name === 'wiggle') return wiggle;
    if (name === 'elastic') return elasticOut(1, 0.4);
    var m = /^(\w+?)(\d?)\.(in|out|inOut)(?:\(([\d.]+)\))?$/.exec(name);
    if (!m) return none;
    if (m[1] === 'back') return back(m[4] ? +m[4] : 1.7)[m[3]];
    if (m[1] === 'sine') return sine[m[3]];
    if (m[1] === 'expo') return m[3] === 'out' ? function (t) { return t >= 1 ? 1 : 1 - Math.pow(2, -10 * t); } : pow(6)[m[3]];
    return pow((+m[2] || 1) + 1)[m[3]];
  }

  /* ---------- per-element transform state ---------- */
  function val(v) {
    if (v === undefined || v === null) return null;
    if (typeof v === 'number') return { n: v, u: '' };
    var m = /^(-?[\d.]+)([a-z%]*)$/i.exec(v);
    return m ? { n: +m[1], u: m[2] } : { s: v };
  }
  var BASE = { x: 0, y: 0, r: 0, ry: 0, s: 1, o: 1 };
  function state(el) {
    if (el._m) return el._m;
    var st = {}, cs = getComputedStyle(el), tr = cs.transform;
    if (tr && tr !== 'none') {
      var d = new DOMMatrix(tr);
      if (d.is2D) {
        st.r = { n: Math.atan2(d.b, d.a) * 180 / Math.PI, u: '' };
        if (d.e) st.x = { n: d.e, u: 'px' };
        if (d.f) st.y = { n: d.f, u: 'px' };
      }
    }
    var op = parseFloat(cs.opacity);
    if (op < 1) st.o = { n: op, u: '' };
    el._base = st;
    el._m = Object.assign({}, st);
    return el._m;
  }
  function apply(el) {
    var m = el._m, t = '', c;
    if (m.x || m.y) {
      var f = function (v) { return v ? v.n.toFixed(3) + (v.u || 'px') : '0px'; };
      t += 'translate3d(' + f(m.x) + ',' + f(m.y) + ',0) ';
    }
    if (m.r) t += 'rotate(' + m.r.n.toFixed(3) + 'deg) ';
    if (m.ry) t += 'rotateY(' + m.ry.n.toFixed(3) + 'deg) ';
    if (m.s) t += 'scale(' + Math.max(0, m.s.n).toFixed(4) + ') ';
    el.style.transform = t || 'none';
    if (m.o) el.style.opacity = Math.max(0, Math.min(1, m.o.n)).toFixed(3);
    for (c in m) {
      if (c === 'bg') el.style.backgroundColor = m.bg.s;
      else if (c === 'color') el.style.color = m.color.s;
      else if (c === 'border') el.style.borderColor = m.border.s;
      else if (c === 'h') el.style.height = m.h.n + m.h.u;
    }
  }
  function rgb(s) {
    if (s.indexOf('--') === 0) s = getComputedStyle(document.documentElement).getPropertyValue(s).trim();
    if (s[0] === '#') {
      return [1, 3, 5].map(function (i) { return parseInt(s.slice(i, i + 2), 16); }).concat([1]);
    }
    var m = (s.match(/[\d.]+/g) || [0, 0, 0, 0]).map(Number);
    return [m[0], m[1], m[2], m.length > 3 ? m[3] : 1];
  }
  var COLORS = { bg: 'backgroundColor', color: 'color', border: 'borderTopColor' };

  /* ---------- timeline ---------- */
  function TL(opts) {
    this.o = opts || {};
    this.tracks = [];   // {el, ch, segs:[{t,d,e,from,to}]}
    this.calls = [];    // {t, fn(isAfter)}
    this.dur = 0;
    this.time = 0;
    this.dirty = true;
  }
  TL.prototype._track = function (el, ch) {
    for (var i = 0; i < this.tracks.length; i++) {
      if (this.tracks[i].el === el && this.tracks[i].ch === ch) return this.tracks[i];
    }
    var t = { el: el, ch: ch, segs: [] };
    this.tracks.push(t);
    return t;
  };
  /* add(targets, {x:[from,to], ...}, {at, d, ease, stagger, from:'end'}); null = natural value */
  TL.prototype.add = function (els, props, o) {
    o = o || {};
    els = list(els);
    var at = o.at || 0, d = o.d === undefined ? 0.5 : o.d, e = ease(o.ease), n = els.length, self = this;
    var sEase = o.staggerEase ? ease(o.staggerEase) : none;
    els.forEach(function (el, i) {
      state(el);
      var k = o.from === 'end' ? n - 1 - i : i;
      var off = o.stagger && n > 1 ? o.stagger * sEase(k / (n - 1)) : 0;
      for (var ch in props) {
        var p = props[ch];
        if (!Array.isArray(p)) p = [null, p];
        var seg = { t: at + off, d: d, e: e };
        if (COLORS[ch]) {
          seg.c = true;
          seg.from = p[0] ? rgb(p[0]) : null;
          seg.to = p[1] ? rgb(p[1]) : null;
        } else {
          seg.from = val(p[0]);
          seg.to = val(p[1]);
        }
        self._track(el, ch).segs.push(seg);
      }
      self.dur = Math.max(self.dur, at + off + d);
    });
    this.dirty = true;
    return this;
  };
  TL.prototype.call = function (at, fn) { this.calls.push({ t: at, fn: fn, on: null }); this.dur = Math.max(this.dur, at); return this; };
  TL.prototype.pad = function (t) { this.dur = Math.max(this.dur, t); return this; };
  TL.prototype._prep = function () {
    this.dirty = false;
    this.tracks.forEach(function (tr) {
      var b = tr.el._base[tr.ch];
      tr.segs.sort(function (a, c) { return a.t - c.t; });
      if (COLORS[tr.ch]) {
        var base = rgb(getComputedStyle(tr.el)[COLORS[tr.ch]]);
        var prev = base;
        tr.segs.forEach(function (s) { if (!s.from) s.from = prev; if (!s.to) s.to = base; prev = s.to; });
      } else {
        var nat = b || { n: BASE[tr.ch], u: '' }, pv = nat;
        tr.segs.forEach(function (s) { if (!s.from) s.from = pv; if (!s.to) s.to = nat; pv = s.to; });
      }
    });
  };
  TL.prototype.seek = function (time) {
    if (this.dirty) this._prep();
    this.time = time;
    var touched = [];
    for (var i = 0; i < this.tracks.length; i++) {
      var tr = this.tracks[i], s = null, j;
      for (j = 0; j < tr.segs.length; j++) if (tr.segs[j].t <= time) s = tr.segs[j];
      var p = 0;
      if (!s) s = tr.segs[0];
      else p = s.d ? Math.min(1, (time - s.t) / s.d) : 1;
      var k = p >= 1 ? 1 : p <= 0 ? 0 : s.e(p);
      if (s.e === wiggle) k = p >= 1 ? 0 : s.e(p);
      var v;
      if (s.c) {
        v = { s: 'rgba(' + [0, 1, 2].map(function (q) { return Math.max(0, Math.min(255, Math.round(s.from[q] + (s.to[q] - s.from[q]) * k))); }).join(',') + ',' + Math.max(0, Math.min(1, s.from[3] + (s.to[3] - s.from[3]) * k)) + ')' };
      } else {
        v = { n: s.from.n + (s.to.n - s.from.n) * k, u: s.to.u || s.from.u };
      }
      tr.el._m[tr.ch] = v;
      if (touched.indexOf(tr.el) < 0) touched.push(tr.el);
    }
    touched.forEach(apply);
    this.calls.forEach(function (c) {
      var on = time >= c.t;
      if (on !== c.on) { c.on = on; c.fn(on); }
    });
    return this;
  };
  TL.prototype.play = function (o) {
    o = o || {};
    var self = this, dir = o.reverse ? -1 : 1, speed = o.speed || 1;
    this.dir = dir;
    if (reduced) { this.seek(dir > 0 ? this.dur : 0); if (o.done) o.done(); return this; }
    var wait = (o.delay || 0) * 1000, last = null;
    var id = this.run = (this.run || 0) + 1;
    function step(now) {
      if (self.run !== id) return;
      if (last === null) last = now;
      var dt = Math.min(now - last, 60); last = now;
      if (wait > 0) { wait -= dt; return requestAnimationFrame(step); }
      var t = self.time + dir * speed * dt / 1000;
      if (t >= self.dur) t = self.dur;
      if (t <= 0 && dir < 0) t = 0;
      self.seek(t);
      if ((dir > 0 && t >= self.dur) || (dir < 0 && t <= 0)) {
        if (o.loop) { self.time = 0; } else { if (o.done) o.done(); return; }
      }
      requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
    return this;
  };
  TL.prototype.reverse = function (o) { o = o || {}; o.reverse = true; return this.play(o); };
  TL.prototype.restart = function (o) { this.seek(0); return this.play(o); };

  /* ---------- scroll driven ---------- */
  function edge(str, size) {
    return str === 'top' ? 0 : str === 'bottom' ? size : str === 'center' ? size / 2 : parseFloat(str) / 100 * size;
  }
  function range(el, start, end) {
    var y0 = docTop(el), h = el.offsetHeight, vh = window.innerHeight;
    var calc = function (s) { var p = s.split(' '); return y0 + edge(p[0], h) - edge(p[1], vh); };
    var max = Math.max(1, document.documentElement.scrollHeight - vh);
    var a = Math.max(0, Math.min(max, calc(start)));
    var b = Math.max(a + 1, Math.min(max, calc(end)));
    return [a, b];
  }
  function docTop(el) {
    var y = 0;
    while (el) { y += el.offsetTop; el = el.offsetParent; }
    return y;
  }
  var scrubs = [], triggers = [];
  function scrub(el, o, build) {
    el = one(el);
    if (!el) return;
    scrubs.push({ el: el, o: o, build: build });
  }
  function onEnter(el, start, fn) {
    el = one(el);
    if (el) triggers.push({ el: el, start: start, fn: fn });
  }
  function matchQ(o) { return !o.mq || window.matchMedia(o.mq).matches; }
  function measure() {
    scrubs.forEach(function (s) {
      if (!s.tl) return;
      s.r = range(s.el, s.o.start, s.o.end);
    });
    triggers.forEach(function (t) {
      var p = t.start.split(' ');
      t.y = docTop(t.el) + edge(p[0], t.el.offsetHeight) - edge(p[1], window.innerHeight);
      t.y = Math.min(t.y, document.documentElement.scrollHeight - window.innerHeight - 2);
    });
  }
  function buildAll() {
    scrubs.forEach(function (s) {
      s.tl = null;
      if (!matchQ(s.o)) return;
      var tl = new TL();
      s.build(tl);
      s.tl = tl;
      s.p = null;
    });
    measure();
    scrubs.forEach(function (s) {
      if (!s.tl) return;
      s.p = prog(s);
      s.tl.seek(s.p * s.tl.dur);
    });
  }
  function prog(s) { return Math.max(0, Math.min(1, (window.scrollY - s.r[0]) / (s.r[1] - s.r[0]))); }
  var last = performance.now();
  function frame(now) {
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    for (var i = 0; i < scrubs.length; i++) {
      var s = scrubs[i];
      if (!s.tl) continue;
      var tgt = prog(s);
      if (Math.abs(tgt - s.p) < 0.00002) { if (s.p !== tgt) { s.p = tgt; s.tl.seek(tgt * s.tl.dur); } continue; }
      s.p = reduced ? tgt : s.p + (tgt - s.p) * (1 - Math.exp(-dt * 4.2 / (s.o.scrub || 1)));
      s.tl.seek(s.p * s.tl.dur);
    }
    for (i = triggers.length - 1; i >= 0; i--) {
      if (window.scrollY >= triggers[i].y) { var t = triggers.splice(i, 1)[0]; t.fn(); }
    }
    requestAnimationFrame(frame);
  }

  /* ---------- text splitting ---------- */
  var splits = [];
  function split(el, type, mask) {
    if (el._split) return el._split;
    var s = { el: el, type: type, html: el.innerHTML };
    el._split = s;
    /* letters would be read one by one: give headings and links a spoken label */
    var lab = type !== 'chars' ? null : /^H\d$/.test(el.tagName) ? el : el.closest('a');
    if (lab && !lab.getAttribute('aria-label') && !el.querySelector('a')) lab.setAttribute('aria-label', el.textContent.replace(/\s+/g, ' ').trim());
    s.quiet = !!lab;
    splits.push(s);
    doSplit(s, mask !== false);
    return s;
  }
  function doSplit(s, mask) {
    s.mask = mask;
    var el = s.el, words = [];
    s.units = [];
    (function walk(node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) {
          var frag = document.createDocumentFragment();
          c.textContent.split(/(\s+)/).forEach(function (w) {
            if (!w) return;
            if (/^\s+$/.test(w)) { frag.appendChild(document.createTextNode(' ')); return; }
            var sp = document.createElement('span');
            sp.className = 'sw';
            if (s.quiet) sp.setAttribute('aria-hidden', 'true');
            if (s.type === 'chars') {
              Array.from(w).forEach(function (ch) {
                var m = document.createElement('span'), i = document.createElement('span');
                m.className = mask ? 'sm' : 'sn'; i.className = 'sc'; i.textContent = ch;
                m.appendChild(i); sp.appendChild(m); s.units.push(i);
              });
            } else { sp.textContent = w; }
            words.push(sp);
            frag.appendChild(sp);
          });
          c.parentNode.replaceChild(frag, c);
        } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
      });
    })(el);
    if (s.type === 'words') s.units = words;
    if (s.type === 'lines') {
      var lines = [], top = null;
      words.forEach(function (w) {
        if (top === null || Math.abs(w.offsetTop - top) > 4) { lines.push([]); top = w.offsetTop; }
        lines[lines.length - 1].push(w.textContent);
      });
      el.innerHTML = '';
      lines.forEach(function (l) {
        var m = document.createElement('span'), i = document.createElement('span');
        m.className = 'lm'; i.className = 'sl'; i.textContent = l.join(' ');
        m.appendChild(i); el.appendChild(m); s.units.push(i);
      });
    }
  }
  function resplit() {
    splits.forEach(function (s) {
      if (s.type !== 'lines') return;
      s.el.innerHTML = s.html;
      doSplit(s, s.mask);
    });
  }
  /* units of a split, marked as scroll driven */
  function units(sel, type) {
    var out = [];
    list(sel).forEach(function (el) { var s = split(el, type); s.scrubbed = true; out = out.concat(s.units); });
    return out;
  }

  /* ---------- smooth scroll ---------- */
  var scroller = { y: window.scrollY, locked: false, stop: function () {} };
  function maxScroll() { return Math.max(0, document.documentElement.scrollHeight - window.innerHeight); }
  /* an element between the target and the page that can still scroll in this direction */
  function innerScroll(n, d) {
    while (n && n !== document.body && n !== document.documentElement && n.nodeType === 1) {
      if (n.hasAttribute('data-native-scroll')) return true;
      if (n.scrollHeight > n.clientHeight + 2) {
        var oy = getComputedStyle(n).overflowY;
        if (oy === 'auto' || oy === 'scroll' || n.tagName === 'TEXTAREA') {
          if (d < 0 ? n.scrollTop > 0 : n.scrollTop + n.clientHeight < n.scrollHeight - 1) return true;
        }
      }
      n = n.parentNode;
    }
    return false;
  }
  /* while locked (preloader, page exit) no input may move the page */
  var KEYS = { ' ': 1, PageUp: 1, PageDown: 1, End: 1, Home: 1, ArrowUp: 1, ArrowDown: 1 };
  window.addEventListener('keydown', function (e) {
    if (!scroller.locked || !KEYS[e.key]) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
  });
  window.addEventListener('touchmove', function (e) { if (scroller.locked && e.cancelable) e.preventDefault(); }, { passive: false });
  window.addEventListener('wheel', function (e) { if (scroller.locked && !e.ctrlKey) e.preventDefault(); }, { passive: false });

  function smooth() {
    if (reduced || window.matchMedia('(hover: none)').matches) return;
    var from = 0, to = window.scrollY, t0 = 0, running = false, D = 1200, lastSet = -1;
    var ez = function (t) { return 1 - Math.pow(1 - t, 5); };
    window.addEventListener('wheel', function (e) {
      if (e.ctrlKey || scroller.locked) return;
      /* horizontal swipes (trackpad, shift+wheel) stay native: back/forward gestures, side scrollers */
      if (e.shiftKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
      var d = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? window.innerHeight : 1);
      if (!d) return;
      /* a scrollable panel under the cursor scrolls itself */
      if (innerScroll(e.target, d)) return;
      var max = maxScroll(), y = window.scrollY;
      if (!running) to = y;
      /* already at the edge: let the wheel through so an embedding page (iframe) can scroll */
      if (!running && (d < 0 ? y <= 0 : y >= max - 1)) return;
      e.preventDefault();
      to = Math.max(0, Math.min(max, to + d));
      from = y;
      t0 = performance.now();
      if (!running) { running = true; lastSet = -1; requestAnimationFrame(tick); }
    }, { passive: false });
    function stop() { running = false; }
    scroller.stop = stop;
    window.addEventListener('mousedown', stop);
    window.addEventListener('keydown', stop);
    window.addEventListener('touchstart', stop, { passive: true });
    /* anything else moved the page (scrollbar, find in page, focus, anchor): hand control back */
    window.addEventListener('scroll', function () {
      if (running && lastSet >= 0 && Math.abs(window.scrollY - lastSet) > 3) running = false;
    }, { passive: true });
    function tick(now) {
      if (!running) return;
      var p = Math.min(1, Math.max(0, (now - t0) / D));
      /* the page can get shorter while animating (resize, layout): stay inside it */
      var y = Math.min(maxScroll(), from + (to - from) * ez(p));
      window.scrollTo(0, y);
      lastSet = window.scrollY;
      if (p < 1) requestAnimationFrame(tick); else running = false;
    }
  }

  /* ---------- helpers ---------- */
  function one(s) { return typeof s === 'string' ? document.querySelector(s) : s; }
  function list(s) {
    if (!s) return [];
    if (typeof s === 'string') return Array.prototype.slice.call(document.querySelectorAll(s));
    if (s.nodeType) return [s];
    return Array.prototype.slice.call(s);
  }

  var width = window.innerWidth, rt;
  window.addEventListener('resize', function () {
    clearTimeout(rt);
    rt = setTimeout(function () {
      if (window.innerWidth !== width) {
        width = window.innerWidth;
        scrubs.forEach(function (s) {
          if (!s.tl) return;
          s.tl.tracks.forEach(function (t) {
            t.el.style.transform = ''; t.el.style.opacity = ''; t.el.style.backgroundColor = ''; t.el.style.height = '';
            t.el._m = null;
          });
          s.tl.calls.forEach(function (c) { if (c.on) c.fn(false); });
        });
        resplit();
        buildAll();
      } else measure();
    }, 180);
  });

  window.M = {
    reduced: reduced, ease: ease, TL: TL, scrub: scrub, onEnter: onEnter, split: split, units: units,
    smooth: smooth, one: one, list: list, measure: measure, scroller: scroller,
    tl: function () { return new TL(); },
    start: function () {
      buildAll();
      requestAnimationFrame(frame);
      window.addEventListener('load', measure);
      if (window.ResizeObserver) new ResizeObserver(function () { measure(); }).observe(document.body);
    }
  };
})();
