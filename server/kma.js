import { cached } from './cache.js'
import { httpError } from './http.js'

// 기상청 단기예보조회서비스 (공공데이터포털 VilageFcstInfoService_2.0 / getVilageFcst)
// 하늘상태·강수형태·강수확률로 "맑은 날씨" 판정에 씁니다. 구름양(%)·층 정보는 Open-Meteo 가 담당.
const URL_BASE = 'https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getVilageFcst'
const BASES = [2, 5, 8, 11, 14, 17, 20, 23] // 하루 8번 발표(시)
const pad = (n) => String(n).padStart(2, '0')

export const SKY = { 1: '맑음', 3: '구름많음', 4: '흐림' }
export const PTY = { 0: '없음', 1: '비', 2: '비/눈', 3: '눈', 4: '소나기' }

// ① 위경도 → 기상청 격자(nx, ny): 기상청 공개 변환식(람베르트 정형 도법)
export function toGrid(lat, lon) {
  const D = Math.PI / 180
  const re = 6371.00877 / 5.0
  const slat1 = 30 * D, slat2 = 60 * D, olon = 126 * D, olat = 38 * D
  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5)
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn
  const ro = (re * sf) / Math.pow(Math.tan(Math.PI * 0.25 + olat * 0.5), sn)
  const ra = (re * sf) / Math.pow(Math.tan(Math.PI * 0.25 + lat * D * 0.5), sn)
  let theta = lon * D - olon
  if (theta > Math.PI) theta -= 2 * Math.PI
  if (theta < -Math.PI) theta += 2 * Math.PI
  theta *= sn
  return { nx: Math.floor(ra * Math.sin(theta) + 43 + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + 136 + 0.5) }
}

// ② 가장 최근 발표 시각: 발표 후 자료가 올라오는 데 약 10분 걸려서 10분 전 기준으로 고름
export function latestBase(now = Date.now()) {
  const t = new Date(now + 9 * 3600e3 - 10 * 60e3) // KST - 10분
  const h = t.getUTCHours()
  const base = [...BASES].reverse().find((b) => b <= h)
  if (base == null) t.setUTCDate(t.getUTCDate() - 1) // 02:10 이전이면 어제 23시 발표
  const d = t.toISOString().slice(0, 10).replaceAll('-', '')
  return { base_date: d, base_time: `${pad(base ?? 23)}00` }
}

// date(YYYY-MM-DD) 하루치를 시(0~23) → { sky, pty, pop, tmp, wind } 로 돌려줌. 실패하면 이유와 함께 던짐
export async function getKma({ lat, lng, date }) {
  const key = process.env.DATA_GO_KR_KEY_KMA
  if (!key) throw httpError(503, '기상청: DATA_GO_KR_KEY_KMA 가 없어요')

  const { nx, ny } = toGrid(lat, lng)
  const { base_date, base_time } = latestBase()
  const q = new URLSearchParams({
    serviceKey: key, pageNo: '1', numOfRows: '1000', dataType: 'JSON', base_date, base_time, nx: String(nx), ny: String(ny),
  })

  const data = await cached(`kma:${base_date}${base_time}:${nx},${ny}`, async () => {
    let r
    try { r = await fetch(`${URL_BASE}?${q}`, { signal: AbortSignal.timeout(8000) }) }
    catch { throw httpError(504, '기상청 응답이 없어요 (시간 초과)') }
    const text = await r.text()
    let body
    try { body = JSON.parse(text) } catch { throw httpError(502, '기상청 응답이 JSON이 아니에요 (키 또는 활용신청 확인)') }
    const head = body?.response?.header
    if (head?.resultCode !== '00') throw httpError(502, `기상청 오류: ${head?.resultMsg ?? r.status}`)
    const items = body.response.body?.items?.item
    return Array.isArray(items) ? items : []
  })

  const want = date.replaceAll('-', '')
  const byHour = {}
  for (const it of data) {
    if (it.fcstDate !== want) continue
    const h = Number(it.fcstTime.slice(0, 2))
    ;(byHour[h] ??= {})[it.category] = it.fcstValue
  }
  if (!Object.keys(byHour).length) throw httpError(422, '기상청 단기예보는 오늘부터 약 3일까지만 제공돼요')

  const hours = {}
  for (const [h, c] of Object.entries(byHour)) {
    hours[h] = {
      sky: c.SKY != null ? Number(c.SKY) : null, skyLabel: SKY[c.SKY] ?? null,
      pty: c.PTY != null ? Number(c.PTY) : null, ptyLabel: PTY[c.PTY] ?? null,
      pop: c.POP != null ? Number(c.POP) : null, tmp: c.TMP != null ? Number(c.TMP) : null,
      wind: c.WSD != null ? Number(c.WSD) : null,
    }
  }
  return { grid: { nx, ny }, base: `${base_date} ${base_time}`, hours }
}
