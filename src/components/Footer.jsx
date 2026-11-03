// 모든 탭이 같은 푸터로 끝남: 로고 + 데이터 출처(성격별로 나눠 적음) + 맨 아래 한 줄
// 상단 탭이 고정되어 있어서 푸터에는 탭 링크를 두지 않음
const SOURCE_GROUPS = [
  {
    title: '날씨·일출·일몰',
    items: [
      { label: '기상청 단기예보 (공공데이터포털)', href: 'https://www.data.go.kr' },
      { label: 'sunrise-sunset.org', href: 'https://sunrise-sunset.org/api' },
      { label: 'Open-Meteo', href: 'https://open-meteo.com' },
    ],
  },
  {
    title: '관광·사진·주변',
    items: [
      { label: '한국관광공사 TourAPI', href: 'https://api.visitkorea.or.kr' },
      { label: '제주관광공사 비짓제주', href: 'https://www.visitjeju.net/kr/visitjejuapi' },
    ],
  },
  {
    title: '지도',
    items: [{ label: '통계청 행정구역 경계 (단순화)', href: 'https://kosis.kr' }],
  },
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

        <div className="foot-sources">
          {SOURCE_GROUPS.map((g) => (
            <div key={g.title} className="foot-col">
              <h4>{g.title}</h4>
              {g.items.map((s) => <a key={s.href} href={s.href} target="_blank" rel="noreferrer">{s.label}</a>)}
            </div>
          ))}
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
