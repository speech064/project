import { httpError } from './http.js'

// 같은 외부 요청은 5분 동안 다시 부르지 않고 저장해 둔 답을 재사용합니다.
// (서버리스 인스턴스 안의 메모리 캐시라, 인스턴스가 바뀌면 비어 있을 수 있어요)
const TTL = 5 * 60 * 1000
const MAX_ENTRIES = 300
const store = new Map()    // key → { at, value }
const inflight = new Map() // 같은 요청이 동시에 오면 한 번만 보냄

// staleFor: 새로 불러오다 실패했을 때, 만료된 지 이 시간(ms) 안이면 예전 값을 대신 돌려줍니다 (기본 0 = 안 씀)
export async function cached(key, load, ttl = TTL, staleFor = 0) {
  const hit = store.get(key)
  if (hit && Date.now() - hit.at < ttl) return hit.value
  if (inflight.has(key)) return inflight.get(key)

  const p = load()
    .then((value) => {
      if (store.size >= MAX_ENTRIES) store.delete(store.keys().next().value)
      store.set(key, { at: Date.now(), value })
      return value
    })
    .catch((err) => {
      if (hit && Date.now() - hit.at < ttl + staleFor) return hit.value // 실패는 저장하지 않고, 쓸 만한 예전 값이 있으면 그것으로
      throw err
    })
    .finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}

// 네트워크 오류의 진짜 이유를 사람이 읽을 말로 (예전에는 전부 "시간 초과"로 뭉뚱그려 원인이 가려졌어요)
const CAUSES = {
  ENOTFOUND: '주소(DNS)를 찾지 못함', EAI_AGAIN: '주소(DNS) 조회 실패',
  ECONNREFUSED: '연결이 거부됨', ECONNRESET: '연결이 중간에 끊김', EPIPE: '연결이 중간에 끊김',
  ETIMEDOUT: '연결 시간 초과', UND_ERR_CONNECT_TIMEOUT: '연결 시간 초과', UND_ERR_HEADERS_TIMEOUT: '응답 헤더가 오지 않음',
  UND_ERR_SOCKET: '연결이 중간에 끊김', ENETUNREACH: '네트워크에 닿지 않음', EHOSTUNREACH: '서버에 닿지 않음',
}
export function explainNetworkError(e, timeoutMs) {
  if (e?.name === 'TimeoutError' || e?.name === 'AbortError') return { code: 'TIMEOUT', text: `${timeoutMs / 1000}초 안에 응답이 없음` }
  const code = e?.cause?.code ?? e?.code ?? ''
  if (/^(ERR_)?SSL|CERT|UNABLE_TO_VERIFY/i.test(code)) return { code, text: '보안 인증서 오류' }
  return { code: code || 'FETCH_FAILED', text: CAUSES[code] ?? (e?.cause?.message || e?.message || '알 수 없는 오류') }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// opts.timeout: 한 번 시도의 제한 시간 · opts.retries: 네트워크 오류·429·5xx 일 때 다시 시도할 횟수 · opts.staleFor: 위 cached 참고
export function fetchJson(url, label, ttl, { timeout = 8000, retries = 1, staleFor = 0 } = {}) {
  const once = async () => {
    let r
    try { r = await fetch(url, { signal: AbortSignal.timeout(timeout) }) }
    catch (e) {
      const why = explainNetworkError(e, timeout)
      console.error(`[${label}] 요청 실패 — ${why.code} · ${e?.name}: ${e?.message}`) // 서버 로그에는 진짜 원인을 남김
      throw Object.assign(httpError(504, `${label}에 연결하지 못했어요 — ${why.text} (${why.code})`), { retryable: true })
    }
    const body = await r.json().catch(() => null)
    if (!r.ok) {
      console.error(`[${label}] HTTP ${r.status}`)
      throw Object.assign(httpError(502, `${label} 오류: ${body?.reason ?? body?.error ?? r.status}`), { retryable: r.status === 429 || r.status >= 500 })
    }
    return body
  }

  return cached(url, async () => {
    let last
    for (let i = 0; i <= retries; i++) {
      try { return await once() }
      catch (e) { last = e; if (!e.retryable || i === retries) break; await sleep(350 * (i + 1)) }
    }
    throw last
  }, ttl, staleFor)
}
