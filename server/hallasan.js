import { fetchJson } from './cache.js'
import { httpError, parseLatLng } from './http.js'
import { getSunTimes } from './sun.js'
import { TRAILS, trailById } from '../shared/trails.js'
import { judge } from '../shared/hallasan.js'
import { rateCloud, weatherLabel } from '../shared/score.js'
import { FORECAST_RANGE, inForecastRange, isDateStr } from '../shared/date.js'

// ── 도구 ① list_trails: 코스 목록(출발·도착 좌표와 고도, 거리, 시간) ──
export function listTrails() {
  return TRAILS.map((t) => ({
    id: t.id, name: t.name, level: t.level, km: t.km, up_hours: t.upH, down_hours: t.downH, note: t.note,
    start: t.start, goal: t.goal,
  }))
}

// ── 도구 ② get_elevation: Open-Meteo Elevation API (지형모델, 약 90m 격자) ──
export async function getElevation({ lat, lng }) {
  const p = parseLatLng({ lat, lng })
  const q = new URLSearchParams({ latitude: p.lat.toFixed(4), longitude: p.lng.toFixed(4) })
  const d = await fetchJson(`https://api.open-meteo.com/v1/elevation?${q}`, 'Open-Meteo 고도', 24 * 3600e3)
  const elevation = d?.elevation?.[0]
  if (!Number.isFinite(elevation)) throw httpError(502, 'Open-Meteo 고도 응답에 값이 없어요')
  return { lat: p.lat, lng: p.lng, elevation, note: '지형모델 값이라 뾰족한 봉우리(백록담 1,947m)는 실제보다 낮게 나올 수 있어요' }
}

const HOURLY = 'temperature_2m,apparent_temperature,precipitation,precipitation_probability,weather_code,cloud_cover,cloud_cover_low,visibility,wind_speed_10m,wind_gusts_10m,freezing_level_height,snowfall'

// ── 도구 ③ get_mountain_weather: 그 고도에서의 시간별 날씨 (Open-Meteo 예보에 elevation 을 지정해 고지대 기온으로 보정) ──
export async function getMountainWeather({ lat, lng, elevation, date }) {
  const p = parseLatLng({ lat, lng })
  if (!isDateStr(date)) throw httpError(400, 'date 는 YYYY-MM-DD 형식이어야 해요')
  if (!inForecastRange(date)) throw httpError(422, `예보 제공 범위(오늘 기준 -${FORECAST_RANGE.back}일 ~ +${FORECAST_RANGE.ahead}일)를 벗어난 날짜예요`)
  const elev = Number(elevation)
  if (!Number.isFinite(elev) || elev < 0 || elev > 2200) throw httpError(400, 'elevation 은 0~2200(m) 숫자여야 해요')

  const q = new URLSearchParams({
    latitude: p.lat.toFixed(4), longitude: p.lng.toFixed(4), elevation: String(Math.round(elev)), hourly: HOURLY,
    wind_speed_unit: 'ms', timezone: 'Asia/Seoul', start_date: date, end_date: date,
  })
  const d = await fetchJson(`https://api.open-meteo.com/v1/forecast?${q}`, 'Open-Meteo 예보', undefined, { staleFor: 30 * 60 * 1000 })
  const h = d?.hourly
  if (!h?.time?.length) throw httpError(502, 'Open-Meteo 예보 응답에 시간별 값이 없어요')
  const hours = h.time.map((_, i) => ({
    hour: i, temp: h.temperature_2m[i], feels: h.apparent_temperature[i], precip: h.precipitation[i], pop: h.precipitation_probability[i],
    sky: weatherLabel(h.weather_code[i]).ko, cloud: h.cloud_cover[i], low: h.cloud_cover_low[i], vis: h.visibility[i],
    wind: h.wind_speed_10m[i], gust: h.wind_gusts_10m[i], freezing: h.freezing_level_height[i], snow: h.snowfall[i],
  }))
  return { date, elevation: Math.round(elev), tz: 'KST (UTC+9)', hours }
}

// 에이전트 도구용: 날씨 + 같은 기준의 판정을 함께 돌려줌 (hours 로 보고 싶은 시간 범위 지정)
export async function getMountainWeatherJudged({ lat, lng, elevation, date, start_hour, end_hour }) {
  const w = await getMountainWeather({ lat, lng, elevation, date })
  const h0 = Number.isInteger(start_hour) ? Math.max(0, Math.min(23, start_hour)) : 6
  const h1 = Number.isInteger(end_hour) ? Math.max(h0, Math.min(23, end_hour)) : 17
  const rows = w.hours.filter((r) => r.hour >= h0 && r.hour <= h1)
  return { ...w, hours: rows, judgement: judge({ goalRows: w.hours, window: [h0, h1] }) }
}

const hmOf = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`

// ── 화면용: 코스 하나·날짜 하나의 판정 + 고도 + Golden Hour 기준 출발 계획 ──
export async function judgeTrail({ trailId, date }) {
  const trail = trailById(trailId)
  if (!trail) throw httpError(400, `없는 코스예요 (${TRAILS.map((t) => t.id).join(', ')} 중 하나)`)
  if (!isDateStr(date)) throw httpError(400, 'date 는 YYYY-MM-DD 형식이어야 해요')

  const [goalW, startW, sun, startDem, goalDem] = await Promise.all([
    getMountainWeather({ lat: trail.goal.lat, lng: trail.goal.lng, elevation: trail.goal.elev, date }),
    getMountainWeather({ lat: trail.start.lat, lng: trail.start.lng, elevation: trail.start.elev, date }),
    getSunTimes({ lat: trail.goal.lat, lng: trail.goal.lng, date }).catch(() => null),
    getElevation({ lat: trail.start.lat, lng: trail.start.lng }).then((e) => e.elevation).catch(() => null),
    getElevation({ lat: trail.goal.lat, lng: trail.goal.lng }).then((e) => e.elevation).catch(() => null),
  ])

  // Golden Hour 기준 계획: 일몰 30분 전까지 하산을 마치도록 거꾸로 계산
  const roundTripMin = Math.round((trail.upH + trail.downH) * 60 + 60) // 쉬는 시간 1시간 포함
  let plan = null
  if (sun) {
    const deadline = sun.sunsetMin - 30
    const latestStart = deadline - roundTripMin
    const earliest = sun.sunriseMin - 30
    const recommended = Math.max(earliest, latestStart - 90) // 마감보다 1시간 반 여유
    const feasible = latestStart >= earliest
    plan = {
      feasible, roundTrip: `${Math.floor(roundTripMin / 60)}시간 ${roundTripMin % 60}분`,
      sunrise: sun.sunrise, sunset: sun.sunset, goldenHour: sun.goldenHour ?? null,
      deadline: hmOf(deadline), latestStart: hmOf(Math.max(0, latestStart)), recommendedStart: hmOf(recommended),
      goalArrival: hmOf(recommended + Math.round(trail.upH * 60)),
      startMin: recommended, deadlineMin: deadline,
    }
  }
  const win = plan ? [Math.floor(plan.startMin / 60), Math.ceil(plan.deadlineMin / 60)] : [6, 17]
  const verdict = judge({ goalRows: goalW.hours, startRows: startW.hours, window: win })

  // 일출 Golden Hour 에 정상(목표 지점)의 구름이 어땠는지
  let sunriseView = null
  if (sun) {
    const row = goalW.hours[Math.min(23, Math.round(sun.sunriseMin / 60))]
    if (row?.cloud != null) sunriseView = { hour: row.hour, cloud: row.cloud, rating: rateCloud(row.cloud).label }
  }

  const strip = (rows) => rows.filter((r) => r.hour >= 4 && r.hour <= 20)
  return {
    date, trail: { id: trail.id, name: trail.name, level: trail.level, km: trail.km, upH: trail.upH, downH: trail.downH, note: trail.note, start: trail.start, goal: trail.goal },
    elevations: { start: { known: trail.start.elev, dem: startDem }, goal: { known: trail.goal.elev, dem: goalDem }, gain: trail.goal.elev - trail.start.elev },
    plan, sunriseView, verdict, goalHours: strip(goalW.hours), startHours: strip(startW.hours),
  }
}
