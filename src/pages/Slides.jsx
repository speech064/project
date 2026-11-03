import { useCallback, useEffect, useRef, useState } from 'react'
import { createScene } from '../three/createScene'
import { createHallaScene } from '../three/hallaScene'
import { TRAILS } from '../../shared/trails'
import '../styles/slides.css'

// 발표용 3분 슬라이드 (/slides). 배경은 사이트와 같은 3D 장면(createScene)·한라산(createHallaScene)을 씀
// ← → 또는 클릭: 넘기기 · F: 전체화면

// 모든 장면이 같이 쓰는 태양·바다 기준값 (일출 06:40, 일몰 18:00)
const BASE = { sunriseMin: 400, sunsetMin: 1080, solarNoon: 740, lat: 33.4, doy: 300, best: 'sunset', shape: 'crown', moonriseMin: null, moonsetMin: null, moonIllum: null, moonWaxing: true }

// 슬라이드 1~6 의 하늘: 시간(분), 구름양, 날씨 종류 → 시간이 바뀌면 3D 장면이 lerp 로 부드럽게 전환됨
const SCENES = [
  { minutes: 1090, total: 25, low: 10, mid: 15, high: 15, wave: 0.6, kind: 'clear' }, // 1 표지: 골든아워 노을
  { minutes: 430, total: 55, low: 25, mid: 35, high: 30, wave: 0.8, kind: 'cloudy' }, // 2 기획 배경: 구름 낀 아침
  { minutes: 1050, total: 15, low: 5, mid: 10, high: 10, wave: 0.5, kind: 'clear' }, // 3 시연
  { minutes: 1230, total: 60, low: 40, mid: 40, high: 40, wave: 0.6, kind: 'fog' }, // 4 AI · 한라산 운해
  { minutes: 1380, total: 10, low: 5, mid: 5, high: 5, wave: 0.5, kind: 'clear' }, // 5 밤하늘
  { minutes: 375, total: 20, low: 10, mid: 10, high: 10, wave: 0.6, kind: 'clear' }, // 6 여명
]

const CHAPTERS = ['표지', '기획 배경', '시연', 'AI 에이전트', 'IP · 기술', '마무리']

function Slide1() {
  return (
    <div className="slide">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>제주 IP × 공공데이터 × AI 에이전트</p>
      <h1 className="slide-title s-item" style={{ '--i': 1 }}>GOLDEN <i>HOUR</i></h1>
      <p className="slide-sub s-item" style={{ '--i': 2 }}>Beyond the clouds, chasing the light in Jeju.</p>
      <p className="slide-ko s-item" style={{ '--i': 3 }}>오늘 어디서, 언제 찍을지 실제 날씨 데이터로 골라 주는 제주 일출·일몰 3D 사진 가이드</p>
      <div className="pills s-item" style={{ '--i': 4 }}>
        <span className="pill amber">🌊 3D 날씨 · 해녀 · 한라산</span>
        <span className="pill coral">🤖 Claude 6-도구 에이전트</span>
        <span className="pill cyan">📊 공공데이터 3종 · 실시간 판정</span>
      </div>
    </div>
  )
}

function Slide2() {
  return (
    <div className="slide">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>기획 배경</p>
      <h2 className="slide-title s-item" style={{ '--i': 1, fontSize: 'clamp(32px, 4.6vw, 64px)' }}>구름만 가득하면 <i>어떡하죠?</i></h2>
      <div className="bento">
        <div className="glass s-item tall" style={{ '--i': 2 }}>
          <span className="num">PROBLEM</span>
          <h3>제주까지 사진 찍으러 갔는데</h3>
          <p>일출·일몰을 기다리다 허탕 치는 일이 많고, 한라산은 정상 날씨가 나빠서 올라가지 못하기도 합니다.</p>
          <div className="big">✕</div>
        </div>
        <div className="glass s-item" style={{ '--i': 3 }}>
          <span className="num">01</span>
          <h3>제주의 빛과 바다 · HOME</h3>
          <p>명소 9곳의 구름·풍속·강수확률로 100점 만점 촬영 점수를 내고, 3D 태양·달·별 궤적으로 보여 줍니다.</p>
        </div>
        <div className="glass s-item" style={{ '--i': 4 }}>
          <span className="num">02</span>
          <h3>해녀와 테왁 IP</h3>
          <p>제주 바다 문화를 상징하는 해녀와 테왁을 3D 바다 위에 올렸습니다.</p>
        </div>
        <div className="glass wide s-item" style={{ '--i': 5 }}>
          <span className="num">03</span>
          <h3>한라산 1947 · 등반 판정</h3>
          <p>성판악·관음사·어리목·영실 4개 코스의 정상부 날씨를 좋음·주의·위험으로 판정하고, 일출 산행 출발 시각을 계산합니다.</p>
        </div>
      </div>
    </div>
  )
}

const LIVE_STEPS = [
  { no: '01', title: '회원가입 · 로그인', desc: '계정을 만들고 로그인합니다', path: '/' },
  { no: '02', title: 'HOME · 골든아워 3D', desc: '날씨 효과, 명소 비교, 빛 리포트', path: '/' },
  { no: '03', title: 'HALLA 1947', desc: '코스 선택, 등반 날씨 판정, 공식 안내', path: '/halla' },
  { no: '04', title: 'AI GUIDE', desc: '질문하면 도구를 골라 호출하고 답합니다', path: '/agent' },
  { no: '05', title: 'NEARBY · SAVED', desc: '저장 후 새로고침해도 남아 있는지 확인', path: '/nearby' },
]

// 3번 슬라이드: 실제 웹앱이 축소되어 도는 라이브 시연 창 + 단계 체크리스트 (양방향 연동)
function Slide3() {
  const [active, setActive] = useState(0)
  const [path, setPath] = useState('/')
  const frame = useRef(null)
  const pick = (i) => { setActive(i); setPath(LIVE_STEPS[i].path) }
  return (
    <div className="slide slide-live">
      <div className="live-row s-item" style={{ '--i': 1 }}>
        <div className="live glass">
          <div className="live-bar">
            <span className="dots"><i /><i /><i /></span>
            <span className="live-url">GOLDEN HOUR{path === '/' ? '' : path}</span>
          </div>
          <div className="live-frame">
            <iframe ref={frame} src={path} title="라이브 시연 화면" onLoad={() => { try { frame.current?.contentWindow?.scrollTo(0, 0) } catch { /* 같은 사이트가 아니면 건너뜀 */ } }} />
          </div>
        </div>
        <div className="side-col">
          <div className="live-head">
            <p className="slide-kicker">라이브 시연</p>
            <h2 className="slide-title" style={{ fontSize: 'clamp(28px, 3.6vw, 48px)' }}>이렇게 <i>동작합니다</i></h2>
          </div>
          <div className="steps-col">
            {LIVE_STEPS.map((st, i) => (
              <button key={st.no} type="button" className={`live-step${active === i ? ' on' : ''}`} onClick={() => pick(i)}>
                <b>{st.no}</b>
                <span><strong>{st.title}</strong><em>{st.desc}</em></span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Slide4() {
  return (
    <div className="slide">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>AI 에이전트</p>
      <h2 className="slide-title s-item" style={{ '--i': 1, fontSize: 'clamp(32px, 4.8vw, 64px)' }}>지어내지 <i>않습니다</i></h2>
      <div className="flow s-item" style={{ '--i': 2 }}>
        <div className="glass"><b>사용자 질문</b></div><span className="arrow">➔</span>
        <div className="glass"><b>Vercel API</b><br />api/agent.js</div><span className="arrow">➔</span>
        <div className="glass"><b>Claude가 도구 선택 · 연속 호출</b></div><span className="arrow">➔</span>
        <div className="glass"><b>실측 데이터로 답변 · 버튼 생성</b></div>
      </div>
      <div className="bento">
        <div className="glass s-item" style={{ '--i': 3 }}>
          <span className="num">6 TOOLS</span>
          <div className="pills">
            {['list_photo_spots', 'get_sun_times', 'get_cloud_cover', 'list_trails', 'get_elevation', 'get_mountain_weather'].map((t) => (
              <span key={t} className="pill" style={{ fontSize: 12 }}>{t}</span>
            ))}
          </div>
        </div>
        <div className="glass wide s-item" style={{ '--i': 4 }}>
          <span className="num">HALLUCINATION ZERO</span>
          <h3>예보 범위를 벗어난 날짜는 숫자를 만들지 않습니다</h3>
          <p>"2027년 3월 1일 성산일출봉 구름 예보"를 물으면 일출·일몰 시각만 알려 주고, 구름은 판단할 수 없다고 답합니다.</p>
        </div>
      </div>
    </div>
  )
}

function Slide5() {
  return (
    <div className="slide">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>IP · 기술</p>
      <h2 className="slide-title s-item" style={{ '--i': 1, fontSize: 'clamp(32px, 4.8vw, 64px)' }}>이렇게 <i>만들었습니다</i></h2>
      <div className="bento">
        <div className="glass s-item" style={{ '--i': 2 }}>
          <span className="num">공공데이터 3종</span>
          <h3>기상청 · 한국관광공사 · 비짓제주</h3>
          <p>보조로 Open-Meteo, sunrise-sunset.org를 씁니다. 키가 없거나 장애가 나도 나머지 기능은 계속 동작합니다.</p>
        </div>
        <div className="glass s-item" style={{ '--i': 3 }}>
          <span className="num">React 구조</span>
          <h3>pages · components · store · api · three</h3>
          <p>Zustand로 전역 상태를 나누고, 모달과 카드 같은 공용 컴포넌트를 재사용합니다.</p>
        </div>
        <div className="glass s-item" style={{ '--i': 4 }}>
          <span className="num">Supabase</span>
          <h3>favorites · favorite_places · chat_logs</h3>
          <p>즐겨찾기, 주변 장소, AI 대화를 계정별로 저장하고 새로고침 뒤에도 유지합니다.</p>
        </div>
        <div className="glass s-item" style={{ '--i': 5 }}>
          <span className="num">보안</span>
          <h3>비밀 키는 서버에만</h3>
          <p>API 키는 Vercel 서버 함수 안에만 있고, 브라우저와 GitHub에는 없습니다.</p>
        </div>
      </div>
    </div>
  )
}

function Slide6() {
  return (
    <div className="slide" style={{ justifyItems: 'center', textAlign: 'center', gap: 'clamp(10px, 1.6vw, 18px)' }}>
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>Thank you</p>
      <p className="quote s-item" style={{ '--i': 1 }}>Beyond the clouds,<br />chasing the light in Jeju.</p>
      <div className="cta-row s-item" style={{ '--i': 2 }}>
        <a className="cta" href="https://jeju-golden-hour.vercel.app/" target="_blank" rel="noreferrer">배포 주소 ↗</a>
        <a className="cta ghost" href="https://github.com/speech064/project" target="_blank" rel="noreferrer">GitHub ↗</a>
      </div>
      <p className="slide-ko s-item" style={{ '--i': 3 }}>Q&amp;A</p>
      <div className="qr-wrap s-item" style={{ '--i': 4 }}>
        <div className="qr-card glass">
          <img style={{ width: 170, height: 170, borderRadius: 12, background: '#fff', padding: 6, display: 'block' }} src="/images/qr.png" alt="배포 주소 QR 코드" />
          <p className="qr-caption">📱 모바일로 바로 체험하기</p>
        </div>
      </div>
    </div>
  )
}

const SLIDES = [Slide1, Slide2, Slide3, Slide4, Slide5, Slide6]

export default function Slides() {
  const [index, setIndex] = useState(0)
  const skyHost = useRef(null)
  const hallaHost = useRef(null)
  const sky = useRef(null)

  // step: 앞뒤로 한 장씩 (키·클릭) / goTo: 점 버튼으로 해당 장으로
  const step = useCallback((d) => setIndex((i) => Math.min(SLIDES.length - 1, Math.max(0, i + d))), [])
  const goTo = useCallback((n) => setIndex(Math.min(SLIDES.length - 1, Math.max(0, n))), [])

  // 3D 하늘 배경 (사이트와 같은 장면)
  useEffect(() => {
    const canvas = document.createElement('canvas')
    canvas.className = 'deck-canvas'
    skyHost.current.appendChild(canvas)
    sky.current = createScene(canvas, { mobile: false })
    const resize = () => sky.current?.resize(window.innerWidth, window.innerHeight)
    resize()
    window.addEventListener('resize', resize)
    return () => {
      window.removeEventListener('resize', resize)
      sky.current?.dispose()
      sky.current = null
      canvas.remove()
    }
  }, [])

  // 슬라이드가 바뀌면 시간·구름·날씨를 목표값으로 (장면은 lerp 로 부드럽게 따라감)
  useEffect(() => {
    const s = SCENES[index]
    sky.current?.setTarget({ ...BASE, minutes: s.minutes, total: s.total, low: s.low, mid: s.mid, high: s.high, wave: s.wave, wx: { kind: s.kind, wind: 2, wave: s.wave } })
  }, [index])

  // 4번 슬라이드: 한라산 3D 운해
  useEffect(() => {
    if (index !== 3 || !hallaHost.current) return undefined
    const scene = createHallaScene(hallaHost.current, TRAILS)
    return () => scene.dispose()
  }, [index])

  // 키보드: ← → (Space, PageUp/Down) 넘기기 · F 전체화면
  useEffect(() => {
    const onKey = (e) => {
      if (e.target.closest?.('input, textarea, select, [contenteditable="true"]') || document.activeElement?.tagName === 'IFRAME') return
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); step(1) }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); step(-1) }
      else if (e.key === 'f' || e.key === 'F') {
        if (document.fullscreenElement) document.exitFullscreen?.()
        else document.documentElement.requestFullscreen?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [step])

  const Current = SLIDES[index]
  return (
    <main className="deck" onClick={(e) => { if (!e.target.closest('a, button, .live, .steps-col')) step(1) }}>
      <div className="deck-sky" ref={skyHost} />
      {index === 3 && <div className="deck-halla" ref={hallaHost} />}
      <div className="deck-vignette" />
      <div className="deck-stage" key={index}>
        <Current />
      </div>
      <div className="deck-hud">
        <span>{String(index + 1).padStart(2, '0')} / 06 · {CHAPTERS[index]}</span>
        <div className="deck-dots">
          {SLIDES.map((_, i) => (
            <button key={i} type="button" className={i === index ? 'on' : ''} aria-label={`${i + 1}번 슬라이드`} onClick={(e) => { e.stopPropagation(); goTo(i) }} />
          ))}
        </div>
        <span className="deck-hint">← → 넘기기 · F 전체화면</span>
      </div>
    </main>
  )
}
