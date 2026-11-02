import { cached } from './cache.js'
import { httpError } from './http.js'
import { endedReason } from './freshness.js'
import { SPOTS } from '../shared/spots.js'

// 제주관광공사 비짓제주 관광정보 Open API (활용가이드 v1.0)
//  · 주소: GET https://api.visitjeju.net/vsjApi/contents/searchList?apiKey=..&locale=kr&page=1   (대소문자 구분! searchList)
//  · 키: 공공데이터포털 serviceKey 가 아니라 visitjeju.net/kr/visitjejuapi 에서 신청해 메일로 받는 자체 apiKey
//  · 한 페이지 100건. 카테고리·좌표·반경 검색 파라미터는 없어서, 전체를 받아 서버에서 거리로 걸러요.
//  · 오류도 HTTP 200 으로 오고 본문의 result 가 "403"(키 오류) 등으로 달라져요.
const BASE = 'https://api.visitjeju.net/vsjApi/contents/searchList'
const MAX_PAGES = 120 // 전체 약 5,900건 ÷ 100 = 59쪽. 넉넉한 안전 상한
const PARALLEL = 10     // 한 번에 보내는 요청 수 (가이드의 초당 30건 제한 안쪽)
const EXCLUDE = new Set(['숙박']) // 주변 탐색에서 뺄 분류
const ALL_TTL = 60 * 60 * 1000 // 전체 목록은 자주 안 바뀌어서 1시간 보관 (호출 수 절약)

async function fetchPage(key, page) {
  const q = new URLSearchParams({ apiKey: key, locale: 'kr', page: String(page) })
  let r
  try { r = await fetch(`${BASE}?${q}`, { signal: AbortSignal.timeout(10000) }) }
  catch { throw httpError(504, '비짓제주 응답이 없어요 (시간 초과)') }
  const body = await r.json().catch(() => null)
  if (!body) throw httpError(502, `비짓제주 응답이 JSON이 아니에요 (${r.status})`)
  const code = String(body.result)
  if (code === '403') throw httpError(403, '비짓제주 apiKey 가 올바르지 않아요 (VISITJEJU_API_KEY 확인)')
  if (code !== '200') throw httpError(502, `비짓제주 오류: ${code} ${body.resultMessage ?? ''}`.trim())
  return body
}

// 일출·일몰 명소 자체는 주변 장소에서 뺌 (성산일출봉 주변에 '성산일출봉'이 또 나오지 않게).
// 제목이 명소 이름과 같거나 '~도로'처럼 두 글자 이내로만 붙은 관광지만 뺌 — '수월봉 지질트레일' 같은 별개 체험은 남김
const norm = (t) => t.replace(/\s/g, '')
const isPhotoSpot = (title) => SPOTS.some((s) => { const k = norm(s.tourKeyword), t = norm(title); return t.startsWith(k) && t.length - k.length <= 2 })

// 전화번호: 이미 하이픈이 있으면 그대로, 숫자만 이어진 것(050713760617)은 0507-1376-0617 처럼 나눔. 번호가 아니면 빈 값
export function formatPhone(raw) {
  const s = String(raw ?? '').trim()
  if (!s || s === '*') return ''
  if (/\d+-\d+/.test(s)) return s
  const d = s.replace(/\D/g, '')
  if (d.length < 7) return ''
  if (/^050\d/.test(d) && d.length === 12) return `${d.slice(0, 4)}-${d.slice(4, 8)}-${d.slice(8)}`   // 0507-1376-0617
  if (/^1[568]\d\d/.test(d) && d.length === 8) return `${d.slice(0, 4)}-${d.slice(4)}`               // 1588-1234
  if (d.startsWith('02')) return d.length === 9 ? `02-${d.slice(2, 5)}-${d.slice(5)}` : `02-${d.slice(2, 6)}-${d.slice(6)}`
  if (/^0\d\d/.test(d)) { // 064-745-3575 / 010-1234-5678
    if (d.length === 10) return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`
    if (d.length === 11) return `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`
  }
  return s
}

const hasPhoto = (p) => Number(Boolean(p.image || p.thumb))

const slim = (it) => ({
  id: it.contentsid, title: it.title, category: it.contentscd?.label ?? '기타',
  address: it.roadaddress || it.address || '', tags: String(it.tag ?? '').split(',').map((t) => t.trim()).filter(Boolean).slice(0, 5),
  intro: String(it.introduction ?? '').slice(0, 200), phone: formatPhone(it.phoneno),
  lat: Number(it.latitude), lng: Number(it.longitude),
  image: it.repPhoto?.photoid?.imgpath ?? '', thumb: it.repPhoto?.photoid?.thumbnailpath ?? '',
})

// 전체 콘텐츠를 모읍니다: 1쪽으로 전체 개수를 알아낸 뒤 나머지 쪽을 10개씩 묶어 병렬로 받아요
function getAll(key) {
  return cached('visitjeju:all', async () => {
    const byId = new Map()
    // 이미 끝난 행사는 목록에서 뺌 (규칙: server/freshness.js)
    const add = (body) => {
      for (const it of body.items ?? []) {
        if (!it.contentsid) continue
        if (it.contentscd?.label === '축제/행사' && endedReason(it)) continue
        if (it.contentscd?.label === '관광지' && isPhotoSpot(it.title ?? '')) continue
        byId.set(it.contentsid, slim(it))
      }
    }

    const first = await fetchPage(key, 1)
    add(first)
    const size = first.pageSize || first.items?.length || 100
    const pages = Math.min(MAX_PAGES, Math.ceil((first.totalCount || 0) / size))

    for (let p = 2; p <= pages; p += PARALLEL) {
      const batch = Array.from({ length: Math.min(PARALLEL, pages - p + 1) }, (_, i) => fetchPage(key, p + i))
      for (const body of await Promise.all(batch)) add(body)
    }
    return [...byId.values()].filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng) && p.lat && p.lng)
  }, ALL_TTL)
}

// 제목에 검색어가 들어간 콘텐츠 (좌표 찾기 스크립트용)
export async function findByTitle(keyword) {
  const key = process.env.VISITJEJU_API_KEY
  if (!key) throw httpError(503, 'VISITJEJU_API_KEY 가 없어요')
  return (await getAll(key)).filter((p) => p.title.replace(/s/g, '').includes(keyword.replace(/s/g, '')))
}

// 명소 카드용 대표 사진: '관광지'로 등록된 항목 중 제목이 가장 비슷한 것
export async function findPhoto(keyword) {
  const key = process.env.VISITJEJU_API_KEY
  if (!key) return null
  const norm = (t) => t.replace(/s/g, '')
  const hits = (await findByTitle(keyword)).filter((p) => p.category === '관광지' && p.image)
  const best = hits.find((p) => norm(p.title) === norm(keyword)) ?? hits.sort((a, b) => a.title.length - b.title.length)[0]
  return best ? { id: best.id, title: best.title, addr: best.address, lat: best.lat, lng: best.lng, image: best.image } : null
}

const rad = (d) => (d * Math.PI) / 180
export function distanceKm(aLat, aLng, bLat, bLng) { // 하버사인 공식
  const dLat = rad(bLat - aLat), dLng = rad(bLng - aLng)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2
  return 6371 * 2 * Math.asin(Math.sqrt(h))
}

// 좌표 주변(반경 km)의 관광 콘텐츠를 가까운 순으로. 용도(분류)마다 가까운 perKind 곳씩 담고, 분류별 개수는 반경 안의 실제 전체 수예요.
export async function getNearby({ lat, lng, radius = 5, perKind = 150 }) {
  const key = process.env.VISITJEJU_API_KEY
  if (!key) return { items: [], categories: [], disabled: 'VISITJEJU_API_KEY 가 없어서 주변 관광지를 불러올 수 없어요 (visitjeju.net/kr/visitjejuapi 에서 신청)' }

  const km = Math.min(30, Math.max(1, Number(radius) || 5))
  const near = (await getAll(key))
    .map((p) => ({ ...p, distanceKm: Math.round(distanceKm(lat, lng, p.lat, p.lng) * 10) / 10 }))
    .filter((p) => p.distanceKm <= km && !EXCLUDE.has(p.category))
    .sort((a, b) => (hasPhoto(b) - hasPhoto(a)) || (Boolean(b.phone) - Boolean(a.phone)) || a.distanceKm - b.distanceKm) // 사진 있는 곳 → 전화번호 있는 곳 → 가까운 순 (사진 없는 곳은 뒤로)

  const counts = {}, taken = {}, items = []
  for (const p of near) {
    counts[p.category] = (counts[p.category] ?? 0) + 1
    if ((taken[p.category] = (taken[p.category] ?? 0) + 1) <= perKind) items.push(p)
  }
  const categories = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([label, count]) => ({ label, count }))
  return { radiusKm: km, total: near.length, items, categories }
}
