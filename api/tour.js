import { route } from '../server/http.js'
import { searchTour } from '../server/tour.js'
import { findPhoto } from '../server/visitjeju.js'

// GET /api/tour?keyword=성산일출봉  → 명소 대표 사진
//  1순위 한국관광공사 TourAPI, 사진이 없으면 2순위 비짓제주('관광지' 등록 사진)
export default route(async (q) => {
  const keyword = String(q.keyword ?? '')
  const tour = await searchTour({ keyword }).catch(() => ({ items: [] }))
  if (tour.items?.some((i) => i.image)) return { source: 'KTO', items: tour.items }
  const jeju = await findPhoto(keyword).catch(() => null)
  return jeju ? { source: 'VisitJeju', items: [jeju] } : { source: null, items: tour.items ?? [], disabled: tour.disabled }
})
