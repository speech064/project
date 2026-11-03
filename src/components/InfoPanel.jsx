import { useState } from 'react'
import { addDays, todayKst, FORECAST_RANGE } from '../../shared/date'
import { weatherLabel } from '../../shared/score'
import { BEST, getSpot } from '../../shared/spots'
import { weatherAt } from '../lib/solar'
import { useAppStore } from '../store/useAppStore'
import ScoreCard from './ScoreCard'

const num = (v, d = 0) => (v == null ? '—' : Number(v).toFixed(d))
const dateLabel = (d) => new Date(`${d}T00:00:00+09:00`).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', timeZone: 'Asia/Seoul' })

// 선택한 명소·날짜의 실제 API 데이터: SUNRISE / SUNSET / CLOUD COVER / WEATHER + 대표 사진
// compact: 에이전트 화면의 미니 창에서 쓰는 모드 (사진 없이 한 열, 나타나는 효과 없음)
const dayChip = (d) => { // "토요일 11/7"
  const wd = new Date(`${d}T00:00:00+09:00`).toLocaleDateString('ko-KR', { weekday: 'long', timeZone: 'Asia/Seoul' })
  return `${wd} ${Number(d.slice(5, 7))}/${Number(d.slice(8))}`
}

// dates: 에이전트가 비교한 날짜 목록 (2개 이상일 때만 전환 버튼이 보임)
export default function InfoPanel({ compact = false, dates = null }) {
  const { spotId, date, sunErr, weatherErr, sunLoading, weatherLoading } = useAppStore()
  // 불러오는 중에는 이전 명소·날짜의 값을 보여주지 않음 (다른 곳 값이 섞여 보이는 것 방지)
  const sun = useAppStore((s) => (s.sunLoading ? null : s.sun))
  const weather = useAppStore((s) => (s.weatherLoading ? null : s.weather))
  const setDate = useAppStore((s) => s.setDate)
  const loadData = useAppStore((s) => s.loadData)
  const [pick, setPick] = useState(null) // 일출/일몰 선택(없으면 명소의 추천 시간대)
  const spot = getSpot(spotId)
  if (!spot) return null
  const rv = compact ? {} : { 'data-reveal': true }

  // 구름·날씨는 슬라이더가 아니라 일출/일몰 시각 기준
  const ev = pick ?? spot.best
  const evMin = ev === 'sunrise' ? sun?.sunriseMin : sun?.sunsetMin
  const now = evMin != null ? weatherAt(weather, evMin) : null
  const w = now ? weatherLabel(now.code) : null
  const kma = evMin != null ? weather?.hours?.[Math.min(23, Math.round(evMin / 60))]?.kma : null // 기상청 공식 예보(없으면 null)
  const today = todayKst()
  const failed = !sunLoading && !weatherLoading && (sunErr || weatherErr)

  return (
    <div className={`info-grid${compact ? ' compact' : ''}`}>
      {!compact && (
        <figure
          className="info-photo" data-reveal
          style={{ backgroundImage: spot.photo ? `url(${spot.photo})` : `linear-gradient(160deg, ${spot.tint[0]}, ${spot.tint[1]})`, ...(spot.photoFit && { backgroundSize: spot.photoFit.size, backgroundPosition: spot.photoFit.pos }) }}
        >
          <span className={`best ${spot.best}`}>{BEST[spot.best].emoji} {BEST[spot.best].ko} 추천 명소</span>
          <figcaption>
            <p className="eyebrow">{spot.en.toUpperCase()}</p>
            <h2>{spot.name}</h2>
            <p className="blurb">{spot.blurb.replace('|', ' ')}</p>
            {spot.photoBy && <small>사진 {spot.photoBy}</small>}
          </figcaption>
        </figure>
      )}

      <div className="info-main">
        <div className="info-top" {...rv}>
          <div>
            <p className="eyebrow">빛 리포트</p>
            <h3>{dateLabel(date)}</h3>
            <p className="muted">모든 시간은 한국 시간(KST)</p>
          </div>
          <label className="date">
            <span>날짜</span>
            <input type="date" value={date} min={addDays(today, -FORECAST_RANGE.back)} max={addDays(today, 60)} onChange={(e) => e.target.value && setDate(e.target.value)} />
            {date !== today && <button onClick={() => setDate(today)}>오늘</button>}
          </label>
        </div>

        <div className="ev-pick" {...rv}>
          <span>날씨 기준 시각</span>
          {['sunrise', 'sunset'].map((k) => (
            <button key={k} className={ev === k ? 'on' : ''} onClick={() => setPick(k)} aria-pressed={ev === k}>
              {k === 'sunrise' ? '일출' : '일몰'} {k === 'sunrise' ? sun?.sunrise : sun?.sunset}
            </button>
          ))}
          {dates?.length >= 2 && (
            <div className="grp" role="group" aria-label="비교한 날짜">
              {dates.map((d) => (
                <button key={d} className={date === d ? 'on' : ''} onClick={() => setDate(d)} aria-pressed={date === d}>{dayChip(d)}</button>
              ))}
            </div>
          )}
        </div>

        <div className="tiles" {...rv}>
          <Tile label="일출" value={sun?.sunrise} err={sunErr} loading={sunLoading} sub={sun?.goldenHour && `추천 시간 ${sun.goldenHour.morning}`} />
          <Tile label="일몰" value={sun?.sunset} err={sunErr} loading={sunLoading} sub={sun?.goldenHour && `추천 시간 ${sun.goldenHour.evening}`} />
          <Tile
            label="구름양" value={now ? `${num(now.total)}%` : null} err={weatherErr ?? (!now && sunErr ? '일출·일몰 시각이 있어야 구름양을 골라요' : null)} loading={weatherLoading || sunLoading}
            sub={now && `저 ${num(now.low)} · 중 ${num(now.mid)} · 고 ${num(now.high)}%`} note={`${ev === 'sunrise' ? '일출' : '일몰'} 시각 기준`}
          />
          <Tile
            label="날씨" value={kma?.skyLabel ?? w?.ko} err={weatherErr ?? (!now && sunErr ? '일출·일몰 시각이 있어야 날씨를 골라요' : null)} loading={weatherLoading || sunLoading}
            sub={now && `${num(now.temp)}°C · 바람 ${num(now.wind, 1)}m/s${now.wave != null ? ` · 파도 ${num(now.wave, 1)}m` : ''}`}
            note={kma ? `기상청 · 강수확률 ${kma.pop ?? '—'}% · 강수 ${kma.ptyLabel ?? '—'}` : `${ev === 'sunrise' ? '일출' : '일몰'} 시각 기준`}
          />
        </div>
        {failed && (
          <p className="kma-note retry-row"><button type="button" className="retry" onClick={() => loadData()}>다시 불러오기</button></p>
        )}

        <div {...rv}><ScoreCard weather={weather} sun={sun} weatherErr={weatherErr} sunErr={sunErr} loading={sunLoading || weatherLoading} ev={pick} /></div>
      </div>
    </div>
  )
}

function Tile({ label, value, sub, err, loading, note }) {
  return (
    <div className="tile">
      <small>{label}</small>
      {value != null ? <b>{value}</b> : <b className="dim">{loading ? '···' : '—'}</b>}
      {value != null && sub && <span>{sub}</span>}
      {value == null && loading && <span className="loading-txt">불러오는 중…</span>}
      {value == null && !loading && err && <span className="err">{err}</span>}
      {note && value != null && <em>{note}</em>}
    </div>
  )
}
