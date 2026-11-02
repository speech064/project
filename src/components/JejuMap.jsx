import { useNavigate } from 'react-router-dom'
import { HALLASAN, MAP, OUTLINE_PATH, PX_PER_KM, project } from '../lib/jejuMap'

// 이름표 위치 [x 이동, y 이동, 정렬]. 서쪽 해안은 핀이 붙어 있어서 이름을 왼쪽에 겹치지 않게 쌓음
const LABEL = {
  sinchang: [-18, -6, 'end'],
  chagwi: [-18, 3, 'end'],
  suwol: [-18, 17, 'end'],
  hyeopjae: [-16, 5, 'end'],
  yongmeori: [16, 6, 'start'],
}

// 제주 지도: 핀을 누르면 그 명소가 선택되고, 점선 원이 선택한 반경(km)을 보여줌
export default function JejuMap({ spots, selectedId, onSelect, radius, narrow }) {
  const navigate = useNavigate()
  const goHallasan = () => navigate('/halla')
  const sel = spots.find((s) => s.id === selectedId)
  const [sx, sy] = sel ? project(sel.lat, sel.lng) : [0, 0]
  // 좁은 화면은 이름표 여백을 잘라내고 핀을 키움 (이름은 아래 버튼으로 고름)
  const viewBox = narrow ? '140 10 840 560' : `0 0 ${MAP.W} ${MAP.H}`
  const dot = narrow ? 13 : 7, dotOn = narrow ? 17 : 10, hit = narrow ? 24 : 16

  return (
    <figure className="jmap">
      <svg viewBox={viewBox} role="group" aria-label="제주 지도 — 핀을 누르면 그 명소 주변 장소를 보여줘요">
        <path d={OUTLINE_PATH} className="jmap-land" />
        <g
          className="jmap-mt" transform={`translate(${HALLASAN[0]} ${HALLASAN[1]})`} role="link" tabIndex={0}
          aria-label="한라산 등반 날씨 판정기로 이동"
          onClick={goHallasan}
          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goHallasan() } }}
        >
          <title>한라산 등반 날씨 판정기</title>
          <circle r="26" className="jmap-mt-hit" />
          <path d="M-14 8 L0 -12 L14 8 Z" />
          {!narrow && <text y="24" textAnchor="middle">한라산</text>}
        </g>

        {sel && <circle className="jmap-radius" cx={sx} cy={sy} r={radius * PX_PER_KM} />}

        {spots.map((s) => {
          const [x, y] = project(s.lat, s.lng)
          const on = s.id === selectedId
          const [dx, dy, anchor] = LABEL[s.id] ?? [16, 6, 'start']
          return (
            <g
              key={s.id} className={`pin${on ? ' on' : ''}`} role="button" tabIndex={0} aria-label={s.name} aria-pressed={on}
              onClick={() => onSelect(s.id)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(s.id) } }}
            >
              <circle className="pin-hit" cx={x} cy={y} r={hit} />
              {on && <circle className="pin-ring" cx={x} cy={y} r={dotOn + 5} />}
              <circle className="pin-dot" cx={x} cy={y} r={on ? dotOn : dot} />
              {!narrow && <text className="pin-label" x={x + dx} y={y + dy} textAnchor={anchor}>{s.name}</text>}
            </g>
          )
        })}
      </svg>
    </figure>
  )
}
