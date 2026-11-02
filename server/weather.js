import { fetchJson } from './cache.js'
import { httpError } from './http.js'
import { getKma } from './kma.js'
import { FORECAST_RANGE, inForecastRange } from '../shared/date.js'

const HOURLY = 'cloud_cover,cloud_cover_low,cloud_cover_mid,cloud_cover_high,weather_code,wind_speed_10m,temperature_2m'

// 파도 높이(바다 데이터) — 3D 바다 출렁임에 쓰며, 실패해도 날씨 조회는 계속합니다
async function getWaves({ lat, lng, date }) {
  const q = new URLSearchParams({ latitude: lat.toFixed(3), longitude: lng.toFixed(3), hourly: 'wave_height', timezone: 'Asia/Seoul', start_date: date, end_date: date })
  const data = await fetchJson(`https://marine-api.open-meteo.com/v1/marine?${q}`, 'Open-Meteo 바다')
  return data.hourly?.wave_height ?? []
}

// 구름양(%)·층·파도는 Open-Meteo, 공식 하늘상태·강수는 기상청 단기예보.
// 기상청이 실패하면(키 없음·범위 밖 등) Open-Meteo 만으로 답하고 kma.error 에 이유를 남깁니다.
export async function getWeather({ lat, lng, date }) {
  if (!inForecastRange(date))
    throw httpError(422, `예보 제공 범위(오늘 기준 -${FORECAST_RANGE.back}일 ~ +${FORECAST_RANGE.ahead}일)를 벗어난 날짜예요`)

  const q = new URLSearchParams({
    latitude: lat.toFixed(3), longitude: lng.toFixed(3), hourly: HOURLY,
    wind_speed_unit: 'ms', timezone: 'Asia/Seoul', start_date: date, end_date: date,
  })
  const [forecast, waves, kma] = await Promise.all([
    fetchJson(`https://api.open-meteo.com/v1/forecast?${q}`, 'Open-Meteo 예보', undefined, { staleFor: 30 * 60 * 1000 }),
    getWaves({ lat, lng, date }).catch(() => []),
    getKma({ lat, lng, date }).then((k) => ({ ok: true, ...k })).catch((e) => ({ ok: false, error: e.message })),
  ])

  const h = forecast.hourly
  const hours = h.time.map((_, i) => ({
    hour: i, cloud: h.cloud_cover[i], low: h.cloud_cover_low[i], mid: h.cloud_cover_mid[i], high: h.cloud_cover_high[i],
    code: h.weather_code[i], wind: h.wind_speed_10m[i], temp: h.temperature_2m[i], wave: waves[i] ?? null,
    kma: kma.ok ? (kma.hours[i] ?? null) : null,
  }))
  return {
    date, tz: 'KST (UTC+9)', hours,
    kma: kma.ok ? { ok: true, grid: kma.grid, base: kma.base } : { ok: false, error: kma.error },
  }
}
