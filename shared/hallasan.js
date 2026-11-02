// 한라산 등반 날씨 판정 — 화면과 에이전트가 같은 기준을 씀.
// 산악 날씨 일반 상식에 맞춘 "자체 기준"이에요. 공식 입산 통제·기상특보는 한라산국립공원 안내가 우선입니다.
// 값을 고치려면 아래 RULES 표만 바꾸세요.
export const RULES = {
  gust: { caution: 15, danger: 20 },    // 돌풍 m/s (능선·정상은 바람이 훨씬 세게 느껴짐)
  feels: { caution: -5, danger: -15 },  // 체감온도 °C (이 값 이하)
  heat: { caution: 30 },                // 출발지 체감온도 °C (이 값 이상 더위 주의)
  rain: { caution: 0.5, danger: 3 },    // 시간당 강수 mm
  pop: { caution: 60 },                 // 강수확률 %
  snow: { caution: 0.3, danger: 2 },    // 시간당 적설 cm
  vis: { caution: 1000, danger: 200 },  // 시정 m (이 값 이하)
}

const RANK = { good: 0, caution: 1, danger: 2 }
const worse = (a, b) => (RANK[b] > RANK[a] ? b : a)
const nums = (rows, k) => rows.map((r) => r[k]).filter((v) => v != null && Number.isFinite(v))
const maxOf = (rows, k) => { const v = nums(rows, k); return v.length ? Math.max(...v) : null }
const minOf = (rows, k) => { const v = nums(rows, k); return v.length ? Math.min(...v) : null }
const hourOf = (rows, k, pick) => { const v = pick(...nums(rows, k)); return v == null ? null : rows.find((r) => r[k] === v)?.hour ?? null }
const r1 = (v) => (v == null ? null : Math.round(v * 10) / 10)

// goalRows / startRows: [{hour, temp, feels, precip, pop, cloud, low, vis, wind, gust, snow, freezing}]
// window: [시작 시, 끝 시] — 이 시간 동안의 날씨만 봄
export function judge({ goalRows, startRows = [], window: [h0, h1] = [6, 17] }) {
  const g = goalRows.filter((r) => r.hour >= h0 && r.hour <= h1)
  const s = startRows.filter((r) => r.hour >= h0 && r.hour <= h1)
  if (!g.length) return null

  const stats = {
    gustMax: r1(maxOf(g, 'gust')), gustHour: hourOf(g, 'gust', Math.max),
    feelsMin: r1(minOf(g, 'feels')), tempMin: r1(minOf(g, 'temp')), tempMax: r1(maxOf(g, 'temp')),
    popMax: maxOf(g, 'pop'), rainMax: r1(maxOf(g, 'precip')), snowMax: r1(maxOf(g, 'snow')),
    visMin: minOf(g, 'vis'), visHour: hourOf(g, 'vis', Math.min),
    cloudAvg: nums(g, 'cloud').length ? Math.round(nums(g, 'cloud').reduce((a, b) => a + b, 0) / nums(g, 'cloud').length) : null,
    startFeelsMax: s.length ? r1(maxOf(s, 'feels')) : null,
  }

  const checks = []
  const add = (key, label, level, text) => checks.push({ key, label, level, text })
  const lv = (v, rule, below = false) => (v == null ? null : below ? (v <= rule.danger ? 'danger' : v <= rule.caution ? 'caution' : 'good') : (v >= rule.danger ? 'danger' : v >= rule.caution ? 'caution' : 'good'))

  const gl = lv(stats.gustMax, RULES.gust)
  if (gl) add('gust', '돌풍', gl, gl === 'danger' ? `정상부 돌풍이 ${stats.gustMax}m/s까지 불어요 (${stats.gustHour}시). 몸을 가누기 어려운 바람이에요.`
    : gl === 'caution' ? `정상부 돌풍이 ${stats.gustMax}m/s까지 불어요 (${stats.gustHour}시). 능선에서 몸이 흔들릴 수 있어요.` : `돌풍은 최대 ${stats.gustMax}m/s로 잔잔한 편이에요.`)

  const fl = lv(stats.feelsMin, RULES.feels, true)
  if (fl) add('feels', '체감온도', fl, fl === 'danger' ? `정상부 체감온도가 ${stats.feelsMin}°C까지 내려가요. 혹한 장비와 경험이 필요해요.`
    : fl === 'caution' ? `정상부 체감온도가 ${stats.feelsMin}°C까지 내려가요. 방풍·방한 옷과 장갑을 챙기세요.` : `정상부 체감온도는 가장 낮을 때 ${stats.feelsMin}°C예요.`)

  const rl = worse(lv(stats.rainMax, RULES.rain) ?? 'good', stats.popMax != null && stats.popMax >= RULES.pop.caution ? 'caution' : 'good')
  if (stats.rainMax != null || stats.popMax != null) add('rain', '비', rl,
    rl === 'danger' ? `시간당 ${stats.rainMax}mm 이상 비가 예보돼요. 계곡·바위길이 위험해져요.`
      : rl === 'caution' ? `비 가능성이 있어요 (강수확률 최대 ${stats.popMax ?? '—'}%${stats.rainMax ? `, 시간당 ${stats.rainMax}mm` : ''}). 우비와 방수 신발을 챙기세요.`
        : `비 소식이 없어요${stats.popMax != null ? ` (강수확률 최대 ${stats.popMax}%)` : ''}.`)

  const sl = lv(stats.snowMax, RULES.snow)
  if (sl && stats.snowMax > 0) add('snow', '눈', sl, sl === 'danger' ? `시간당 ${stats.snowMax}cm 눈이 예보돼요. 길이 묻히고 미끄러워요.` : `눈이 예보돼요 (시간당 ${stats.snowMax}cm). 아이젠이 필요해요.`)

  const vl = lv(stats.visMin, RULES.vis, true)
  if (vl) add('vis', '시정', vl, vl === 'danger' ? `시정이 ${stats.visMin}m까지 떨어져요 (${stats.visHour}시). 길을 잃기 쉬워요.`
    : vl === 'caution' ? `시정이 ${stats.visMin}m까지 떨어져요 (${stats.visHour}시). 안개 속에서는 코스 표식을 놓치지 마세요.` : `시정이 좋아요 (최소 ${(stats.visMin / 1000).toFixed(0)}km 이상).`)

  if (stats.startFeelsMax != null && stats.startFeelsMax >= RULES.heat.caution)
    add('heat', '더위', 'caution', `출발지 체감온도가 ${stats.startFeelsMax}°C까지 올라요. 물을 넉넉히 챙기세요.`)

  const level = checks.reduce((acc, c) => worse(acc, c.level), 'good')
  const headline = level === 'danger' ? '오늘은 등반을 미루는 게 좋아요' : level === 'caution' ? '준비를 갖추면 갈 수 있어요' : '등반하기 좋은 날이에요'
  // 심각한 것부터
  checks.sort((a, b) => RANK[b.level] - RANK[a.level])
  return { level, headline, checks, stats, window: [h0, h1] }
}
