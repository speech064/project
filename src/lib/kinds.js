// 용도별 구분: 색(Pantone 올해의 색을 글씨가 읽히게 살짝 진하게) · 이모지 · 한 줄 설명  (숙박은 서버에서 제외)
// 주변 탐색(NEARBY)과 저장(SAVED)이 같이 씀
export const KINDS = {
  '관광지': { c: '#00826A', mark: '🏞️', sub: '둘러볼 곳' },   // Emerald
  '음식점': { c: '#D8402F', mark: '🍽️', sub: '먹을 곳' },     // Living Coral
  '쇼핑': { c: '#A6740A', mark: '🛍️', sub: '살 곳' },         // Mimosa
  '축제/행사': { c: '#BB2649', mark: '🎉', sub: '즐길 거리' },  // Viva Magenta
  '테마여행': { c: '#5B5CA6', mark: '🧭', sub: '테마 코스' },   // Very Peri
}
export const ORDER = Object.keys(KINDS)
export const kind = (label) => KINDS[label] ?? { c: '#6B7F90', mark: '📍', sub: '기타' }
export const rank = (label) => { const i = ORDER.indexOf(label); return i < 0 ? 99 : i }
