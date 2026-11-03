import { useState } from 'react'

// 에이전트가 호출한 도구 목록: 평소에는 한 줄만 보이고, 누르면 도구별 호출 횟수와 성공·실패를 펼쳐 보여 줘요.
// 같은 도구는 한 줄로 묶어 횟수를 보여 주고, 실패가 섞이면 실패 횟수와 안내 문장도 함께 나와요.
const LABEL = {
  list_photo_spots: '명소 목록 조회',
  get_sun_times: '일출·일몰 시각 조회',
  get_cloud_cover: '구름 예보 조회',
  list_trails: '한라산 코스 조회',
  get_elevation: '고도 조회',
  get_mountain_weather: '한라산 날씨 판정',
}

const FAIL_TEXT = {
  list_photo_spots: '명소 목록을 불러오는데 실패했습니다.',
  get_sun_times: '일출·일몰 정보를 불러오는데 실패했습니다.',
  get_cloud_cover: '구름 예보를 불러오는데 실패했습니다.',
  list_trails: '한라산 코스를 불러오는데 실패했습니다.',
  get_elevation: '고도 정보를 불러오는데 실패했습니다.',
  get_mountain_weather: '한라산 날씨를 불러오는데 실패했습니다.',
}

// 같은 도구끼리 묶어서 성공·실패 횟수를 셈
const groupSteps = (steps) => {
  const map = new Map()
  for (const s of steps) {
    const g = map.get(s.tool) ?? { tool: s.tool, ok: 0, bad: 0 }
    s.ok ? g.ok++ : g.bad++
    map.set(s.tool, g)
  }
  return [...map.values()]
}

export default function ToolSteps({ steps }) {
  const [open, setOpen] = useState(false)
  if (!steps?.length) return null
  const groups = groupSteps(steps)
  const total = steps.length
  return (
    <div className="steps">
      <button type="button" className="steps-toggle" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        에이전트가 호출한 도구 · {total}회 {open ? '접기 ▴' : '보기 ▾'}
      </button>
      {open && (
        <ul>
          {groups.map((g) => {
            const failed = g.bad > 0
            return (
              <li key={g.tool} className={failed && !g.ok ? 'bad' : 'ok'} role={failed ? 'status' : undefined}>
                <span className="dot" aria-hidden="true">{failed && !g.ok ? '✕' : '✓'}</span>
                <span className="lab">{LABEL[g.tool] ?? g.tool}</span>
                <span className="res">
                  {g.ok} 회 조회{failed ? ` · ${g.bad} 회 실패 (${FAIL_TEXT[g.tool] ?? '정보를 불러오는데 실패했습니다.'})` : ''}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
