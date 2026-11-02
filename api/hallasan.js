import { route } from '../server/http.js'
import { judgeTrail } from '../server/hallasan.js'

// GET /api/hallasan?trail=seongpanak&date=YYYY-MM-DD  → 한라산 등반 날씨 판정 (고도·Golden Hour 계획 포함)
export default route((q) => judgeTrail({ trailId: q.trail, date: q.date }))
