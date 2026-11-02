// 일출·일몰을 직접 계산합니다 (NOAA 태양 방정식, 한국 시간 기준, 오차 약 ±1~2분).
// sunrise-sunset.org 가 응답하지 않을 때만 대신 쓰는 값이라, 결과에 approx: true 를 붙여 구분합니다.
const R = Math.PI / 180
const deg = (r) => r / R
const hm = (min) => {
  const t = Math.floor(((min % 1440) + 1440) % 1440)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}

export function calcSunTimes({ lat, lng, date }) {
  const [y, m, d] = date.split('-').map(Number)
  const jd = Date.UTC(y, m - 1, d) / 86400000 + 2440587.5 + 3 / 24 // 한국 시간 정오(= UTC 03시)
  const T = (jd - 2451545) / 36525

  const L0 = (280.46646 + T * (36000.76983 + T * 0.0003032)) % 360
  const M = 357.52911 + T * (35999.05029 - 0.0001537 * T)
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T)
  const C = Math.sin(M * R) * (1.914602 - T * (0.004817 + 0.000014 * T)) + Math.sin(2 * M * R) * (0.019993 - 0.000101 * T) + Math.sin(3 * M * R) * 0.000289
  const omega = 125.04 - 1934.136 * T
  const lambda = L0 + C - 0.00569 - 0.00478 * Math.sin(omega * R)
  const eps = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60 + 0.00256 * Math.cos(omega * R)
  const decl = Math.asin(Math.sin(eps * R) * Math.sin(lambda * R))
  const yy = Math.tan((eps * R) / 2) ** 2
  const eqTime = 4 * deg(yy * Math.sin(2 * L0 * R) - 2 * e * Math.sin(M * R) + 4 * e * yy * Math.sin(M * R) * Math.cos(2 * L0 * R) - 0.5 * yy * yy * Math.sin(4 * L0 * R) - 1.25 * e * e * Math.sin(2 * M * R))

  const noon = 720 - 4 * lng - eqTime + 9 * 60 // 하루 중 분 (KST)
  const halfDay = (zenith) => {
    const c = Math.cos(zenith * R) / (Math.cos(lat * R) * Math.cos(decl)) - Math.tan(lat * R) * Math.tan(decl)
    return c < -1 || c > 1 ? null : 4 * deg(Math.acos(c))
  }
  const h = halfDay(90.833), hc = halfDay(96)
  if (h == null) throw new Error('이 날짜·위치에는 일출·일몰이 없어요')

  const sunriseMin = Math.floor(noon - h), sunsetMin = Math.floor(noon + h)
  return {
    date, tz: 'KST (계산값)', approx: true, source: '직접 계산한 값이에요 (sunrise-sunset.org 응답이 없어 대신 사용, 오차 약 ±2분)',
    sunrise: hm(sunriseMin), sunset: hm(sunsetMin), solarNoon: hm(noon),
    civilTwilightBegin: hc == null ? null : hm(noon - hc), civilTwilightEnd: hc == null ? null : hm(noon + hc),
    goldenHour: null, sunriseAzimuth: null, sunsetAzimuth: null,
    moonrise: null, moonset: null, moonPhase: null, moonIllumination: null,
    dayLengthMin: Math.round(2 * h),
    moonriseMin: null, moonsetMin: null,
    sunriseMin, sunsetMin, solarNoonMin: Math.floor(noon),
  }
}
