import { readySpots } from '../shared/spots.js'
import { rateCloud, weatherLabel } from '../shared/score.js'
import { httpError, parseGeo } from './http.js'
import { getSunTimes } from './sun.js'
import { getWeather } from './weather.js'
import { getElevation, getMountainWeatherJudged, listTrails } from './hallasan.js'
import { getNearby } from './visitjeju.js'

// ① 도구 설명서: Claude 는 이 설명만 보고 "어떤 도구를 언제 쓸지" 결정합니다
export const TOOLS = [
  {
    name: 'list_photo_spots',
    description: '제주 일출·일몰 사진 명소 목록(id, 이름, 좌표, 일출/일몰 중 어느 쪽이 좋은지)을 돌려준다. 명소를 비교하려면 가장 먼저 호출한다.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_sun_times',
    description: '좌표와 날짜로 일출·일몰 시각을 조회한다 (sunrise-sunset.org). 시각은 한국 시간(KST).',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: '위도' },
        lng: { type: 'number', description: '경도' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
      },
      required: ['lat', 'lng', 'date'],
    },
  },
  {
    name: 'get_cloud_cover',
    description: '좌표와 날짜로 시간별 구름양(전체·저층·중층·고층 %), 날씨, 풍속, 파도 높이를 조회한다 (Open-Meteo 구름양 + 기상청 단기예보의 하늘상태·강수형태·강수확률). 구름양은 오늘 -92일 ~ +15일, 기상청 값은 오늘~약 3일 안에서만 채워진다. 일출·일몰 시각의 시(hour)를 먼저 알아낸 뒤 hours 로 필요한 시간만 요청하면 결과가 짧아진다.',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' },
        lng: { type: 'number' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        hours: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 23 }, description: '필요한 시(0~23). 생략하면 24시간 전체' },
      },
      required: ['lat', 'lng', 'date'],
    },
  },
  // ── 한라산 등반 날씨 판정기 ──
  {
    name: 'list_trails',
    description: '한라산 탐방로(성판악·관음사·어리목·영실) 목록을 돌려준다: 코스 id, 이름, 난이도, 거리(km), 오르는/내려오는 시간, 출발지·도착지 좌표와 고도(m). 백록담 정상까지 갈 수 있는 코스는 성판악·관음사뿐이고 어리목·영실은 윗세오름(1,700m)까지다. 한라산 등반 질문이면 가장 먼저 호출한다.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'get_elevation',
    description: '좌표의 해발고도(m)를 조회한다 (Open-Meteo Elevation). 지형모델(약 90m 격자) 값이라 뾰족한 정상은 실제보다 낮게 나온다. 코스 목록의 고도를 확인할 때 쓴다.',
    input_schema: { type: 'object', properties: { lat: { type: 'number' }, lng: { type: 'number' } }, required: ['lat', 'lng'] },
  },
  {
    name: 'get_mountain_weather',
    description: '좌표·고도·날짜로 고지대의 시간별 날씨(기온, 체감온도, 강수량·확률, 구름, 시정, 풍속, 돌풍, 결빙 고도, 적설)를 조회하고, 등반 판정(좋음/주의/위험과 이유)까지 함께 돌려준다 (Open-Meteo 예보에 고도를 지정해 고지대 기온으로 보정). 날씨를 볼 지점의 고도를 elevation 으로 반드시 넘긴다(정상 1947, 윗세오름 1700). 등반하는 시간대를 start_hour~end_hour 로 주면 그 시간만 판정한다.',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number' }, lng: { type: 'number' },
        elevation: { type: 'number', description: '날씨를 볼 지점의 해발고도(m)' },
        date: { type: 'string', description: 'YYYY-MM-DD' },
        start_hour: { type: 'integer', minimum: 0, maximum: 23, description: '등반 시작 시(기본 6)' },
        end_hour: { type: 'integer', minimum: 0, maximum: 23, description: '하산을 마치는 시(기본 17)' },
      },
      required: ['lat', 'lng', 'elevation', 'date'],
    },
  },
  // ── 주변 장소 (니어바이 탭과 같은 비짓제주 데이터) ──
  {
    name: 'list_nearby_places',
    description: '명소 주변 장소(관광지·음식점·행사 등)를 비짓제주 데이터로 찾는다. 이름, 분류, 거리, 주소, 전화번호, 태그를 돌려준다. 음식점·카페·관광지·행사 추천 질문이면 명소 좌표(list_photo_spots 의 lat, lng)를 넣어 호출한다. 영업시간·평점·메뉴는 데이터에 없다.',
    input_schema: {
      type: 'object',
      properties: {
        lat: { type: 'number', description: '기준 위도 (명소 좌표)' },
        lng: { type: 'number', description: '기준 경도 (명소 좌표)' },
        radius: { type: 'number', description: '반경(km). 생략하면 5' },
        category: { type: 'string', description: '분류 이름에 들어가는 말 (예: 음식점, 카페, 관광지, 행사). 생략하면 전부' },
      },
      required: ['lat', 'lng'],
    },
  },
]

// ② 도구 이름 → 실제로 실행할 함수
export const RUN = {
  async list_photo_spots() {
    if (!readySpots.length) throw httpError(500, '좌표가 확정된 명소가 없어요')
    return readySpots.map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng, better_for: s.best }))
  },

  get_sun_times: (input) => getSunTimes(parseGeo(input)),

  async get_cloud_cover(input) {
    const geo = parseGeo(input)
    const w = await getWeather(geo)
    const want = Array.isArray(input.hours) && input.hours.length ? input.hours : null
    const rows = want ? w.hours.filter((r) => want.includes(r.hour)) : w.hours
    return {
      date: geo.date, tz: w.tz,
      hours: rows.map((r) => ({
        hour: r.hour, cloud_total: r.cloud, low: r.low, mid: r.mid, high: r.high,
        rating: rateCloud(r.cloud).label, weather: weatherLabel(r.code).ko, wind_ms: r.wind, wave_m: r.wave,
        // 기상청 공식 예보 (없으면 null)
        kma_sky: r.kma?.skyLabel ?? null, kma_precip: r.kma?.ptyLabel ?? null, kma_pop_pct: r.kma?.pop ?? null,
      })),
      kma_status: w.kma.ok ? '기상청 단기예보 포함' : `기상청 없음 (${w.kma.error}) — Open-Meteo 만으로 판단`,
    }
  },

  async list_trails() { return listTrails() },
  get_elevation: (input) => getElevation(input),
  get_mountain_weather: (input) => getMountainWeatherJudged(input),

  async list_nearby_places(input) {
    const lat = Number(input.lat), lng = Number(input.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) throw httpError(400, '기준 좌표가 없어요')
    const r = await getNearby({ lat, lng, radius: input.radius ?? 5 })
    if (r.disabled) return { disabled: r.disabled, places: [] }
    const want = String(input.category ?? '').trim()
    const places = r.items
      .filter((p) => !want || p.category.includes(want))
      .slice(0, 12)
      .map((p) => ({ name: p.title, category: p.category, distance_km: p.distanceKm, address: p.address, phone: p.phone || null, tags: (p.tags ?? []).slice(0, 3) }))
    return { radius_km: r.radiusKm, total_in_radius: r.total, places }
  },
}

// 화면의 "호출한 도구" 목록에 보여줄 한 줄 요약
export function summarize(name, result) {
  if (name === 'list_photo_spots') return `명소 ${result.length}곳`
  if (name === 'get_sun_times') return `일출 ${result.sunrise} · 일몰 ${result.sunset}${result.approx ? ' (계산값)' : ''}`
  if (name === 'get_cloud_cover') return result.hours.map((h) => `${h.hour}시 ${h.cloud_total}%`).slice(0, 3).join(' · ')
  if (name === 'list_trails') return `코스 ${result.length}개`
  if (name === 'list_nearby_places') return result.disabled ? '주변 장소 정보 없음' : `주변 장소 ${result.places.length}곳`
  if (name === 'get_elevation') return `${result.elevation}m`
  if (name === 'get_mountain_weather') return result.judgement ? `판정 ${result.judgement.level}` : `${result.hours.length}시간`
  return 'OK'
}
