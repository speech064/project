import { CLOUD_TABLE, ADJUST, photoScore } from '../../shared/score'
import { hm } from '../../shared/date'
import { shootingTip } from '../lib/tips'
import { weatherAt } from '../lib/solar'
import Lines from './Lines'

// 일출·일몰 시각의 구름·날씨로 계산한 자체 추천 점수 + 계산 기준 공개
export default function ScoreCard({ weather, sun, weatherErr, sunErr, loading, ev = null }) {
  const at = (min) => weather?.hours?.[Math.min(23, Math.max(0, Math.round(min / 60)))]
  const make = (kind, min) => {
    const r = at(min)
    return {
      kind, min, time: hm(min), hour: r?.hour,
      result: r ? photoScore({ total: r.cloud, low: r.low, mid: r.mid, high: r.high, code: r.code, wind: r.wind, pty: r.kma?.pty, pop: r.kma?.pop }) : null,
    }
  }
  const rows = sun ? [make('일출', sun.sunriseMin), make('일몰', sun.sunsetMin)] : []
  const best = rows.filter((r) => r.result).sort((a, b) => b.result.score - a.result.score)[0]
  // 사용자가 일출·일몰을 고르면 그 시각의 점수·문구·팁을 보여 주고, 고르지 않으면 명소의 추천 시각을 씀
  const picked = ev ? rows.find((r) => r.kind === (ev === 'sunrise' ? '일출' : '일몰')) : null
  const focus = picked ?? best
  const focusRow = focus && at(focus.min)
  const kma = focusRow?.kma
  const tip = focus?.result && shootingTip({
    // 구름양 카드와 같은 값(분 단위 보간)을 써서 팁과 카드가 어긋나지 않게 한다
    evKo: focus.kind, time: focus.time, cloud: Math.round(weatherAt(weather, focus.min)?.total ?? focusRow.cloud), wind: focusRow.wind,
    rain: !!kma && ((kma.ptyLabel && kma.ptyLabel !== '없음') || (kma.pop ?? 0) >= 60),
  })

  return (
    <div className="score">
      <div className="score-head">
        <p className="eyebrow">사진 지수</p>
        {focus?.result ? (
          <>
            <div className="score-big" style={{ '--p': focus.result.score }}><b>{focus.result.score}</b></div>
            <p className="score-msg">{focus.kind} 기준 · {focus.result.verdict.ko}</p>
            <p className="score-en">{focus.result.verdict.en}</p>
          </>
        ) : (
          <>
            <div className="score-big none"><b>—</b></div>
            <p className="score-ko">{loading ? '불러오는 중이에요…' : (weatherErr ?? sunErr ?? '예보가 없는 날짜는 점수를 만들지 않아요')}</p>
            {!loading && (weatherErr || sunErr) && <p className="score-ko">불러오지 못한 값이 있어서 점수를 만들지 못했어요</p>}
          </>
        )}
      </div>

      {rows.length > 0 && (
        <div className="score-rows">
          {rows.map((r) => (
            <div key={r.kind} className={`score-row${r === focus ? ' top' : ''}`}>
              <small>{r.kind} · {r.time}</small>
              <b>{r.result ? r.result.score : '—'}</b>
              <span className="bar"><i style={{ width: `${r.result ? r.result.score : 0}%` }} /></span>
            </div>
          ))}
        </div>
      )}

      {tip && <p className="score-tip"><b>오늘의 촬영 팁</b><Lines text={tip} /></p>}

      <details className="how">
        <summary>점수는 이렇게 계산했어요</summary>
        {rows.filter((r) => r.result).map((r) => (
          <div key={r.kind} className="how-block">
            <h4>{r.kind} · {r.hour}시 예보 기준</h4>
            <ul>
              {r.result.parts.map((p, i) => (
                <li key={i}><span>{p.name}</span><em>{i === 0 ? `${p.delta}점` : `${p.delta > 0 ? '+' : ''}${p.delta}`}</em><small>{p.reason}</small></li>
              ))}
            </ul>
          </div>
        ))}
        <h4>구름양 기준표</h4>
        <table>
          <tbody>
            {CLOUD_TABLE.map((c) => (
              <tr key={c.label}><td>{c.label}</td><td>{c.score}점</td></tr>
            ))}
            <tr><td colSpan="2" className="muted">보정: 저층 {ADJUST.lowCloud.above}%↑ {ADJUST.lowCloud.delta} · 중·고층 적당 +{ADJUST.highMid.delta} · 강수 {ADJUST.rain.delta} · 강풍 {ADJUST.wind.delta}</td></tr>
          </tbody>
        </table>
        <p className="muted">날씨 데이터로 계산한 자체 추천 점수이며, 실제 사진 품질을 보장하지 않아요.</p>
      </details>
    </div>
  )
}
