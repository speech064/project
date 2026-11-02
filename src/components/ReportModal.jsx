import { useEffect, useRef } from 'react'
import { getSpot, BEST } from '../../shared/spots'
import { useAppStore } from '../store/useAppStore'
import InfoPanel from './InfoPanel'

// 에이전트 화면 위에 바로 뜨는 "빛 리포트" 미니 창. 홈으로 이동하지 않고, 열리자마자 불러오는 상태가 보여요.
// 닫기: ✕ 버튼 · ESC · 바깥 클릭
export default function ReportModal({ onClose, dates = null }) {
  const spot = getSpot(useAppStore((s) => s.spotId))
  const closeBtn = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden' // 뒤 화면이 같이 스크롤되지 않게
    closeBtn.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  if (!spot) return null
  return (
    <div className="report-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="report-pop info-band" role="dialog" aria-modal="true" aria-label={`${spot.name} 빛 리포트`}>
        <button type="button" className="report-x" ref={closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        <header className="report-head">
          <p className="eyebrow">{BEST[spot.best].emoji} {BEST[spot.best].ko} 추천 명소</p>
          <h2>{spot.name}</h2>
          <p className="muted">{spot.blurb.replace('|', ' ')}</p>
        </header>
        <InfoPanel compact dates={dates} />
      </div>
    </div>
  )
}
