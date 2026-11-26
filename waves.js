// ASCII ocean footer for the home page, drawn in a dense ink ramp (" .:*IVFN") like old ASCII art prints.
// The front swell is a 1D fluid surface: move the mouse through it to push the water around, press and
// drag (or drag a finger) to pull the water up with you, and click or tap to splash. It also exposes window.ocean so the GitHub
// graph (contrib.js) can read the water line and call up swells that reach into it.
(function () {
  var sea = document.getElementById("ocean");
  if (!sea) return;
  var screen = sea.querySelector("pre");

  var RAMP = " .:*IVFN";
  var ROWS = 40;     // grows with the footer's height (it fills the space on phones)
  var REF_ROWS = 40;  // the fade is measured against the normal height so a taller sea keeps the same look
  var FPS = 24;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // back to front. ink = how dark the water is; lift = how much higher the sea sits at the left edge
  var LAYERS = [
    { base: 15, amp: 2.4, k: 0.085, w: 0.7, ink: 0.42, phase: 0.0, lift: 10, sim: 0.25 },
    { base: 23, amp: 4.0, k: 0.06, w: 0.95, ink: 0.52, phase: 2.1, lift: 15, sim: 0.55 },
    { base: 31, amp: 6.5, k: 0.042, w: 1.2, ink: 0.62, phase: 4.4, lift: 20, sim: 1 }
  ];
  var FRONT = LAYERS[LAYERS.length - 1];

  var cols = 0, t = 0, spray = [], swells = [], lastFront = null;
  var h = new Float32Array(0), v = new Float32Array(0); // simulated surface offset (rows, + is down)

  function hash(x, y) {
    var n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function noise(x, y) {
    var i = Math.floor(x), f = x - i;
    f = f * f * (3 - 2 * f);
    return hash(i, y) * (1 - f) + hash(i + 1, y) * f;
  }
  function swell(s) { var q = (s + 1) / 2; return 2 * q * q - 1; } // sharp crests, flat troughs
  function leftness(x) { return Math.pow(1 - Math.max(0, Math.min(1, x / cols)), 1.4); }
  function simAt(x) {
    var i = Math.max(0, Math.min(cols - 1, Math.round(x)));
    return h[i] || 0;
  }

  function rest(L, x) { return L.base - L.lift * leftness(x); }
  function surface(L, x) {
    var left = leftness(x), p = x * L.k, q = t * L.w;
    var wave = 0.62 * swell(Math.sin(p - q + L.phase))
      + 0.28 * swell(Math.sin(p * 2.3 + q * 1.4 + L.phase * 1.7))
      + 0.1 * Math.sin(p * 5.7 - q * 2.6);
    return rest(L, x) - L.amp * (0.7 + 0.6 * left) * wave + simAt(x) * L.sim;
  }

  // ---------- fluid surface ----------
  function stepSim(dt) {
    var n = cols, sub = 3, d = dt / sub;
    for (var s = 0; s < sub; s++) {
      for (var i = 0; i < n; i++) {
        var l = h[i > 0 ? i - 1 : 0], r = h[i < n - 1 ? i + 1 : n - 1];
        v[i] += (140 * (l + r - 2 * h[i]) - 4 * h[i]) * d;
        v[i] *= 0.99;
      }
      for (i = 0; i < n; i++) h[i] = Math.max(-40, Math.min(16, h[i] + v[i] * d));
      // a touch of smoothing keeps neighbouring columns from tearing apart
      for (i = 1; i < n - 1; i++) h[i] += (h[i - 1] + h[i + 1] - 2 * h[i]) * 0.08;
    }
  }

  function push(x, amount, radius) {
    var r = Math.ceil(radius * 2.5);
    for (var i = Math.max(0, Math.floor(x - r)); i <= Math.min(cols - 1, Math.ceil(x + r)); i++) {
      var g = Math.exp(-((i - x) * (i - x)) / (2 * radius * radius));
      v[i] += amount * g;
    }
  }

  function splash(x, y, count, speed) {
    for (var i = 0; i < count; i++) {
      spray.push({
        x: x + (Math.random() - 0.5) * 4, y: y,
        vx: (Math.random() - 0.5) * speed * 2.5, vy: -(speed * 0.5 + Math.random() * speed)
      });
    }
  }

  // ---------- drawing ----------
  function shade(L, x, r, s, slope) {
    var d = r - s;
    var crest = Math.max(0, (rest(L, x) - s) / L.amp); // 0 in troughs, ~1+ at peaks
    var ink = L.ink * (0.8 + 0.35 * (1 - Math.exp(-d * 0.2)));    // a little darker with depth
    ink += 0.3 * Math.exp(-d * 1.3);                               // inked outline along the surface
    ink -= 0.8 * crest * crest * Math.exp(-d * 0.55);              // white water on the crests
    ink -= slope * 0.22 * Math.exp(-d * 0.4);                      // light from the left
    ink += (noise(x * 0.11 - t * L.w * 3, r) - 0.5) * 0.42;        // drifting streaks
    ink += (noise(x * 0.5 + t * 2, r * 3.1) - 0.5) * 0.16;         // fine chop
    if (d < 1.6 && hash(Math.floor(x), Math.floor(t * 8) + r) < 0.14 * crest) ink = 0.04; // glints
    return ink;
  }

  var lineH = 8;
  function measure() {
    var probe = document.createElement("span");
    probe.textContent = "M".repeat(40);
    screen.appendChild(probe);
    var r = probe.getBoundingClientRect();
    screen.removeChild(probe);
    lineH = parseFloat(getComputedStyle(screen).lineHeight) || 8;
    return r.width / 40 || 5;
  }

  function layout() {
    var n = Math.max(40, Math.ceil(sea.clientWidth / measure()));
    ROWS = Math.max(REF_ROWS, Math.ceil(sea.clientHeight / lineH));
    if (n === cols) return;
    var nh = new Float32Array(n), nv = new Float32Array(n);
    nh.set(h.subarray(0, Math.min(n, h.length)));
    nv.set(v.subarray(0, Math.min(n, v.length)));
    h = nh; v = nv; cols = n;
  }

  function render() {
    var surf = LAYERS.map(function (L) {
      var a = new Float32Array(cols + 2);
      for (var x = -1; x <= cols; x++) a[x + 1] = surface(L, x);
      return a;
    });
    lastFront = surf[surf.length - 1];
    var lines = [];
    for (var r = 0; r < ROWS; r++) {
      var line = "";
      for (var x = 0; x < cols; x++) {
        // stay quiet at the top: the sky stipple fades out completely, the water only a little
        var u = r / (REF_ROWS * 0.92);
        var fade = u >= 1 ? 1 : u * u * (3 - 2 * u);
        var sky = Math.max(0, Math.min(1, (r - 2) / 27));
        // sky: a fine stipple of : and .
        var ink = (0.3 + (hash(x, r) - 0.5) * 0.1) * sky * sky * (3 - 2 * sky);
        for (var li = 0; li < LAYERS.length; li++) {
          var s = surf[li][x + 1], d = r - s;
          if (d <= -1) continue;
          var cov = Math.min(1, 1 + d);
          ink = ink * (1 - cov) + shade(LAYERS[li], x, r, s, surf[li][x + 2] - surf[li][x]) * cov * Math.max(0.75, fade);
        }
        ink = Math.max(0, Math.min(0.999, ink));
        line += RAMP[Math.floor(ink * RAMP.length)];
      }
      lines.push(line);
    }
    spray.forEach(function (p) {
      var px = Math.round(p.x), py = Math.round(p.y);
      if (px < 0 || px >= cols || py < 0 || py >= ROWS) return;
      lines[py] = lines[py].slice(0, px) + (p.vy < 0 ? "'" : ".") + lines[py].slice(px + 1);
    });
    screen.textContent = lines.join("\n");
  }

  function step(dt) {
    t += dt;
    // swells called up by the graph: lift the water until it reaches the line it was asked for
    swells = swells.filter(function (w) {
      if (t > w.until || surface(FRONT, w.x) <= w.row) return false;
      push(w.x, -1100 * dt, 5);
      return true;
    });
    // pressing and dragging pulls the water at the pointer towards it, like scooping it up
    if (grab && grab.c) {
      var R = 7;
      for (var j = Math.max(0, Math.floor(grab.c.x - R * 2)); j <= Math.min(cols - 1, Math.ceil(grab.c.x + R * 2)); j++) {
        var g = Math.exp(-((j - grab.c.x) * (j - grab.c.x)) / (2 * R * R));
        var want = Math.max(1, grab.c.y) - surface(FRONT, j);
        v[j] += want * 160 * g * dt;
        v[j] *= 1 - 0.12 * g;
      }
    }
    stepSim(dt);
    // fast-rising water throws off spray
    for (var i = 1; i < cols - 1; i += 2) {
      if (v[i] < -26 && Math.random() < 0.06) splash(i, surface(FRONT, i) - 1, 2, 10);
    }
    spray.forEach(function (p) {
      p.vy += 40 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    });
    spray = spray.filter(function (p) { return p.vy < 0 || p.y < surface(FRONT, p.x); });
    if (spray.length > 300) spray.splice(0, spray.length - 300);
  }

  // ---------- input ----------
  function cell(e) {
    var r = screen.getBoundingClientRect();
    return { x: (e.clientX - r.left) / (r.width / cols), y: (e.clientY - r.top) / (r.height / ROWS) };
  }

  var lastPt = null;
  sea.addEventListener("pointermove", function (e) {
    if (reduce) return;
    var c = cell(e);
    if (lastPt && lastPt.id === e.pointerId) {
      var dx = c.x - lastPt.x, dy = c.y - lastPt.y;
      var s = surface(FRONT, c.x);
      // only water near or under the pointer reacts: like dragging a hand through it
      if (c.y > s - 8) {
        var depth = Math.min(1, Math.max(0.5, (c.y - s + 8) / 10));
        push(c.x, Math.max(-110, Math.min(110, dy * 26 + Math.abs(dx) * 7)) * depth, 4.5);
        push(c.x + Math.sign(dx) * 6, -Math.min(90, Math.abs(dx) * 5) * depth, 5); // bow wave ahead of the motion
        if (Math.abs(dx) > 0.8 && Math.random() < 0.7) splash(c.x, s - 1, 3 + Math.round(Math.abs(dx)), 14);
      }
    }
    lastPt = { id: e.pointerId, x: c.x, y: c.y };
  });
  sea.addEventListener("pointerleave", function () { if (!grab) lastPt = null; });

  var grab = null;
  sea.addEventListener("pointerdown", function (e) {
    if (reduce || (e.pointerType === "mouse" && e.button !== 0)) return;
    var c = cell(e);
    grab = { id: e.pointerId, c: c, x0: e.clientX, y0: e.clientY, moved: false };
    sea.setPointerCapture(e.pointerId);
    e.preventDefault();
  });
  sea.addEventListener("pointermove", function (e) {
    if (!grab || grab.id !== e.pointerId) return;
    grab.c = cell(e);
    if (Math.hypot(e.clientX - grab.x0, e.clientY - grab.y0) > 6) grab.moved = true;
  });
  function release(e) {
    if (!grab || grab.id !== e.pointerId) return;
    var c = grab.c, moved = grab.moved;
    grab = null;
    if (e.pointerType !== "mouse") lastPt = null;
    if (moved) {
      splash(c.x, surface(FRONT, c.x) - 1, 24, 20); // let go: it crashes back down
    } else if (e.type === "pointerup") {
      push(c.x, 80, 4.5);                          // a plain click or tap splashes
      splash(c.x, surface(FRONT, c.x) - 1, 60, 26);
    }
  }
  sea.addEventListener("pointerup", release);
  sea.addEventListener("pointercancel", release);

  // ---------- for the GitHub graph ----------
  window.ocean = {
    // where the front water line is right now, in client pixels
    snapshot: function () {
      if (!lastFront || !cols) return null;
      var r = screen.getBoundingClientRect();
      return {
        left: r.left, top: r.top, cols: cols,
        cw: r.width / cols, rh: r.height / ROWS,
        surf: lastFront.subarray(1, cols + 1), v: v
      };
    },
    splash: function (clientX, n) {
      var r = screen.getBoundingClientRect(), x = (clientX - r.left) / (r.width / cols);
      splash(x, surface(FRONT, x) - 1, n || 3, 12);
    },
    // raise a swell under clientX until its crest reaches clientY
    swell: function (clientX, clientY) {
      if (reduce || !cols) return;
      var r = screen.getBoundingClientRect();
      var x = (clientX - r.left) / (r.width / cols);
      var row = Math.max(1, (clientY - r.top) / (r.height / ROWS));
      swells.push({ x: x, row: row, until: t + 1.4 });
    }
  };

  // ---------- loop ----------
  var running = false, last = 0, prev = 0;
  function loop(ts) {
    if (!running) return;
    // hold still while the photo view is open over the page
    if (document.documentElement.classList.contains("photo-open")) { prev = 0; requestAnimationFrame(loop); return; }
    if (ts - last >= 1000 / FPS) {
      step(prev ? Math.min(0.08, (ts - prev) / 1000) : 1 / FPS);
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
