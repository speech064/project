import * as THREE from 'three'

// 별똥별: 밤하늘에 자주 스르륵 떨어지는 짧은 빛줄기 (별 그룹 안에서 움직여서 하늘과 같이 보임)
// · 유성우: 여러 줄기가 짧은 간격으로 이어서 떨어짐
// · 긴 별똥별: 왼쪽 위에서 오른쪽 아래로 길게 가로지르는 줄기 (가끔 한 번)
const SHOWER_COUNT = 8
const R = 780
const rnd = (a, b) => a + Math.random() * (b - a)

function streakTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 16
  const g = c.getContext('2d')
  const gr = g.createLinearGradient(0, 0, 256, 0) // 꼬리(왼쪽, 투명) → 머리(오른쪽, 밝음)
  gr.addColorStop(0, 'rgba(180,205,255,0)'); gr.addColorStop(0.7, 'rgba(210,225,255,.55)'); gr.addColorStop(1, 'rgba(255,255,255,1)')
  g.fillStyle = gr
  g.beginPath(); g.moveTo(0, 8); g.lineTo(250, 4.5); g.lineTo(256, 8); g.lineTo(250, 11.5); g.closePath(); g.fill()
  const head = g.createRadialGradient(248, 8, 0, 248, 8, 8)
  head.addColorStop(0, 'rgba(255,255,255,1)'); head.addColorStop(1, 'rgba(255,255,255,0)')
  g.fillStyle = head; g.fillRect(232, 0, 24, 16)
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

export function createMeteors(group, { mobile = false, reduced = false } = {}) {
  const map = streakTexture()
  const make = (long) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, opacity: 0, blending: THREE.AdditiveBlending }))
    s.renderOrder = -8; s.visible = false
    group.add(s)
    return { s, long, next: 0, t0: -1, az0: 0, el0: 0, daz: 0, del: 0, dur: 1 }
  }
  // 유성우 줄기 여러 개 + 긴 별똥별 하나
  const streaks = Array.from({ length: SHOWER_COUNT }, (_, i) => ({ ...make(false), next: 1 + i * rnd(0.6, 1.2) }))
  const longOne = { ...make(true), next: rnd(10, 16) }
  const all = [...streaks, longOne]

  const spawn = (m, time) => {
    if (m.long) { // 왼쪽 위 → 오른쪽 아래로 길게
      m.t0 = time; m.dur = rnd(2.0, 2.6)
      m.az0 = -0.5; m.el0 = 0.74
      m.daz = 0.5; m.del = -0.42
      return
    }
    m.t0 = time; m.dur = rnd(0.8, 1.3)
    m.az0 = (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 0.55); m.el0 = rnd(0.42, 0.7) // 가운데(제목 자리)를 피해 좌우 위쪽 하늘에서
    const dir = Math.random() < 0.5 ? -1 : 1
    m.daz = dir * rnd(0.18, 0.3); m.del = -rnd(0.1, 0.17)
  }

  return {
    // night: 별이 보이는 정도(0~1)
    update(time, night) {
      if (reduced || night < 0.45) { all.forEach((m) => { m.s.visible = false; m.t0 = -1 }); return }
      for (const m of all) {
        if (m.t0 < 0 && time >= m.next) spawn(m, time)
        if (m.t0 < 0) { m.s.visible = false; continue }
        const k = (time - m.t0) / m.dur
        if (k >= 1) { // 한 줄기가 끝나면 잠깐 쉬었다가 다시 떨어짐
          m.t0 = -1
          m.next = time + (m.long ? (mobile ? rnd(24, 36) : rnd(16, 26)) : (mobile ? rnd(3, 6) : rnd(1.5, 3.5)))
          m.s.visible = false; continue
        }
        const az = m.az0 + m.daz * k, el = m.el0 + m.del * k
        m.s.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, -Math.cos(az) * Math.cos(el) * R)
        m.s.material.rotation = Math.atan2(m.del, m.daz * Math.cos(el)) // 화면에서 날아가는 방향으로 눕힘 (머리가 진행 방향)
        m.s.scale.set(m.long ? 170 : 90, m.long ? 7 : 5.5, 1)
        m.s.material.opacity = night * Math.sin(Math.PI * Math.min(1, k * 1.15)) * (m.long ? 0.85 : 0.7) // 스르륵 나타났다 사라짐
        m.s.visible = true
      }
    },
    dispose() { map.dispose() },
  }
}
