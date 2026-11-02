import * as THREE from 'three'

// 제주 바다의 하루: 밤에는 수평선 위로 오징어잡이 배의 집어등이 줄지어 켜지고,
// 날이 밝으면 서서히 사라지면서 해녀들이 테왁을 띄워 놓고 물질(숨 참고 잠수 → 물 위로 올라옴)을 한다.
// 해가 지면 해녀는 사라지고 다시 배가 들어온다. 모두 스프라이트 + 캔버스 그림이라 가볍다.
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t) }
const rng = (seed) => () => ((seed = (seed * 16807) % 2147483647) / 2147483647)

const canvas = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return [c, c.getContext('2d')] }
const tex = (c) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t }

// 집어등: 한가운데가 하얗게 타는 빛
function lampTexture() {
  const [c, g] = canvas(128, 128)
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.12, 'rgba(255,252,236,.95)')
  gr.addColorStop(0.35, 'rgba(255,246,214,.28)'); gr.addColorStop(1, 'rgba(255,246,214,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return tex(c)
}

// 물에 비친 빛기둥: 위는 밝고 아래로 갈수록 흐려지며, 물결에 끊긴 듯 토막이 난 모양
function streakTexture() {
  const W = 32, H = 256
  const [c, g] = canvas(W, H)
  const r = rng(7)
  for (let y = 0; y < H; y++) {
    const fade = Math.pow(1 - y / H, 1.4)
    const broken = 0.45 + 0.55 * Math.max(0, Math.sin(y * 0.42 + r() * 0.8)) // 잔물결에 끊김
    const a = fade * broken
    const gr = g.createLinearGradient(0, 0, W, 0)
    gr.addColorStop(0, 'rgba(255,248,225,0)'); gr.addColorStop(0.5, `rgba(255,250,235,${a})`); gr.addColorStop(1, 'rgba(255,248,225,0)')
    g.fillStyle = gr; g.fillRect(0, y, W, 1)
  }
  return tex(c)
}

// 테왁: 둥글게 깎은 팔각기둥 모양의 주황색 박 — 옆면에 세로 모서리, 위쪽 면, 초록색 그물 줄(망사리는 아래로 늘어짐)
function tewakTexture() {
  const [c, g] = canvas(160, 128)
  g.fillStyle = 'rgba(20,70,60,.6)' // 망사리
  g.beginPath(); g.ellipse(80, 98, 50, 26, 0, 0, Math.PI); g.fill()
  g.strokeStyle = 'rgba(190,230,210,.3)'; g.lineWidth = 1.5
  for (let k = -4; k <= 4; k++) { g.beginPath(); g.moveTo(80 + k * 11, 98); g.lineTo(80 + k * 8, 124); g.stroke() }
  const X0 = 20, X1 = 140, Y0 = 36, Y1 = 98, R = 16
  const body = () => { // 모서리를 둥글린 옆면
    g.beginPath(); g.moveTo(X0 + R, Y0); g.lineTo(X1 - R, Y0); g.quadraticCurveTo(X1, Y0, X1, Y0 + R)
    g.lineTo(X1, Y1 - R); g.quadraticCurveTo(X1, Y1, X1 - R, Y1); g.lineTo(X0 + R, Y1); g.quadraticCurveTo(X0, Y1, X0, Y1 - R)
    g.lineTo(X0, Y0 + R); g.quadraticCurveTo(X0, Y0, X0 + R, Y0); g.closePath()
  }
  const shade = g.createLinearGradient(X0, 0, X1, 0) // 팔각 면마다 밝기가 다르게
  shade.addColorStop(0, '#c9560c'); shade.addColorStop(0.2, '#f08a22'); shade.addColorStop(0.5, '#ffb04a'); shade.addColorStop(0.8, '#f08a22'); shade.addColorStop(1, '#b94a08')
  body(); g.fillStyle = shade; g.fill()
  g.save(); body(); g.clip()
  g.strokeStyle = 'rgba(120,50,0,.35)'; g.lineWidth = 2 // 팔각의 세로 모서리
  for (const x of [50, 80, 110]) { g.beginPath(); g.moveTo(x, Y0); g.lineTo(x, Y1); g.stroke() }
  g.strokeStyle = '#1f6b4a'; g.lineWidth = 3.2 // 그물 줄이 감긴 모양
  for (const x of [34, 66, 98, 126]) { g.beginPath(); g.moveTo(x, Y0 - 2); g.lineTo(x + 14, Y1 + 2); g.stroke() }
  g.restore()
  const top = g.createLinearGradient(0, Y0 - 16, 0, Y0 + 14) // 위쪽 면
  top.addColorStop(0, '#ffd08a'); top.addColorStop(1, '#f5963a')
  g.fillStyle = top; g.beginPath(); g.ellipse(80, Y0 + 1, 58, 15, 0, 0, Math.PI * 2); g.fill()
  g.strokeStyle = 'rgba(120,50,0,.3)'; g.lineWidth = 1.5; g.beginPath(); g.ellipse(80, Y0 + 1, 58, 15, 0, 0, Math.PI * 2); g.stroke()
  g.fillStyle = 'rgba(255,255,255,.3)'; g.beginPath(); g.ellipse(60, Y0 - 2, 16, 4, -0.1, 0, Math.PI * 2); g.fill()
  return tex(c)
}

// 해녀: 검은 잠수복 두건과 물안경 (숨대롱 없이 숨을 참고 잠수)
function headTexture() {
  const [c, g] = canvas(96, 96)
  g.fillStyle = '#121419'; g.beginPath(); g.ellipse(48, 84, 36, 22, 0, 0, Math.PI * 2); g.fill() // 어깨
  g.beginPath(); g.arc(48, 52, 26, 0, Math.PI * 2); g.fill()                                    // 두건
  g.fillStyle = '#d9a98a'; g.beginPath(); g.ellipse(48, 58, 15, 10, 0, 0, Math.PI * 2); g.fill()  // 얼굴
  g.fillStyle = 'rgba(120,210,225,.9)'; g.beginPath(); g.ellipse(48, 52, 17, 8, 0, 0, Math.PI * 2); g.fill() // 물안경
  g.strokeStyle = '#121419'; g.lineWidth = 3; g.beginPath(); g.ellipse(48, 52, 17, 8, 0, 0, Math.PI * 2); g.stroke()
  return tex(c)
}

// 물결 고리
function ringTexture() {
  const [c, g] = canvas(128, 128)
  const gr = g.createRadialGradient(64, 64, 20, 64, 64, 62)
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.7, 'rgba(255,255,255,.55)'); gr.addColorStop(0.82, 'rgba(255,255,255,.18)'); gr.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  return tex(c)
}

export function createSeaLife(scene, { mobile }) {
  const lampT = lampTexture(), streakT = streakTexture(), tewakT = tewakTexture(), headT = headTexture(), ringT = ringTexture()
  const group = new THREE.Group()
  scene.add(group)

  const sprite = (map, { additive = false, depthTest = true, order = 0, center } = {}) => {
    const m = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, depthTest, fog: false, opacity: 0, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending })
    const s = new THREE.Sprite(m)
    s.renderOrder = order
    if (center) s.center.set(...center)
    s.visible = false
    group.add(s)
    return s
  }
  const place = (s, a, d, y) => s.position.set(Math.sin(a) * d, y, -Math.cos(a) * d)

  // ── 밤: 오징어잡이 배 ──
  const r = rng(31)
  const BOATS = Array.from({ length: mobile ? 9 : 15 }, (_, i) => ({
    u: 0.04 + (i / (mobile ? 8 : 14)) * 0.6 + (r() - 0.5) * 0.05, // 화면 오른쪽 위주로 줄지어 (왼쪽엔 제주 섬 실루엣)
    d: 520 + r() * 170, size: 0.7 + r() * 0.6, stagger: r(), ph: r() * 6.28,
    lamp: sprite(lampT, { additive: true, depthTest: false, order: 20 }),
    halo: sprite(lampT, { additive: true, depthTest: false, order: 19 }),
    streak: sprite(streakT, { additive: true, depthTest: false, order: 21, center: [0.5, 1] }),
  }))
  const FAR_LEFT = [-0.47, -0.39, -0.3].map((u, i) => ({ // 왼쪽 수평선 끝의 배 두세 척: 작고 약하게
    u, d: 600 + i * 40, size: 0.55 + i * 0.12, stagger: 0.15 + i * 0.3, ph: 1.7 + i,
    lamp: sprite(lampT, { additive: true, depthTest: false, order: 20 }),
    halo: sprite(lampT, { additive: true, depthTest: false, order: 19 }),
    streak: sprite(streakT, { additive: true, depthTest: false, order: 21, center: [0.5, 1] }),
  }))
  BOATS.push(...FAR_LEFT)
  const haze = sprite(lampT, { additive: true, depthTest: false, order: 18 }) // 수평선 위로 번지는 뿌연 빛

  // ── 낮: 해녀와 테왁 ──
  const q = rng(77)
  const DIVERS = Array.from({ length: mobile ? 4 : 6 }, (_, i) => ({ // 가로로 8칸(모바일 6칸)을 잡고 양 끝 칸은 비움
    u: -0.44 + (i + 1.5) / (mobile ? 6 : 8) * 0.88 + (q() - 0.5) * 0.05,
    d: 62 + q() * 70, period: 11 + q() * 6, phase: q(), side: q() < 0.5 ? -1 : 1, ph: q() * 6.28,
    tewak: sprite(tewakT, { order: 10, center: [0.5, 0.3] }),
    head: sprite(headT, { order: 11, center: [0.5, 0.12] }),
    ring: sprite(ringT, { order: 9 }),
  }))
  DIVERS.sort((a, b) => b.d - a.d) // 먼 것부터 그려야 겹침이 자연스러움

  return {
    // night: 0(낮)~1(깊은 밤) · facing/span: 카메라가 보는 방위와 화면 가로 시야각(라디안)
    update({ time, night, facing, span, glintAz = 0, glint = 0 }) {
      const nv = smooth(0.35, 0.9, night)       // 배: 밤이 깊어질수록
      const dvAll = 1 - smooth(0.04, 0.5, night) // 해녀: 날이 밝을수록

      BOATS.forEach((b, i) => {
        const v = smooth(b.stagger * 0.45, b.stagger * 0.45 + 0.55, nv) // 한 척씩 차례로 켜짐/꺼짐
        const on = v > 0.01
        for (const s of [b.lamp, b.halo, b.streak]) s.visible = on
        if (!on) return
        const a = facing + (b.u + 0.012 * Math.sin(time * 0.05 + b.ph)) * span // 천천히 떠다님
        const flick = 0.9 + 0.1 * Math.sin(time * 2.1 + b.ph * 3) * Math.sin(time * 0.7 + b.ph)
        place(b.lamp, a, b.d, 0.9);  b.lamp.scale.setScalar(20 * b.size); b.lamp.material.opacity = v * flick
        place(b.halo, a, b.d, 0.9);  b.halo.scale.setScalar(80 * b.size); b.halo.material.opacity = v * 0.3
        place(b.streak, a, b.d * 0.82, 0.6); b.streak.scale.set(4.2 * b.size, 46 * b.size, 1); b.streak.material.opacity = v * 0.5 * flick
      })
      haze.visible = nv > 0.01
      if (haze.visible) { place(haze, facing + 0.24 * span, 640, 10); haze.scale.set(1100, 150, 1); haze.material.opacity = nv * 0.2 }

      DIVERS.forEach((d) => {
        const a0 = facing + d.u * span
        const dA = Math.abs(((a0 - glintAz + Math.PI) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI) - Math.PI)
        const dv = dvAll * (1 - 0.92 * glint * Math.exp(-((dA / 0.12) ** 2))) // 윤슬 길 위의 해녀는 흐려져 길을 가리지 않음
        const on = dv > 0.01
        for (const s of [d.tewak, d.head, d.ring]) s.visible = on
        if (!on) return
        const a = facing + d.u * span
        const bob = Math.sin(time * 1.1 + d.ph) * 0.12 + Math.sin(time * 1.9 + d.ph * 2) * 0.04 // 물결 두 겹에 따라 잔잔하게
        const base = -0.02 + bob
        const f = Math.pow(d.d / 45, 0.6) // 멀수록 조금 작게 (원근) — 완전한 원근보다 덜 줄여서 알아볼 수 있게
        place(d.tewak, a, d.d, base); d.tewak.material.rotation = 0.05 * Math.sin(time * 0.9 + d.ph * 1.3); // 살짝 기울어짐
         d.tewak.scale.set(2.0 * f, 1.6 * f, 1); d.tewak.material.opacity = dv

        // 머리: 테왁 옆(줄로 연결)에서 떠 있다가 → 잠수 → 물속 → 올라옴
        const p = (time / d.period + d.phase) % 1
        let rise, ripple = 0                                  // rise: 1 이면 물 위, 0 이면 물속
        if (p < 0.5) rise = 1
        else if (p < 0.58) { const t = (p - 0.5) / 0.08; rise = 1 - smooth(0, 1, t); ripple = t }              // 잠수
        else if (p < 0.86) { rise = 0; ripple = 1 - (p - 0.58) / 0.28 }                                       // 물속(고리만 퍼짐)
        else { const t = (p - 0.86) / 0.14; rise = smooth(0, 1, t); ripple = t < 0.5 ? t * 2 : 0 }            // 숨비소리 내며 올라옴
        const hx = a + d.side * (1.7 * f / d.d), hd = d.d - 0.7 * f                                                   // 테왁 옆 약간 앞
        place(d.head, hx, hd, base - 1.1 + rise * 1.05)
        d.head.scale.set(1.45 * f, 1.45 * f, 1)
        d.head.material.opacity = dv * Math.min(1, rise * 1.6)
        place(d.ring, hx, hd, 0.03)
        const rs = 0.6 + (1 - ripple) * 3.2
        d.ring.scale.set(rs * 1.6 * f, rs * 0.5 * f, 1)
        d.ring.material.opacity = dv * ripple * 0.7
      })
    },
    dispose() { for (const t of [lampT, streakT, tewakT, headT, ringT]) t.dispose(); scene.remove(group) },
  }
}
