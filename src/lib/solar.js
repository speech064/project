const D2R = Math.PI / 180
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))

// 태양 고도(el)·방위(az, 북쪽 기준 시계방향) — 라디안.
// 남중 시각(solarNoonMin)은 sunrise-sunset.org 값을 쓰고, 적위는 날짜로 계산합니다.
export function solarPosition({ lat, doy, minutes, solarNoonMin = 750 }) {
  const decl = 23.44 * D2R * Math.sin((2 * Math.PI * (284 + doy)) / 365)
  const H = ((minutes - solarNoonMin) / 60) * 15 * D2R // 시간각
  const phi = lat * D2R
  const sinEl = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(H)
  const el = Math.asin(clamp(sinEl, -1, 1))
  const cosAz = (Math.sin(decl) - Math.sin(el) * Math.sin(phi)) / (Math.cos(el) * Math.cos(phi) || 1e-6)
  let az = Math.acos(clamp(cosAz, -1, 1))
  if (H > 0) az = 2 * Math.PI - az // 오후엔 서쪽
  return { el, az }
}

// 구름·날씨를 하루 중 분 단위로 보간 (슬라이더를 움직이면 부드럽게 변하도록)
export function weatherAt(weather, minutes) {
  const rows = weather?.hours
  if (!rows?.length) return null
  const f = clamp(minutes / 60, 0, 23)
  const a = rows[Math.floor(f)], b = rows[Math.min(23, Math.ceil(f))], t = f - Math.floor(f)
  const mix = (x, y) => (x == null || y == null ? (x ?? y) : x + (y - x) * t)
  const near = t < 0.5 ? a : b
  return {
    hour: near.hour, total: mix(a.cloud, b.cloud), low: mix(a.low, b.low), mid: mix(a.mid, b.mid), high: mix(a.high, b.high),
    wave: mix(a.wave, b.wave), wind: mix(a.wind, b.wind), temp: mix(a.temp, b.temp), code: near.code,
  }
}
