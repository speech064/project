import { useEffect, useMemo, useRef, useState } from 'react'
import { dayOfYear, hm } from '../../shared/date'
import { getSpot } from '../../shared/spots'
import { solarPosition } from '../lib/solar'
import { skyColors } from '../three/palette'
import { useAppStore } from '../store/useAppStore'

const PLAY_SPEED = 90 // 재생 시 1초에 흐르는 "하루 중 분"
// 이 두 시간대만 조금 느리게 (일출 전 보랏빛~황금빛, 일몰 황금빛~보랏빛). 그 밖에는 모두 같은 속도
const SLOW_ZONES = [[5 * 60 + 40, 8 * 60 + 30], [16 * 60 + 40, 19 * 60 + 10]] // 05:40–08:30, 16:40–19:10
const SLOW = 0.3   // 구간 안 속도 배율(1 = 보통) — 눈에 띄게 천천히
const EDGE = 10    // 구간 가장자리에서 서서히 느려지고 빨라지는 폭(분)
const ramp = (x, a0, a1) => Math.min(1, Math.max(0, (x - a0) / (a1 - a0)))

function speedFactor(m) {
  const inZone = Math.max(...SLOW_ZONES.map(([s0, s1]) => ramp(m, s0 - EDGE, s0) * (1 - ramp(m, s1, s1 + EDGE))))
  return 1 - (1 - SLOW) * inZone
}

export default function TimeControl() {
  const minutes = useAppStore((s) => s.minutes)
  const setMinutes = useAppStore((s) => s.setMinutes)
  const sun = useAppStore((s) => s.sun)
  const spotId = useAppStore((s) => s.spotId)
  const date = useAppStore((s) => s.date)
  const [playing, setPlaying] = useState(true) // 처음 들어오면 하루가 자동으로 재생됨
  const raf = useRef(0)

  useEffect(() => {
    if (!playing) return
    let last = performance.now()
    const tick = (now) => {
      const dt = (now - last) / 1000
      last = now
      const m = useAppStore.getState().minutes
      setMinutes((m + dt * PLAY_SPEED * speedFactor(m)) % 1440)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf.current)
  }, [playing, setMinutes])

  // 슬라이더 바탕: 그날 하루의 하늘 색을 그대로 띠로 보여줌
  const track = useMemo(() => {
    const spot = getSpot(spotId)
    if (!spot) return undefined
    const doy = dayOfYear(date), noon = sun?.solarNoonMin ?? 750
    const stops = Array.from({ length: 49 }, (_, i) => {
      const m = (i / 48) * 1439
      const { el } = solarPosition({ lat: spot.lat, doy, minutes: m, solarNoonMin: noon })
      const c = skyColors(el, m < noon).horizon.map((v) => Math.round(v * 255))
      return `rgb(${c}) ${((i / 48) * 100).toFixed(1)}%`
    })
    return `linear-gradient(90deg, ${stops.join(',')})`
  }, [spotId, date, sun?.solarNoonMin])

  const presets = [
    sun && { label: '일출', m: sun.sunriseMin + 5 },
    { label: '한낮', m: 720 },
    sun && { label: '일몰', m: sun.sunsetMin - 10 },
    { label: '밤', m: 1260 },
  ].filter(Boolean)

  return (
    <div className="timebar glass">
      <div className="timebar-top">
        <button className="play" onClick={() => setPlaying((p) => !p)} aria-label={playing ? '일시정지' : '하루 재생'}>
          {playing ? '❚❚' : '▶'}
        </button>
        <div className="clock" aria-live="off">{hm(minutes)}<small>KST</small></div>
        <div className="presets">
          {presets.map((p) => (
            <button key={p.label} onClick={() => { setPlaying(false); setMinutes(Math.max(0, Math.min(1439, p.m))) }}>{p.label}</button>
          ))}
        </div>
      </div>
      <div className="slider" style={{ '--track': track }}>
        <input
          type="range" min="0" max="1439" step="1" value={Math.round(minutes)}
          onChange={(e) => { setPlaying(false); setMinutes(Number(e.target.value)) }}
          aria-label="시간 (00:00–23:59)"
        />
      </div>
      <div className="ticks"><span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:59</span></div>
    </div>
  )
}
