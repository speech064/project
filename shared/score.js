// ═══ 사진 촬영 추천 점수 기준표 ═════════════════════════════════
// 실제 사진 품질을 보장하는 값이 아니라, 날씨 데이터로 계산한 자체 추천 점수입니다.
// 기준을 바꾸려면 이 표만 고치면 화면·에이전트 답변이 함께 바뀝니다.

// ① 구름양(전체 %) → 기본 점수.  구름이 아예 없으면 노을이 심심하고, 적당하면 하늘이 물듭니다.
export const CLOUD_TABLE = [
  { max: 10, score: 45, label: '구름 거의 없음', note: '하늘이 물들 재료가 부족해 심심해요' },
  { max: 20, score: 70, label: '구름 적음', note: '맑지만 약간의 포인트가 아쉬워요' },
  { max: 60, score: 92, label: '좋음 (20~60%)', note: '구름이 빛을 받아 노을이 잘 번져요' },
  { max: 80, score: 60, label: '구름 많음', note: '틈 사이로 빛이 새면 가능성 있어요' },
  { max: 101, score: 20, label: '나쁨 (80% 이상)', note: '해가 거의 가려져요' },
]

// ② 보정값
export const ADJUST = {
  lowCloud: { above: 70, delta: -15, reason: '저층 구름이 많아 수평선의 해를 가려요' },
  highMid: { min: 20, max: 70, delta: 6, reason: '중·고층 구름이 적당해 하늘이 잘 물들어요' },
  rain: { codeFrom: 51, popFrom: 60, delta: -25, reason: '비·눈 등 강수 예보가 있어요 (기상청 강수형태·강수확률 60%↑ 포함)' },
  wind: { above: 12, delta: -5, reason: '바람이 강해 삼각대 촬영이 흔들릴 수 있어요' }, // m/s
}

// ③ 점수 → 한 줄 평
export const VERDICTS = [
  { min: 85, en: 'Excellent conditions for photography.', ko: '촬영하기 아주 좋은 조건이에요' },
  { min: 70, en: 'Good conditions for photography.', ko: '충분히 좋은 조건이에요' },
  { min: 50, en: 'Fair conditions — worth a try.', ko: '무난해요. 시도해 볼 만해요' },
  { min: 0, en: 'Challenging conditions today.', ko: '오늘은 쉽지 않은 조건이에요' },
]
// ═════════════════════════════════════════════════════════════════

export const rateCloud = (total) => CLOUD_TABLE.find((r) => total < r.max) ?? CLOUD_TABLE.at(-1)

export function photoScore({ total, low, mid, high, code, wind, pty, pop }) {
  if (total == null) return null
  const base = rateCloud(total)
  const parts = [{ name: `구름양 ${Math.round(total)}% · ${base.label}`, delta: base.score, reason: base.note }]
  const { lowCloud, highMid, rain, wind: w } = ADJUST
  if (low > lowCloud.above) parts.push({ name: `저층 구름 ${Math.round(low)}%`, delta: lowCloud.delta, reason: lowCloud.reason })
  const hm = Math.max(mid ?? 0, high ?? 0)
  if (hm >= highMid.min && hm <= highMid.max && low <= lowCloud.above)
    parts.push({ name: `중·고층 구름 ${Math.round(hm)}%`, delta: highMid.delta, reason: highMid.reason })
  if (code >= rain.codeFrom || pty > 0 || pop >= rain.popFrom) parts.push({ name: '강수 예보', delta: rain.delta, reason: rain.reason })
  if (wind > w.above) parts.push({ name: `풍속 ${wind.toFixed(1)}m/s`, delta: w.delta, reason: w.reason })
  const score = Math.max(0, Math.min(100, parts.reduce((a, p) => a + p.delta, 0)))
  const verdict = VERDICTS.find((v) => score >= v.min)
  return { score, parts, verdict }
}

// WMO 날씨 코드 → 이름
const WMO = [
  [[0], '맑음', 'Clear'], [[1, 2], '대체로 맑음', 'Mostly clear'], [[3], '흐림', 'Overcast'],
  [[45, 48], '안개', 'Fog'], [[51, 53, 55, 56, 57], '이슬비', 'Drizzle'],
  [[61, 63, 65, 66, 67], '비', 'Rain'], [[71, 73, 75, 77], '눈', 'Snow'],
  [[80, 81, 82], '소나기', 'Showers'], [[85, 86], '눈 소나기', 'Snow showers'], [[95, 96, 99], '뇌우', 'Thunderstorm'],
]
export function weatherLabel(code) {
  const row = WMO.find(([codes]) => codes.includes(code))
  return row ? { ko: row[1], en: row[2] } : { ko: '알 수 없음', en: 'Unknown' }
}
