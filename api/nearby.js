import { route, parseLatLng } from '../server/http.js'
import { getNearby } from '../server/visitjeju.js'

// GET /api/nearby?lat=..&lng=..&radius=5  → 주변 관광지·음식점·숙박 등 (비짓제주, 가까운 순)
export default route((q) => getNearby({ ...parseLatLng(q), radius: q.radius }))
