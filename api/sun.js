import { route, parseGeo } from '../server/http.js'
import { getSunTimes } from '../server/sun.js'

// GET /api/sun?lat=..&lng=..&date=YYYY-MM-DD  → 일출·일몰 (KST)
export default route((q) => getSunTimes(parseGeo(q)))
