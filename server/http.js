import { isDateStr } from '../shared/date.js'

export const httpError = (status, message) => Object.assign(new Error(message), { status })

// GET 서버 함수 공통 틀: 검증 → 실행 → 실패 이유를 JSON 으로
export const route = (fn) => async (req, res) => {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' })
  try {
    const data = await fn(req.query ?? {})
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate=60') // 5분 캐시
    res.status(200).json(data)
  } catch (e) {
    res.status(e.status ?? 502).json({ error: e.message })
  }
}

// lat / lng 를 검증해서 돌려줍니다
export function parseLatLng({ lat, lng }) {
  const la = Number(lat), lo = Number(lng)
  if (!Number.isFinite(la) || la < 32 || la > 34.5) throw httpError(400, 'lat 은 제주 범위(32~34.5)의 숫자여야 해요')
  if (!Number.isFinite(lo) || lo < 125 || lo > 128) throw httpError(400, 'lng 은 제주 범위(125~128)의 숫자여야 해요')
  return { lat: la, lng: lo }
}

// lat / lng / date 를 검증해서 돌려줍니다 (에이전트 도구 입력에도 같이 씀)
export function parseGeo({ lat, lng, date }) {
  if (!isDateStr(date)) throw httpError(400, 'date 는 YYYY-MM-DD 형식이어야 해요')
  return { ...parseLatLng({ lat, lng }), date }
}
