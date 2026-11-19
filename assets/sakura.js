/* ============================================================
   anoshor.com — 3D sakura skills tree
   Lazy island: site.js imports this only when #skills nears the
   viewport. If WebGL or the CDN fails, the SVG tree stays put.
   The HTML .node buttons remain the source of truth for which
   branch is open; this file only draws and forwards clicks.
   ============================================================ */
import * as THREE from "./vendor/three.module.min.js";   // three r170, vendored

const RM = matchMedia("(prefers-reduced-motion: reduce)").matches;
const V3 = THREE.Vector3;
const KEYS = ["backend", "ai", "lang", "front"];

// four scaffold limbs, one per skill group. az/el in degrees.
const LIMBS = [
  { key: "backend", t: 0.64, az: 118, el: 16, len: 1.22, r: 0.15 },
  { key: "ai",      t: 0.70, az: 18,  el: 15, len: 1.26, r: 0.15 },
  { key: "lang",    t: 0.88, az: 205, el: 36, len: 1.02, r: 0.12 },
  { key: "front",   t: 1.00, az: 292, el: 40, len: 1.02, r: 0.12 }
];

/* ---------- small helpers ---------- */
function rng(seed) {                       // mulberry32: same tree every load
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const R = rng(20261120);
const rr = (a, b) => a + (b - a) * R();
const css = (v) => getComputedStyle(document.documentElement).getPropertyValue(v).trim();

// one indexed geometry from many (positions + normals only)
function merge(geos) {
  let nv = 0, ni = 0;
  for (const g of geos) { nv += g.attributes.position.count; ni += g.index.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), idx = new Uint32Array(ni);
  let vo = 0, io = 0;
  for (const g of geos) {
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    const a = g.index.array;
    for (let i = 0; i < a.length; i++) idx[io + i] = a[i] + vo;
    vo += g.attributes.position.count; io += a.length;
    g.dispose();
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  m.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  m.setIndex(new THREE.BufferAttribute(idx, 1));
  return m;
}

// a tube along points whose radius tapers r0 -> r1
function branch(points, r0, r1) {
  const curve = new THREE.CatmullRomCurve3(points);
  const tub = 12, rad = 8;
  const g = new THREE.TubeGeometry(curve, tub, 1, rad, false);
  const pos = g.attributes.position, p = new V3(), c = new V3();
  for (let i = 0; i <= tub; i++) {
    const t = i / tub;
    curve.getPointAt(t, c);
    const r = r0 + (r1 - r0) * Math.pow(t, 0.85);
    for (let j = 0; j <= rad; j++) {
      const k = i * (rad + 1) + j;
      p.fromBufferAttribute(pos, k).sub(c).multiplyScalar(r).add(c);
      pos.setXYZ(k, p.x, p.y, p.z);
    }
  }
  return { g, curve };
}

// sakura petal: rounded, with the notch at the tip
function petalShape() {
  const s = new THREE.Shape();
  s.moveTo(0, 0);
  s.bezierCurveTo(0.36, 0.22, 0.44, 0.78, 0.2, 1);
  s.lineTo(0, 0.88);
  s.lineTo(-0.2, 1);
  s.bezierCurveTo(-0.44, 0.78, -0.36, 0.22, 0, 0);
  return s;
}
function flowerGeo() {
  const parts = [];
  for (let k = 0; k < 5; k++) {
    const g = new THREE.ShapeGeometry(petalShape(), 3);
    g.scale(0.5, 0.5, 0.5);
    g.translate(0, 0.04, 0);
    g.rotateZ((k * Math.PI * 2) / 5);
    parts.push(g);
  }
  const m = merge(parts), p = m.attributes.position;
  for (let i = 0; i < p.count; i++) {              // shallow cup, opening outward (+z)
    const x = p.getX(i), y = p.getY(i);
    p.setZ(i, (x * x + y * y) * 0.35);
  }
  m.computeVertexNormals();
  return m;
}
function petalGeo() {
  const g = new THREE.ShapeGeometry(petalShape(), 3);
  g.scale(0.5, 0.5, 0.5);
  g.translate(0, -0.25, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getX(i) * p.getX(i) * 0.6);   // slight curl
  g.computeVertexNormals();
  return g;
}

/* ---------- the tree ---------- */
function growTree() {
  const bark = [];
  const anchors = { backend: [], ai: [], lang: [], front: [] };

  // trunk, with a little S-bend
  const trunk = branch([
    new V3(0, 0, 0), new V3(0.06, 0.55, 0.03), new V3(-0.05, 1.1, -0.02),
    new V3(0.07, 1.6, 0.04), new V3(0.02, 2.12, 0)
  ], 0.3, 0.16);
  bark.push(trunk.g);

  // root flare into the ground
  for (let i = 0; i < 5; i++) {
    const a = (i * Math.PI * 2) / 5 + rr(-0.3, 0.3), ca = Math.cos(a), sa = Math.sin(a);
    bark.push(branch([
      new V3(0, 0.38, 0), new V3(ca * 0.24, 0.12, sa * 0.24), new V3(ca * rr(0.42, 0.56), -0.03, sa * rr(0.42, 0.56))
    ], 0.13, 0.035).g);
  }

  function grow(start, dir, len, r0, depth, key) {
    const pts = [start.clone()], d = dir.clone().normalize(), p = start.clone();
    for (let i = 1; i <= 4; i++) {
      // wander; tips turn up a touch, the way sakura twigs do
      d.add(new V3(rr(-0.16, 0.16), rr(-0.08, 0.1) + (depth === 0 ? 0.08 : 0), rr(-0.16, 0.16))).normalize();
      p.addScaledVector(d, len / 4);
      pts.push(p.clone());
    }
    const r1 = depth === 0 ? r0 * 0.3 : r0 * 0.64;
    bark.push(branch(pts, r0, r1).g);
    const end = pts[4];
    if (depth <= 1) anchors[key].push({ p: end.clone(), s: depth === 0 ? 1 : 0.85 });
    if (depth === 2) anchors[key].push({ p: pts[2].clone(), s: 0.62 }, { p: end.clone(), s: 0.78 });
    if (depth === 0) return;

    const kids = depth >= 3 ? 2 : (R() < 0.55 ? 2 : 3);
    for (let k = 0; k < kids; k++) {
      const nd = d.clone();
      const axis = new V3().crossVectors(nd, new V3(rr(-1, 1), rr(-1, 1), rr(-1, 1))).normalize();
      nd.applyAxisAngle(axis, rr(0.38, 0.78));
      if (nd.y < -0.12) nd.y = -0.12;               // sakura spreads, it doesn't weep
      grow(end, nd.normalize(), len * rr(0.6, 0.72), r1, depth - 1, key);
    }
  }

  for (const L of LIMBS) {
    const az = THREE.MathUtils.degToRad(L.az), el = THREE.MathUtils.degToRad(L.el);
    const dir = new V3(Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az));
    grow(trunk.curve.getPointAt(L.t), dir, L.len, L.r, 3, L.key);
  }
  return { geo: merge(bark), anchors };
}

/* ---------- mount ---------- */
export function mount(wrap) {
  const nodes = [...wrap.querySelectorAll(".node")];
  const nodeOf = (k) => nodes.find((n) => n.dataset.key === k);
  const openKey = () => { const n = wrap.querySelector(".node.on"); return n ? n.dataset.key : null; };

  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.shadowMap.autoUpdate = false;     // static scene: rendered once below
  renderer.shadowMap.needsUpdate = true;
  wrap.insertBefore(canvas, wrap.querySelector(".nodes"));

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1.456, 0.1, 60);

  /* lights */
  const hemi = new THREE.HemisphereLight(0xffffff, 0xffffff, 1.25);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 1.9);
  sun.position.set(-4, 7.5, 4.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  Object.assign(sun.shadow.camera, { left: -4, right: 4, top: 4, bottom: -4, near: 1, far: 20 });
  sun.shadow.bias = -0.0008;
  sun.shadow.radius = 4;
  scene.add(sun);

  /* plinth */
  const plinthSide = new THREE.MeshStandardMaterial({ roughness: 0.95 });
  const plinthTop = new THREE.MeshStandardMaterial({ roughness: 1 });
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.35, 0.42, 72, 1, true), plinthSide);
  plinth.position.y = -0.21;
  const top = new THREE.Mesh(new THREE.CircleGeometry(2.6, 72), plinthTop);
  top.rotation.x = -Math.PI / 2;
  top.receiveShadow = true;
  scene.add(plinth, top);

  /* bark */
  const tree = growTree();
  const barkMat = new THREE.MeshStandardMaterial({ roughness: 0.92, side: THREE.DoubleSide });
  const barkMesh = new THREE.Mesh(tree.geo, barkMat);
  barkMesh.castShadow = true;
  scene.add(barkMesh);

  /* blossoms: per skill group, soft low-poly puffs + five-petal flowers on them */
  const puffGeo = new THREE.IcosahedronGeometry(1, 2);
  const fGeo = flowerGeo();
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s3 = new V3(), tmp = new V3(), Z = new V3(0, 0, 1);
  const group = {};
  const puffMeshes = [];

  for (const key of KEYS) {
    const puffs = [];
    for (const a of tree.anchors[key]) {
      const n = a.s >= 1 ? 3 : 2;
      for (let i = 0; i < n; i++) {
        puffs.push({
          c: a.p.clone().add(new V3(rr(-0.13, 0.13), rr(0, 0.12), rr(-0.13, 0.13))),
          r: rr(0.19, 0.3) * a.s
        });
      }
    }
    const pMat = new THREE.MeshStandardMaterial({ roughness: 1 });
    const pMesh = new THREE.InstancedMesh(puffGeo, pMat, puffs.length);
    pMesh.castShadow = true;
    pMesh.userData.key = key;
    const pT = new Float32Array(puffs.length);
    puffs.forEach((p, i) => {
      q.setFromEuler(new THREE.Euler(rr(0, 6.3), rr(0, 6.3), rr(0, 6.3)));
      m4.compose(p.c, q, s3.set(p.r * 0.74, p.r * 0.74 * rr(0.82, 1), p.r * 0.74));
      pMesh.setMatrixAt(i, m4);
      pT[i] = rr(0, 0.16);
    });

    const nF = Math.round(puffs.length * 18);
    const fMat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
    const fMesh = new THREE.InstancedMesh(fGeo, fMat, nF);
    const fT = new Float32Array(nF);
    for (let i = 0; i < nF; i++) {
      const p = puffs[(R() * puffs.length) | 0];
      tmp.set(rr(-1, 1), rr(-0.35, 1), rr(-1, 1)).normalize();      // favour the sunny top
      const pos = p.c.clone().addScaledVector(tmp, p.r * rr(0.7, 1.22));
      q.setFromUnitVectors(Z, tmp);
      q.multiply(new THREE.Quaternion().setFromAxisAngle(Z, rr(0, 6.3)));
      const sc = rr(0.13, 0.2);
      m4.compose(pos, q, s3.set(sc, sc, sc));
      fMesh.setMatrixAt(i, m4);
      fT[i] = R() < 0.18 ? rr(0.25, 0.5) : rr(0.55, 1);
    }

    // label anchor: above the cloud's centre
    const ctr = new V3();
    puffs.forEach((p) => ctr.add(p.c));
    ctr.divideScalar(puffs.length);
    let hi = -Infinity;
    puffs.forEach((p) => { hi = Math.max(hi, p.c.y + p.r); });

    scene.add(pMesh, fMesh);
    puffMeshes.push(pMesh);
    group[key] = {
      pMesh, pMat, pT, fMesh, fMat, fT, puffs, ctr,
      label: new V3(ctr.x, hi + 0.16, ctr.z),
      dim: 0, glow: 0, hover: 0
    };
  }

  /* petals: some lying on the plinth, some falling */
  const pGeo = petalGeo();
  const groundMat = new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide });
  const nG = 260;
  const ground = new THREE.InstancedMesh(pGeo, groundMat, nG);
  ground.receiveShadow = true;
  const gT = new Float32Array(nG);
  for (let i = 0; i < nG; i++) {
    const a = rr(0, 6.3), d = 2.5 * Math.sqrt(R()) * (R() < 0.65 ? 0.75 : 1);   // drift under the canopy
    q.setFromEuler(new THREE.Euler(-Math.PI / 2 + rr(-0.25, 0.25), rr(-0.25, 0.25), rr(0, 6.3)));
    const sc = rr(0.07, 0.11);
    m4.compose(tmp.set(Math.cos(a) * d, 0.012 + R() * 0.006, Math.sin(a) * d), q, s3.set(sc, sc, sc));
    ground.setMatrixAt(i, m4);
    gT[i] = rr(0.35, 1);
  }
  scene.add(ground);

  const allAnchors = KEYS.flatMap((k) => tree.anchors[k]);
  const nFall = RM ? 0 : 120;
  const fallMat = new THREE.MeshStandardMaterial({ roughness: 0.6, side: THREE.DoubleSide });
  const fall = new THREE.InstancedMesh(pGeo, fallMat, Math.max(nFall, 1));
  fall.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  fall.count = nFall;
  fall.castShadow = false;
  const F = Array.from({ length: nFall }, () => ({
    p: new V3(), v: new V3(), r: new THREE.Euler(), w: new V3(), ph: 0, s: 0, t: 0
  }));
  function spawn(f, from, burst) {
    if (burst) {
      f.p.copy(from).add(tmp.set(rr(-0.25, 0.25), rr(-0.1, 0.25), rr(-0.25, 0.25)));
      f.v.set(rr(-1, 1), rr(0.2, 1.1), rr(-1, 1)).multiplyScalar(rr(0.5, 1.2));
    } else {
      const a = allAnchors[(R() * allAnchors.length) | 0];
      f.p.copy(a.p).add(tmp.set(rr(-0.3, 0.3), rr(-0.15, 0.2), rr(-0.3, 0.3)));
      f.v.set(0, -rr(0.05, 0.2), 0);
    }
    f.r.set(rr(0, 6.3), rr(0, 6.3), rr(0, 6.3));
    f.w.set(rr(-3, 3), rr(-3, 3), rr(-3, 3));
    f.ph = rr(0, 6.3);
    f.s = rr(0.07, 0.11);
    f.t = rr(0.4, 1);
  }
  F.forEach((f) => { spawn(f); f.p.y -= rr(0, 3); });   // stagger so they don't fall in step

  /* ---------- colours from the active theme ---------- */
  const C = new THREE.Color(), W = new THREE.Color(1, 1, 1);
  let pal;
  function applyTheme() {
    const col = (v, fb) => { try { return new THREE.Color(css(v) || fb); } catch (e) { return new THREE.Color(fb); } };
    const accent = col("--accent", "#d94f6e"), ink = col("--ink", "#2b2724"), bg = col("--bg", "#fbf8f5");
    const bg2 = col("--bg2", "#f3ece6"), chip = col("--chip", "#f5ede7"), border = col("--border", "#e7ded5");
    pal = {
      deep: accent.clone().lerp(W, 0.3),
      light: accent.clone().lerp(W, 0.84),
      glow: accent.clone().lerp(W, 0.45)
    };
    barkMat.color.copy(ink).lerp(bg, 0.1);
    if (document.documentElement.getAttribute("data-theme") !== "manga") barkMat.color.lerp(new THREE.Color("#6e4c3c"), 0.3);
    plinthTop.color.copy(chip).lerp(ink, 0.05);
    plinthSide.color.copy(border).lerp(ink, 0.18);
    hemi.groundColor.copy(bg2);
    const paint = (mesh, ts) => {
      for (let i = 0; i < ts.length; i++) mesh.setColorAt(i, C.copy(pal.deep).lerp(pal.light, ts[i]));
      mesh.instanceColor.needsUpdate = true;
    };
    for (const k of KEYS) { paint(group[k].pMesh, group[k].pT); paint(group[k].fMesh, group[k].fT); }
    paint(ground, gT);
    if (nFall) paint(fall, Float32Array.from(F, (f) => f.t));
  }
  applyTheme();
  new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

  /* ---------- camera: a small hand-rolled orbit ---------- */
  const HOME = new V3(0, 1.55, 0);
  const target = HOME.clone(), tTarget = HOME.clone();
  let theta = 0.55, tTheta = theta, phi = 1.36, tPhi = phi, dist = 10, tDist = dist, fit = 10;
  let auto = !RM, lastTouch = 0, hovered = null, dragging = false, moved = false, sx = 0, sy = 0, st = 0, sp = 0;
  const ptr = new THREE.Vector2(), ray = new THREE.Raycaster();
  let ptrIn = false;

  function resize() {
    const w = wrap.clientWidth, h = wrap.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    const tan = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
    fit = Math.max(3.05 / tan, 3.15 / (tan * camera.aspect));
    focus(openKey(), true);
  }
  new ResizeObserver(resize).observe(wrap);

  const wrapAngle = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function focus(key, instant) {
    if (key && group[key]) {
      const c = group[key].ctr;
      tTarget.copy(HOME).lerp(c, 0.3);
      tTheta = theta + wrapAngle(Math.atan2(c.x, c.z) - theta);   // turn the tree to present it
      tPhi = 1.28;
      tDist = fit * 0.9;
    } else {
      tTarget.copy(HOME);
      tPhi = 1.36;
      tDist = fit;
    }
    if (instant || RM) { target.copy(tTarget); theta = tTheta; phi = tPhi; dist = tDist; }
    for (const k of KEYS) group[k].want = key ? (k === key ? 1 : -1) : 0;
  }

  function place() {
    const s = Math.sin(phi);
    camera.position.set(target.x + dist * s * Math.sin(theta), target.y + dist * Math.cos(phi), target.z + dist * s * Math.cos(theta));
    camera.lookAt(target);
  }

  function pick(cx, cy) {
    const r = canvas.getBoundingClientRect();
    ptr.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ptr, camera);
    const hit = ray.intersectObjects(puffMeshes, false)[0];
    return hit ? hit.object.userData.key : null;
  }

  let hx = 0, hy = 0;
  canvas.addEventListener("pointerdown", (e) => {
    dragging = true; moved = false; sx = e.clientX; sy = e.clientY; st = tTheta; sp = tPhi;
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener("pointermove", (e) => {
    hx = e.clientX; hy = e.clientY; ptrIn = true;
    if (!dragging) return;
    const dx = e.clientX - sx, dy = e.clientY - sy;
    if (!moved && Math.hypot(dx, dy) > 5) { moved = true; canvas.classList.add("grabbing"); }
    if (!moved) return;
    auto = false; lastTouch = performance.now();
    tTheta = st - dx * 0.008;
    if (e.pointerType === "mouse") tPhi = THREE.MathUtils.clamp(sp - dy * 0.004, 0.95, 1.48);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    canvas.classList.remove("grabbing");
    if (moved || e.type === "pointercancel") return;
    lastTouch = performance.now();
    const k = pick(e.clientX, e.clientY);
    if (k) nodeOf(k).click();                          // reuse the existing branch logic
    else if (openKey()) nodeOf(openKey()).click();     // empty space closes the open branch
  };
  canvas.addEventListener("pointerup", end);
  canvas.addEventListener("pointercancel", end);
  canvas.addEventListener("pointerleave", () => { ptrIn = false; });

  // labels and keyboard drive the same state; follow it here
  let lastOpen = null;
  wrap.addEventListener("click", () => {
    const k = openKey();
    if (k === lastOpen) return;
    lastOpen = k;
    lastTouch = performance.now();
    auto = false;
    focus(k);
    if (k && !RM) burst(group[k].ctr);
  });

  function burst(from) {
    let n = 0;
    for (const f of F) {
      if (n >= 34) break;
      if (R() < 0.45) { spawn(f, from, true); n++; }
    }
  }

  /* ---------- frame ---------- */
  const proj = new V3(), toCam = new V3(), toLbl = new V3(), eu = new THREE.Euler();
  let running = false, last = 0, shown = false;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000 || 0);
    last = now;
    const k = RM ? 1 : 1 - Math.exp(-dt * 4.2);

    // drift slowly when nobody is using it
    if (!auto && !RM && !openKey() && !dragging && !ptrIn && now - lastTouch > 4000) auto = true;
    if (auto && !dragging) tTheta += dt * 0.11;

    theta += (tTheta - theta) * k;
    phi += (tPhi - phi) * k;
    dist += (tDist - dist) * k;
    target.lerp(tTarget, k);
    place();

    // hover
    if (ptrIn && !dragging) {
      hovered = pick(hx, hy);
      canvas.classList.toggle("over", !!hovered);
    } else if (!ptrIn) { hovered = null; canvas.classList.remove("over"); }

    for (const key of KEYS) {
      const g = group[key], want = g.want || 0;
      g.dim += ((want < 0 ? 1 : 0) - g.dim) * k;
      g.glow += ((want > 0 ? 1 : 0) - g.glow) * k;
      g.hover += ((hovered === key ? 1 : 0) - g.hover) * (RM ? 1 : 1 - Math.exp(-dt * 10));
      const shade = 1 - 0.32 * g.dim;
      g.pMat.color.setScalar(shade);
      g.fMat.color.setScalar(shade);
      const e = 0.2 * g.glow + 0.12 * g.hover;
      g.pMat.emissive.copy(pal.glow).multiplyScalar(e);
      g.fMat.emissive.copy(pal.glow).multiplyScalar(0.09 + e * 1.3);   // keeps shaded petals from going grey

      // label follows its blossoms; fades when they swing round the back
      const n = nodeOf(key);
      proj.copy(g.label).project(camera);
      n.style.setProperty("--x", ((proj.x + 1) * 50).toFixed(2) + "%");
      n.style.setProperty("--y", ((1 - proj.y) * 50).toFixed(2) + "%");
      toCam.copy(camera.position).sub(target).setY(0).normalize();
      toLbl.copy(g.ctr).sub(HOME).setY(0).normalize();
      const face = toCam.dot(toLbl);
      n.style.setProperty("--vis", (0.42 + 0.58 * THREE.MathUtils.smoothstep(face, -0.7, 0.2)).toFixed(3));
      n.style.setProperty("--z", String(Math.round(face * 10) + 20));
    }

    // falling petals: drift, tumble, sway in a light breeze
    for (let i = 0; i < nFall; i++) {
      const f = F[i];
      f.v.y = Math.max(f.v.y - 0.32 * dt, -0.42);
      f.v.x *= 1 - 1.4 * dt; f.v.z *= 1 - 1.4 * dt;
      f.p.x += (f.v.x + Math.sin(now * 0.0013 + f.ph) * 0.22 + 0.07) * dt;
      f.p.z += (f.v.z + Math.cos(now * 0.0011 + f.ph) * 0.16) * dt;
      f.p.y += f.v.y * dt;
      f.r.x += f.w.x * dt; f.r.y += f.w.y * dt; f.r.z += f.w.z * dt;
      const onPlinth = f.p.x * f.p.x + f.p.z * f.p.z < 2.55 * 2.55;
      if ((onPlinth && f.p.y < 0.02) || f.p.y < -3) spawn(f);
      q.setFromEuler(eu.copy(f.r));
      m4.compose(f.p, q, s3.set(f.s, f.s, f.s));
      fall.setMatrixAt(i, m4);
    }
    if (nFall) fall.instanceMatrix.needsUpdate = true;

    renderer.render(scene, camera);
    if (!shown) {                                       // swap the SVG out only once we've drawn
      shown = true;
      wrap.classList.add("three-on");
      const hint = wrap.parentNode.querySelector(".bonsai-hint");
      if (hint) hint.textContent = "// drag to turn the tree · click a blossom to open it";
    }
    requestAnimationFrame(frame);
  }
  function run(on) {
    if (on && !running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
    else if (!on) running = false;
  }

  let inView = true;
  new IntersectionObserver((es) => { inView = es[0].isIntersecting; run(inView && !document.hidden); })
    .observe(wrap);
  document.addEventListener("visibilitychange", () => run(inView && !document.hidden));

  resize();
  lastOpen = openKey();                                 // honour ?branch= deep links
  focus(lastOpen, true);
  run(true);
}
