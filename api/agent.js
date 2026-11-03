import Anthropic from '@anthropic-ai/sdk'
import { readySpots } from '../shared/spots.js'
import { CLOUD_TABLE, ADJUST } from '../shared/score.js'
import { todayKst, addDays, FORECAST_RANGE } from '../shared/date.js'
import { RUN, TOOLS, summarize } from '../server/tools.js'
import { trailById } from '../shared/trails.js'

const MODEL = 'claude-haiku-5-5'
const MAX_TURNS = 8

// 답변 끝 태그: [[FOCUS spot=<id> date=YYYY-MM-DD event=sunrise|sunset dates=YYYY-MM-DD,YYYY-MM-DD]]  (dates 는 비교한 날짜들, 선택)
const FOCUS_RE = /\[\[FOCUS\s+([^\]]*)\]\]/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

export function parseFocus(answer) {
  const m = answer.match(FOCUS_RE)
  if (!m) return { answer, focus: null }
  const kv = Object.fromEntries([...m[1].matchAll(/(\w+)=(\S+)/g)].map((x) => [x[1], x[2]]))
  const clean = answer.replace(FOCUS_RE, '').trim()
  if (!readySpots.some((s) => s.id === kv.spot) || !DATE_RE.test(kv.date ?? '') || !['sunrise', 'sunset'].includes(kv.event)) return { answer: clean, focus: null }
  const focus = { spotId: kv.spot, date: kv.date, event: kv.event }
  // 비교한 날짜가 2개 이상일 때만 목록을 내려 줌 (화면의 날짜 전환 버튼용). 최대 7개, 중복 제거, 오름차순
  const dates = [...new Set([...(kv.dates ?? '').split(','), kv.date].filter((d) => DATE_RE.test(d) && !Number.isNaN(Date.parse(d))))].sort().slice(0, 7)
  if (dates.length >= 2) focus.dates = dates
  return { answer: clean, focus }
}

// 사용자가 알 필요 없는 내부 사정(데이터 출처, 예보가 없다는 안내, 계산값)이 답변에 섞여 오면 그 문장만 걸러 내고,
// 골든아워는 늘 영어로 쓴다. (지시문으로도 막지만 모델이 가끔 쓰므로 한 번 더 확인)
const INTERNAL_RE = /Open-?Meteo|오픈\s?메테오|sunrise-sunset|계산값|기상청[^.!?\n]*예보[^.!?\n]*(없|못|제공|범위)/i
export function polish(text) {
  const kept = String(text ?? '').split('\n')
    .map((line) => line.split(/(?<=[.!?。])\s+/).filter((s) => !INTERNAL_RE.test(s)).join(' '))
    .join('\n')
  return kept.replace(/골든\s?아워/g, 'Golden Hour').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
}

// 한라산 등반 답변 끝 태그: [[HALLASAN trail=<코스 id> date=YYYY-MM-DD]] → 화면의 "한라산 판정기에서 보기" 버튼용
const HZ_RE = /\[\[HALLASAN\s+([^\]]*)\]\]/
export function parseHallasan(answer) {
  const m = answer.match(HZ_RE)
  if (!m) return { answer, hallasan: null }
  const kv = Object.fromEntries([...m[1].matchAll(/(\w+)=(\S+)/g)].map((x) => [x[1], x[2]]))
  const clean = answer.replace(HZ_RE, '').trim()
  if (!trailById(kv.trail) || !DATE_RE.test(kv.date ?? '')) return { answer: clean, hallasan: null }
  return { answer: clean, hallasan: { trail: kv.trail, date: kv.date } }
}

const WEEKDAY = ['일', '월', '화', '수', '목', '금', '토']
const dowOf = (d) => WEEKDAY[new Date(`${d}T00:00:00Z`).getUTCDay()]
const md = (d) => `${Number(d.slice(5, 7))}/${Number(d.slice(8))}`
const dayTag = (d) => `${dowOf(d)}요일(${md(d)})`

// "이번 주말"이 며칠인지 모델이 헷갈리지 않게 미리 계산해서 알려 준다 (토·일, 이미 지난 날은 제외)
function weekendInfo() {
  const t = todayKst(), dow = new Date(`${t}T00:00:00Z`).getUTCDay()
  const sat = dow === 0 ? addDays(t, -1) : addDays(t, 6 - dow)
  return [sat, addDays(sat, 1)].filter((d) => d >= t)
}

const systemPrompt = () => `너는 제주 일출·일몰 사진 명소 알리미 에이전트다. 오늘은 ${todayKst()} ${dowOf(todayKst())}요일 (KST)다.
날짜 참고: 내일 = ${addDays(todayKst(), 1)} (${dayTag(addDays(todayKst(), 1))}), 이번 주말 = ${weekendInfo().map((d) => `${d} (${dayTag(d)})`).join(', ')}.

[작업 순서]
1. 명소를 비교해야 하면 list_photo_spots 로 목록을 얻는다.
2. 날짜가 없으면 오늘로 본다. 각 명소마다 get_sun_times 로 일출·일몰 시각을 얻는다.
3. get_cloud_cover 는 일출·일몰 시각의 시(hour)만 hours 로 골라 요청한다 (예: 일몰 17:39 → [17, 18]).
4. 비교해서 가장 좋은 명소 1곳과 이유를 말한다.

[구름양 기준표 — 전체 구름 %]
${CLOUD_TABLE.map((r, i) => `- ${i === 0 ? 0 : CLOUD_TABLE[i - 1].max}~${Math.min(r.max, 100)}%: ${r.label} (${r.score}점) — ${r.note}`).join('\n')}
보정: ${ADJUST.lowCloud.reason}(저층 ${ADJUST.lowCloud.above}% 초과 ${ADJUST.lowCloud.delta}), ${ADJUST.highMid.reason}(+${ADJUST.highMid.delta}), ${ADJUST.rain.reason}(${ADJUST.rain.delta}), ${ADJUST.wind.reason}(${ADJUST.wind.delta})

[규칙]
- 시각·구름양은 반드시 도구 결과로만 말한다. 도구에 없는 숫자는 지어내지 않는다.
- 구름 예보는 오늘 -${FORECAST_RANGE.back}일 ~ +${FORECAST_RANGE.ahead}일만 가능하다. 범위 밖이면 일출·일몰 시각만 알려 주고 구름은 판단할 수 없다고 말한다.
- 구름양(%)은 cloud_total 값으로 말하고, 맑음/구름많음/흐림과 비 가능성은 기상청 값(kma_sky, kma_precip, kma_pop_pct)이 있으면 그 값으로, null 이면 weather 값으로 말한다.
- 데이터 출처나 예보 범위 같은 내부 사정은 사용자에게 말하지 않는다. "기상청 예보가 이 날짜에 없다", "Open-Meteo", "sunrise-sunset.org", "계산값" 같은 말은 답변에 쓰지 않는다. 그냥 가진 값으로 자연스럽게 답한다.
- 골든아워는 한글로 쓰지 말고 항상 영어 "Golden Hour"로 쓴다.
- 기상청이 비·눈(kma_precip 이 '없음'이 아님)이거나 강수확률 60% 이상이면 구름이 좋아도 촬영을 권하지 않는다.
- 도구가 실패하면 실패한 사실을 한 줄로 알리고, 가능한 정보만으로 답한다.
- 사진 점수는 자체 추천일 뿐 촬영 결과를 보장하지 않는다.
- 한국어로 쓰고, 시각은 HH:MM, 구름은 %로 쓴다. 마크다운 기호(**, #, 표, 목록 기호)는 쓰지 않는다.
- 사용자가 여러 날짜를 비교해 달라고 하면(예: 이번 주말), 그 날짜를 모두 도구로 조회하고 답변에 모두 넣는다. 날짜는 항상 요일과 날짜를 함께 쓴다 (예: 토요일(11/7), 일요일(11/8)).
- 답변은 읽기 쉽게 문단을 빈 줄로 나눈다. 한 문단은 최대 3문장(2~3줄)으로 짧게, 문장마다 꼭 필요한 수치만:
  ① 결론 한 줄 (비교라면 "토요일(11/7) 일몰이 일요일(11/8)보다 낫습니다."처럼 두 날짜 모두 적는다)
  ② 날짜별 문단 (날짜마다 한 문단: 구름양·풍속·비 가능성을 짧게)
  ③ 가장 좋은 명소와 시간 한 줄
  ④ 마지막 문단에 "사진 점수는 자체 추천일 뿐이에요." 한 줄.
  비교가 아닌 단순 질문은 ①③④만으로 5문장 이내로 답한다.
[주변 장소 질문] (명소 근처의 음식점·카페·관광지·행사를 물으면)
1. list_photo_spots 로 해당 명소의 좌표를 얻는다.
2. list_nearby_places 를 그 좌표와 분류(음식점·카페·관광지·행사 등)로 호출한다.
3. 답변은 도구 결과의 이름·분류·거리·주소만 말한다. 영업시간·평점·메뉴·가격은 데이터에 없으니 지어내지 않는다. 가게 이름으로 메뉴를 추측하지 않고, 목록에 없는 가게 이름은 쓰지 않는다.
4. 결과가 없거나 정보가 없다고 나오면 그대로 알리고 NEARBY 탭을 안내한다.
[한라산 등반 질문] (한라산·백록담·성판악·관음사·어리목·영실·등산·등반 이야기가 나오면 위 일출·일몰 명소 작업 순서 대신 이 순서를 쓴다)
1. list_trails 로 코스를 얻는다. 코스를 말하지 않았으면 성판악 코스로 본다. 백록담 정상까지는 성판악·관음사만 갈 수 있고 어리목·영실은 윗세오름(1,700m)까지다.
2. 도착 지점(goal)의 좌표·고도로 get_sun_times 와 get_mountain_weather 를 부른다. 날짜가 없으면 오늘로 본다.
   get_mountain_weather 의 start_hour~end_hour 는 일출·일몰로 정한다: 하산 마감 = 일몰 30분 전, 출발 = 마감 − (오르는 시간 + 내려오는 시간 + 1시간).
3. 판정(judgement.level: good=좋음, caution=주의, danger=위험)과 judgement.checks 의 이유를 그대로 따른다. 판정을 마음대로 바꾸지 않는다.
4. 답변은 ① 판정 한 줄 ② 근거(돌풍·체감온도·비·시정 중 중요한 2~3개를 수치로) ③ Golden Hour(일출·일몰) 기준 출발 시각과 하산 마감 ④ 필요하면 더 안전한 코스 제안 순서로 쓰고, 마지막 문단에 "입산 통제와 탐방 예약은 한라산국립공원 공식 안내를 꼭 확인하세요."를 쓴다.
5. 한라산 답변에는 FOCUS 태그를 붙이지 않고, 맨 끝 줄에 [[HALLASAN trail=<코스 id> date=YYYY-MM-DD]] 를 한 번 붙인다.
6. list_trails 의 거리·오르내리는 시간은 어림값이다. 말할 때 "약"을 붙이고, 정확한 값은 한라산국립공원 공식 안내에서 확인하라고 한다. 고도도 어림값이니 같은 식으로 말한다.

- 답변 맨 끝 줄에 3D 화면을 맞출 태그를 정확히 이 형식으로 한 번 붙인다 (한라산 등반 질문은 제외) (추천한 명소·날짜·일출/일몰 중 하나, 그리고 비교한 날짜가 2개 이상이면 dates 에 모두 쉼표로):
  [[FOCUS spot=<명소 id> date=YYYY-MM-DD event=sunrise|sunset dates=YYYY-MM-DD,YYYY-MM-DD]]
  (dates 는 날짜를 비교했을 때만 붙이고, 아니면 생략한다)
  명소 id: ${readySpots.map((s) => s.id).join(', ')}`

// 클라이언트가 보낸 history 를 안전한 형태로 정리
function cleanHistory(history) {
  const out = []
  for (const m of Array.isArray(history) ? history.slice(-10) : []) {
    if ((m?.role === 'user' || m?.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
      out.push({ role: m.role, content: m.content.slice(0, 2000) })
  }
  while (out.length && out[0].role !== 'user') out.shift()
  return out.filter((m, i) => i === 0 || m.role !== out[i - 1].role)
}

async function runOne(block) {
  const fn = RUN[block.name]
  if (!fn) return { step: { tool: block.name, args: block.input, ok: false, error: '없는 도구' }, content: '없는 도구예요', isError: true }
  try {
    const result = await fn(block.input ?? {})
    return { step: { tool: block.name, args: block.input, ok: true, summary: summarize(block.name, result) }, content: JSON.stringify(result), isError: false }
  } catch (e) {
    return { step: { tool: block.name, args: block.input, ok: false, error: e.message }, content: `도구 실패: ${e.message}`, isError: true }
  }
}

// 테스트에서 가짜 client 를 넣을 수 있도록 팩토리로 만듭니다
export function createHandler(getClient) {
  return async function handler(req, res) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' })

    const message = String(req.body?.message ?? '').trim().slice(0, 500)
    if (!message) return res.status(400).json({ error: '질문을 입력해 주세요' })
    if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ error: '서버에 ANTHROPIC_API_KEY 가 없어요 (.env 또는 Vercel 환경변수)' })

    const messages = [...cleanHistory(req.body?.history), { role: 'user', content: message }]
    const steps = [] // 화면에 "에이전트가 호출한 도구"를 보여주기 위한 기록

    try {
      const client = getClient()
      // 에이전트 루프: 생각 → 도구 호출(여러 개 동시) → 결과 확인 → (반복) → 최종 답
      for (let turn = 0; turn < MAX_TURNS; turn++) {
        const r = await client.messages.create({ model: MODEL, max_tokens: 2500, system: systemPrompt(), tools: TOOLS, messages })

        if (r.stop_reason !== 'tool_use') {
          const hz = parseHallasan(r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n'))
          const { answer, focus } = parseFocus(hz.answer)
          if (!polish(answer)) { // 답변 글이 비어 오면 빈 화면 대신 안내를 보여 줌
            console.error(`[agent] 빈 답변 (stop_reason: ${r.stop_reason})`)
            return res.status(200).json({ answer: '답변이 길어져서 끝까지 만들지 못했어요. 날짜를 하나씩 나눠서 다시 물어봐 주세요.', steps, focus: null, hallasan: null })
          }
          return res.status(200).json({ answer: polish(answer), steps, focus, hallasan: hz.hallasan })
        }

        messages.push({ role: 'assistant', content: r.content })
        const calls = r.content.filter((b) => b.type === 'tool_use')
        const done = await Promise.all(calls.map(runOne))
        done.forEach((d) => steps.push(d.step))
        messages.push({
          role: 'user',
          content: calls.map((b, i) => ({ type: 'tool_result', tool_use_id: b.id, content: done[i].content, is_error: done[i].isError })),
        })
      }
      res.status(200).json({ answer: '도구 호출이 너무 많아 중단했어요. 질문을 좁혀 주세요.', steps, focus: null })
    } catch (e) {
      const msg = e.status === 429 ? '사용량이 많아요. 1분 뒤 다시 시도해 주세요.' : e.status === 401 ? 'ANTHROPIC_API_KEY 가 올바르지 않아요.' : `에이전트 오류: ${e.message}`
      res.status(e.status && e.status < 600 ? e.status : 500).json({ error: msg, steps })
    }
  }
}

let client
export default createHandler(() => (client ??= new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })))
