import { BEST, readySpots } from '../../shared/spots'
import InfoPanel from '../components/InfoPanel'
import SpotCard from '../components/SpotCard'
import TimeControl from '../components/TimeControl'
import { useAppStore } from '../store/useAppStore'

// 일출이 좋은 곳끼리, 일몰이 좋은 곳끼리 한 줄씩 (4곳 + 5곳)
const GROUPS = ['sunrise', 'sunset'].map((key) => ({ key, items: readySpots.filter((s) => s.best === key) }))

export default function Home() {
  const spotId = useAppStore((s) => s.spotId)
  const selectSpot = useAppStore((s) => s.selectSpot)

  // 카드를 골라도 화면은 그 자리에 머묾 (위로 스크롤하지 않음)
  const onSelect = (id) => selectSpot(id)

  return (
    <>
      <section className="hero">
        <div className="hero-inner">
          <p className="eyebrow rise" style={{ '--d': '0.1s' }}>오늘 어디서, 언제 찍을지 날씨 데이터로 골라 주는 제주 일출·일몰 사진 가이드</p>
          <h1 className="rise" style={{ '--d': '0.25s' }}>GOLDEN HOUR</h1>
          <p className="tagline rise" style={{ '--d': '0.45s' }}>Beyond the clouds, chasing the light in Jeju.</p>
        </div>
        <TimeControl />
      </section>

      <section className="band" id="spots">
        <div className="wrap">
          <div className="sec-head" data-reveal>
            <p className="eyebrow">사진 명소</p>
            <h2>빛이 머무는 곳</h2>
            <p className="muted">제주의 일출·일몰 명소를 실제 날씨 데이터로 비교해, 사진 찍기 가장 좋은 곳과 시간을 알려드려요.</p>
          </div>
          {GROUPS.map((g) => (
            <section key={g.key} className="spot-group" style={{ '--c': BEST[g.key].color }}>
              <header className="group-head" data-reveal>
                <h3>{BEST[g.key].ko} 명소</h3>
              </header>
              <div className="spots">
                {g.items.map((s) => <SpotCard key={s.id} spot={s} selected={s.id === spotId} onSelect={onSelect} />)}
              </div>
            </section>
          ))}
        </div>
      </section>

      <section className="band info-band" id="report">
        <div className="wrap"><InfoPanel /></div>
      </section>
    </>
  )
}
