import * as THREE from 'three'
import { skyColors, smoothstep, lerp, clamp } from './palette'
import { buildSilhouette } from './silhouettes'
import { createDipper } from './dipper'
import { createMeteors } from './meteors'
import { createSeaLife } from './seaLife'
import { createWeatherFx } from './weatherEffects'

const D2R = Math.PI / 180
const SUN_MAX_EL = 34 * D2R // 한낮에 해가 오르는 높이(화면 위쪽 안에 머물게)
const NIGHT_DEPTH = 45 * D2R // 한밤중에 해가 수평선 아래로 내려가는 깊이

// 작은 난수 생성기 (구름·별 위치를 매번 똑같이)
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

// ── 셰이더 ──────────────────────────────────────────────
const SKY_VERT = `
varying vec3 vDir;
void main(){ vDir = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.); }`

const SKY_FRAG = `
uniform vec3 uTop, uHorizon, uSunColor, uSunDir;
uniform float uNight, uSunVis, uGlow;
varying vec3 vDir;
void main(){
  vec3 d = normalize(vDir);
  float h = clamp(d.y, 0., 1.);
  vec3 col = mix(uHorizon, uTop, pow(h, .5));
  float sd = max(dot(d, uSunDir), 0.);
  float glow = (pow(sd, 5.) * .20 + pow(sd, 40.) * .32) * uGlow;
  float disk = smoothstep(.99935, .99965, sd);
  col += uSunColor * glow * (1. - uNight * .85) * uSunVis;
  col += uSunColor * disk * (.6 + .5 * uGlow) * uSunVis;
  col = mix(col, uHorizon * 1.04, exp(-h * 16.) * .55);   // 수평선 안개띠
  gl_FragColor = vec4(col, 1.);
}`

const SEA_VERT = `
uniform float uTime, uAmp, uFreq;
varying vec3 vWorld; varying vec3 vN;
void addWave(vec2 p, vec2 d, float k, float w, float a, inout float h, inout vec2 g){
  float ph = dot(normalize(d), p) * k * uFreq + uTime * w;
  h += a * sin(ph);
  g += a * k * uFreq * cos(ph) * normalize(d);
}
void main(){
  vec3 p = position;
  float h = 0.; vec2 g = vec2(0.);
  addWave(p.xz, vec2(1.,.3),   .35, 1.1, .35 * uAmp, h, g);
  addWave(p.xz, vec2(-.6,1.),  .55, 1.5, .22 * uAmp, h, g);
  addWave(p.xz, vec2(.3,-1.),  .90, 2.0, .12 * uAmp, h, g);
  addWave(p.xz, vec2(1.,1.),  1.60, 2.8, .06 * uAmp, h, g);
  p.y += h;
  vN = normalize(vec3(-g.x, 1., -g.y));
  vec4 w = modelMatrix * vec4(p, 1.);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}`

const SEA_FRAG = `
uniform vec3 uTop, uHorizon, uSunColor, uSunDir, uDeep, uCam, uShallow, uMidSea;
uniform vec4 uIsl; // 섬 중심(x,z)과 가로 방향(x,z)
uniform vec4 uMoon; // 달 방향(xyz)과 보이는 정도(w)
uniform float uNight, uSunVis, uTime, uFogK;
varying vec3 vWorld; varying vec3 vN;
void main(){
  vec3 toCam = uCam - vWorld;
  float dist = length(toCam);
  vec3 V = toCam / dist;
  vec2 rp = vWorld.xz;
  vec3 rip = vec3(sin(rp.x*3.1+uTime*1.3) + sin(rp.y*4.3-uTime), 0., sin(rp.y*2.7+uTime*1.1) + sin(rp.x*5.1+uTime*.7));
  vec3 N = normalize(vN + rip * .018 / (1. + dist * .02));
  float fres = pow(1. - max(dot(N, V), 0.), 4.);
  vec3 R = reflect(-V, N);
  vec3 sky = mix(uHorizon, uTop, pow(clamp(R.y, 0., 1.), .5));
  float blot = .5 + .5 * sin(rp.x * .045 + sin(rp.y * .031) * 2.2) * sin(rp.y * .052 - rp.x * .018);
  float shallow = (1. - smoothstep(10., 170., dist + blot * 55.));
  vec3 water = mix(uDeep, uMidSea, smoothstep(14., 140., dist));
  water = mix(water, uShallow, shallow);
  water += uShallow * .10 * pow(max(vN.y < 1. ? 1. - vN.y : 0., 0.) * 8., 1.) * shallow; // 파도 마루가 살짝 밝게
  vec3 col = mix(water, sky, clamp(fres * .6 + .02, 0., 1.));
  float sd = max(dot(R, uSunDir), 0.);
  float up = smoothstep(-.10, .03, uSunDir.y);
  float spec = pow(sd, 450.) * 1.7 + pow(sd, 45.) * .32 + pow(sd, 7.) * .12;
  col += uSunColor * spec * up * (1. - uNight) * uSunVis;
  // 윤슬: 해가 낮게 내려올수록 주황·황금빛이 해 바로 아래 바다를 따라 길게, 잘게 반짝임 (밤에는 달빛이 은빛으로)
  vec3 Dv = vWorld - uCam;
  float fAz = atan(Dv.x, -Dv.z);
  float w = .045 + 2.6 / (dist + 22.);                            // 가까운 물일수록 길이 넓어짐
  float n1 = sin(rp.x * 2.3 + uTime * 2.1) * sin(rp.y * 2.9 - uTime * 1.7);
  float n2 = sin(rp.x * 5.1 - uTime * 3.3 + rp.y * 1.7) * sin(rp.y * 4.7 + uTime * 2.6);
  float sparkle = smoothstep(.28, .9, n1 * .6 + n2 * .5 + .22);   // 물결마다 반짝이는 점
  float sAz = atan(uSunDir.x, -uSunDir.z);
  float dS = abs(mod(fAz - sAz + 3.14159265, 6.2831853) - 3.14159265);
  float sunLow = smoothstep(.62, .05, uSunDir.y) * smoothstep(-.07, .02, uSunDir.y);   // 해가 낮을수록 강함
  vec3 glintC = mix(vec3(1., .74, .38), uSunColor, .45);
  col += glintC * exp(-pow(dS / w, 2.)) * (.16 + .95 * sparkle) * sunLow * (1. - uNight) * uSunVis * smoothstep(5., 30., dist) * .75;
  float mAz = atan(uMoon.x, -uMoon.z);
  float dM = abs(mod(fAz - mAz + 3.14159265, 6.2831853) - 3.14159265);
  col += vec3(.72, .82, 1.) * exp(-pow(dM / (w * .8), 2.)) * (.12 + .7 * sparkle) * uMoon.w * uNight * smoothstep(5., 30., dist) * .6;

  vec2 pi = vWorld.xz - uIsl.xy;
  float along = dot(pi, uIsl.zw);
  float front = -dot(pi, normalize(uIsl.xy));                   // 섬 바로 앞(카메라 쪽)으로 얼마나 떨어졌나
  float inside = 1. - smoothstep(190., 250., abs(along));
  float lagoon = (1. - smoothstep(0., 70., front)) * step(-4., front) * inside;
  col = mix(col, uShallow * 1.18, lagoon * .55 * (1. - uNight));  // 섬 앞은 하와이 라군처럼 맑은 청록
  float surf = smoothstep(0., 2.5, front) * (1. - smoothstep(5., 13., front)) * inside * (.55 + .45 * sin(along * .9 + uTime * 1.3));
  col = mix(col, vec3(1.), surf * .6 * (1. - uNight * .8));      // 해안에 부서지는 하얀 파도
  col = mix(col, uHorizon, 1. - exp(-dist * (.0018 + .02 * uFogK)));      // 먼 바다는 수평선 색으로 (안개 날에는 더 빨리 흐려져 수평선이 사라짐)
  gl_FragColor = vec4(col, 1.);
}`

// ── 구름 스프라이트 텍스처 ──────────────────────────────
function cloudTexture() {
  const c = document.createElement('canvas')
  c.width = 256; c.height = 128
  const g = c.getContext('2d')
  const r = rng(11)
  // 윗면은 둥글게, 아랫면은 납작한 뭉게구름: 가운데는 크고 높게, 가장자리는 작고 낮게 덩어리를 쌓음
  for (let i = 0; i < 30; i++) {
    const t = i / 29
    const x = 36 + t * 184 + (r() - 0.5) * 16
    const bell = Math.sin(Math.PI * t)
    const rad = 15 + bell * 28 + r() * 12
    const y = 84 - bell * 22 - r() * 8
    const gr = g.createRadialGradient(x, y, 0, x, y, rad)
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.6, 'rgba(255,255,255,.92)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = gr
    g.fillRect(0, 0, 256, 128)
  }
  g.globalCompositeOperation = 'source-atop' // 아랫면에 은은한 그림자를 입혀 몽글몽글 입체감을 줌
  const shade = g.createLinearGradient(0, 46, 0, 92)
  shade.addColorStop(0, 'rgba(160,178,210,0)'); shade.addColorStop(1, 'rgba(150,168,204,.75)')
  g.fillStyle = shade
  g.fillRect(0, 0, 256, 128)
  g.globalCompositeOperation = 'destination-out' // 아랫면을 부드럽게 평평하게 깎음
  const cut = g.createLinearGradient(0, 80, 0, 104)
  cut.addColorStop(0, 'rgba(0,0,0,0)'); cut.addColorStop(1, 'rgba(0,0,0,1)')
  g.fillStyle = cut
  g.fillRect(0, 80, 256, 48)
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

// 달: 오른쪽이 밝은 가는 초승달(차오르는 달)로 고정. API 의 위상 값과 상관없이 늘 같은 모양.
// 어두운 쪽의 둥근 반투명 원(지구반사광)은 그리지 않고, 밝은 초승달 모양만 남김. 밝은 쪽에는 눈에 띄지 않을 만큼 옅은 분화구 질감을 넣음.
// 두 원을 겹쳐 오려 내지 않고, 반원 + 타원(경계선) 경로로 그려서 가장자리가 매끈함.
// 장면에서는 이 달 스프라이트를 오른쪽으로 기울여 놓음(MOON_TILT).
function moonTexture() {
  const S = 512, R = 190, cx = S / 2, cy = S / 2
  const c = document.createElement('canvas'); c.width = c.height = S
  const g = c.getContext('2d')

  // 밝은 초승달 모양 경로: 오른쪽 반원 + 안쪽 경계선(타원)
  const k = 0.17, rx = R * (1 - 2 * k)
  const crescent = () => {
    g.beginPath()
    g.arc(cx, cy, R, -Math.PI / 2, Math.PI / 2, false)
    g.ellipse(cx, cy, rx, R, 0, Math.PI / 2, -Math.PI / 2, true)
    g.closePath()
  }
  // 달 가까이에만 번지는 은은한 빛
  g.save(); g.shadowColor = 'rgba(255,238,200,.55)'; g.shadowBlur = 22; g.fillStyle = '#fff4dc'; crescent(); g.fill(); g.restore()

  // 3) 몸체: 따뜻한 상아색, 안쪽(경계선) 쪽은 살짝 어둡게
  g.save(); crescent(); g.clip()
  const body = g.createLinearGradient(cx - rx, 0, cx + R, 0)
  body.addColorStop(0, '#e6d8b8'); body.addColorStop(0.45, '#fbf0d6'); body.addColorStop(1, '#fffaea')
  g.fillStyle = body; g.fillRect(0, 0, S, S)
  // 4) 달 표면: 아주 옅고 작은 분화구와 어두운 바다 무늬
  let seed = 12; const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
  g.fillStyle = 'rgba(150,130,98,.09)'
  for (const [x, y, rr] of [[60, -50, 54], [95, 40, 40], [40, 110, 46], [120, -110, 34]]) { g.beginPath(); g.arc(cx + x, cy + y, rr, 0, Math.PI * 2); g.fill() }
  for (let i = 0; i < 34; i++) {
    const x = cx + 20 + r() * (R - 20), y = cy + (r() - 0.5) * R * 1.7, rr = 3 + r() * 9
    g.fillStyle = 'rgba(140,120,90,.10)'; g.beginPath(); g.arc(x, y, rr, 0, Math.PI * 2); g.fill()
    g.strokeStyle = 'rgba(255,255,255,.14)'; g.lineWidth = 1; g.beginPath(); g.arc(x - 1, y - 1, rr, Math.PI * 0.9, Math.PI * 1.7); g.stroke()
  }
  g.restore()

  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  t.anisotropy = 4
  return t
}

const LAYERS = [ // 저층·중층·고층 구름: 높이(고도각)·크기·진하기, min = 맑은 날에도 떠 있는 기본 구름 수
  { key: 'low', max: 18, min: 4, el: [3, 10], scale: [130, 220], opacity: 0.9 },
  { key: 'mid', max: 18, min: 7, el: [11, 28], scale: [150, 260], opacity: 0.82 },
  { key: 'high', max: 14, min: 4, el: [28, 50], scale: [210, 340], opacity: 0.6 },
]

export function createScene(canvas, { mobile }) {
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches // 움직임 줄이기 설정
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: !mobile, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.25 : 1.75))

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(58, 1, 0.5, 3000)
  camera.rotation.order = 'YXZ'
  const CAM_H = 4
  const PITCH = 0.17 // 카메라는 살짝만 위를 봄 — 고정

  // 하늘
  const skyU = {
    uTop: { value: new THREE.Vector3() }, uHorizon: { value: new THREE.Vector3() }, uSunColor: { value: new THREE.Vector3() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uNight: { value: 0 }, uSunVis: { value: 1 }, uGlow: { value: 1 },
  }
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: skyU, side: THREE.BackSide, depthWrite: false }),
  )
  sky.renderOrder = -10
  scene.add(sky)

  // 별
  const starPos = []
  const rs = rng(5)
  for (let i = 0; i < (mobile ? 650 : 1100); i++) {
    const az = (rs() - 0.5) * 2.6, el = Math.asin(0.02 + rs() * 0.72) // 정면 ±75°, 고도 0~46° 안에 흩뿌림 (카메라는 이쪽만 봄)
    starPos.push(Math.sin(az) * Math.cos(el) * 800, Math.sin(el) * 800, -Math.cos(az) * Math.cos(el) * 800)
  }
  const starGeo = new THREE.BufferGeometry()
  starGeo.setAttribute('position', new THREE.Float32BufferAttribute(starPos, 3))
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: mobile ? 1.6 : 1.8, sizeAttenuation: false, transparent: true, opacity: 0, depthWrite: false })
  const stars = new THREE.Points(starGeo, starMat)
  stars.renderOrder = -9
  const starGroup = new THREE.Group() // 시선 방향을 따라 돌려 별이 항상 정면에 있게 함
  starGroup.add(stars)
  scene.add(starGroup)
  const dipper = createDipper(starGroup) // 북두칠성이 한 별씩 반짝
  const meteors = createMeteors(starGroup, { mobile, reduced }) // 가끔 떨어지는 별똥별
  const wx = createWeatherFx(scene, { mobile, fog: true, mist: true }) // 실제 날씨: 비·눈·안개·해무 (weatherEffects.js)

  // 바다: 카메라 근처는 촘촘하고 멀수록 성긴 격자
  const seg = mobile ? 72 : 140
  const seaGeo = new THREE.PlaneGeometry(1, 1, seg, seg)
  const sp = seaGeo.attributes.position
  for (let i = 0; i < sp.count; i++) {
    const u = sp.getX(i) * 2, v = sp.getY(i) * 2
    sp.setXY(i, Math.sign(u) * Math.pow(Math.abs(u), 2.4) * 700, Math.sign(v) * Math.pow(Math.abs(v), 2.4) * 700)
  }
  seaGeo.rotateX(-Math.PI / 2)
  const seaU = {
    ...skyU, uTime: { value: 0 }, uAmp: { value: 0.7 }, uFreq: { value: 1 }, uFogK: { value: 0 }, uDeep: { value: new THREE.Vector3() }, uCam: { value: new THREE.Vector3() },
    uShallow: { value: new THREE.Vector3() }, uMidSea: { value: new THREE.Vector3() }, uIsl: { value: new THREE.Vector4(0, -420, 1, 0) }, uMoon: { value: new THREE.Vector4(0, 0, -1, 0) },
  }
  const sea = new THREE.Mesh(seaGeo, new THREE.ShaderMaterial({ vertexShader: SEA_VERT, fragmentShader: SEA_FRAG, uniforms: seaU }))
  sea.frustumCulled = false
  scene.add(sea)
  const seaLife = createSeaLife(scene, { mobile }) // 밤: 오징어잡이 배 / 낮: 해녀와 테왁

  // 제주 실루엣 (모든 명소에서 같은 모양) — 앞 섬과 뒤 섬을 겹치되 같은 진한 색 하나로 칠해서 하나의 섬처럼 보이게 함
  const silGeo = buildSilhouette()
  // 섬에 색 입히기: 해안은 초록(그리너리), 중턱은 짙은 숲, 한라산 꼭대기는 푸른 회색. 시간대에 따라 하늘빛·안개가 섞임
  const silPos = silGeo.attributes.position
  const silCol = new THREE.BufferAttribute(new Float32Array(silPos.count * 3), 3)
  silGeo.setAttribute('color', silCol)
  const silT = Array.from({ length: silPos.count }, (_, i) => clamp(silPos.getY(i) / 64, 0, 1)) // 0 해안 ~ 1 정상
  const ISLAND_LOW = [0.24, 0.62, 0.30], ISLAND_MID = [0.15, 0.47, 0.29], ISLAND_HIGH = [0.36, 0.52, 0.50], ISLAND_NIGHT = [0.02, 0.035, 0.06]
  const tmpC = new THREE.Color()
  function paintIsland(horizon, haze, day, dim) { // dim: 해가 낮을수록 어둡게(저녁·새벽의 역광)
    for (let i = 0; i < silPos.count; i++) {
      const t = silT[i]
      const a = t < 0.5 ? ISLAND_LOW : ISLAND_MID, b = t < 0.5 ? ISLAND_MID : ISLAND_HIGH, k = t < 0.5 ? t * 2 : (t - 0.5) * 2
      const rgb = [0, 1, 2].map((c) => {
        const dayC = lerp(a[c], b[c], k)
        const tone = lerp(ISLAND_NIGHT[c], dayC, Math.pow(day, 0.8))
        return lerp(tone, horizon[c], Math.max(haze * 0.85, 0.32)) * dim
      })
      tmpC.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace)
      silCol.setXYZ(i, tmpC.r, tmpC.g, tmpC.b)
    }
    silCol.needsUpdate = true
  }
  const silMat = new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, side: THREE.DoubleSide, fog: false })
  const sil = new THREE.Mesh(silGeo, silMat)
  const silFar = new THREE.Mesh(silGeo, silMat) // 같은 재질 → 색이 항상 똑같음
  silFar.scale.set(1.55, 0.5, 1)
  scene.add(silFar, sil)

  // 구름
  const tex = cloudTexture()
  const cloudLayers = LAYERS.map((L, li) => {
    const r = rng(100 + li)
    const n = Math.round(L.max * (mobile ? 0.55 : 1))
    const sprites = Array.from({ length: n }, () => {
      const m = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, fog: false, opacity: 0 })
      const s = new THREE.Sprite(m)
      const az = (-60 + r() * 120) * D2R, el = (L.el[0] + r() * (L.el[1] - L.el[0])) * D2R, d = 620
      const sc = L.scale[0] + r() * (L.scale[1] - L.scale[0])
      s.scale.set(sc, sc * (L.ratio ?? 0.5), 1)
      s.renderOrder = -5
      s.visible = false
      scene.add(s)
      return { s, a: 0, az, el, d, sx: sc, sy: sc * (L.ratio ?? 0.5), speed: (0.007 + r() * 0.009) * (li === 2 ? 0.7 : 1) * (L.speed ?? 1), dir: new THREE.Vector3() }
    })
    return { ...L, sprites }
  })

  // 달: sunrise-sunset.org v2 의 월출·월몰·위상으로 위치와 모양을 정함
  // 달 뒤의 둥근 빛무리(반투명 원)는 없앰 — 초승달 모양만 보이게
  const MOON_TILT = -0.49 // 라디안(시계 방향 약 28°): 위쪽 뿔이 오른쪽으로 기울어진 초승달
  let moonTex = moonTexture()
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, transparent: true, depthWrite: false, fog: false, opacity: 0, rotation: MOON_TILT }))
  moon.scale.set(84, 84, 1); moon.renderOrder = -6; moon.visible = false; scene.add(moon)
  let moonKey = ''
  const dbg = {} // 개발 중 점검용(window.__sky.debug())

  // ── 상태: target 은 바깥(스토어)에서 받은 값, cur 는 부드럽게 따라가는 현재 값 ──
  const target = {
    minutes: 1050, lat: 33.4, doy: 100, solarNoon: 750, sunriseMin: 400, sunsetMin: 1080, best: 'sunset',
    shape: 'crown', total: 20, low: 10, mid: 10, high: 10, wave: 0.6,
    moonriseMin: null, moonsetMin: null, moonIllum: null, moonWaxing: true,
  }
  const cur = { minutes: 1050, total: 20, low: 10, mid: 10, high: 10, wave: 0.6, yaw: 180 * D2R, pitch: 0.1 }
  const pointer = { x: 0, y: 0, sx: 0, sy: 0 }
  let paused = false, time = 0, last = performance.now()

  const sunDirOf = (az, el) => new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el))

  let facing = Math.PI, placed = false // 카메라가 고정해서 바라보는 방위(라디안)

  function placeSilhouette() {
    // 카메라는 명소를 바꿔도 돌아가지 않고 항상 같은 방향(남쪽)을 봄 — 일출↔일몰 명소를 오가도 화면이 좌우로 틀어지지 않음
    if (!placed) { cur.yaw = facing; placed = true }
    // 제주는 언제나 화면 왼쪽(제목 글씨의 왼쪽)에 두고, 뒤 섬은 그 오른쪽 뒤에 겹침
    const span = arcSpan()
    const at = facing - 0.36 * span, atFar = at + 0.2 * span
    sil.position.set(Math.sin(at) * 420, 0, -Math.cos(at) * 420)
    sil.lookAt(0, 0, 0)
    silFar.position.set(Math.sin(atFar) * 470, 0, -Math.cos(atFar) * 470)
    silFar.lookAt(0, 0, 0)
    seaU.uIsl.value.set(Math.sin(at) * 420, -Math.cos(at) * 420, Math.cos(at), Math.sin(at))
  }
  placeSilhouette()

  function arcSpan() { // 함수 선언이라 위쪽 placeSilhouette() 첫 호출에서도 쓸 수 있음
    const halfH = Math.atan(Math.tan((camera.fov * D2R) / 2) * camera.aspect)
    return Math.min(1.75, 1.4 * halfH)
  }

  // 하루 중 분(m) → 해의 위치. 시계처럼 한 바퀴 도는 느낌:
  //  · 낮: 일출 시각에 왼쪽 수평선에서 떠서 정면 하늘을 지나 일몰 시각에 오른쪽 수평선으로 짐
  //  · 밤: 수평선 아래에서 오른쪽 → 왼쪽으로 돌아가 다음 일출에 다시 뜸 (달은 정확히 반대편을 돎)
  function sunAt(m) {
    const { sunriseMin: r, sunsetMin: s } = target
    const dayLen = ((((s - r) % 1440) + 1440) % 1440) || 1440
    const p = ((((m - r) % 1440) + 1440) % 1440) / dayLen
    const span = arcSpan()
    if (p <= 1) return { el: Math.sin(Math.PI * p) * SUN_MAX_EL, az: cur.yaw + (p - 0.5) * span, morning: p < 0.5 }
    const q = ((((m - s) % 1440) + 1440) % 1440) / (1440 - dayLen)
    return { el: -Math.sin(Math.PI * q) * NIGHT_DEPTH, az: cur.yaw + (0.5 - q) * span, morning: q > 0.5 }
  }

  // 하루 중 분(m) → 달의 위치. 해가 진 뒤부터 해가 뜨기 전(밤)까지 항상 떠 있고, 정면 하늘을 왼쪽에서 오른쪽으로 천천히 지남.
  // 실제 월출·월몰은 낮이거나 한밤중인 날이 많아서, 장면에서는 밤 동안 보이게 단순화하고 달의 모양(위상)만 API 값을 씀
  function moonAt(m) {
    const { sunsetMin: a, sunriseMin: b } = target
    const len = ((((b - a) % 1440) + 1440) % 1440) || 1440
    const p = ((((m - a) % 1440) + 1440) % 1440) / len
    if (p > 1) return null // 낮
    const span = arcSpan()
    return { el: Math.sin(Math.PI * p) * 32 * D2R, az: cur.yaw + (p - 0.5) * span, vis: smoothstep(0, 0.06, p) * smoothstep(1, 0.94, p) }
  }

  function frame(now) {
    const dt = Math.min((now - last) / 1000, 0.1)
    last = now
    if (paused) return
    time += dt
    const k = 1 - Math.exp(-dt * 5)

    // 값 부드럽게 따라가기
    // 하루가 원처럼 이어지도록 가장 짧은 쪽으로 따라감 (23:59 → 00:00 에서 낮을 거쳐 돌아가며 번쩍이지 않게)
    const dMin = ((((target.minutes - cur.minutes + 720) % 1440) + 1440) % 1440) - 720
    cur.minutes = (((cur.minutes + dMin * k) % 1440) + 1440) % 1440
    for (const key of ['total', 'low', 'mid', 'high', 'wave']) cur[key] += (target[key] - cur[key]) * (1 - Math.exp(-dt * 2))

    // 해의 위치(시계처럼 도는 호) → 하늘 색
    const { el, az, morning } = sunAt(cur.minutes)
    dbg.sun = { el: +(el / D2R).toFixed(1), off: +(((az - cur.yaw) / D2R)).toFixed(1) } // 점검용: 해의 고도와 정면 기준 좌우 각
    const ov = clamp(cur.total / 100, 0, 1)
    const pal = skyColors(el, morning, ov)
    const sunDir = sunDirOf(az, el)
    skyU.uSunDir.value.copy(sunDir)
    skyU.uTop.value.set(...pal.top)
    skyU.uHorizon.value.set(...pal.horizon)
    skyU.uSunColor.value.set(...pal.sun.map((c) => c * (1 - 0.35 * ov)))
    skyU.uNight.value = pal.night
    skyU.uSunVis.value = 1 - 0.85 * ov * ov * (0.4 + 0.6 * smoothstep(4, 24, el / D2R)) // 일출·일몰 때는 구름이 많아도 해빛이 번지게
    skyU.uGlow.value = 1 - 0.68 * smoothstep(6, 36, el / D2R) // 해가 높을수록 후광을 줄여 눈부시지 않게
    const day = 1 - pal.night
    const wxs = wx.update(dt, time, target.wx, cur.yaw, pal.horizon) // 날씨 효과 세기 (목표값을 천천히 따라감)
    skyU.uSunVis.value *= 1 - 0.3 * wxs.overcast // 흐린 날에는 해빛이 약해짐
    // 흐림·안개: 하늘을 묵직한 잿빛으로 빼고, 해를 흐릿하게 가림 (바다의 햇빛 반사도 함께 줄어듦)
    const G = wxs.gray, grey = new THREE.Vector3(lerp(0.55, 0.05, pal.night), lerp(0.6, 0.06, pal.night), lerp(0.64, 0.08, pal.night))
    skyU.uTop.value.lerp(grey, G * 0.85)
    skyU.uHorizon.value.lerp(grey, G * 0.85)
    skyU.uSunVis.value *= 1 - 0.9 * G
    seaU.uFogK.value = wxs.fog
    seaU.uDeep.value.set(
      0.03 * (0.3 + 0.7 * day) + pal.horizon[0] * 0.17,
      0.11 * (0.3 + 0.7 * day) + pal.horizon[1] * 0.15,
      0.17 * (0.3 + 0.7 * day) + pal.horizon[2] * 0.15,
    )
    // 낮에는 에메랄드(가까이) → 청록(중간) → 파랑(멀리). 아침·저녁엔 하늘빛이 섞이고, 구름이 많으면 탁해짐
    const tint = 0.22 * (1 - smoothstep(20, 50, el / D2R)) // 해가 낮을수록 하늘색을 더 섞음
    const hz = pal.horizon, gray = 0.45 * ov
    const mixSea = (c, nightC) => c.map((v, i) => {
      const lit = nightC[i] + (v - nightC[i]) * day
      return (lit * (1 - tint) + hz[i] * tint) * (1 - gray) + (0.28 + 0.2 * day) * 0.5 * gray
    })
    seaU.uShallow.value.set(...mixSea([0.10, 0.80, 0.68], [0.02, 0.07, 0.09]))
    seaU.uMidSea.value.set(...mixSea([0.04, 0.50, 0.62], [0.02, 0.06, 0.10]))
    for (const key of ['uDeep', 'uShallow', 'uMidSea']) seaU[key].value.lerp(grey, G * 0.85) // 흐리면 바다도 납빛으로
    seaU.uTime.value = time
    const glint = (1 - smoothstep(0.05, 0.62, sunDir.y)) * smoothstep(-0.07, 0.02, sunDir.y) * (1 - pal.night) // 윤슬이 보이는 정도
    seaLife.update({ time, night: pal.night, facing, span: arcSpan(), glintAz: Math.atan2(sunDir.x, -sunDir.z), glint })
    seaU.uAmp.value = clamp(0.18 + cur.wave * 0.28 + wxs.rain * 0.2 + wxs.wind * 0.012, 0.22, 1.1) // 파고가 클수록, 비·바람이 셀수록 더 출렁
    seaU.uFreq.value = 1 + wxs.wind * 0.03 + wxs.rain * 0.2 // 바람이 세고 비가 오면 물결 간격이 촘촘해짐

    // 별: 밤에만, 구름이 많으면 가려짐
    starMat.opacity = pal.night * (1 - 0.45 * ov)
    dipper.update(time, pal.night * (1 - 0.45 * ov))
    meteors.update(time, pal.night * (1 - 0.6 * ov))

    // 달: 밤에 또렷하고, 낮에는 옅게. 구름이 많으면 흐려짐
    const mp = target.moonIllum != null ? moonAt(cur.minutes) : null
    if (mp) {
      moon.position.copy(sunDirOf(mp.az, mp.el)).multiplyScalar(700)
      seaU.uMoon.value.set(Math.sin(mp.az) * Math.cos(mp.el), Math.sin(mp.el), -Math.cos(mp.az) * Math.cos(mp.el), mp.vis * smoothstep(0.3, 0.8, pal.night))
      const op = mp.vis * smoothstep(0.3, 0.8, pal.night) * (1 - 0.25 * ov) // 낮에는 0 → 밤에만 또렷
      moon.material.opacity = op * 0.9
      moon.visible = op > 0.02
      Object.assign(dbg, { moon: true, vis: mp.vis, el: mp.el / D2R, az: mp.az / D2R, op, yaw: cur.yaw / D2R, minutes: cur.minutes, ov, night: pal.night, illum: target.moonIllum, waxing: target.moonWaxing })
    } else { seaU.uMoon.value.w = 0; moon.visible = false; Object.assign(dbg, { moon: false, minutes: cur.minutes, moonIllum: target.moonIllum, rise: target.moonriseMin, set: target.moonsetMin }) }

    // 실루엣 색: 노을빛이 번진 어두운 윤곽
    const haze = 0.18 + 0.5 * smoothstep(5, 30, el / D2R) // 낮엔 푸른 안개 속에 흐릿
    const dimI = 0.52 + 0.48 * smoothstep(3, 26, el / D2R)
    paintIsland(pal.horizon, Math.max(haze, 0.92 * wxs.fog), day, dimI) // 안개 날에는 섬이 안개 색에 묻힘

    // 구름: 맑은 날에도 평화로운 기본 구름이 천천히 흐르고, 구름양이 많으면 더 늘어남
    const calm = 1 - smoothstep(0.2, 0.6, pal.night) // 해가 지면 기본 구름을 서서히 치워 별이 잘 보이게
    const AZ0 = -60 * D2R, AZ1 = 60 * D2R // 시선 기준 좌우 60°
    for (const L of cloudLayers) {
      const want = Math.max(Math.round(L.min * calm * (mobile ? 0.7 : 1)), Math.round(((cur[L.key] ?? 20) / 100) * L.sprites.length * (1 - 0.6 * pal.night)), Math.round(L.sprites.length * 0.85 * wxs.gray)) // 흐리면 구름층이 하늘을 덮음
      L.sprites.forEach((c, i) => {
        c.az += c.speed * dt * (reduced ? 0.2 : 1) * (1 + wxs.wind * 0.05) // 바람이 셀수록 구름이 빨리 흐름
        if (c.az > AZ1) c.az = AZ0
        const ca = cur.yaw + c.az
        c.s.position.set(Math.sin(ca) * Math.cos(c.el) * c.d, Math.sin(c.el) * c.d, -Math.cos(ca) * Math.cos(c.el) * c.d)
        c.dir.copy(c.s.position).normalize()
        const edge = smoothstep(AZ0, AZ0 + 0.25, c.az) * smoothstep(AZ1, AZ1 - 0.25, c.az) // 양끝에서 서서히 나타나고 사라짐
        const grow = 0.9 + 0.25 * ov // 구름양이 많을수록 구름 덩어리가 조금 커짐
        c.s.scale.set(c.sx * grow * (1 + 0.7 * wxs.gray), c.sy * grow * (1 + 0.25 * wxs.gray), 1) // 흐리면 구름층이 넓고 납작하게 펼쳐짐
        c.a += ((i < want ? 1 : 0) - c.a) * (1 - Math.exp(-dt * 1.8))
        c.s.visible = c.a * edge > 0.01
        if (!c.s.visible) return
        const lit = Math.pow(Math.max(c.dir.dot(sunDir), 0), 3) * (1 - pal.night) // 해 쪽 구름은 노을빛
        const w = 0.6 + 0.3 * smoothstep(8, 30, el / D2R) // 해가 높을수록 더 하얗게
        const base = [lerp(pal.horizon[0], 1, w), lerp(pal.horizon[1], 1, w), lerp(pal.horizon[2], 1, w)]
        const dim = (0.18 + 0.82 * day) * (1 - 0.22 * wxs.overcast) * (1 - 0.4 * wxs.gray) // 흐리면 구름이 젖은 회색빛으로, 아랫면은 더 어둡게
        c.s.material.color.setRGB(
          lerp(base[0], pal.sun[0], lit * 0.8) * dim, lerp(base[1], pal.sun[1], lit * 0.7) * dim, lerp(base[2], pal.sun[2], lit * 0.5) * dim,
          THREE.SRGBColorSpace,
        )
        const title = Math.exp(-((c.az / 0.34) ** 2)) * Math.exp(-(((c.el / D2R - 15) / 11) ** 2)) // 제목·설명이 있는 화면 가운데
        c.s.material.opacity = Math.min(1, L.opacity * c.a * edge * (1 - 0.55 * pal.night) * (1 - 0.6 * title) * (1 + 0.6 * wxs.gray))
      })
    }

    // 카메라는 명소의 일출/일몰 방향에 고정: 시간이 흘러도 장소는 그대로, 하늘(해·달·구름·밝기)만 움직임.
    // 방향은 명소를 바꿀 때만 천천히 돌아가고, 마우스에는 아주 미세하게만 반응
    cur.yaw += (facing - cur.yaw) * (1 - Math.exp(-dt * 2.5))
    cur.pitch += (PITCH - cur.pitch) * (1 - Math.exp(-dt * 2.5))
    starGroup.rotation.y = -cur.yaw
    pointer.sx += (pointer.x - pointer.sx) * (1 - Math.exp(-dt * 3))
    pointer.sy += (pointer.y - pointer.sy) * (1 - Math.exp(-dt * 3))
    const sway = reduced ? 0 : Math.sin(time * 0.55) * 0.07 + Math.sin(time * 0.93 + 1.3) * 0.03   // 잔잔한 물결에 떠 있는 듯한 위아래 흔들림
    camera.position.set(pointer.sx * 0.5, CAM_H + pointer.sy * 0.2 + sway, 0)
    camera.rotation.z = reduced ? 0 : 0.0035 * Math.sin(time * 0.42) // 3D 카메라만 흔들림 (글자·UI는 그대로)
    camera.rotation.y = -(cur.yaw + pointer.sx * 0.012)
    camera.rotation.x = cur.pitch + pointer.sy * 0.008
    sky.position.copy(camera.position)
    seaU.uCam.value.copy(camera.position)

    renderer.render(scene, camera)
  }

  renderer.setAnimationLoop(frame)

  return {
    setTarget(patch) {
      const shapeChanged = patch.shape && patch.shape !== target.shape
      const timesChanged = ['sunriseMin', 'sunsetMin', 'sunriseAz', 'sunsetAz', 'solarNoon', 'lat', 'doy', 'best'].some((k) => patch[k] != null && patch[k] !== target[k])
      Object.assign(target, patch)
      if (shapeChanged || timesChanged) placeSilhouette()
    },
    debug() { return { ...dbg } },
    snap() { cur.minutes = target.minutes }, // 개발 중 점검용: 부드러운 따라가기 없이 시간을 바로 맞춤
    setPointer(nx, ny) { pointer.x = nx; pointer.y = ny },
    setPaused(p) { paused = p; last = performance.now() },
    resize(w, h) {
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.fov = w / h < 0.8 ? 72 : 58 // 세로 화면은 시야를 넓혀 수평선이 잘 보이게
      camera.updateProjectionMatrix()
      placeSilhouette()
    },
    dispose() {
      seaLife.dispose(); dipper.dispose(); meteors.dispose(); wx.dispose()
      renderer.setAnimationLoop(null)
      scene.traverse((o) => { o.geometry?.dispose?.(); o.material?.dispose?.() })
      tex.dispose()
      renderer.dispose()
      renderer.forceContextLoss()
    },
  }
}
