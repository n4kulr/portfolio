// GitHub contribution graph on the home page, from a public API that mirrors github.com/<user>'s calendar.
// It sits under the links, a few months wide, and scrolls sideways (wheel or drag on PC, swipe on a phone).
// The ocean (waves.js) reaches up into it now and then: squares the water touches darken, then dry.
(function () {
  var root = document.getElementById("contrib");
  if (!root) return;
  var user = root.dataset.user;
  var grid = root.querySelector(".contrib-grid:not(.contrib-ghost)");
  var ghost = root.querySelector(".contrib-ghost"); // empty rows under the graph that fade away
  var GHOST_ROWS = 6;
  var months = root.querySelector(".contrib-months");
  var total = root.querySelector(".contrib-total");
  var scroller = root.querySelector(".contrib-scroll");
  var MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cells = [], weeks = 53, pad = 0, days = [];

  function parse(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  function build(list) {
    grid.textContent = "";
    cells = [];
    var frag = document.createDocumentFragment();
    list.forEach(function (day) {
      var c = document.createElement("span");
      c.className = "contrib-cell";
      if (day) c.dataset.level = day.level;
      else if (day === null) c.style.visibility = "hidden";
      frag.appendChild(c);
      if (day !== null) cells.push({ el: c, x: 0, bottom: 0, wet: 0 });
    });
    grid.appendChild(frag);

    if (ghost) {
      ghost.textContent = "";
      var g = document.createDocumentFragment();
      var n = Math.ceil(list.length / 7) * GHOST_ROWS;
      for (var i = 0; i < n; i++) {
        var e = document.createElement("span");
        e.className = "contrib-cell";
        g.appendChild(e);
        cells.push({ el: e, x: 0, bottom: 0, wet: 0 });
      }
      ghost.appendChild(g);
    }
  }

  function labels() {
    months.textContent = "";
    if (!days.length) return;
    var all = [];
    for (var i = 0; i < pad; i++) all.push(null);
    all = all.concat(days);
    var last = -1;
    for (var w = 0; w < weeks; w++) {
      var day = all[w * 7] || all[w * 7 + 6];
      if (!day) continue;
      var m = parse(day.date).getMonth();
      if (m !== last && (w > 0 || pad === 0)) {
        var s = document.createElement("span");
        s.textContent = MONTHS[m];
        s.style.gridColumn = String(w + 1);
        s.style.gridRow = "1";
        months.appendChild(s);
      }
      last = m;
    }
  }

  function layout() {
    grid.style.setProperty("--weeks", weeks);
    if (ghost) ghost.style.setProperty("--weeks", weeks);
    months.style.setProperty("--weeks", weeks);
    labels();
    measure();
  }

  // cache where each cell sits (in page coordinates, ignoring the water's nudges);
  // cells scrolled out of view are left alone
  function measure() {
    var sx = window.scrollX, sy = window.scrollY;
    var view = scroller.getBoundingClientRect();
    cells.forEach(function (c) {
      var r = c.el.getBoundingClientRect();
      c.x = r.left + r.width / 2 + sx;
      c.bottom = r.bottom + sy;
      c.off = r.right < view.left || r.left > view.right;
    });
  }

  // placeholder grid so the page doesn't jump while the data loads
  var blank = [];
  for (var i = 0; i < 53 * 7; i++) blank.push(undefined);
  build(blank);
  layout();

  fetch("https://github-contributions-api.jogruber.de/v4/" + encodeURIComponent(user) + "?y=last")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      days = data.contributions || [];
      if (!days.length) throw new Error("empty");
      // pad so each week starts on a Sunday, like GitHub's graph
      pad = parse(days[0].date).getDay();
      var list = [];
      for (var i = 0; i < pad; i++) list.push(null);
      list = list.concat(days);
      weeks = Math.ceil(list.length / 7);
      build(list);
      layout();
      var n = data.total && data.total.lastYear != null ? data.total.lastYear : days.reduce(function (a, d) { return a + d.count; }, 0);
      if (total) total.textContent = n.toLocaleString() + " contributions in the last year";
      if (scroller.scrollWidth > scroller.clientWidth + 4) scroller.scrollLeft = scroller.scrollWidth;
    })
    .catch(function () {
      if (total) total.textContent = "couldn't load contributions right now";
    });

  window.addEventListener("resize", layout);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(layout);
  scroller.addEventListener("scroll", measure, { passive: true });

  // PC: no scrollbar, so the wheel and a click-drag move through the months
  scroller.addEventListener("wheel", function (e) {
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
    var max = scroller.scrollWidth - scroller.clientWidth;
    if ((e.deltaY < 0 && scroller.scrollLeft <= 0) || (e.deltaY > 0 && scroller.scrollLeft >= max - 1)) return;
    e.preventDefault();
    scroller.scrollLeft += e.deltaY;
  }, { passive: false });
  var drag = null;
  scroller.addEventListener("pointerdown", function (e) {
    if (e.pointerType !== "mouse") return;
    drag = { x: e.clientX, left: scroller.scrollLeft };
    scroller.setPointerCapture(e.pointerId);
    scroller.classList.add("is-dragging");
  });
  scroller.addEventListener("pointermove", function (e) {
    if (drag) scroller.scrollLeft = drag.left - (e.clientX - drag.x);
  });
  function endDrag() { drag = null; scroller.classList.remove("is-dragging"); }
  scroller.addEventListener("pointerup", endDrag);
  scroller.addEventListener("pointercancel", endDrag);

  // ---------- the sea reaching in ----------
  if (reduce) return;
  var REACH = 26, visible = true, nextSwell = performance.now() + 3500;
  new IntersectionObserver(function (e) { visible = e[0].isIntersecting; }).observe(root);

  function tick(now) {
    requestAnimationFrame(tick);
    var sea = window.ocean;
    if (!visible || !sea || !cells.length) return;
    var snap = sea.snapshot();
    if (!snap) return;
    var sx = window.scrollX, sy = window.scrollY;

    // every so often a swell rolls up under the graph and reaches into it
    if (now > nextSwell) {
      nextSwell = now + 7000 + Math.random() * 6000;
      var gr = scroller.getBoundingClientRect();
      sea.swell(gr.left + gr.width * (0.15 + Math.random() * 0.7), gr.bottom - Math.random() * Math.min(40, gr.height * 0.4));
    }

    for (var i = 0; i < cells.length; i++) {
      var c = cells[i];
      if (c.off) continue;
      var x = c.x - sx, bottom = c.bottom - sy;
      var col = (x - snap.left) / snap.cw;
      if (col < 0 || col >= snap.cols) continue;
      var water = snap.top + snap.surf[Math.round(col)] * snap.rh;
      var gap = water - bottom; // > 0: the water is still below this cell
      // the water soaks the squares it reaches: they darken with ink, then slowly dry
      var soak = gap < 0 ? 1 : gap < REACH ? 0.45 * (1 - gap / REACH) : 0;
      if (gap < 0 && c.wet < 0.6) sea.splash(x, 2);
      var w = soak > c.wet ? c.wet + (soak - c.wet) * 0.35 : c.wet * 0.975;
      if (w < 0.01) w = 0;
      if (Math.abs(w - c.wet) > 0.004 || (w === 0 && c.wet !== 0)) {
        c.el.style.setProperty("--wet", w.toFixed(3));
      }
      c.wet = w;
    }
  }
  requestAnimationFrame(tick);
})();
