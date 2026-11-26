// ASCII ocean footer for the home page: three layers of shaded swell drawn with a brightness ramp.
// Move the mouse across it to stir the water, click to splash.
(function () {
  var sea = document.getElementById("ocean");
  if (!sea) return;
  var screen = sea.querySelector("pre");

  var RAMP = " .:-=+*#%@";
  var ROWS = 34;
  var FPS = 20;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // back to front
  var LAYERS = [
    { base: 9, amp: 2.4, k: 0.085, w: 0.7, light: 0.3, phase: 0.0 },
    { base: 16, amp: 4.0, k: 0.06, w: 0.95, light: 0.5, phase: 2.1 },
    { base: 24, amp: 6.5, k: 0.042, w: 1.2, light: 0.72, phase: 4.4 }
  ];
  var FRONT = LAYERS[LAYERS.length - 1];

  var cols = 0, t = 0, ripples = [], spray = [];

  function hash(x, y) {
    var h = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return h - Math.floor(h);
  }
  function noise(x, y) {
    var i = Math.floor(x), f = x - i;
    f = f * f * (3 - 2 * f);
    return hash(i, y) * (1 - f) + hash(i + 1, y) * f;
  }

  function swell(s) { var v = (s + 1) / 2; return 2 * v * v - 1; } // sharp crests, flat troughs

  function surface(L, x) {
    var p = x * L.k, q = t * L.w;
    var h = 0.62 * swell(Math.sin(p - q + L.phase))
      + 0.28 * swell(Math.sin(p * 2.3 + q * 1.4 + L.phase * 1.7))
      + 0.1 * Math.sin(p * 5.7 - q * 2.6);
    var s = L.base - L.amp * h;
    if (L === FRONT) {
      for (var i = 0; i < ripples.length; i++) {
        var r = ripples[i], age = t - r.t0, dx = Math.abs(x - r.x);
        s += r.amp * Math.exp(-age * 1.3) * Math.cos(dx * 0.35 - age * 6) * Math.exp(-dx / (6 + age * 22));
      }
    }
    return s;
  }

  function shade(L, x, r, s, slope) {
    var d = r - s;
    var crest = Math.max(0, (L.base - s) / L.amp); // 0 in troughs, ~1 at peaks
    var b = L.light * Math.exp(-d * 0.16) - 0.12;                   // fades to blank with depth
    b += 0.28 * Math.exp(-d * 1.4);                                  // bright rim on the surface
    b += 0.75 * crest * crest * Math.exp(-d * 0.6);                  // foam on the crests
    b += -slope * 0.3 * Math.exp(-d * 0.3);                          // lit from the left
    b += (noise(x * 0.12 - t * L.w * 3, r) - 0.5) * 0.22;            // drifting streaks
    if (d < 1.5 && hash(Math.floor(x), Math.floor(t * 6) + r) < 0.15 * crest) b += 0.4; // sparkle
    return b;
  }

  function measure() {
    var probe = document.createElement("span");
    probe.textContent = "M".repeat(40);
    screen.appendChild(probe);
    var cw = probe.getBoundingClientRect().width / 40 || 5;
    screen.removeChild(probe);
    return cw;
  }

  function layout() { cols = Math.max(40, Math.ceil(sea.clientWidth / measure())); }

  function render() {
    var surf = LAYERS.map(function (L) {
      var a = new Float32Array(cols + 2);
      for (var x = -1; x <= cols; x++) a[x + 1] = surface(L, x);
      return a;
    });
    var lines = [];
    for (var r = 0; r < ROWS; r++) {
      var line = "";
      for (var x = 0; x < cols; x++) {
        var v = 0;
        for (var li = 0; li < LAYERS.length; li++) {
          var s = surf[li][x + 1], d = r - s;
          if (d <= -1) continue;
          var cov = Math.min(1, 1 + d);
          v = v * (1 - cov) + shade(LAYERS[li], x, r, s, surf[li][x + 2] - surf[li][x]) * cov;
        }
        v = Math.max(0, Math.min(0.999, v));
        line += RAMP[Math.floor(v * RAMP.length)];
      }
      lines.push(line);
    }
    spray.forEach(function (p) {
      var px = Math.round(p.x), py = Math.round(p.y);
      if (px < 0 || px >= cols || py < 0 || py >= ROWS) return;
      var ch = p.vy < 0 ? (p.size > 0.5 ? "o" : "'") : (p.size > 0.5 ? "*" : ".");
      lines[py] = lines[py].slice(0, px) + ch + lines[py].slice(px + 1);
    });
    screen.textContent = lines.join("\n");
  }

  function step(dt) {
    t += dt;
    ripples = ripples.filter(function (r) { return t - r.t0 < 4; });
    spray.forEach(function (p) {
      p.vy += 40 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    spray = spray.filter(function (p) { return p.vy < 0 || p.y < surface(FRONT, p.x); });
  }

  function cell(e) {
    var r = screen.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (r.width / cols), y: (e.clientY - r.top) / (r.height / ROWS) };
  }

  var lastStir = 0;
  sea.addEventListener("pointermove", function (e) {
    if (reduce || t - lastStir < 0.1) return;
    var speed = Math.hypot(e.movementX, e.movementY);
    if (speed < 3) return;
    lastStir = t;
    ripples.push({ x: cell(e).x, t0: t, amp: Math.min(2.5, speed / 12) });
  });

  sea.addEventListener("click", function (e) {
    if (reduce) return;
    var c = cell(e);
    ripples.push({ x: c.x, t0: t, amp: 4.5 });
    var y = surface(FRONT, c.x) - 1;
    for (var i = 0; i < 40; i++) {
      spray.push({ x: c.x + (Math.random() - 0.5) * 6, y: y, vx: (Math.random() - 0.5) * 50, vy: -(14 + Math.random() * 22), size: Math.random() });
    }
  });

  var running = false, last = 0, prev = 0;
  function loop(ts) {
    if (!running) return;
    if (ts - last >= 1000 / FPS) {
      step(prev ? Math.min(0.1, (ts - prev) / 1000) : 1 / FPS);
      prev = ts;
      last = ts;
      render();
    }
    requestAnimationFrame(loop);
  }
  function start() { if (!running && !reduce) { running = true; prev = 0; requestAnimationFrame(loop); } }
  function stop() { running = false; }

  layout();
  render();
  new ResizeObserver(function () { layout(); render(); }).observe(sea);
  new IntersectionObserver(function (entries) {
    entries[0].isIntersecting ? start() : stop();
  }).observe(sea);
})();
