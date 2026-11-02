import * as THREE from 'three'

// 제주도 하나로 통일한 실루엣 — 바다에서 바라본 제주.
// 한라산을 중심으로 완만하게 퍼진 방패 모양(순상화산) 위에 오름 몇 개가 솟은 모습이에요.
// 참고: 위성 지도의 동서로 긴 타원형 윤곽(동쪽이 조금 낮음)과, 바다에서 본 섬 사진의 낮고 넓은 산세.
const HALF_W = 200 // 가로 반폭(장면 단위)
const PEAK = 64    // 한라산 높이 (보기 좋게 과장)
const BASE = -10   // 바닥은 바다 아래로 묻어 둠
const bump = (u, c, w, h) => h * Math.exp(-(((u - c) / w) ** 2))

// u: -1(서쪽 끝) ~ +1(동쪽 끝) → 0~1 높이
function height(u) {
  const a = Math.abs(u)
  if (a >= 1) return 0
  let h = Math.pow(1 - Math.pow(a, 1.8), 2.4)        // 넓게 퍼진 방패 모양
  h *= u > 0 ? 0.86 : 1                               // 동쪽(오른쪽)이 조금 낮음
  h -= 0.07 * Math.max(0, 1 - (u / 0.045) ** 2) * h  // 정상의 분화구(백록담)
  h += bump(u, -0.66, 0.05, 0.05) + bump(u, -0.38, 0.04, 0.035) + bump(u, 0.3, 0.045, 0.04)
    + bump(u, 0.56, 0.05, 0.05) + bump(u, 0.74, 0.04, 0.03) + bump(u, -0.84, 0.04, 0.025) // 오름들
  return Math.max(0, h)
}

// 능선 높이 (섬 표면 덮임 비율을 재는 테스트 등에서 씀)
export const ridgeY = (u) => height(u) * PEAK

export function buildSilhouette() {
  const shape = new THREE.Shape()
  shape.moveTo(-HALF_W, BASE)
  for (let i = 0; i <= 200; i++) {
    const u = -1 + i / 100
    shape.lineTo(u * HALF_W, height(u) * PEAK)
  }
  shape.lineTo(HALF_W, BASE)
  shape.closePath()
  return new THREE.ShapeGeometry(shape)
}
