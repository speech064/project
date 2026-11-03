import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { addDays, FORECAST_RANGE, isDateStr, todayKst } from '../../shared/date'
import { RULES } from '../../shared/hallasan'
import { ROUTE_STATS_VERIFIED, TRAILS, trailById } from '../../shared/trails'
import { fetchHallasan } from '../api/client'

const LEVEL = { good: { ko: '좋음', icon: '✓' }, caution: { ko: '주의', icon: '!' }, danger: { ko: '위험', icon: '✕' } }
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
const dateLabel = (d) => { const x = new Date(`${d}T00:00:00+09:00`); return `${x.getMonth() + 1}월 ${x.getDate()}일 (${WEEK[x.getDay()]})` }
const num = (v, d = 0) => (v == null ? '—' : Number(v).toFixed(d))
const km = (m) => (m == null ? '—' : m >= 10000 ? `${Math.round(m / 1000)}km` : m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${Math.round(m)}m`)

// 시간별 표의 칸 색: 기준표(RULES)에 따라 주의/위험이면 색을 입힘
const cellLevel = {
  gust: (v) => (v >= RULES.gust.danger ? 'danger' : v >= RULES.gust.caution ? 'caution' : ''),
  feels: (v) => (v <= RULES.feels.danger ? 'danger' : v <= RULES.feels.caution ? 'caution' : ''),
  rain: (r) => (r.precip >= RULES.rain.danger ? 'danger' : r.precip >= RULES.rain.caution || r.pop >= RULES.pop.caution ? 'caution' : ''),
  vis: (v) => (v <= RULES.vis.danger ? 'danger' : v <= RULES.vis.caution ? 'caution' : ''),
}

// 등반 시간대(오르고 내리는 때)의 줄 색: 초록(무난)·분홍(주의)·빨강(돌풍이나 비가 심함).
// 등반 시간 밖은 줄을 칠하지 않고, 값 칸(돌풍·비)만 기준에 따라 따로 칠해요.
const rowLevel = (r, inWindow) => {
  if (!inWindow) return ''
  if (cellLevel.gust(r.gust) === 'danger' || cellLevel.rain(r) === 'danger') return 'danger'
  return [cellLevel.gust(r.gust), cellLevel.feels(r.feels), cellLevel.rain(r), cellLevel.vis(r.vis)].some(Boolean) ? 'caution' : 'good'
}
const rowClass = (r, [from, to]) => {
  const inWin = r.hour >= from && r.hour <= to
  const lvl = rowLevel(r, inWin)
  return [lvl && `row-${lvl}`, inWin && 'in'].filter(Boolean).join(' ')
}

// embed: 에이전트 화면 위의 한라산 리포트 창에 넣을 때 쓰는 값 { trail, date }. 이때는 주소를 바꾸지 않고 창 안에서만 고쳐요.
export default function Hallasan({ embed = null }) {
  const [sp, setSp] = useSearchParams()
  const [local, setLocal] = useState(embed ?? {})
  const q = embed ? local : Object.fromEntries(sp)
  const today = todayKst()
  const maxDate = addDays(today, FORECAST_RANGE.ahead)
  const trailId = trailById(q.trail) ? q.trail : TRAILS[0].id
  const rawDate = q.date
  const date = isDateStr(rawDate) && rawDate >= today && rawDate <= maxDate ? rawDate : today
  const [retry, setRetry] = useState(0)
  const [state, setState] = useState({ key: '', data: null, error: null })
  const key = `${trailId}|${date}|${retry}`
  const loading = state.key !== key

  useEffect(() => {
    let stale = false
    fetchHallasan(trailId, date)
      .then((data) => !stale && setState({ key, data, error: null }))
      .catch((e) => !stale && setState({ key, data: null, error: e.message }))
    return () => { stale = true }
  }, [trailId, date, key])

  const go = (patch) => (embed ? setLocal({ trail: trailId, date, ...patch }) : setSp({ trail: trailId, date, ...patch }, { replace: true }))
  const trail = trailById(trailId)
  const d = !loading && state.data
  const v = d?.verdict
  const plan = d?.plan

  return (
    <>
      {!embed && (
        <section className="page-head">
          <p className="eyebrow">한라산 등반 날씨 판정기</p>
          <h1>Read the mountain.</h1>
          <p className="intent">코스와 날짜를 고르면, 산 위 높이의 날씨로 등반해도 되는지 판정해 드려요.</p>
        </section>
      )}

      <section className="band">
        <div className="wrap hz">
          <div className="hz-controls">
            <div className="hz-chips" role="group" aria-label="코스 선택">
              {TRAILS.map((t) => (
                <button key={t.id} type="button" className={`hz-chip${t.id === trailId ? ' on' : ''}`} aria-pressed={t.id === trailId} onClick={() => go({ trail: t.id })}>{t.name}</button>
              ))}
            </div>
            <div className="hz-date">
              <button type="button" aria-label="전날" disabled={date <= today} onClick={() => go({ date: addDays(date, -1) })}>◀</button>
              <label>
                <span>{dateLabel(date)}</span>
                <input type="date" value={date} min={today} max={maxDate} onChange={(e) => e.target.value && go({ date: e.target.value })} aria-label="날짜" />
              </label>
              <button type="button" aria-label="다음날" disabled={date >= maxDate} onClick={() => go({ date: addDays(date, 1) })}>▶</button>
              {date !== today && <button type="button" className="hz-today" onClick={() => go({ date: today })}>오늘</button>}
            </div>
          </div>

          <div className="hz-trail">
            <h2>{trail.name}</h2>
            <p className="hz-meta">
              <span>난이도 {trail.level}</span>
              {ROUTE_STATS_VERIFIED
                ? <><span>편도 {trail.km}km</span><span>오르는 데 약 {trail.upH}시간</span><span>내려오는 데 약 {trail.downH}시간</span></>
                : <span className="muted">거리·소요시간은 공식 자료 확인 전이라 표시하지 않아요</span>}
            </p>
            <p className="muted">{trail.note}</p>
            {d && (
              <p className="hz-elev">
                {trail.start.name} <b>{d.elevations.start.known}m</b>{d.elevations.start.dem != null && <small> (지형모델 {d.elevations.start.dem}m)</small>}
                <i aria-hidden="true">→</i>
                {trail.goal.name} <b>{d.elevations.goal.known}m</b>{d.elevations.goal.dem != null && <small> (지형모델 {d.elevations.goal.dem}m)</small>}
                <em>오르막 +{d.elevations.gain}m</em>
              </p>
            )}
          </div>

          {loading && <p className="muted center hz-loading" role="status">한라산 날씨를 불러오는 중…</p>}
          {!loading && state.error && (
            <div className="notice hz-err" role="alert">
              {state.error} <button type="button" className="retry" onClick={() => setRetry((n) => n + 1)}>다시 불러오기</button>
            </div>
          )}

          {d && v && (
            <>
              <article className={`hz-verdict ${v.level}`} aria-live="polite">
                <div className="hz-badge"><i aria-hidden="true">{LEVEL[v.level].icon}</i><b>{LEVEL[v.level].ko}</b></div>
                <div className="hz-vbody">
                  <h2>{v.headline}</h2>
                  <p className="muted">{dateLabel(date)} · {v.window[0]}시~{v.window[1]}시 {trail.goal.name} 높이({trail.goal.elev}m) 기준</p>
                  <ul className="hz-checks">
                    {v.checks.map((c) => (
                      <li key={c.key} className={c.level}><i aria-hidden="true">{LEVEL[c.level].icon}</i><span><b>{c.label}</b> {c.text}</span></li>
                    ))}
                  </ul>
                </div>
              </article>

              <div className="hz-tiles">
                <Tile label="정상부 기온" value={`${num(v.stats.tempMin)}~${num(v.stats.tempMax)}°C`} sub={`체감 최저 ${num(v.stats.feelsMin)}°C`} />
                <Tile label="돌풍" value={`${num(v.stats.gustMax)}m/s`} sub={v.stats.gustHour != null ? `가장 센 때 ${v.stats.gustHour}시` : ''} />
                <Tile label="비·눈" value={`${v.stats.popMax ?? '—'}%`} sub={`시간당 최대 ${num(v.stats.rainMax, 1)}mm${v.stats.snowMax > 0 ? ` · 눈 ${num(v.stats.snowMax, 1)}cm` : ''}`} />
                <Tile label="시정·구름" value={km(v.stats.visMin)} sub={`구름 평균 ${num(v.stats.cloudAvg)}%`} />
              </div>

              {plan && (
                <article className="hz-plan">
                  <div className="hz-plan-top">
                    <div>
                      <p className="eyebrow">GOLDEN HOUR</p>
                      <h2>일출·일몰로 짜는 하루</h2>
                    </div>
                    <div className="hz-sun">
                      <div><small>일출</small><b>{plan.sunrise}</b></div>
                      <div><small>일몰</small><b>{plan.sunset}</b></div>
                    </div>
                  </div>
                  <p className="muted">해가 지기 전에 내려오는 게 한라산 산행에서 가장 중요해요. 일몰 30분 전을 하산 마감으로 잡고 거꾸로 계산했어요.</p>
                  <div className="hz-plan-grid">
                    <div><small>권장 출발</small><b>{plan.recommendedStart}</b><em>늦어도 {plan.latestStart}</em></div>
                    <div><small>{trail.goal.name} 도착(예상)</small><b>{plan.goalArrival}</b><em>왕복 약 {plan.roundTrip} (휴식 1시간 포함)</em></div>
                    <div><small>하산 마감</small><b>{plan.deadline}</b><em>일몰 30분 전</em></div>
                  </div>
                  {!plan.feasible && <p className="notice hz-warn">이 날은 해가 짧아서 이 코스를 하루에 다녀오기 빠듯해요. 더 짧은 코스를 고르는 걸 권해요.</p>}
                  {d.sunriseView && <p className="hz-view">일출 Golden Hour({d.sunriseView.hour}시) {trail.goal.name} 높이 구름은 <b>{d.sunriseView.cloud}%</b> — 일출 조망 <b>{d.sunriseView.rating}</b></p>}
                </article>
              )}

              <article className="hz-hours">
                <h2>시간별 날씨 <small>({trail.goal.name} 높이)</small></h2>
                <div className="hz-legend">
                  <p><b>칸 색</b>
                    <i className="lg caution" aria-hidden="true" />주의 <i className="lg danger" aria-hidden="true" />위험
                    <span>돌풍 {RULES.gust.caution}m/s 이상(위험 {RULES.gust.danger}) · 체감 {RULES.feels.caution}°C 이하(위험 {RULES.feels.danger}) · 비 시간당 {RULES.rain.caution}mm 또는 강수확률 {RULES.pop.caution}% 이상(위험 {RULES.rain.danger}mm) · 시정 {RULES.vis.caution}m 이하(위험 {RULES.vis.danger}m)</span>
                  </p>
                  <p><b>왼쪽 세로 줄</b> 등반 시간대 판정
                    <i className="lg good" aria-hidden="true" />무난 <i className="lg caution" aria-hidden="true" />주의 <i className="lg danger" aria-hidden="true" />위험(돌풍·비가 심함)
                  </p>
                </div>
                <div className="hz-scroll">
                  <table>
                    <thead><tr><th>시각</th><th>하늘</th><th>기온 / 체감</th><th>돌풍</th><th>비</th><th>시정</th><th>구름</th></tr></thead>
                    <tbody>
                      {d.goalHours.map((r) => (
                        <tr key={r.hour} className={rowClass(r, v.window)}>
                          <th scope="row">{String(r.hour).padStart(2, '0')}:00</th>
                          <td>{r.sky}</td>
                          <td className={cellLevel.feels(r.feels)}>{num(r.temp)}° / {num(r.feels)}°</td>
                          <td className={cellLevel.gust(r.gust)}>{num(r.gust, 1)}m/s</td>
                          <td className={cellLevel.rain(r)}>{r.pop ?? '—'}% · {num(r.precip, 1)}mm</td>
                          <td className={cellLevel.vis(r.vis)}>{km(r.vis)}</td>
                          <td>{num(r.cloud)}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="muted hz-note">굵은 줄이 등반 시간대예요. 칸 색은 시간대와 상관없이 기준을 넘은 값에만 칠해요.</p>
              </article>
            </>
          )}

          <p className="muted hz-foot">
            날씨 판정은 예보를 바탕으로 한 참고 정보입니다. 실제 탐방 가능 여부와 통제 상황은 <a href="https://www.jeju.go.kr/hallasan/index.htm" target="_blank" rel="noreferrer">한라산국립공원 공식 안내</a>를 확인해 주세요.
          </p>
          <p className="muted hz-foot">
            판정은 날씨 데이터(Open-Meteo 예보에 산 높이를 지정해 보정)로 계산한 참고용 자체 기준이에요. 코스 고도·시간은 어림값이에요.
          </p>
        </div>
      </section>
    </>
  )
}

function Tile({ label, value, sub }) {
  return (
    <div className="hz-tile">
      <small>{label}</small>
      <b>{value}</b>
      {sub && <span>{sub}</span>}
    </div>
  )
}
