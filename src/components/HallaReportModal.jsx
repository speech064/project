import { useEffect, useRef } from 'react'
import Hallasan from '../pages/Hallasan'

// 에이전트 화면 위에 뜨는 "한라산 리포트" 창 (빛 리포트 창과 같은 방식). 주소는 그대로 두고 창 안에서만 코스·날짜를 바꿔요.
// 닫기: ✕ 버튼 · ESC · 바깥 클릭
export default function HallaReportModal({ trail, date, onClose }) {
  const closeBtn = useRef(null)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeBtn.current?.focus()
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])

  return (
    <div className="report-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="report-pop info-band halla-report" role="dialog" aria-modal="true" aria-label="한라산 등반 리포트">
        <button type="button" className="report-x" ref={closeBtn} onClick={onClose} aria-label="닫기">✕</button>
        <Hallasan embed={{ trail, date }} />
      </div>
    </div>
  )
}
