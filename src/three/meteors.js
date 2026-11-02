import * as THREE from 'three'

// 별똥별: 밤하늘에 가끔 스르륵 떨어지는 짧은 빛줄기 (별 그룹 안에서 움직여서 하늘과 같이 보임)
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

const R = 780
export function createMeteors(group, { mobile = false, reduced = false } = {}) {
  const map = streakTexture()
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, opacity: 0, blending: THREE.AdditiveBlending }))
  s.renderOrder = -8; s.visible = false
  group.add(s)
  let next = 4, t0 = -1, az0 = 0, el0 = 0, daz = 0, del = 0, dur = 1
  const rnd = (a, b) => a + Math.random() * (b - a)

  return {
    // night: 별이 보이는 정도(0~1)
    update(time, night) {
      if (reduced || night < 0.45) { s.visible = false; t0 = -1; return }
      if (t0 < 0 && time >= next) { // 새 별똥별: 위쪽 하늘의 한 점에서 비스듬히 아래로
        t0 = time; dur = rnd(0.8, 1.3)
        az0 = (Math.random() < 0.5 ? -1 : 1) * rnd(0.3, 0.55); el0 = rnd(0.42, 0.7) // 가운데(제목 자리)를 피해 좌우 위쪽 하늘에서
        const dir = Math.random() < 0.5 ? -1 : 1
        daz = dir * rnd(0.18, 0.3); del = -rnd(0.1, 0.17)
      }
      if (t0 < 0) { s.visible = false; return }
      const k = (time - t0) / dur
      if (k >= 1) { t0 = -1; next = time + (mobile ? rnd(14, 26) : rnd(8, 16)); s.visible = false; return }
      const az = az0 + daz * k, el = el0 + del * k
      s.position.set(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, -Math.cos(az) * Math.cos(el) * R)
      s.material.rotation = Math.atan2(del, daz * Math.cos(el)) // 화면에서 날아가는 방향으로 눕힘 (머리가 진행 방향)
      s.scale.set(90, 5.5, 1)
      s.material.opacity = night * Math.sin(Math.PI * Math.min(1, k * 1.15)) * 0.7 // 스르륵 나타났다 사라짐
      s.visible = true
    },
    dispose() { map.dispose() },
  }
}
