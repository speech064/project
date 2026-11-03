import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { NAV_ITEMS } from '../router'
import SkyScene from '../components/SkyScene'
import Footer from '../components/Footer'
import WeatherPreview from '../components/WeatherPreview'
import AuthModal from '../components/AuthModal'
import { useReveal } from '../hooks/useReveal'
import { useAppStore } from '../store/useAppStore'

export default function RootLayout() {
  const toasts = useAppStore((s) => s.toasts)
  const user = useAppStore((s) => s.user)
  const signOut = useAppStore((s) => s.signOut)
  const [authOpen, setAuthOpen] = useState(false)
  const [glass, setGlass] = useState('') // '' | 'dark' | 'light'
  const { pathname } = useLocation()
  const plain = pathname === '/nearby' || pathname === '/saved' // 3D 장면 없이 보는 탭
  const halla = pathname === '/halla' // 자체 3D 장면(HALLA 1947)을 쓰는 탭
  useReveal()

  // 앱이 켜질 때 한 번: 기본 명소 데이터, 명소 사진, 즐겨찾기·대화 기록 불러오기
  useEffect(() => {
    const s = useAppStore.getState()
    s.loadData()
    s.initAuth() // 저장된 로그인 세션 확인
    s.loadImages()
    s.loadFavorites()
    s.loadPlaceFavs()
    s.loadChatLogs()
  }, [])

  useEffect(() => {
    // 맨 위: 투명 / 히어로(어두운 하늘) 위: 어두운 유리 / 밝은 본문 위: 밝은 유리
    const on = () => {
      const dark = document.querySelector('.halla-hero')
      if (dark) { setGlass(dark.getBoundingClientRect().bottom > 56 ? 'dark' : 'light'); return }
      const hero = document.querySelector('.hero')
      const overHero = hero ? hero.getBoundingClientRect().bottom > 56 : false
      setGlass(window.scrollY < 24 ? '' : overHero ? 'dark' : 'light')
    }
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])

  useEffect(() => { window.scrollTo(0, 0) }, [pathname])

  // HALLA 1947 로 들어갈 때는 검은 막이, 나올 때는 흰 막이 걷히며 장면이 바뀜
  const prev = useRef(pathname)
  const [veil, setVeil] = useState(null)
  useEffect(() => {
    const from = prev.current
    prev.current = pathname
    if (from === pathname || (from !== '/halla' && pathname !== '/halla')) return undefined
    setVeil({ n: pathname, dark: pathname === '/halla' })
    const id = setTimeout(() => setVeil(null), 900)
    return () => clearTimeout(id)
  }, [pathname])
  useEffect(() => { document.body.classList.toggle('plain', plain); return () => document.body.classList.remove('plain') }, [plain])

  return (
    <>
      {!plain && !halla && <SkyScene />}
      <div className="page">
        <header className={`head${plain ? ' glass-light' : glass ? ` glass-${glass}` : ''}`}>
          <NavLink to="/" className="brand">Beyond the clouds, chasing the light in Jeju.</NavLink>
          <nav>
            {NAV_ITEMS.map((n) => (
              <NavLink key={n.to} to={n.to} end={n.to === '/'}>{n.label}</NavLink>
            ))}
          </nav>
          <div className="auth-slot">
            {user ? (
              <>
                <span className="auth-hi">Hi, {user.displayName}</span>
                <button type="button" className="auth-btn" onClick={signOut}>LOG OUT</button>
              </>
            ) : (
              <button type="button" className="auth-btn" onClick={() => setAuthOpen(true)}>LOG IN</button>
            )}
          </div>
        </header>

        <Outlet />

        {pathname !== '/agent' && <Footer />}
      </div>

      {veil && <div key={veil.n} className={`route-veil${veil.dark ? ' dark' : ''}`} aria-hidden="true" />}
      {authOpen && !user && <AuthModal onClose={() => setAuthOpen(false)} />}
      {(pathname === '/' || pathname === '/halla') && <WeatherPreview />}
      <div className="toasts" role="status">
        {toasts.map((t) => <div key={t.id} className={`toast ${t.variant}`}>{t.message}</div>)}
      </div>
    </>
  )
}
