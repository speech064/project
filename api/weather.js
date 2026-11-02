import { route, parseGeo } from '../server/http.js'
import { getWeather } from '../server/weather.js'

// GET /api/weather?lat=..&lng=..&date=YYYY-MM-DD  → 시간별 구름·날씨·풍속·파도
export default route((q) => getWeather(parseGeo(q)))
