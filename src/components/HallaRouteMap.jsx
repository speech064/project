import { useState } from 'react'
import { HALLASAN, OUTLINE_PATH, project } from '../lib/jejuMap'
import { ROUTE_STATS_VERIFIED } from '../../shared/trails'

// 북쪽이 항상 위인 한라산 코스 지도. 코스를 바꿔도 방향은 그대로이고, 선택한 코스만 강조해요.
// 등산로 선은 검증된 GPS 데이터가 있을 때만 그려요. 지금은 없어서 출발점·정상 위치와 점선 '개략 방향'만 보여줘요.
const W = 300, H = 250, PAD = 34
const LAT0 = 33.39
const COS = Math.cos((LAT0 * Math.PI) / 180)

const shortName = (name) => name.replace(' 코스', '')
const DIRS = ['북', '북동', '동', '남동', '남', '남서', '서', '북서']
const bearing = (a, b) => {
  const dE = (b.lng - a.lng) * COS, dN = b.lat - a.lat
  return (Math.atan2(dE, dN) * 180 / Math.PI + 360) % 360
}
const dirName = (deg) => DIRS[Math.round(deg / 45) % 8]

// 모든 코스의 출발점·도착점을 담는 범위 → 지도 크기에 맞춰 같은 비율로 축소 (위가 북, 오른쪽이 동)
function frame(trails) {
  const pts = trails.flatMap((t) => [t.start, t.goal])
  const minLat = Math.min(...pts.map((p) => p.lat)), maxLat = Math.max(...pts.map((p) => p.lat))
  const minLng = Math.min(...pts.map((p) => p.lng)), maxLng = Math.max(...pts.map((p) => p.lng))
  const spanX = (maxLng - minLng) * COS, spanY = maxLat - minLat
  const k = Math.min((W - PAD * 2) / spanX, (H - PAD * 2) / spanY)
  const offX = (W - spanX * k) / 2, offY = (H - spanY * k) / 2
  const at = (p) => [offX + (p.lng - minLng) * COS * k, offY + (maxLat - p.lat) * k]
  return { at }
}

export default function HallaRouteMap({ trails, trailId, onPick, className = '' }) {
  const [open, setOpen] = useState(false)
  const { at } = frame(trails)
  const sel = trails.find((t) => t.id === trailId)
  // 목적지 표시: 백록담과 윗세오름은 같은 자리라 겹치므로, 고른 코스의 목적지 이름만 쓴다
  const goal = sel?.goal ?? null
  const press = (e, id) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(id) } }

  return (
    <aside className={`rm ${open ? 'open' : ''} ${className}`} aria-label="한라산 코스 지도 (북쪽이 위)">
      <div className="rm-head">
        <p className="rm-k">ROUTE MAP · 북쪽이 위</p>
        <button type="button" className="rm-more" aria-expanded={open} onClick={() => setOpen((o) => !o)}>{open ? '작게 보기' : '크게 보기'}</button>
      </div>

      <svg className="rm-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="코스 위치">
        <rect x="0.5" y="0.5" width={W - 1} height={H - 1} rx="14" className="rm-bg" />

        {/* 나침반: 북 화살표 + 동서남북 */}
        <g transform={`translate(${W - 26} 26)`} className="rm-north" aria-hidden="true">
          <path d="M0 -12 L5 6 L0 2 L-5 6 Z" />
          <text y="-17" textAnchor="middle">N</text>
        </g>
        <text x={W - 10} y={H / 2 + 3} textAnchor="end" className="rm-card">E</text>
        <text x="10" y={H / 2 + 3} className="rm-card">W</text>
        <text x={W / 2} y={H - 8} textAnchor="middle" className="rm-card">S</text>

        {/* 개략 방향: 출발점→정상 점선 (실제 등산로 아님) */}
        {trails.map((t) => {
          const [x1, y1] = at(t.start), [x2, y2] = at(t.goal)
          const on = t.id === trailId
          return <line key={`l-${t.id}`} x1={x1} y1={y1} x2={x2} y2={y2} className={on ? 'rm-line on' : 'rm-line'} />
        })}

        {/* 정상·목적지 */}
        {(() => {
          const [x, y] = at(goal ?? trails[0].goal)
          return (
            <g transform={`translate(${x} ${y})`}>
              <rect x="-4" y="-4" width="8" height="8" transform="rotate(45)" className="rm-goal" />
              {goal && <text x="8" y="-6" className="rm-lbl">{goal.name}{goal.approx ? ' (대략)' : ''}</text>}
            </g>
          )
        })()}

        {/* 출발점 (누르면 선택) */}
        {trails.map((t) => {
          const [x, y] = at(t.start), on = t.id === trailId
          return (
            <g key={t.id} role="button" tabIndex={0} aria-pressed={on} aria-label={`${t.name} 선택`}
              className={on ? 'rm-pt on' : 'rm-pt'} onClick={() => onPick(t.id)} onKeyDown={(e) => press(e, t.id)}>
              <circle cx={x} cy={y} r="13" className="rm-hit" />
              <circle cx={x} cy={y} r={on ? 5 : 3.5} className="rm-dot" />
              <text x={x + (x > W / 2 ? -9 : 9)} y={y + 14} textAnchor={x > W / 2 ? 'end' : 'start'} className="rm-lbl">{shortName(t.name)}</text>
            </g>
          )
        })}
      </svg>

      <div className="rm-info" aria-live="polite">
        {sel ? (
          <>
            <p className="rm-title">{sel.name}</p>
            <p className="rm-dir">{sel.start.name} · {dirName(bearing(sel.goal, sel.start))}쪽 입구 → {sel.goal.name}{sel.goal.approx ? ' (대략 위치)' : ''}</p>
            {ROUTE_STATS_VERIFIED ? null : <p className="rm-note">정확한 GPS 등산로 데이터가 없어 지도 위 등산로는 그리지 않았어요. 점선은 출발점과 정상을 잇는 개략 방향이에요.</p>}
          </>
        ) : (
          <p className="rm-note">코스를 고르면 출발점과 정상 위치가 강조돼요.</p>
        )}
      </div>

      {/* 제주도 위치도: 한라산 주변을 확대해서 코스(점선 = 출발점→정상 개략 방향)를 함께 표시 */}
      <svg className="rm-jeju" viewBox="150 20 820 540" role="img" aria-label="제주도 안 한라산 코스 위치">
        <path d={OUTLINE_PATH} className="rm-island" />
        {trails.map((t) => {
          const [x1, y1] = project(t.start.lat, t.start.lng), [x2, y2] = project(t.goal.lat, t.goal.lng)
          return <line key={`j-${t.id}`} x1={x1} y1={y1} x2={x2} y2={y2} className={t.id === trailId ? 'rm-jeju-line on' : 'rm-jeju-line'} />
        })}
        {trails.map((t) => {
          const [x, y] = project(t.start.lat, t.start.lng), on = t.id === trailId
          return <circle key={`jd-${t.id}`} cx={x} cy={y} r={on ? 12 : 8} className={on ? "rm-jeju-dot on" : "rm-jeju-dot"} />
        })}
        <circle cx={HALLASAN[0]} cy={HALLASAN[1]} r="7" className="rm-jeju-summit" />
      </svg>
    </aside>
  )
}
