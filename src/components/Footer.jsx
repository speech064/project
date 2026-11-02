import { NavLink } from 'react-router-dom'
import { NAV_ITEMS } from '../router'

// 모든 탭이 같은 푸터로 끝남 (아만·애플·식스센시스처럼: 로고 + 링크 열 + 맨 아래 한 줄)
const SOURCES = [
  { label: '일출·일몰 sunrise-sunset.org', href: 'https://sunrise-sunset.org/api' },
  { label: '구름·파도 Open-Meteo', href: 'https://open-meteo.com' },
  { label: '단기예보 기상청 (공공데이터포털)', href: 'https://www.data.go.kr' },
  { label: '사진·주소 한국관광공사 TourAPI', href: 'https://api.visitkorea.or.kr' },
  { label: '주변 장소 비짓제주', href: 'https://www.visitjeju.net/kr/visitjejuapi' },
]

export default function Footer() {
  return (
    <footer className="foot">
      <div className="foot-grid">
        <div className="foot-brand">
          <b>GOLDEN HOUR</b>
          <p>Chasing the light in Jeju.</p>
          <p className="foot-sub">제주의 일출·일몰 명소를 실제 날씨로 비교하는 사진 가이드</p>
        </div>

        <nav className="foot-col" aria-label="페이지">
          <h4>둘러보기</h4>
          {NAV_ITEMS.map((n) => <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>)}
        </nav>

        <div className="foot-col">
          <h4>데이터 출처</h4>
          {SOURCES.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>)}
        </div>
      </div>

      <div className="foot-bottom">
        <span>© {new Date().getFullYear()} GOLDEN HOUR · 사진 한국관광공사·제주관광공사</span>
        <span>사진 지수는 추천일 뿐 촬영 결과를 보장하지 않아요.</span>
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>맨 위로 ↑</button>
      </div>
    </footer>
  )
}
