// 화면 → 우리 서버 함수(/api/...) 호출 모음. 외부 API·Claude 키는 브라우저에서 쓰지 않습니다.
// 모든 호출에 제한 시간이 있어서, 서버가 응답하지 않아도 "불러오는 중"이 끝없이 이어지지 않아요.
const TIMEOUT = 20000        // 일반 조회 (서버 쪽 재시도·대체 계산까지 기다릴 수 있는 시간)
const AGENT_TIMEOUT = 90000  // 에이전트는 도구를 여러 번 부르므로 더 길게

async function readJson(r) {
  let data
  try { data = await r.json() }
  catch { throw new Error(`서버 응답이 JSON이 아니에요 (${r.status}) — npm run dev 로 실행했는지 확인`) }
  if (!r.ok) throw new Error(data.error || r.statusText)
  return data
}

async function request(path, init, ms) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), ms)
  try {
    return await readJson(await fetch(path, { ...init, signal: ctl.signal }))
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`서버가 ${ms / 1000}초 안에 응답하지 않았어요. 잠시 뒤 다시 시도해 주세요.`)
    if (e instanceof TypeError) throw new Error('서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}

const get = (path) => request(path, undefined, TIMEOUT)
const post = (path, body) =>
  request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }, AGENT_TIMEOUT)

const geo = ({ lat, lng }, date) => new URLSearchParams({ lat, lng, date })

export const fetchSun = (spot, date) => get(`/api/sun?${geo(spot, date)}`)
export const fetchWeather = (spot, date) => get(`/api/weather?${geo(spot, date)}`)
export const fetchNearby = ({ lat, lng }, radius) => get(`/api/nearby?${new URLSearchParams({ lat, lng, radius })}`)
export const fetchTour = (keyword) => get(`/api/tour?${new URLSearchParams({ keyword })}`)
export const fetchHallasan = (trail, date) => get(`/api/hallasan?${new URLSearchParams({ trail, date })}`)
export const askAgent = (message, history) => post('/api/agent', { message, history })
