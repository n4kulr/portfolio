// GitHub contribution graph. On the projects page at desktop widths, and under the home-page
// links on a phone. A public API mirrors github.com/<user>'s calendar.
(function () {
  var root = document.getElementById("contrib");
  if (!root) return;
  var phone = window.matchMedia("(max-width: 600px)").matches;
  if (root.classList.contains("home-contrib") && !phone) return;
  if (!root.classList.contains("home-contrib") && phone) return;
  var user = root.dataset.user;
  var grid = root.querySelector(".contrib-grid");
  var months = root.querySelector(".contrib-months");
  var total = root.querySelector(".contrib-total");
  var scroller = root.querySelector(".contrib-scroll");
  var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // empty grid first so the page doesn't jump when the data arrives
  function blank() {
    var frag = document.createDocumentFragment();
    for (var i = 0; i < 53 * 7; i++) {
      var c = document.createElement("span");
      c.className = "contrib-cell";
      frag.appendChild(c);
    }
    grid.appendChild(frag);
  }
  blank();

  function parse(d) { var p = d.split("-"); return new Date(+p[0], +p[1] - 1, +p[2]); }

  fetch("https://github-contributions-api.jogruber.de/v4/" + encodeURIComponent(user) + "?y=last")
    .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(function (data) {
      var days = data.contributions || [];
      if (!days.length) throw new Error("empty");
      grid.textContent = "";
      months.textContent = "";

      // pad so the first column starts on a Sunday, like GitHub's graph
      var pad = parse(days[0].date).getDay();
      var cells = [];
      for (var i = 0; i < pad; i++) cells.push(null);
      cells = cells.concat(days);
      var weeks = Math.ceil(cells.length / 7);
      grid.style.setProperty("--weeks", weeks);
      months.style.setProperty("--weeks", weeks);

      var frag = document.createDocumentFragment();
      cells.forEach(function (day) {
        var c = document.createElement("span");
        c.className = "contrib-cell";
        if (day) c.dataset.level = day.level;
        else c.style.visibility = "hidden";
        frag.appendChild(c);
      });
      grid.appendChild(frag);

      // month labels over the first week that starts in each month
      var last = -1;
      for (var w = 0; w < weeks; w++) {
        var day = cells[w * 7] || cells[w * 7 + 6];
        if (!day) continue;
        var m = parse(day.date).getMonth();
        if (m !== last && (w > 0 || pad === 0)) {
          var s = document.createElement("span");
          s.textContent = MONTHS[m].toLowerCase();
          s.style.gridColumn = String(w + 1);
          s.style.gridRow = "1";
          months.appendChild(s);
        }
        last = m;
      }

      var n = data.total && (data.total.lastYear != null ? data.total.lastYear : null);
      if (n == null) n = days.reduce(function (a, d) { return a + d.count; }, 0);
      if (total) total.textContent = n.toLocaleString() + " contributions in the last year";
      if (scroller.scrollWidth > scroller.clientWidth + 4) scroller.scrollLeft = scroller.scrollWidth;
    })
    .catch(function () {
      if (total) total.textContent = "couldn't load contributions right now";
    });
})();
