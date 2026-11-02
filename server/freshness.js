import { todayKst } from '../shared/date.js'

// 비짓제주 '축제/행사' 중 이미 끝난 행사를 걸러내는 규칙.
// 비짓제주 응답에는 종료일·폐업 여부 같은 전용 필드가 없어서(필드 15개뿐), 글과 사진 경로에서 판단합니다.
//   1) 제목·소개글의 날짜: 가장 늦은 날짜가 오늘보다 앞이면 종료  (예: 2026년 3월 9일부터 14일까지)
//      연도가 없으면 사진 등록 연도로 추정하고, 12월→1월처럼 해가 바뀌는 범위도 처리
//   2) 연도만 있고 올해보다 과거면 종료                           (예: 2025 제주 흑한우 박람회)
//   3) 올해 행사지만 날짜가 없으면 계절 표현으로 판단               (예: 입춘굿·설맞이·벚꽃축제 → 지난 계절)
//   4) 그래도 모르면 사진 등록 시점: 행사는 보통 끝나기 0~3개월 전에 등록되므로, 4개월보다 오래됐으면 종료
//      (사진 경로 imgpath/YYYYMM/ 에 등록 연월이 들어 있음)
// 식당·숙박·쇼핑 등은 폐업을 알 수 있는 정보가 응답에 없어서 이 규칙으로는 걸러낼 수 없습니다.
const LEAD_MONTHS = 4

const pad = (n) => String(n).padStart(2, '0')
const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
const validMD = (m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31
const lastDay = (y, m) => new Date(y, m, 0).getDate()

// 올해 행사 중 지나간 계절을 알려 주는 표현 → 그 계절이 끝나는 날(MM-DD)
const SEASONS = [
  [/입춘/, '02-28'],
  [/설\s*(?:맞이|민속|연휴|명절|나들이)|설날/, '02-28'],
  [/정월\s*대보름/, '03-10'],
  [/벚꽃|유채/, '04-30'],
  [/(?<![가-힣])봄(?![가-힣]{0,2}(?:을|를)\s*(?:본|보))/, '05-31'],
  [/여름/, '08-31'],
]

// 글에서 날짜를 읽어 { year, guessed, end } 로. 연도가 글에 없으면 사진 등록 연도로 추정(guessed)
//  · 월이 줄어들면(12월 → 1월) 다음 해로 넘김
//  · 연도 없는 날짜가 사진 등록 월보다 3개월 넘게 앞선 달이면 다음 해로 봄
//  · 'Vol. 4-6' 같은 숫자 쌍은 날짜로 읽지 않음 (월 표기나 연도가 있어야 함)
function dateClue(text, ym) {
  const years = [...text.matchAll(/(?<!\d)(20[0-3]\d)(?!\d)/g)].map((m) => Number(m[1]))
  const guessed = !years.length
  const base = years.length ? Math.max(...years) : ym?.[0]
  if (base == null) return null
  const ends = []
  let y = null, prevM = 0
  for (const m of text.matchAll(/(?:(20[0-3]\d)\s*[년.\-/]\s*(\d{1,2})\s*[월.\-/]|(\d{1,2})\s*월)\s*(\d{1,2})\s*일?/g)) {
    const mo = +(m[2] ?? m[3]), d = +m[4]
    if (!validMD(mo, d)) continue
    if (m[1]) y = +m[1]
    let yy = y ?? base
    if (y != null && mo < prevM) { y += 1; yy = y }
    prevM = mo
    if (guessed && ym && mo + 12 * yy < ym[1] + 12 * ym[0] - 3) yy += 1
    ends.push(iso(yy, mo, d))
  }
  for (const m of text.matchAll(/(\d{1,2})\s*월\s*(\d{1,2})\s*일[^0-9월]{0,8}(\d{1,2})\s*일/g)) { // 3월 9일부터 14일까지
    if (!validMD(+m[1], +m[3])) continue
    let yy = y ?? base
    if (guessed && ym && +m[1] + 12 * yy < ym[1] + 12 * ym[0] - 3) yy += 1
    ends.push(iso(yy, +m[1], +m[3]))
  }
  if (!ends.length) { // 월만 있으면 그 달 마지막 날로 봄
    const months = [...text.matchAll(/(?<!\d)(\d{1,2})\s*월/g)].map((m) => Number(m[1])).filter((n) => n >= 1 && n <= 12)
    if (months.length) { const mm = Math.max(...months); ends.push(iso(base, mm, lastDay(base, mm))) }
  }
  ends.sort()
  return { year: base, guessed, end: ends.at(-1) ?? null }
}

// 사진 등록 연월 → [년, 월]
const photoYm = (item) => item.repPhoto?.photoid?.imgpath?.match(/imgpath\/(\d{4})(\d{2})\//)?.slice(1).map(Number) ?? null

// 끝난 행사면 이유(문자열), 아니면 null
export function endedReason(item, today = todayKst()) {
  const text = `${item.title ?? ''} ${item.introduction ?? ''}`
  const [ty, tm] = today.split('-').map(Number)
  const ym = photoYm(item)
  const clue = dateClue(text, ym)

  if (clue && (clue.end || !clue.guessed)) { // 연도만 추정한 채 날짜가 없으면 아래 사진 등록 시점으로 판단
    if (clue.end) return clue.end < today ? `종료일 ${clue.end}` : null
    if (clue.year < ty) return `${clue.year}년 행사`
    if (clue.year === ty) {
      const ends = SEASONS.filter(([re]) => re.test(text)).map(([, md]) => `${ty}-${md}`).sort()
      if (ends.length && ends.at(-1) < today) return `지난 계절 행사 (${ends.at(-1)})`
    }
    if (clue.year > ty) return null
  }

  if (ym && (ty * 12 + tm) - (ym[0] * 12 + ym[1]) > LEAD_MONTHS) return `사진 등록 ${ym[0]}-${pad(ym[1])} (${LEAD_MONTHS}개월 초과)`
  return null
}
