import { JEJU_OUTLINE } from '../data/jejuOutline'

// 위도·경도 → 지도(SVG) 좌표. 위도 1도 = S 픽셀이고, 경도는 위도에 맞춰 cos 로 줄여서 섬이 찌그러지지 않게 함
export const MAP = {
  S: 1125, cos: Math.cos((33.35 * Math.PI) / 180),
  lng0: 126.146, lat0: 33.564, // 섬의 서쪽 끝·북쪽 끝
  padL: 170, padT: 30,         // 왼쪽에 이름표를 놓을 여백
  W: 1120, H: 580,
}

export const project = (lat, lng) => [MAP.padL + (lng - MAP.lng0) * MAP.cos * MAP.S, MAP.padT + (MAP.lat0 - lat) * MAP.S]
export const PX_PER_KM = MAP.S / 111 // 반경(km)을 지도 픽셀로

export const OUTLINE_PATH = JEJU_OUTLINE
  .map((ring) => `M${ring.map(([lng, lat]) => project(lat, lng).map((v) => v.toFixed(1)).join(',')).join('L')}Z`)
  .join('')

export const HALLASAN = project(33.362, 126.533)
