// 3D ID card on the home page. The model (models/idcard.glb) was built in Blender (models/portfolio.blend);
// both faces are drawn here on canvases, with the animated portrait gif in the photo box.
// It reacts to a nearby mouse, can be dragged around on its lanyard, and flips on a click or tap.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.getElementById("id-card");
const portrait = host && host.querySelector("img");

const done = () => document.documentElement.classList.remove("card-pending");
if (host && portrait && hasWebGL()) start().catch((err) => console.warn("ID card unavailable, keeping the gif", err)).finally(done);
else done();

function hasWebGL() {
  try { return !!document.createElement("canvas").getContext("webgl2"); } catch { return false; }
}

// ---------- portrait frames ----------
// ImageDecoder gives us every gif frame; where it's missing we draw the <img> itself, which animates in place.
async function gifFrames(src) {
  if (!("ImageDecoder" in window)) return null;
  try {
    const data = await (await fetch(src)).arrayBuffer();
    const dec = new ImageDecoder({ data, type: "image/gif" });
    await dec.tracks.ready;
    const count = dec.tracks.selectedTrack.frameCount;
    const frames = [];
    for (let i = 0; i < count; i++) {
      const { image } = await dec.decode({ frameIndex: i });
      frames.push({ bmp: await createImageBitmap(image), ms: Math.max(20, (image.duration || 100000) / 1000) });
      image.close();
    }
    return frames.length ? frames : null;
  } catch { return null; }
}

// ---------- card faces ----------
const CW = 1080, CH = 1712; // 54 x 85.6 mm
const INK = "#111111";
const PAPER = "#f4f3ef";
const DIM = "#262626";
const FAINT = "#9a9a9a";
const PHOTO_BG = "#ffffff";
const SERIF = "Georgia, 'Times New Roman', serif";
const SANS = "system-ui, -apple-system, 'Segoe UI', sans-serif";
const MONO = "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";

function field(g, x, y, label, value, size = 40, font = SANS) {
  g.fillStyle = DIM;
  g.font = `700 26px ${MONO}`;
  g.fillText(label, x, y);
  g.fillStyle = INK;
  g.font = `600 ${size}px ${font}`;
  g.fillText(value, x, y + size + 10);
}

function barcode(g, x, y, w, h, seed) {
  let s = seed, cx = x;
  g.fillStyle = INK;
  while (cx < x + w) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const bar = 3 + (s % 4) * 3;
    if ((s >> 8) & 1) g.fillRect(cx, y, bar, h);
    cx += bar + 3 + ((s >> 4) % 3) * 2;
  }
}

function drawFront(g, photo) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, CW, CH);

  // header band (the lanyard slot sits in it)
  g.fillStyle = INK;
  g.fillRect(0, 0, CW, 270);
  g.fillStyle = PAPER;
  g.font = `italic 72px ${SERIF}`;
  g.textAlign = "left";
  g.fillText("nakul", 70, 226);
  g.font = `500 26px ${MONO}`;
  g.textAlign = "right";
  g.fillText("ACCESS PASS", CW - 70, 196);
  g.fillStyle = FAINT;
  g.fillText("EST. 2005", CW - 70, 232);
  g.textAlign = "left";

  // photo
  const px = 70, py = 330, pw = 450, ph = 505;
  g.fillStyle = PHOTO_BG;
  g.fillRect(px, py, pw, ph);
  if (photo) {
    g.imageSmoothingEnabled = false;
    g.drawImage(photo, px + 10, py + 10, pw - 20, ph - 20);
  }
  g.strokeStyle = INK;
  g.lineWidth = 4;
  g.strokeRect(px, py, pw, ph);

  // fields beside the photo
  const fx = 572;
  field(g, fx, 360, "ID NO.", "0x4E414B55", 40, MONO);
  field(g, fx, 490, "ROLE", "ENGINEER");
  field(g, fx, 620, "CLEARANCE", "ALL AREAS");
  field(g, fx, 750, "ISSUED", "2026");

  // name block
  g.fillStyle = INK;
  g.font = `400 104px ${SERIF}`;
  g.fillText("Nakul Rejeesh", 70, 990);
  g.fillStyle = DIM;
  g.font = `500 42px ${SANS}`;
  g.fillText("Computer Engineering @ UNSW", 72, 1056);

  g.fillStyle = INK;
  g.fillRect(70, 1110, CW - 140, 3);
  field(g, 70, 1170, "BUILDS", "webapps / embedded / arduino", 38);
  field(g, 70, 1300, "SPEAKS", "py · c · swift · js · ts · lua · asm", 34, MONO);

  barcode(g, 70, 1450, CW - 140, 140, 0x4e414b55);
  g.fillStyle = DIM;
  g.font = `500 26px ${MONO}`;
  g.fillText("N4KULR", 70, 1640);
  g.textAlign = "right";
  g.fillText("PORTFOLIO / NOT A REAL ID", CW - 70, 1640);
  g.textAlign = "left";
}

// the easter egg on the back: a real photo, printed onto the card with faded colour, film grain and a vignette
async function loadPrint(src, w, h) {
  const img = new Image();
  img.src = src;
  try { await img.decode(); } catch { return null; }
  const c = Object.assign(document.createElement("canvas"), { width: w, height: h });
  const g = c.getContext("2d");
  // fill the frame from the centre of the photo (the photo itself is already cropped)
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const dw = img.naturalWidth * scale, dh = img.naturalHeight * scale;
  g.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
  const data = g.getImageData(0, 0, w, h), d = data.data;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const lum = d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11;
      const nx = x / w - 0.5, ny = y / h - 0.5;
      const vignette = 1 - 0.55 * (nx * nx + ny * ny) * 2;
      const grain = (Math.random() - 0.5) * 46;
      const tint = [8, 3, -8]; // a little warm, like an old print
      for (let k = 0; k < 3; k++) {
        let v = d[i + k] * 0.55 + lum * 0.45;       // faded colour
        v = 22 + v * 0.84;                          // lifted blacks
        v = v * vignette + grain + tint[k];
        d[i + k] = Math.max(0, Math.min(255, v));
      }
    }
  }
  g.putImageData(data, 0, 0);
  return c;
}

function drawBack(g, holder) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, CW, CH);
  // header either side of the lanyard slot
  g.fillStyle = DIM;
  g.font = `600 22px ${MONO}`;
  g.fillText("PROPERTY OF N. REJEESH", 70, 186);
  g.textAlign = "right";
  g.fillText("CARD NO. 0001", CW - 70, 186);
  g.textAlign = "left";

  g.fillStyle = INK;
  g.fillRect(0, 230, CW, 190); // magnetic stripe
  g.fillStyle = "#3a3a3a";
  g.font = `600 18px ${MONO}`;
  g.textAlign = "right";
  g.fillText("MAGNETIC STRIPE · DO NOT SCRATCH", CW - 40, 404);
  g.textAlign = "left";

  // the photo, left, under the stripe
  const px = 70, py = 480, pw = 330, ph = 398; // same shape as images/holder.jpg (221 x 267)
  if (holder) {
    g.fillStyle = "#ffffff";
    g.fillRect(px - 10, py - 10, pw + 20, ph + 20);
    g.drawImage(holder, px, py, pw, ph);
    g.strokeStyle = "rgba(0,0,0,0.25)";
    g.lineWidth = 2;
    g.strokeRect(px - 10, py - 10, pw + 20, ph + 20);
  }

  const tx = holder ? 440 : 70;
  g.fillStyle = DIM;
  g.font = `600 26px ${MONO}`;
  g.fillText("IF FOUND, PLEASE RETURN TO", tx, 520);
  g.fillStyle = INK;
  g.font = `400 50px ${SERIF}`;
  g.fillText("github.com/n4kulr", tx, 592);

  g.fillStyle = DIM;
  g.font = `400 31px ${SANS}`;
  const lines = holder
    ? ["This card grants the holder", "access to the projects page", "and the ocean at the bottom", "of the home page.", "", "Not valid for entry to", "any real building."]
    : ["This card grants the holder access to", "the projects page and the ocean at", "the bottom of the home page.", "", "Not valid for entry to any real building."];
  lines.forEach((l, i) => g.fillText(l, tx, 690 + i * 46));

  // conditions of use, to fill the space under the photo
  g.fillStyle = DIM;
  g.font = `600 22px ${MONO}`;
  g.fillText("CONDITIONS OF USE", 70, 1014);
  g.font = `400 26px ${SANS}`;
  [
    "1.  Do not bend, fold or feed to the ocean.",
    "2.  The lanyard may twist. This is normal.",
    "3.  Flip responsibly.",
    "4.  Report sightings of the holder at github.com/n4kulr.",
  ].forEach((l, i) => g.fillText(l, 70, 1056 + i * 36));

  // signature
  g.strokeStyle = INK;
  g.lineWidth = 3;
  g.beginPath();
  g.moveTo(70, 1290);
  g.lineTo(CW - 70, 1290);
  g.stroke();
  g.fillStyle = INK;
  g.font = `italic 96px ${SERIF}`;
  g.fillText("Nakul", 110, 1265);
  g.fillStyle = DIM;
  g.font = `500 24px ${MONO}`;
  g.fillText("AUTHORISED SIGNATURE", 70, 1340);

  barcode(g, 70, 1460, CW - 140, 110, 0x2005);
  g.fillText("0x4E414B55", 70, 1630);
  g.textAlign = "right";
  g.fillText("VALID WHILE STOCKS LAST", CW - 70, 1630);
  g.textAlign = "left";
}

// ---------- scene ----------
async function start() {
  const [gltf, frames] = await Promise.all([
    new GLTFLoader().loadAsync("models/idcard.glb"),
    gifFrames(portrait.currentSrc || portrait.src),
  ]);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 0.82;
  const scene = new THREE.Scene();
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(40, 60, 120);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 10, 2000);

  // faces
  function faceTexture(canvas) {
    const tex = new THREE.CanvasTexture(canvas);
    tex.flipY = false;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
  }
  const front = Object.assign(document.createElement("canvas"), { width: CW, height: CH });
  const back = Object.assign(document.createElement("canvas"), { width: CW, height: CH });
  const fg = front.getContext("2d"), bg = back.getContext("2d");
  await document.fonts.ready;
  const frontTex = faceTexture(front), backTex = faceTexture(back);
  let lastPhoto = frames ? frames[0].bmp : portrait;
  function paintFront(photo) {
    lastPhoto = photo;
    drawFront(fg, photo);
    frontTex.needsUpdate = true;
  }
  paintFront(lastPhoto);
  const holder = await loadPrint("images/holder.jpg", 330, 398);
  drawBack(bg, holder);
  backTex.needsUpdate = true;

  const model = gltf.scene;
  let edge = null, backMesh = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === "card_front" || o.name === "card_back") {
      o.material = new THREE.MeshPhysicalMaterial({
        map: o.name === "card_front" ? frontTex : backTex,
        roughness: 0.65,
        envMapIntensity: 0.35,
        clearcoat: 0.6,
        clearcoatRoughness: 0.25,
      });
    }
    if (o.name === "card_edge") edge = o;
    if (o.name === "card_back") backMesh = o;
  });
  edge && (edge.material = edge.material.clone());
  if (edge) edge.material.color.set(0xe6e6e0);

  // the model's rigid strap is replaced by a simulated lanyard (below)
  model.traverse((o) => { if (o.name === "card_strap") o.visible = false; });

  // the card hangs from the top of the lanyard connector
  const PIVOT = 56.6; // connector top, in model space
  const HANG = 48;    // where the connector sits at rest, in world space
  const pivot = new THREE.Group();
  model.position.y = -PIVOT;
  pivot.add(model);
  scene.add(pivot);

  // ---------- lanyard: a rope of points fixed above the page, with the card on the end ----------
  const N = 20;
  const pts = Array.from({ length: N + 1 }, () => new THREE.Vector3());
  const old = Array.from({ length: N + 1 }, () => new THREE.Vector3());
  const anchor = new THREE.Vector3(0, 220, 0);
  let seg = 8;
  function buildRope() {
    const end = new THREE.Vector3(0, HANG, 0);
    seg = anchor.distanceTo(end) / N;
    for (let i = 0; i <= N; i++) {
      pts[i].lerpVectors(anchor, end, i / N);
      old[i].copy(pts[i]);
    }
  }

  // a printed fabric strap
  const STRAP_W = 13;
  const print = Object.assign(document.createElement("canvas"), { width: 128, height: 1024 });
  {
    const g = print.getContext("2d");
    g.fillStyle = "#151515";
    g.fillRect(0, 0, 128, 1024);
    g.fillStyle = "rgba(255,255,255,0.06)";
    for (let y = 0; y < 1024; y += 4) g.fillRect(0, y, 128, 1); // woven ribs
    g.translate(64, 1024);
    g.rotate(-Math.PI / 2);
    g.fillStyle = "#d8d8d4";
    g.font = `600 46px ${MONO}`;
    g.textBaseline = "middle";
    g.fillText("NAKUL REJEESH  ·  ACCESS ALL AREAS  ·", 24, 0);
  }
  const printTex = new THREE.CanvasTexture(print);
  printTex.colorSpace = THREE.SRGBColorSpace;
  printTex.wrapT = THREE.RepeatWrapping;
  printTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const strapGeo = new THREE.BufferGeometry();
  const strapPos = new Float32Array((N + 1) * 2 * 3);
  const strapUv = new Float32Array((N + 1) * 2 * 2);
  const strapIdx = [];
  for (let i = 0; i < N; i++) {
    const a = i * 2, b = a + 1, c = a + 2, d = a + 3;
    strapIdx.push(a, c, b, b, c, d);
  }
  strapGeo.setAttribute("position", new THREE.BufferAttribute(strapPos, 3));
  strapGeo.setAttribute("uv", new THREE.BufferAttribute(strapUv, 2));
  strapGeo.setIndex(strapIdx);
  const strap = new THREE.Mesh(strapGeo, new THREE.MeshStandardMaterial({
    map: printTex, roughness: 0.85, metalness: 0, side: THREE.DoubleSide,
  }));
  strap.frustumCulled = false;
  scene.add(strap);

  const tmpT = new THREE.Vector3(), tmpF = new THREE.Vector3(), tmpS = new THREE.Vector3();
  function updateStrap(yaw) {
    const len = seg * N;
    for (let i = 0; i <= N; i++) {
      const p = pts[i];
      tmpT.subVectors(pts[Math.min(N, i + 1)], pts[Math.max(0, i - 1)]).normalize();
      // the strap twists along its length to meet the card, like a real lanyard when the badge turns
      const u = i / N, a = yaw * u * u * (3 - 2 * u);
      tmpF.set(Math.sin(a), 0, Math.cos(a));
      tmpS.crossVectors(tmpT, tmpF).normalize().multiplyScalar(STRAP_W / 2);
      strapPos.set([p.x - tmpS.x, p.y - tmpS.y, p.z - tmpS.z, p.x + tmpS.x, p.y + tmpS.y, p.z + tmpS.z], i * 6);
      const v = (len * (1 - u)) / 70; // one print repeat every 70 units
      strapUv.set([1, v, 0, v], i * 4);
    }
    strapGeo.attributes.position.needsUpdate = true;
    strapGeo.attributes.uv.needsUpdate = true;
    strapGeo.computeVertexNormals();
  }

  // ---------- motion ----------
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const G = 9800 * 0.6;                       // gravity, world units / s^2
  const gravity = new THREE.Vector3(0, -G, 0);
  const cur = { x: 0, y: 0 }, vel = { x: 0, y: 0 }, target = { x: 0, y: 0 };
  let flip = 0, lastMouse = null, drag = null, dragged = false;
  let worldPerPx = 0.3;
  const grabTarget = new THREE.Vector3();

  function nudge(dxWorld, dyWorld) { // push the card sideways, as if brushed past
    old[N].x -= dxWorld;
    old[N].y -= dyWorld;
  }

  // the mouse only matters when it's near the card
  const REACH = 130;
  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || drag) return;
    const r = host.getBoundingClientRect();
    const dx = Math.max(r.left - e.clientX, 0, e.clientX - r.right);
    const dy = Math.max(r.top - e.clientY, 0, e.clientY - r.bottom);
    const k = Math.max(0, 1 - Math.hypot(dx, dy) / REACH);
    if (k > 0) {
      const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2 + REACH)));
      const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2 + REACH)));
      target.y = nx * 0.35 * k;
      target.x = ny * 0.12 * k;
      if (lastMouse) {
        const mx = Math.max(-40, Math.min(40, e.clientX - lastMouse.x));
        const my = Math.max(-40, Math.min(40, e.clientY - lastMouse.y));
        nudge(mx * worldPerPx * 0.012 * k * k, -my * worldPerPx * 0.005 * k * k);
      }
    } else {
      target.y = 0;
      target.x = 0;
    }
    lastMouse = { x: e.clientX, y: e.clientY };
  });

  // drag the card: it pulls on the lanyard, swings when you let go, and spins with sideways throws
  function pointerWorld(e) {
    const s = stage.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - s.left) / s.width) * 2 - 1, -((e.clientY - s.top) / s.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = new THREE.Vector3();
    return ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit) ? hit : null;
  }
  host.addEventListener("pointerdown", (e) => {
    const w = pointerWorld(e);
    if (!w) return;
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, off: new THREE.Vector3().subVectors(pts[N], w) };
    grabTarget.copy(pts[N]);
    dragged = false;
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    if (Math.hypot(e.clientX - drag.x, e.clientY - drag.y) > 6) dragged = true;
    const w = pointerWorld(e);
    if (w) grabTarget.copy(w).add(drag.off);
    vel.y += Math.max(-0.08, Math.min(0.08, (e.clientX - drag.lastX) * 0.004));
    drag.lastX = e.clientX;
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    if (!dragged) return;
    flip = Math.round((cur.y - target.y) / Math.PI) * Math.PI;
  }
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);

  // ---------- the photo on the back opens up large ----------
  // where the print sits on the back face, in canvas pixels (see drawBack)
  const PHOTO = { x0: 60, y0: 470, x1: 410, y1: 888 };
  function overPhoto(e) {
    if (!holder || !backMesh) return false;
    const s = stage.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - s.left) / s.width) * 2 - 1, -((e.clientY - s.top) / s.height) * 2 + 1);
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObject(model, true)[0];
    if (!hit || hit.object !== backMesh || !hit.uv) return false;
    const x = hit.uv.x * CW, y = hit.uv.y * CH;
    return x >= PHOTO.x0 && x <= PHOTO.x1 && y >= PHOTO.y0 && y <= PHOTO.y1;
  }
  host.addEventListener("pointermove", (e) => {
    if (!drag) host.style.cursor = overPhoto(e) ? "zoom-in" : "";
  });

  let lightbox = null;
  async function openPhoto() {
    if (!lightbox) {
      // a sharper print for the big view, with the same grain and fade
      const big = await loadPrint("images/holder.jpg", 804, 971);
      lightbox = document.createElement("dialog");
      lightbox.className = "photo-lightbox";
      lightbox.setAttribute("aria-label", "Photo of Nakul");
      const fig = document.createElement("figure");
      const img = document.createElement("img");
      img.src = (big || holder).toDataURL("image/jpeg", 0.9);
      img.alt = "Nakul smiling on a lawn at sunset, printed like an old photo";
      const glare = document.createElement("span");
      glare.className = "photo-glare";
      fig.append(img, glare);
      lightbox.append(fig);
      document.body.append(lightbox);

      // tilt the print towards the pointer, like spinning album art round with your finger
      let rx = 0, ry = 0, tx = 0, ty = 0, raf = 0;
      const tick = () => {
        rx += (tx - rx) * 0.12;
        ry += (ty - ry) * 0.12;
        fig.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
        glare.style.setProperty("--gx", `${50 + ry * 2.4}%`);
        glare.style.setProperty("--gy", `${50 - rx * 2.4}%`);
        raf = Math.abs(tx - rx) + Math.abs(ty - ry) > 0.01 ? requestAnimationFrame(tick) : 0;
      };
      const aim = (e) => {
        const r = img.getBoundingClientRect();
        const nx = Math.max(-1.4, Math.min(1.4, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        const ny = Math.max(-1.4, Math.min(1.4, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        ty = nx * 16;
        tx = -ny * 16;
        if (!raf) raf = requestAnimationFrame(tick);
      };
      const settle = () => { tx = 0; ty = 0; if (!raf) raf = requestAnimationFrame(tick); };
      lightbox.addEventListener("pointermove", aim);
      lightbox.addEventListener("pointerdown", aim);
      lightbox.addEventListener("pointerleave", settle);
      lightbox.addEventListener("pointerup", (e) => { if (e.pointerType !== "mouse") settle(); });
      // only a click on the blurred background closes it
      lightbox.addEventListener("click", (e) => { if (!fig.contains(e.target)) lightbox.close(); });
      lightbox.addEventListener("close", () => {
        settle();
        document.documentElement.classList.remove("photo-open");
      });
    }
    // everything behind the blur stays still while the photo is open (moving content made the blur flicker)
    document.documentElement.classList.add("photo-open");
    lightbox.showModal();
  }

  host.addEventListener("click", (e) => {
    if (dragged) { dragged = false; return; }
    if (overPhoto(e)) { openPhoto(); return; }
    flip += Math.PI;
    nudge(1.2, 0);
  });

  // ---------- physics ----------
  const STEP = 1 / 120;
  let acc = 0, simT = 0;
  function simulate(dt) {
    acc = Math.min(acc + dt, 0.1);
    while (acc >= STEP) {
      acc -= STEP;
      simT += STEP;
      // a faint breeze keeps it alive when nobody's touching it
      const wind = reduce ? 0 : Math.sin(simT * 0.7) * 120 + Math.sin(simT * 1.9) * 50;
      for (let i = 1; i <= N; i++) {
        const p = pts[i], o = old[i];
        const vx = (p.x - o.x) * 0.996, vy = (p.y - o.y) * 0.996, vz = (p.z - o.z) * 0.95;
        o.copy(p);
        p.x += vx + (gravity.x + wind) * STEP * STEP;
        p.y += vy + gravity.y * STEP * STEP;
        p.z += vz;
      }
      if (drag) pts[N].lerp(grabTarget, 0.35);
      // keep each link from stretching; the strap can still go slack and bend
      for (let it = 0; it < 14; it++) {
        pts[0].copy(anchor);
        for (let i = 0; i < N; i++) {
          const a = pts[i], b = pts[i + 1];
          tmpT.subVectors(b, a);
          const len = tmpT.length();
          if (len <= seg || len === 0) continue;
          const wa = i === 0 ? 0 : 1;
          const wb = i + 1 === N ? (drag ? 0 : 0.2) : 1; // the card end is heavy
          const k = (len - seg) / len / (wa + wb || 1);
          a.addScaledVector(tmpT, k * wa);
          b.addScaledVector(tmpT, -k * wb);
        }
      }
      // twist: spring the card's spin towards its target (the strap's torsion)
      const tgtY = target.y + flip, tgtX = target.x;
      vel.y += (tgtY - cur.y) * 0.008;
      vel.x += (tgtX - cur.x) * 0.015;
      vel.y *= 0.955;
      vel.x *= 0.9;
      cur.y += vel.y;
      cur.x += vel.x;
    }
  }

  const up = new THREE.Vector3(), qSwing = new THREE.Quaternion(), qSpin = new THREE.Quaternion();
  const Y = new THREE.Vector3(0, 1, 0), euler = new THREE.Euler();
  function placeCard() {
    pivot.position.copy(pts[N]);
    // the card hangs along the last stretch of strap
    up.subVectors(pts[N - 2], pts[N]).normalize();
    qSwing.setFromUnitVectors(Y, up);
    qSpin.setFromEuler(euler.set(cur.x, cur.y, 0, "YXZ"));
    pivot.quaternion.copy(qSwing).multiply(qSpin);
    // the strap only ever twists up to half a turn, however many times the card has been flipped
    updateStrap(((cur.y % (Math.PI * 2)) + Math.PI * 3) % (Math.PI * 2) - Math.PI);
  }

  // ---------- mount ----------
  // The canvas covers the whole hero, behind the text, so the card can swing and flip without
  // being clipped. #id-card stays in the layout as the card's spot and its click target.
  const stage = document.createElement("div");
  stage.className = "id-card-stage";
  stage.appendChild(renderer.domElement);
  const hero = host.closest("main") || document.body;
  hero.prepend(stage);
  host.classList.add("is-3d");
  host.closest(".intro")?.classList.add("has-card");

  const FOV = 30;
  function resize() {
    const s = stage.getBoundingClientRect(), r = host.getBoundingClientRect();
    if (!s.width || !r.width) return;
    renderer.setSize(s.width, s.height, false);
    // distance that fits the card (about 60 x 105 units incl. clip) into its spot; it can swing past the spot freely
    const tan = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
    const dist = Math.max(105 / 2 / tan, 60 / 2 / tan / (r.width / r.height));
    // widen the view to the whole stage at the same scale, then shift it so the card lands on its spot
    worldPerPx = (2 * dist * tan) / r.height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((worldPerPx * s.height) / 2 / dist));
    camera.aspect = s.width / s.height;
    const cx = r.left + r.width / 2 - s.left, cy = r.top + r.height / 2 - s.top;
    camera.setViewOffset(s.width, s.height, s.width / 2 - cx, s.height / 2 - cy, s.width, s.height);
    camera.position.set(0, -2, dist);
    camera.lookAt(0, -2, 0);
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    // fix the lanyard just above the top of the stage, straight above the card
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((cx / s.width) * 2 - 1, -((-30) / s.height) * 2 + 1), camera);
    const hit = new THREE.Vector3();
    if (ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit)) {
      anchor.set(0, Math.max(HANG + 40, hit.y), 0);
      buildRope();
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  ro.observe(host);
  addEventListener("resize", resize);
  resize();

  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(stage);

  let frame = 0, frameStart = performance.now(), lastNow = performance.now();
  renderer.setAnimationLoop((now) => {
    const dt = (now - lastNow) / 1000;
    lastNow = now;
    if (!visible || document.documentElement.classList.contains("photo-open")) return;

    // portrait animation
    if (frames && frames.length > 1 && now - frameStart >= frames[frame].ms) {
      frame = (frame + 1) % frames.length;
      frameStart = now;
      paintFront(frames[frame].bmp);
    } else if (!frames && now - frameStart > 80) {
      frameStart = now;
      paintFront(portrait);
    }

    simulate(dt);
    placeCard();
    renderer.render(scene, camera);
  });
}
