import { fetchJson } from './cache.js'
import { httpError } from './http.js'
import { calcSunTimes } from './sunCalc.js'

// sunrise-sunset.org v2 — 시각을 한국 시간(+09:00)으로 바로 돌려주고, 골든아워·일출/일몰 방위각도 줍니다.
// 응답 예: "sunrise": "2026-11-03T06:52:15+09:00"  (그래서 별도의 시간대 변환이 필요 없어요)
const hmOf = (iso) => iso.slice(11, 16)
const minOf = (iso) => Number(iso.slice(11, 13)) * 60 + Number(iso.slice(14, 16))

// 같은 좌표·날짜의 일출·일몰은 바뀌지 않으니 오래 기억하고, 새로 못 불러오면 예전 값을 씁니다
const SUN_TTL = 12 * 60 * 60 * 1000
const SUN_STALE = 7 * 24 * 60 * 60 * 1000
// 사이트가 계속 응답하지 않으면 잠깐(2분) 건너뛰고 바로 계산값을 써서, 매번 몇 초씩 기다리지 않게 함
const SKIP_MS = 2 * 60 * 1000
let downUntil = 0

async function fromApi({ lat, lng, date }) {
  const q = new URLSearchParams({ lat: lat.toFixed(4), lng: lng.toFixed(4), date })
  const d = await fetchJson(`https://api.sunrise-sunset.org/v2?${q}`, 'sunrise-sunset.org', SUN_TTL, { timeout: 4500, retries: 1, staleFor: SUN_STALE })
  if (!d?.sunrise || !d?.sunset) throw httpError(502, `sunrise-sunset.org 응답에 일출·일몰이 없어요 (${d?.sun_status ?? d?.error ?? '알 수 없음'})`)
  if (d.utc_offset !== '+09:00') throw httpError(502, `시간대가 한국이 아니에요 (${d.tzid})`)

  const g = d.golden_hour
  return {
    date: d.date, tz: `KST (${d.tzid})`,
    sunrise: hmOf(d.sunrise), sunset: hmOf(d.sunset), solarNoon: hmOf(d.solar_noon),
    civilTwilightBegin: hmOf(d.civil_twilight_begin), civilTwilightEnd: hmOf(d.civil_twilight_end),
    goldenHour: g && { morning: `${hmOf(g.morning.begin)}–${hmOf(g.morning.end)}`, evening: `${hmOf(g.evening.begin)}–${hmOf(g.evening.end)}` },
    sunriseAzimuth: d.solar_position?.sunrise_azimuth, sunsetAzimuth: d.solar_position?.sunset_azimuth,
    moonrise: d.moonrise ? hmOf(d.moonrise) : null, moonset: d.moonset ? hmOf(d.moonset) : null,
    moonPhase: d.moon_phase ?? null, moonIllumination: d.moon_illumination ?? null, // 0~100 (%)
    dayLengthMin: Math.round(d.day_length / 60),
    moonriseMin: d.moonrise ? minOf(d.moonrise) : null, moonsetMin: d.moonset ? minOf(d.moonset) : null,
    sunriseMin: minOf(d.sunrise), sunsetMin: minOf(d.sunset), solarNoonMin: minOf(d.solar_noon), // 3D 장면용 (하루 중 분)
  }
}

export async function getSunTimes(geo) {
  if (Date.now() >= downUntil) {
    try {
      const r = await fromApi(geo)
      downUntil = 0
      return r
    } catch (e) {
      if (e.status && e.status < 500 && e.status !== 429) throw e // 요청 자체가 잘못된 경우는 계산으로 덮지 않음
      downUntil = Date.now() + SKIP_MS
      console.error(`[sun] sunrise-sunset.org 실패 → 계산값으로 대체: ${e.message}`)
      const r = calcSunTimes(geo)
      return { ...r, apiError: e.message } // 왜 대체됐는지 화면·에이전트가 알 수 있게
    }
  }
  return { ...calcSunTimes(geo), apiError: 'sunrise-sunset.org 가 방금 응답하지 않아 잠시 건너뜀' }
}
