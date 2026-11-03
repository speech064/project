// AI 답변에 섞여 오는 마크다운 기호(**굵게**, "- 목록")는 화면에 그대로 보이지 않게 정리
const clean = (text) => String(text ?? '').replace(/\*\*/g, '').replace(/^\s*#+\s*/gm, '').replace(/^\s*[-*]\s+/gm, '· ')

// 문장이 끝날 때마다(. ! ? 뒤) 나눈 문장들
const sentences = (line) => line.split(/(?<=[.!?])\s+/).map((l) => l.trim()).filter(Boolean)

export const splitLines = (text) => clean(text).split(/\n+|(?<=[.!?])\s+/).map((l) => l.trim()).filter(Boolean)

// "한라산국립공원 공식 안내"라는 말은 누리집 링크로 바꿔 줌 (공식 누리집에서 통제·예약을 확인하도록)
const HZ_OFFICIAL = '한라산국립공원 공식 안내'
const HZ_URL = 'https://www.jeju.go.kr/hallasan/index.htm'
const withOfficialLink = (s) => s.split(HZ_OFFICIAL).flatMap((part, i) => (i === 0 ? [part] : [
  <a key={`hz-${i}`} href={HZ_URL} target="_blank" rel="noreferrer">{HZ_OFFICIAL}</a>, part,
]))

// 빈 줄 = 문단 나눔, 줄바꿈 = 새 줄, 한 줄 안의 문장들은 짧으면 같이 흐르고 길면 다음 줄로.
// (예전에는 줄바꿈과 빈 줄이 모두 사라져 답변이 한 덩어리로 보였어요)
export default function Lines({ text }) {
  return clean(text)
    .split(/\n\s*\n/)
    .map((p) => p.split('\n').map((l) => l.trim()).filter(Boolean))
    .filter((p) => p.length)
    .map((lines, pi) => (
      <span key={pi} className="para">
        {lines.map((line, li) => (
          <span key={li} className="pl">
            {sentences(line).map((s, si) => <span key={si} className="ln">{withOfficialLink(s)}</span>)}
          </span>
        ))}
      </span>
    ))
}
