import * as THREE from 'three'

// HALLA 1947 — 어두운 배경 위의 3D 한라산. 코스를 고르면 카메라가 다가가고 등산로가 빛나는 선으로 그려짐.
// 1 단위 = 1km (세로는 보기 좋게 VS 배 과장)
const SUMMIT = { lat: 33.3617, lng: 126.5292, elev: 1947 }
const VS = 2.4
const KM_LAT = 111.3, KM_LNG = 92.5
const SIZE = { w: 46, d: 32 }

const toWorld = (lat, lng) => [(lng - SUMMIT.lng) * KM_LNG, -(lat - SUMMIT.lat) * KM_LAT] // x 동쪽, z 남쪽

// 값 잡음 (같은 모양이 매번 나오게)
const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s) }
const smooth = (t) => t * t * (3 - 2 * t)
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = smooth(x - xi), yf = smooth(y - yi)
  const a = hash(xi, yi), b = hash(xi + 1, yi), c = hash(xi, yi + 1), d = hash(xi + 1, yi + 1)
  return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf
}
const fbm = (x, y) => noise(x, y) * 0.55 + noise(x * 2.1, y * 2.1) * 0.28 + noise(x * 4.3, y * 4.3) * 0.17

// 산의 높이(m): 동서로 긴 방패 모양 + 정상 분화구(백록담)
function heightM(x, z) {
  const rho = Math.hypot(x / 1.25, z)
  const base = SUMMIT.elev * Math.pow(Math.max(0, 1 - rho / 17), 1.9)
  const rough = (fbm(x * 0.7 + 9, z * 0.7 + 3) - 0.5) * 2
  const h = base + rough * 130 * Math.min(1, base / 600)
  const crater = Math.max(0, 1 - Math.hypot(x, z) / 0.55)
  return Math.max(0, h - crater * crater * 90)
}
const heightY = (x, z) => (heightM(x, z) / 1000) * VS

function cloudTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d'); const grad = g.createRadialGradient(64, 64, 4, 64, 64, 62)
  grad.addColorStop(0, 'rgba(255,255,255,.9)'); grad.addColorStop(0.5, 'rgba(255,255,255,.32)'); grad.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128)
  return new THREE.CanvasTexture(c)
}

// 코스 한 개의 선: 출발 → 도착(어림 도착점은 높이 1700m 지점까지) 사이를 살짝 굽이치게 지형 위에 얹음
function trailPoints(t) {
  const [sx, sz] = toWorld(t.start.lat, t.start.lng)
  let [ex, ez] = toWorld(t.goal.lat, t.goal.lng)
  if (t.goal.approx) {
    for (let i = 1; i <= 100; i++) {
      const u = i / 100, x = sx + (ex - sx) * u, z = sz + (ez - sz) * u
      if (heightM(x, z) >= 1700) { ex = x; ez = z; break }
    }
  }
  const dx = ex - sx, dz = ez - sz, len = Math.hypot(dx, dz) || 1, nx = -dz / len, nz = dx / len
  const pts = []
  for (let i = 0; i <= 90; i++) {
    const u = i / 90, w = Math.sin(u * Math.PI * 7) * 0.16 * Math.sin(u * Math.PI)
    const x = sx + dx * u + nx * w, z = sz + dz * u + nz * w
    pts.push(new THREE.Vector3(x, heightY(x, z) + 0.035, z))
  }
  return pts
}

export function createHallaScene(host, trails) {
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5))
  renderer.setClearColor(0x000000, 0)
  host.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.fog = new THREE.FogExp2(0x030407, 0.022)
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 120)

  // ── 산 ──
  const group = new THREE.Group()
  scene.add(group)
  const seg = [150, 105]
  const geo = new THREE.PlaneGeometry(SIZE.w, SIZE.d, seg[0], seg[1])
  geo.rotateX(-Math.PI / 2)
  const pos = geo.attributes.position
  const colors = new Float32Array(pos.count * 3)
  const low = new THREE.Color('#22362b'), mid = new THREE.Color('#4d6350'), rock = new THREE.Color('#8a7e72'), top = new THREE.Color('#cfc8bd')
  const tmp = new THREE.Color()
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), m = heightM(x, z)
    const e = Math.min(1, Math.max(0, (Math.hypot(x / SIZE.w, z / SIZE.d) - 0.28) / 0.22)) // 가장자리는 아래로 가라앉혀 어둠 속으로 사라지게
    pos.setY(i, (m / 1000) * VS - e * e * 1.2)
    const t = m / SUMMIT.elev
    if (t < 0.35) tmp.copy(low).lerp(mid, t / 0.35)
    else if (t < 0.8) tmp.copy(mid).lerp(rock, (t - 0.35) / 0.45)
    else tmp.copy(rock).lerp(top, (t - 0.8) / 0.2)
    tmp.multiplyScalar(0.85 + fbm(x * 3, z * 3) * 0.3)
    colors.set([tmp.r, tmp.g, tmp.b], i * 3)
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geo.computeVertexNormals()
  const mountain = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, flatShading: false }))
  group.add(mountain)

  scene.add(new THREE.HemisphereLight(0x8aa0d0, 0x10121a, 0.95))
  const key = new THREE.DirectionalLight(0xffc98a, 3.4) // 낮게 비추는 골든아워 빛
  key.position.set(-14, 5, -8)
  scene.add(key)
  const rim = new THREE.DirectionalLight(0x6e8cff, 1.1)
  rim.position.set(12, 6, 10)
  scene.add(rim)

  // ── 구름 ──
  const tex = cloudTexture()
  const clouds = []
  for (let i = 0; i < 16; i++) {
    const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, opacity: 0.03 + hash(i, 1) * 0.07, depthWrite: false, fog: false })
    const s = new THREE.Sprite(mat)
    const size = 5 + hash(i, 2) * 7
    s.scale.set(size * 1.7, size * 0.7, 1)
    s.position.set((hash(i, 3) - 0.5) * 40, 3.2 + hash(i, 4) * 2.6, (hash(i, 5) - 0.5) * 22)
    s.userData.speed = 0.12 + hash(i, 6) * 0.2
    scene.add(s); clouds.push(s)
  }

  // ── 코스 선 ──
  const lines = {}
  const goldMat = () => new THREE.MeshBasicMaterial({ color: 0xefc050, transparent: true, opacity: 1, depthTest: false, fog: false })
  const glowMat = () => new THREE.MeshBasicMaterial({ color: 0xefc050, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false, fog: false })
  for (const t of trails) {
    const pts = trailPoints(t)
    const curve = new THREE.CatmullRomCurve3(pts)
    const core = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.03, 6, false), goldMat())
    const glow = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.09, 8, false), glowMat())
    core.renderOrder = 3; glow.renderOrder = 2
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 16), new THREE.MeshBasicMaterial({ color: 0xfff1cf, depthTest: false, fog: false }))
    head.renderOrder = 4
    const goal = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff, depthTest: false, fog: false, transparent: true, opacity: 0 }))
    goal.position.copy(pts[pts.length - 1]); goal.renderOrder = 4
    const g = new THREE.Group(); g.add(glow, core, head, goal); g.visible = false
    group.add(g)
    lines[t.id] = { g, core, glow, head, goal, curve, total: core.geometry.index.count, totalGlow: glow.geometry.index.count, pts }
  }

  // ── 카메라 ──
  const overview = { pos: new THREE.Vector3(0, 4.4, 27), look: new THREE.Vector3(0, 1.5, 0) }
  const camPos = new THREE.Vector3(0, 8, 42), camLook = overview.look.clone()
  let target = overview
  const shots = {}
  for (const t of trails) {
    const p = lines[t.id].pts, a = p[0], b = p[p.length - 1], m = a.clone().lerp(b, 0.5)
    const away = new THREE.Vector3(a.x - b.x, 0, a.z - b.z).normalize()
    const side = new THREE.Vector3(-away.z, 0, away.x).multiplyScalar(2.2)
    shots[t.id] = { pos: m.clone().addScaledVector(away, 8).add(side).setY(Math.max(a.y, m.y) + 3.6), look: m.clone().lerp(b, 0.35).setY(m.y + 0.35) }
  }

  let active = null, progress = 0
  const setTrail = (id) => {
    active = id && lines[id] ? id : null
    progress = 0
    for (const [k, l] of Object.entries(lines)) l.g.visible = k === active
    target = active ? shots[active] : overview
  }

  const mouse = { x: 0, y: 0 }, rot = { x: 0, y: 0 }
  const onMove = (e) => { mouse.x = (e.clientX / window.innerWidth - 0.5) * 2; mouse.y = (e.clientY / window.innerHeight - 0.5) * 2 }
  if (!reduce) window.addEventListener('pointermove', onMove)

  const resize = () => {
    const w = host.clientWidth || 1, h = host.clientHeight || 1
    renderer.setSize(w, h)
    camera.aspect = w / h
    camera.fov = w / h < 0.9 ? 52 : 38 // 세로로 긴 화면은 시야를 넓힘
    camera.updateProjectionMatrix()
  }
  const ro = new ResizeObserver(resize); ro.observe(host); resize()

  const clock = new THREE.Clock()
  let raf = 0, intro = 0, shift = 0
  const frame = () => {
    raf = requestAnimationFrame(frame)
    const dt = Math.min(clock.getDelta(), 0.25), t = clock.elapsedTime
    intro = Math.min(1, intro + dt / 2.6)
    const ease = 1 - Math.pow(1 - intro, 3)
    group.position.y = (1 - ease) * -2.2 // 서서히 떠오르며 등장
    host.style.opacity = String(Math.min(1, intro * 1.6))

    rot.y += ((reduce ? 0 : mouse.x * 0.28) - rot.y) * Math.min(1, dt * 2.2)
    rot.x += ((reduce ? 0 : mouse.y * 0.05) - rot.x) * Math.min(1, dt * 2.2)
    group.rotation.y = rot.y + Math.sin(t * 0.1) * 0.02
    group.rotation.x = rot.x

    const k = 1 - Math.exp(-dt * 1.6)
    camPos.lerp(target.pos, k); camLook.lerp(target.look, k)
    camera.position.copy(camPos); camera.lookAt(camLook)
    // 코스를 고르면 산을 왼쪽으로 밀어 오른쪽 날씨 패널과 겹치지 않게 함
    const w = host.clientWidth || 1, h = host.clientHeight || 1
    shift += ((active && w / h > 1.1 ? w * 0.16 : 0) - shift) * k
    camera.setViewOffset(w, h, shift, 0, w, h)

    for (const c of clouds) {
      c.position.x += c.userData.speed * dt
      if (c.position.x > 24) c.position.x = -24
    }

    if (active) {
      const l = lines[active]
      progress = Math.min(1, progress + dt / 2.6)
      const p = 1 - Math.pow(1 - progress, 2)
      l.core.geometry.setDrawRange(0, Math.floor((l.total * p) / 6) * 6)
      l.glow.geometry.setDrawRange(0, Math.floor((l.totalGlow * p) / 6) * 6)
      l.head.position.copy(l.curve.getPoint(p))
      l.head.scale.setScalar(1 + Math.sin(t * 5) * 0.15)
      l.goal.material.opacity = progress >= 1 ? 0.6 + Math.sin(t * 3) * 0.4 : 0
      l.glow.material.opacity = 0.2 + Math.sin(t * 2.4) * 0.08
    }
    renderer.render(scene, camera)
  }
  frame()

  return {
    setTrail,
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); window.removeEventListener('pointermove', onMove)
      scene.traverse((o) => { o.geometry?.dispose(); o.material?.dispose?.() })
      tex.dispose(); renderer.dispose(); renderer.domElement.remove()
    },
  }
}
