import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addDays, FORECAST_RANGE, isDateStr, todayKst } from '../../shared/date'
import { TRAILS, trailById } from '../../shared/trails'
import { fetchHallasan } from '../api/client'
import { createHallaScene } from '../three/hallaScene'
import { weatherKind } from '../three/weatherEffects'
import { useAppStore } from '../store/useAppStore'
import HallaRouteMap from '../components/HallaRouteMap'
import Hallasan from './Hallasan'

const kstHour = () => new Date(Date.now() + 9 * 3600e3).getUTCHours()
const f1 = (v) => (v == null ? '—' : Number(v).toFixed(1))

export default function Halla() {
  const [sp, setSp] = useSearchParams()
  const today = todayKst()
  const rawDate = sp.get('date')
  const date = isDateStr(rawDate) && rawDate >= today && rawDate <= addDays(today, FORECAST_RANGE.ahead) ? rawDate : today
  const trailId = trailById(sp.get('trail')) ? sp.get('trail') : null // 처음에는 코스를 고르지 않은 전체 모습

  const host = useRef(null)
  const scene = useRef(null)
  const [noGl, setNoGl] = useState(false) // WebGL 을 쓸 수 없는 브라우저
  const wxPreview = useAppStore((s) => s.wxPreview)
  const [state, setState] = useState({ key: '', data: null, error: null })
  const key = trailId ? `${trailId}|${date}` : ''
  const loading = !!trailId && state.key !== key

  useEffect(() => {
    try {
      scene.current = createHallaScene(host.current, TRAILS)
    } catch {
      setNoGl(true)
    }
    return () => { scene.current?.dispose(); scene.current = null }
  }, [])

  useEffect(() => { scene.current?.setTrail(trailId) }, [trailId])

  useEffect(() => {
    if (!trailId) return undefined
    let stale = false
    fetchHallasan(trailId, date)
      .then((data) => !stale && setState({ key, data, error: null }))
      .catch((e) => !stale && setState({ key, data: null, error: e.message }))
    return () => { stale = true }
  }, [trailId, date, key])

  const pick = (id) => setSp({ trail: id, date }, { replace: true })
  const reset = () => setSp({}, { replace: true })

  const trail = trailById(trailId)
  const d = trailId && state.key === key ? state.data : null
  // 지금(오늘이면) 또는 낮 12시의 정상부 날씨
  const hour = date === today ? Math.min(20, Math.max(4, kstHour())) : 12
  const row = d?.goalHours.find((r) => r.hour === hour) ?? d?.goalHours[0]
  const level = d?.verdict.level

  // 정상부 실제 날씨 → 3D 효과 (미리보기 토글이 켜져 있으면 그 값을 씀)
  const kind = wxPreview ?? weatherKind({ cloud: row?.cloud, vis: row?.vis, precip: row?.precip, pop: row?.pop, temp: row?.temp })
  useEffect(() => { scene.current?.setWeather({ kind, wind: row?.wind ?? 2, wave: 0.6 }) }, [kind, row?.wind])
  // 산 위 라벨: 고른 코스의 정상 높이, 풍속, 판정 결과 (데이터가 없으면 라벨을 숨김)
  const LEVEL_KO = { good: '좋음', caution: '주의', danger: '위험' }
  useEffect(() => {
    if (!d || !row || !trail) { scene.current?.setLabel(''); return }
    scene.current?.setLabel(`${trail.goal.name} ${trail.goal.elev}m · 풍속 ${Math.round(row.wind ?? 0)}m/s · ${LEVEL_KO[level] ?? '판정 불가'}`)
  }, [d, row?.wind, level, trail])

  return (
    <>
      <section className={`halla-hero${trail ? ' picked' : ''}`}>
        <div className="halla-canvas" ref={host} aria-hidden="true" />
        <div className="halla-vignette" aria-hidden="true" />
        {noGl && <p className="halla-nogl" role="status">이 브라우저에서는 3D 장면을 볼 수 없어요. 아래 코스 지도와 날씨 판정은 그대로 볼 수 있어요.</p>}

        <div className="halla-title">
          <h1>HALLA <span>1947</span></h1>
          <p>Beyond the clouds.</p>
        </div>

        {trail && (
          <aside className="halla-panel" aria-live="polite">
            <p className="halla-k">SUMMIT WEATHER</p>
            <p className="halla-where">{trail.goal.name} · {trail.goal.elev}m<small>{date === today ? ` · ${String(hour).padStart(2, '0')}:00` : ` · ${date.slice(5).replace('-', '.')} ${hour}:00`}</small></p>
            {loading && <p className="halla-wait" role="status">Loading…</p>}
            {state.key === key && state.error && <p className="halla-wait" role="alert">{state.error}</p>}
            {d && row && (
              <dl>
                <div><dt>TEMPERATURE</dt><dd>{f1(row.temp)}<small>°C</small></dd></div>
                <div><dt>WIND SPEED</dt><dd>{row.wind == null ? '—' : Math.round(row.wind * 3.6)}<small> km/h</small></dd></div>
                <div><dt>HIKING CONDITION</dt><dd className={`cond ${level}`}>{level.toUpperCase()}</dd></div>
              </dl>
            )}
            {d && <p className="halla-sum">{d.verdict.headline}</p>}
            <a className="halla-more" href="#halla-detail">Full forecast &amp; Golden Hour plan ↓</a>
          </aside>
        )}

        <HallaRouteMap className="rm-desk" trails={TRAILS} trailId={trailId} onPick={pick} />

        <div className="halla-dock">
          {trail && <button type="button" className="halla-back" onClick={reset}>← Overview</button>}
          <div className="halla-courses" role="group" aria-label="Course">
            {TRAILS.map((t) => (
              <button key={t.id} type="button" className={t.id === trailId ? 'on' : ''} aria-pressed={t.id === trailId} onClick={() => pick(t.id)}>{t.name}</button>
            ))}
          </div>
        </div>
      </section>

      <div id="halla-detail" className="halla-detail">
        <HallaRouteMap className="rm-mobile" trails={TRAILS} trailId={trailId} onPick={pick} />
        <Hallasan />
      </div>
    </>
  )
}
