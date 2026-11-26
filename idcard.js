// 3D ID card on the home page. The model (models/idcard.glb) was built in Blender (models/portfolio.blend);
// both faces are drawn here on canvases, with the animated portrait gif in the photo box.
// Desktop: the card follows the mouse. Phones: it follows the gyroscope. Click or tap to flip it.
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const host = document.getElementById("id-card");
const portrait = host && host.querySelector("img");

if (host && portrait && hasWebGL()) start().catch((err) => console.warn("ID card unavailable, keeping the gif", err));

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

function drawBack(g) {
  g.fillStyle = PAPER;
  g.fillRect(0, 0, CW, CH);
  g.fillStyle = INK;
  g.fillRect(0, 230, CW, 190); // magnetic stripe

  g.fillStyle = DIM;
  g.font = `500 26px ${MONO}`;
  g.fillText("IF FOUND, PLEASE RETURN TO", 70, 540);
  g.fillStyle = INK;
  g.font = `400 54px ${SERIF}`;
  g.fillText("github.com/n4kulr", 70, 620);

  g.fillStyle = DIM;
  g.font = `400 34px ${SANS}`;
  const lines = [
    "This card grants the holder access to",
    "the projects page and the ocean at",
    "the bottom of the home page.",
    "",
    "Not valid for entry to any real building.",
  ];
  lines.forEach((l, i) => g.fillText(l, 70, 760 + i * 52));

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
  drawBack(bg);
  backTex.needsUpdate = true;

  const model = gltf.scene;
  let edge = null;
  model.traverse((o) => {
    if (!o.isMesh) return;
    if (o.name === "card_front" || o.name === "card_back") {
      o.material = new THREE.MeshPhysicalMaterial({
        map: o.name === "card_front" ? frontTex : backTex,
        roughness: 0.6,
        envMapIntensity: 0.55,
        clearcoat: 1,
        clearcoatRoughness: 0.12,
      });
    }
    if (o.name === "card_edge") edge = o;
  });
  edge && (edge.material = edge.material.clone());
  if (edge) edge.material.color.set(0xe6e6e0);

  // hang the card from the top of the lanyard connector so it swings like a real badge
  const PIVOT = 56.6;
  const pivot = new THREE.Group();
  model.position.y = -PIVOT;
  pivot.add(model);
  pivot.position.y = 48;
  scene.add(pivot);

  // ---------- motion ----------
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const cur = { x: 0, y: 0, z: 0 }, vel = { x: 0, y: 0, z: 0 }, target = { x: 0, y: 0, z: 0 };
  let flip = 0, lastInput = 0, gyro = null, lastMouse = null, drag = null, dragged = false;

  window.addEventListener("pointermove", (e) => {
    if (e.pointerType !== "mouse" || drag) return;
    const r = host.getBoundingClientRect();
    const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (innerWidth / 2)));
    const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (innerHeight / 2)));
    target.y = nx * 0.75;
    target.x = ny * 0.35;
    if (lastMouse) vel.z += Math.max(-0.02, Math.min(0.02, -(e.clientX - lastMouse) * 0.0006));
    lastMouse = e.clientX;
    lastInput = performance.now();
  });

  function onTilt(e) {
    if (e.beta == null || e.gamma == null || drag) return;
    if (!gyro) gyro = { beta: e.beta };
    const g = Math.max(-1, Math.min(1, e.gamma / 35));
    const b = Math.max(-1, Math.min(1, (e.beta - gyro.beta) / 35));
    target.y = g * 0.8;
    target.z = -g * 0.25;
    target.x = b * 0.4;
    lastInput = performance.now();
  }
  const needsPermission = typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function";
  if (!needsPermission) window.addEventListener("deviceorientation", onTilt);
  let askedTilt = !needsPermission;


  // drag the card around with a finger (or the mouse): it spins freely, then settles on whichever face is nearer
  host.addEventListener("pointerdown", (e) => {
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, lastX: e.clientX, baseY: target.y, baseX: target.x };
    dragged = false;
    host.setPointerCapture(e.pointerId);
  });
  host.addEventListener("pointermove", (e) => {
    if (!drag || e.pointerId !== drag.id) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 6) dragged = true;
    target.y = drag.baseY + dx * 0.014;
    target.x = Math.max(-0.9, Math.min(0.9, drag.baseX + dy * 0.008));
    vel.z += Math.max(-0.03, Math.min(0.03, -(e.clientX - drag.lastX) * 0.001));
    drag.lastX = e.clientX;
    lastInput = performance.now();
  });
  function endDrag(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag = null;
    if (!dragged) return;
    flip = Math.round((target.y + flip) / Math.PI) * Math.PI;
    target.y = 0;
    target.x = 0;
    lastInput = performance.now();
  }
  host.addEventListener("pointerup", endDrag);
  host.addEventListener("pointercancel", endDrag);

  host.addEventListener("click", async () => {
    if (dragged) { dragged = false; return; }
    if (!askedTilt) {
      askedTilt = true;
      try {
        if ((await DeviceOrientationEvent.requestPermission()) === "granted") {
          window.addEventListener("deviceorientation", onTilt);
          return;
        }
      } catch { /* fall through to a flip */ }
    }
    flip += Math.PI;
    vel.z += 0.04;
  });

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
    const worldPerPx = (2 * dist * tan) / r.height;
    camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan((worldPerPx * s.height) / 2 / dist));
    camera.aspect = s.width / s.height;
    const cx = r.left + r.width / 2 - s.left, cy = r.top + r.height / 2 - s.top;
    camera.setViewOffset(s.width, s.height, s.width / 2 - cx, s.height / 2 - cy, s.width, s.height);
    camera.position.set(0, -2, dist);
    camera.lookAt(0, -2, 0);
    camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize);
  ro.observe(stage);
  ro.observe(host);
  addEventListener("resize", resize);
  resize();

  let visible = true;
  new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; }).observe(stage);

  let frame = 0, frameStart = performance.now();
  renderer.setAnimationLoop((now) => {
    if (!visible) return;

    // portrait animation
    if (frames && frames.length > 1 && now - frameStart >= frames[frame].ms) {
      frame = (frame + 1) % frames.length;
      frameStart = now;
      paintFront(frames[frame].bmp);
    } else if (!frames && now - frameStart > 80) {
      frameStart = now;
      paintFront(portrait);
    }

    // idle sway when nobody is moving anything
    if (!reduce && now - lastInput > 2500) {
      const t = now / 1000;
      target.y = Math.sin(t * 0.6) * 0.35;
      target.x = Math.sin(t * 0.9) * 0.06;
      target.z = Math.sin(t * 0.75) * 0.04;
    }

    // springs
    const tgt = { x: target.x, y: target.y + flip, z: target.z };
    for (const k of ["x", "y", "z"]) {
      vel[k] += (tgt[k] - cur[k]) * 0.035;
      vel[k] *= 0.88;
      cur[k] += vel[k];
    }
    pivot.rotation.set(cur.x, cur.y, cur.z);
    renderer.render(scene, camera);
  });
}
