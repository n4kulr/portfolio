// CD shelf for the projects page: a row of jewel-case spines. Picking one slides it up and shows the project.
(function () {
  var row = document.getElementById("shelf-row");
  var detail = document.getElementById("cd-detail");
  if (!row || !detail) return;
  var shelf = row.parentElement;
  // PC: the rack starts centred; picking a CD slides it left and opens the project beside it
  var wide = window.matchMedia("(min-width: 861px)");

  var CDS = [
    {
      id: "guessify", name: "Guessify", link: "https://guessify.uk",
      image: "images/guessify-demo.png", alt: "Guessify gameplay preview",
      album: { title: "Blonde", artist: "Frank Ocean", spine: "images/spines/blonde.jpg" },
      desc: "Hear a few seconds of a song, name it before the timer runs out. Play solo, in a party room, or online against other people.",
      why: "i used to play guess-the-song games all the time as a kid, so this is my take on one. it's still my favourite kind of game.",
      tags: ["React", "Vite", "JavaScript", "PartyKit", "Cloudflare Workers", "Vercel"]
    },
    {
      id: "drawmethis", name: "drawmethis", link: "https://drawmethis.vercel.app/",
      image: "images/drawmethis-demo.jpg", alt: "drawmethis drawing page",
      album: { title: "Who Really Cares", artist: "TV Girl", spine: "images/spines/who-really-cares.jpg" },
      desc: "Sketch something in the browser, hit send, and it drops straight into a Discord channel.",
      why: "made so me and my friends could mess around sending each other drawings. no accounts, no app, just draw and send.",
      tags: ["React", "Vite", "GSAP", "Framer Motion", "Discord"]
    },
    {
      id: "outliner", name: "Outliner", link: "https://outliner-vert.vercel.app",
      image: "images/outliner-demo.jpg", alt: "Outliner month calendar with the course outline drop panel",
      album: { title: "Gemini Rights", artist: "Steve Lacy", spine: "images/spines/gemini-rights.jpg" },
      desc: "Drop in your UNSW course outlines and every assessment lands on one calendar, with week numbers worked out and an export to Google, Apple or Outlook.",
      why: "started as practice for AI automation, then turned out to be useful for real once i started my internship at Agent Genius.",
      tags: ["Next.js", "TypeScript", "React", "Tailwind CSS", "PDF parsing", "iCal"]
    },
    {
      id: "hitthatbeat", name: "hitthatbeat", link: "https://hitthatbeat.vercel.app",
      image: "images/hitthatbeat-demo.jpg", alt: "hitthatbeat home screen with the four note lanes",
      album: { title: "Speak Now", artist: "Taylor Swift", spine: "images/spines/speak-now.jpg" },
      desc: "Drop in any song and play it as a four-lane rhythm game, with charts from easy to expert built straight from the audio.",
      why: "made for my sister. she loves rhythm games like RoBeats on Roblox, so now any song she likes can be one.",
      tags: ["TypeScript", "Vite", "Vercel"]
    },
    {
      id: "linkedout", name: "LinkedOut", link: "https://linkedout-iota.vercel.app/",
      image: "images/linkedout-demo.jpg", alt: "LinkedOut feed of failure posts",
      album: { title: "Die Lit", artist: "Playboi Carti", spine: "images/spines/die-lit.jpg" },
      desc: "The opposite of LinkedIn — a social network for failures and rejections. Winner, UNSW Terrible Ideas Hackathon 2025.",
      why: "built with a team at UNSW's Terrible Ideas Hackathon, where the brief is to make a bad idea as well as you can. we flipped linkedin upside down and it won.",
      tags: ["Node.js", "Express", "PostgreSQL", "JavaScript", "Vercel"]
    },
    {
      id: "fotos", name: "fotos", link: "https://manjumedia.vercel.app",
      image: "images/fotos-demo.jpg", alt: "fotos album grid",
      album: { title: "Whole Lotta Red", artist: "Playboi Carti", spine: "images/spines/whole-lotta-red.jpg" },
      desc: "A private photo and video gallery that installs like an app, hidden behind a passcode lock screen.",
      why: "made for my mum. she's not that tech savvy, so instead of downloading every photo she can just open this and see all our family photos in one place.",
      tags: ["JavaScript", "PWA", "Cloudflare Workers", "sharp"]
    },
    {
      id: "secure-gate", name: "Secure Gate", year: "2026", course: "DESN2000",
      image: "images/nucleo.svg", alt: "STM32 Nucleo board illustration", svg: true,
      album: { title: "Goodbye & Good Riddance", artist: "Juice WRLD", spine: "images/spines/goodbye-good-riddance.jpg" },
      desc: "An access-control system on an STM32 Nucleo-F303RE — scan a card or type a code to open the gate, with an LCD, keypad, LEDs and a buzzer handling the feedback.",
      why: "it's a gate. scan a card or punch in a code and it decides whether you're getting in.",
      built: [
        "Written mostly in C on the F303RE's 72 MHz Cortex-M4, with about 10% hand-written in ARM assembly",
        "My part of the build: the PN532 RFID/NFC reader, a shift-register LED bank, the buzzer and the switches",
        "Got the card reader working by forking an existing PN532 driver and reading up on it enough to adapt it",
        "Keypad and LCD for entering codes and showing status, wired up over GPIO, interrupts, timers, UART, SPI and I2C"
      ],
      tags: ["C", "STM32", "ARM", "SPI", "I2C", "UART", "GPIO"]
    },
    {
      id: "toohak", name: "Toohak", year: "2025", course: "COMP1531",
      image: "images/itsquiz.svg", alt: "Quiz app illustration", svg: true,
      album: { title: "Certified Lover Boy", artist: "Drake", spine: "images/spines/certified-lover-boy.jpg" },
      desc: "A full-stack quiz app in the shape of Kahoot — build a quiz, host a session, players join and answer.",
      why: "the group project for COMP1531, UNSW's Software Engineering Fundamentals course. the whole term goes into building Toohak, a Kahoot-style quiz app, as a team, so it's as much about git workflows, code review, testing and working in sprints as it is about the code.",
      built: [
        "Built as a team in TypeScript and JavaScript, tracked on GitLab",
        "A REST API for creating quizzes, hosting sessions and scoring answers",
        "Login and persistent storage so quizzes and results stick around",
        "Worked in iterations with code review and tests, the way COMP1531 runs"
      ],
      tags: ["TypeScript", "JavaScript", "GitLab", "REST API", "Full Stack"]
    },
    {
      id: "gitavadi", name: "Gitavadi", year: "2025",
      image: "images/gitavadi.svg", alt: "Gitavadi illustration", svg: true,
      album: { title: "WRLD ON DRUGS", artist: "Future & Juice WRLD", spine: "images/spines/wrld-on-drugs.jpg" },
      desc: "A native iOS reader for the Bhagavad Gita — move through all 18 chapters and 700 verses.",
      why: "made for my mum again. she's religious and reads the Gita, so i built her a clean, simple way to read it on her phone. it was also my first proper go at Swift.",
      built: [
        "Swift and SwiftUI — my first native mobile app",
        "A clean reader for all 18 chapters and 700 verses, chapter by chapter",
        "Built the interface using SwiftUI's declarative UI framework"
      ],
      tags: ["Swift", "SwiftUI", "iOS"]
    },
    {
      id: "fire-rescue-robot", name: "Fire Rescue Robot", year: "2024", course: "DESN1000",
      image: "images/fire-rescue.svg", alt: "Robot illustration", svg: true,
      album: { title: "Eternal Atake", artist: "Lil Uzi Vert", spine: "images/spines/eternal-atake.jpg" },
      desc: "A first-year Arduino robot that homes in on a target with light sensors and picks it up with a servo arm.",
      built: [
        "Arduino and C, one of my first hardware builds",
        "Light sensors to find the target, servos to drive and to work the arm",
        "Team effort on the wiring, the mechanical design, and getting the pickup to actually grab"
      ],
      tags: ["Arduino", "C", "Sensors", "Servo Motors"]
    },
    {
      id: "about", name: "about me", about: true,
      image: "images/portrait.gif", alt: "Pixel portrait of Nakul", portrait: true,
      album: { title: "Playboi Carti", artist: "Playboi Carti", spine: "images/spines/playboi-carti.jpg" },
      desc: "Computer Engineering student at UNSW. I build webapps, embedded things and Arduino projects, and I like making the web feel a bit more physical.",
      built: [
        "Languages: Python, C, Swift, JavaScript, TypeScript, Lua, Assembly",
        "Into: webapps / embedded / arduino",
        "Currently: making this portfolio more interesting than it needs to be"
      ],
      links: [
        ["github", "https://github.com/n4kulr"],
        ["linkedin", "https://www.linkedin.com/in/nakul-rejeesh-a5498736b/"],
        ["email", "mailto:nakulrejeesh2005@gmail.com"]
      ],
      tags: []
    }
  ];

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }

  // ---------- spines ----------
  var buttons = CDS.map(function (cd, i) {
    var b = el("button", "cd");
    b.type = "button";
    b.id = "cd-" + cd.id;
    b.setAttribute("role", "tab");
    b.setAttribute("aria-controls", "cd-detail");
    b.setAttribute("aria-label", cd.name + " (" + cd.album.title + ", " + cd.album.artist + ")");
    b.title = cd.name;
    var spine = el("img");
    spine.src = cd.album.spine;
    spine.alt = "";
    spine.draggable = false;
    b.appendChild(spine);
    b.addEventListener("click", function () { select(i, true); });
    b.addEventListener("keydown", function (e) {
      var j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? CDS.length - 1 : -1;
      if (j < 0 || j >= CDS.length) return;
      e.preventDefault();
      select(j, true);
      buttons[j].focus();
    });
    row.appendChild(b);
    return b;
  });

  // ---------- detail ----------
  function render(cd, i) {
    detail.textContent = "";
    detail.setAttribute("aria-labelledby", "cd-" + cd.id);

    var info = el("div", "cd-info");
    info.appendChild(el("p", "cd-kicker", "track " + pad(i + 1) + (cd.course ? " · " + cd.course : "") + (cd.year ? " · " + cd.year : "")));
    info.appendChild(el("h3", "cd-title", cd.name));

    var shot = el("div", "cd-shot" + (cd.svg ? " is-svg" : "") + (cd.portrait ? " is-portrait" : ""));
    var img = el("img");
    img.src = cd.image;
    img.alt = cd.alt;
    shot.appendChild(img);
    info.appendChild(shot);

    info.appendChild(el("p", "cd-desc", cd.desc));
    if (cd.why) {
      info.appendChild(el("p", "cd-sub", "why i made it"));
      info.appendChild(el("p", "cd-desc cd-why", cd.why));
    }
    if (cd.built) {
      if (!cd.about) info.appendChild(el("p", "cd-sub", "what i built"));
      var ul = el("ul", "cd-built");
      cd.built.forEach(function (t) { ul.appendChild(el("li", null, t)); });
      info.appendChild(ul);
    }
    if (cd.tags.length) {
      var tags = el("div", "project-tags cd-tags");
      cd.tags.forEach(function (t) { tags.appendChild(el("span", null, t)); });
      info.appendChild(tags);
    }
    var links = cd.links || (cd.link ? [[cd.link.replace(/^https?:\/\//, "").replace(/\/$/, "") + " →", cd.link]] : []);
    if (links.length) {
      var lw = el("div", "cd-links");
      links.forEach(function (l) {
        var a = el("a", "cd-link", l[0]);
        a.href = l[1];
        if (!/^mailto:/.test(l[1])) { a.target = "_blank"; a.rel = "noopener"; }
        lw.appendChild(a);
      });
      info.appendChild(lw);
    }

    detail.appendChild(info);
    detail.classList.remove("is-open");
    void detail.offsetWidth;
    detail.classList.add("is-open");
  }

  var current = -1;
  function centre() {
    var off = Math.max(0, (shelf.clientWidth - row.scrollWidth) / 2);
    shelf.style.setProperty("--centre", off + "px");
  }
  function close() {
    current = -1;
    shelf.classList.remove("is-open");
    buttons.forEach(function (b, j) {
      b.classList.remove("is-selected");
      b.setAttribute("aria-selected", "false");
      b.tabIndex = j === 0 ? 0 : -1;
    });
    detail.textContent = "";
    history.replaceState(null, "", location.pathname);
  }
  function select(i, fromUser) {
    if (i === current) {
      if (fromUser && wide.matches) close(); // clicking the open CD again puts it back
      return;
    }
    current = i;
    shelf.classList.add("is-open");
    buttons.forEach(function (b, j) {
      var on = j === i;
      b.classList.toggle("is-selected", on);
      b.setAttribute("aria-selected", on ? "true" : "false");
      b.tabIndex = on ? 0 : -1;
    });
    render(CDS[i], i);
    if (fromUser) {
      history.replaceState(null, "", "#" + CDS[i].id);
      var r = buttons[i].getBoundingClientRect(), rr = row.getBoundingClientRect();
      if (r.left < rr.left || r.right > rr.right) row.scrollTo({ left: row.scrollLeft + (r.left + r.width / 2) - (rr.left + rr.width / 2), behavior: "smooth" });
      // phone: glide down to the project, unless its top is already on screen
      if (!wide.matches) {
        var top = detail.getBoundingClientRect().top;
        if (top < 0 || top > window.innerHeight * 0.6) detail.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
  }

  centre();
  window.addEventListener("resize", centre);
  if (wide.addEventListener) wide.addEventListener("change", centre);

  var start = wide.matches ? -1 : 0;
  if (location.hash) {
    var k = CDS.findIndex(function (cd) { return "#" + cd.id === location.hash; });
    if (k >= 0) start = k;
  }
  if (start >= 0) select(start, false);
  else buttons[0].tabIndex = 0;
  // let the first layout settle before the rack is allowed to animate
  requestAnimationFrame(function () { shelf.classList.add("is-ready"); });
})();
