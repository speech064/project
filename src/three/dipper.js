import * as THREE from 'three'

// 북두칠성(이라고 가정한 일곱 별): 국자 모양으로 놓고, 손잡이 끝에서 국자 쪽으로 한 별씩 차례로 반짝임
// [x, y] 는 별자리 그림 위의 상대 위치. 순서: 알카이드 · 미자르 · 알리오트 · 메그레즈 · 페크다 · 메락 · 두베
const STARS = [[0, 0.8], [1.6, 0.5], [3.0, 0.55], [4.1, 0.9], [4.2, -0.4], [5.7, -0.3], [5.9, 1.2]]
const LINK = [0, 1, 2, 3, 4, 5, 6, 3] // 손잡이 → 국자를 한 붓으로
const UNIT = 4.2 * Math.PI / 180      // 그림 한 칸 = 4.2도
const AZ0 = 0.36, EL0 = 27 * Math.PI / 180 // 화면 오른쪽 위쪽에 둠

function starTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 128
  const g = c.getContext('2d')
  const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64)
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.1, 'rgba(255,252,240,.95)'); gr.addColorStop(0.3, 'rgba(210,225,255,.28)'); gr.addColorStop(1, 'rgba(210,225,255,0)')
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128)
  for (const [x0, y0, x1, y1] of [[64, 6, 64, 122], [6, 64, 122, 64]]) { // 십자 빛줄기
    const l = g.createLinearGradient(x0, y0, x1, y1)
    l.addColorStop(0, 'rgba(255,255,255,0)'); l.addColorStop(0.5, 'rgba(255,255,255,.8)'); l.addColorStop(1, 'rgba(255,255,255,0)')
    g.strokeStyle = l; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke()
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace
  return t
}

// 별 그룹(시선 방향을 따라 도는 그룹) 안에 일곱 별과 이음선을 만듦
export function createDipper(group) {
  const map = starTexture()
  const R = 790
  const pts = STARS.map(([x, y]) => {
    const el = EL0 + (y - 0.4) * UNIT, az = AZ0 + ((x - 3) * UNIT) / Math.cos(EL0)
    return new THREE.Vector3(Math.sin(az) * Math.cos(el) * R, Math.sin(el) * R, -Math.cos(az) * Math.cos(el) * R)
  })
  const sprites = pts.map((p) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, fog: false, opacity: 0, blending: THREE.AdditiveBlending }))
    s.position.copy(p); s.renderOrder = -8; s.visible = false
    group.add(s)
    return s
  })
  const lineMat = new THREE.LineBasicMaterial({ color: 0xbcd0ff, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending })
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(LINK.map((i) => pts[i])), lineMat)
  line.renderOrder = -8; line.visible = false
  group.add(line)

  const CYCLE = 4.5, STEP = 0.3, FLASH = 1.0 // 한 바퀴가 짧아 자주 반짝임
  return {
    update(time, night) { // night: 별이 보이는 정도(0~1)
      const on = night > 0.01
      line.visible = on
      sprites.forEach((s) => { s.visible = on })
      if (!on) return
      const tt = time % CYCLE
      sprites.forEach((s, i) => {
        const t = tt - i * STEP
        const k = t > 0 && t < FLASH ? Math.pow(Math.sin(Math.PI * t / FLASH), 2) : 0 // 차례가 되면 한 번 크게 반짝
        s.material.opacity = night * (0.62 + 0.38 * k)
        s.scale.setScalar(26 + 36 * k)
      })
      lineMat.opacity = night * 0.045 // 이음선은 거의 보이지 않을 만큼만
    },
    dispose() { map.dispose(); lineMat.dispose() },
  }
}
