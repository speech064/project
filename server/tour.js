import { cached } from './cache.js'
import { httpError } from './http.js'

// 한국관광공사 TourAPI (공공데이터포털) — 명소 카드의 대표 사진·주소에 씁니다
const BASE = 'https://apis.data.go.kr/B551011/KorService2'

export async function searchTour({ keyword }) {
  const key = process.env.DATA_GO_KR_KEY_KTO
  if (!keyword) throw httpError(400, 'keyword 가 필요해요')
  if (!key) return { items: [], disabled: 'DATA_GO_KR_KEY_KTO 가 없어서 명소 사진은 기본 배경으로 표시돼요' }

  return cached(`tour:${keyword}`, async () => {
    const params = new URLSearchParams({
      serviceKey: key, MobileOS: 'ETC', MobileApp: 'GoldenHour', _type: 'json',
      numOfRows: '5', pageNo: '1', areaCode: '39', keyword,
    })
    const r = await fetch(`${BASE}/searchKeyword2?${params}`, { signal: AbortSignal.timeout(8000) })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { throw httpError(502, 'TourAPI 응답이 JSON이 아니에요 (키 확인)') }

    const item = data?.response?.body?.items?.item
    const list = !item ? [] : Array.isArray(item) ? item : [item]
    return {
      items: list.map((p) => ({
        id: p.contentid, title: p.title, addr: p.addr1,
        lat: Number(p.mapy) || null, lng: Number(p.mapx) || null, // 좌표: mapy = 위도, mapx = 경도
        image: p.firstimage ? p.firstimage.replace(/^http:/, 'https:') : '',
      })),
    }
  }, 30 * 60 * 1000)
}
