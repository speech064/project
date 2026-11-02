// 좌표가 비어 있는 명소(shared/spots.js)의 좌표를 찾아 보여줍니다.
// 실행:  node --env-file=.env scripts/find-coords.mjs
// 1) 비짓제주 전체 목록에서 제목으로 검색(DATA: VISITJEJU_API_KEY)  2) 한국관광공사 TourAPI(DATA_GO_KR_KEY_KTO)
// 결과는 "후보"입니다. 이름·주소가 맞는지 확인하고 shared/spots.js 의 lat / lng 에 옮겨 적으세요.
import { SPOTS, isReady } from '../shared/spots.js'
import { searchTour } from '../server/tour.js'
import { findByTitle } from '../server/visitjeju.js'

const show = (label, list) => {
  console.log(`  [${label}] ${list.length ? '' : '결과 없음'}`)
  for (const i of list.slice(0, 6)) console.log(`   - ${i.title} | ${i.category ? i.category + ' | ' : ''}${i.addr ?? i.address} | lat ${i.lat}, lng ${i.lng}`)
}

for (const s of SPOTS.filter((s) => !isReady(s))) {
  console.log(`\n■ ${s.name} (id: ${s.id})`)
  const word = s.tourKeyword
  try { show('비짓제주', process.env.VISITJEJU_API_KEY ? await findByTitle(word) : []) } catch (e) { console.log('  [비짓제주] 실패 —', e.message) }
  try { show('한국관광공사', process.env.DATA_GO_KR_KEY_KTO ? (await searchTour({ keyword: word })).items : []) } catch (e) { console.log('  [한국관광공사] 실패 —', e.message) }
}
