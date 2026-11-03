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
  { minutes: 1090, total: 25, low: 10, mid: 15, high: 15, wave: 0.6, kind: 'clear' }, // 개요: 표지와 같은 노을
  { minutes: 430, total: 55, low: 25, mid: 35, high: 30, wave: 0.8, kind: 'cloudy' }, // 2 기획 배경: 구름 낀 아침
  { minutes: 1050, total: 15, low: 5, mid: 10, high: 10, wave: 0.5, kind: 'clear' }, // 3 시연
  { minutes: 1230, total: 60, low: 40, mid: 40, high: 40, wave: 0.6, kind: 'fog' }, // 4 AI · 한라산 운해
  { minutes: 1380, total: 10, low: 5, mid: 5, high: 5, wave: 0.5, kind: 'clear' }, // 5 밤하늘
  { minutes: 375, total: 20, low: 10, mid: 10, high: 10, wave: 0.6, kind: 'clear' }, // 6 여명
]

const CHAPTERS = ['표지', '프로젝트 한눈에', '기획 배경', '시연', 'AI 에이전트', 'IP · 기술', '마무리']
// 1. 표지 (원래 디자인)
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

// 1-2. 프로젝트 한눈에 (표지 다음 장: 표지의 4개 요약 카드를 풀어서 설명)
function Overview() {
  const ITEMS = [
    { big: '9 SPOTS', title: '제주 일출·일몰 명소', body: '명소 9곳의 구름·풍속·강수확률을 비교해 100점 촬영 점수를 냅니다.',
      pts: ['일출·일몰 시각에 맞춘 점수', '구름 30~50%를 최적 가점으로 계산', '3D 태양·달·별 궤적으로 보여 줌'] },
    { big: '1947m', title: '한라산 4대 등반 코스', body: '성판악·관음사·어리목·영실의 고도별 날씨를 판정합니다.',
      pts: ['좋음 · 주의 · 위험 3단계 판정', '일출 산행 출발 시각 계산', '하산 마감은 일몰 30분 전'] },
    { big: '6 TOOLS', title: 'Claude AI 에이전트', body: '질문에 맞는 도구를 골라 연속으로 호출하고 답합니다.',
      pts: ['호출한 도구 목록을 화면에 표시', '없는 날씨 수치는 지어내지 않음', '결과에 따라 리포트 버튼 생성'] },
    { big: '3+2 APIs', title: '공공데이터 · 실시간 3D', body: '기상청·관광공사·비짓제주 3종에 보조 API 2종을 더합니다.',
      pts: ['기상청 · TourAPI · 비짓제주', '보조: Open-Meteo · sunrise-sunset', 'Three.js 날씨 시뮬레이션'] },
  ]
  return (
    <div className="slide slide-overview">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>프로젝트 한눈에</p>
      <h2 className="slide-title s-item" style={{ '--i': 1, fontSize: 'clamp(2.2rem, 3.6vw, 3.4rem)' }}>숫자로 보는 <i>GOLDEN HOUR</i></h2>
      <div className="ov-grid">
        {ITEMS.map((k, i) => (
          <div key={k.big} className="glass ov-card s-item" style={{ '--i': 2 + i }}>
            <b>{k.big}</b>
            <h3>{k.title}</h3>
            <p>{k.body}</p>
            <ul>
              {k.pts.map((p) => <li key={p}>{p}</li>)}
            </ul>
          </div>
        ))}
      </div>
    </div>
  )
}

// 2. 기획 배경: 좌 PROBLEM 35% · 우 SOLUTION 65%
function Slide2() {
  const SOLUTION = [
    { no: '01', title: '제주의 빛과 바다 · HOME', tags: ['기상청 단기예보', 'sunrise-sunset', 'shared/score.js'],
      body: '명소 9곳의 구름·풍속·강수확률을 분석해 100점 만점 촬영 점수를 내고, 3D 태양·달·별의 방위각과 궤적을 보여 줍니다.' },
    { no: '02', title: '해녀와 테왁 · 제주 IP의 3D 재해석', tags: ['Three.js', '맑음·흐림·해무·비·눈'],
      body: '해녀와 테왁, 오름, 바다 파도, 별똥별과 오징어배 불빛을 외부 이미지 없이 Three.js 프로시저럴 3D로 구현했습니다.' },
    { no: '03', title: '한라산 1947 · 등반 날씨 판정기', tags: ['고도별 기상 예보', 'shared/hallasan.js', '공식 입산통제 링크'],
      body: '성판악·관음사·어리목·영실 4개 코스의 고도별 기온·풍속·강수를 좋음·주의·위험 3단계로 판정하고, 코스별 출발·하산 시각을 계산합니다.' },
  ]
  const PROBLEM = [
    { icon: '🌫️', title: '변덕스러운 제주의 구름과 해무', body: '일출·일몰 시각만 알고 갔다가 먹구름만 보고 돌아옵니다.' },
    { icon: '🧭', title: '흩어진 기상·관광 정보', body: '기상청, 천문 시각, 주변 관광지를 각각 따로 검색해야 합니다.' },
    { icon: '⛰️', title: '한라산 고지대 기상 악화', body: '해안가 날씨만 믿고 올라갔다가 백록담 강풍·안개로 통제되기도 합니다.' },
  ]
  return (
    <div className="slide slide-s2n">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>기획 배경</p>
      <h2 className="slide-title s-item" style={{ '--i': 1, fontSize: 'clamp(2.2rem, 3.6vw, 3.4rem)' }}>구름만 가득하면 <i>어떡하죠?</i></h2>
      <div className="s2n-grid">
        <div className="glass s2n-problem s-item" style={{ '--i': 2 }}>
          <span className="num">PROBLEM</span>
          <h3>제주 출사와 산행, 왜 늘 허탕을 칠까요?</h3>
          <ul className="s2n-list">
            {PROBLEM.map((p) => (
              <li key={p.title}>
                <b aria-hidden="true">{p.icon}</b>
                <div><strong>{p.title}</strong><p>{p.body}</p></div>
              </li>
            ))}
          </ul>
        </div>
        <div className="s2n-solution">
          {SOLUTION.map((s, i) => (
            <div key={s.no} className="glass s2n-card s-item" style={{ '--i': 3 + i }}>
              <div>
                <span className="num">{s.no}</span>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
              </div>
              <div className="pills">
                {s.tags.map((t) => <span key={t} className="pill cyan">{t}</span>)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 3. 라이브 시연: 실제 웹앱이 축소되어 도는 창 + 단계 카드 (양방향 연동)
const LIVE_STEPS = [
  { no: '01', title: '회원가입 · 로그인', desc: '계정을 만들고 로그인합니다', check: '계정별 분리', path: '/' },
  { no: '02', title: 'HOME · 골든아워 3D', desc: '날씨 효과, 명소 비교, 빛 리포트', check: '날씨 토글 · 며칠 뒤 예보', path: '/' },
  { no: '03', title: 'HALLA 1947', desc: '코스 선택, 등반 날씨 판정, 공식 안내', check: '3D 회전 · 등반 판정', path: '/halla' },
  { no: '04', title: 'AI GUIDE', desc: '질문하면 도구를 골라 호출하고 답합니다', check: '도구 연속 호출 · 환각 방지', path: '/agent' },
  { no: '05', title: 'NEARBY · SAVED', desc: '저장 후 새로고침해도 남아 있는지 확인', check: '비짓제주 저장 · 새로고침 유지', path: '/nearby' },
]

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
                <span>
                  <strong>{st.title}</strong>
                  <em>{st.desc}</em>
                  <span className="live-meta">
                    <small className="live-check">확인 포인트 · {st.check}</small>
                    <i className="live-hint">Click to jump ↗</i>
                  </span>
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// 4. AI 에이전트: 흐름 · 도구 6종 · 환각 방지 시나리오 2가지
function Slide4() {
  const FLOW = [
    { t: '사용자 질문', d: '자연어로 묻습니다' },
    { t: 'Vercel API', d: 'api/agent.js 가 요청을 받습니다' },
    { t: 'Claude 도구 선택', d: '필요한 도구를 골라 연속 호출합니다' },
    { t: '실측 데이터 답변', d: '수치로 답하고 리포트 버튼을 만듭니다' },
  ]
  const TOOLS = [
    { n: 'list_photo_spots', d: '제주 일출·일몰 명소 9곳 목록과 좌표 조회' },
    { n: 'get_sun_times', d: '명소별 일출·일몰·골든아워 시각과 방위각' },
    { n: 'get_cloud_cover', d: '기상청·Open-Meteo 시간별 구름양·풍속·강수' },
    { n: 'list_trails', d: '한라산 4대 등반 코스 정보와 정상 고도' },
    { n: 'get_elevation', d: '특정 위경도 좌표의 해발고도 조회' },
    { n: 'get_mountain_weather', d: '고도 지정 한라산 기상과 등반 판정(RULES)' },
  ]
  const CHAIN = ['list_photo_spots', 'get_sun_times', 'get_cloud_cover', 'get_mountain_weather']
  return (
    <div className="slide">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>AI 에이전트</p>
      <h2 className="slide-title s-item" style={{ '--i': 1, fontSize: 'clamp(1.9rem, 2.8vw, 2.6rem)' }}>지어내지 <i>않습니다</i></h2>
      <div className="flow s-item" style={{ '--i': 2 }}>
        {FLOW.map((f, i) => (
          <div key={f.t} className="flow-item">
            <div className="glass flow-step"><b>{f.t}</b><small>{f.d}</small></div>
            {i < FLOW.length - 1 && <span className="arrow">➔</span>}
          </div>
        ))}
      </div>
      <div className="ai-grid">
        <div className="glass s-item" style={{ '--i': 3 }}>
          <span className="num">6 TOOLS</span>
          <div className="tool-grid">
            {TOOLS.map((t) => (
              <div key={t.n} className="tool-card">
                <code>{t.n}</code>
                <p>{t.d}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="glass s-item" style={{ '--i': 4 }}>
          <span className="num">HALLUCINATION ZERO</span>
          <div className="case">
            <p className="case-tag">Case A · 복합 질문 (도구 연속 호출)</p>
            <p className="bubble">내일 일출 찍기 좋은 곳 추천해주고 성판악 날씨도 알려줘</p>
            <div className="chain">
              {CHAIN.map((f, i) => (
                <p key={f} className="chain-row">
                  <code>{f}</code>{i < CHAIN.length - 1 && <span>→</span>}
                </p>
              ))}
            </div>
            <p className="case-ans">수치 기반으로 추천하고 <b>[빛 리포트]</b> · <b>[한라산 리포트]</b> 버튼을 만듭니다.</p>
          </div>
          <div className="case">
            <p className="case-tag">Case B · 예보 범위 밖 (지어내지 않음)</p>
            <p className="bubble">2027년 3월 1일 성산일출봉 구름 예보 알려줘</p>
            <p className="case-ans">일출·일몰 시각만 안내하고, 구름과 날씨는 <b>예보 범위를 벗어나 판단할 수 없습니다</b>라고 답합니다. <em>숫자 날조 0%</em></p>
          </div>
        </div>
      </div>
    </div>
  )
}

// 5. IP · 기술: 3열 × 2행 벤토
function Slide5() {
  const CARDS = [
    { tag: '공공데이터 API 3종', title: '기상청 · 관광공사 · 비짓제주', body: '기상청 단기예보(하늘·강수확률), 한국관광공사 TourAPI(명소 사진·좌표), 비짓제주(주변 3·5·10km 관광지·음식점·행사)를 실데이터로 연동합니다.', pills: ['기상청', 'TourAPI', '비짓제주'] },
    { tag: 'Three.js 프로시저럴 3D', title: '외부 이미지 없이 코드로', body: '해·달·별자리·구름·파도·해녀와 테왁·한라산을 셰이더로 그리고, 맑음·흐림·해무·비·눈 날씨를 애니메이션으로 보여 줍니다.', pills: ['Three.js', 'Shader'] },
    { tag: 'React + Zustand', title: 'pages · components · store · api · three', body: 'Zustand로 전역 상태를 나누고 ToolSteps, ReportModal, HallaReportModal 같은 공용 컴포넌트를 재사용합니다.', pills: ['React', 'Zustand'] },
    { tag: 'Supabase DB · 계정 분리', title: 'favorites · favorite_places · chat_logs', body: '명소 즐겨찾기, 주변 장소, AI 대화를 로그인 계정별로 저장합니다. 비로그인 시 닉네임으로 구분하고 새로고침 뒤에도 유지합니다.', pills: ['Supabase', 'RLS'] },
    { tag: '무중단 폴백', title: 'Open-Meteo · sunrise-sunset 보조', body: '보조 API를 결합하고 서버에서 5분 캐시를 씁니다. 키가 없거나 장애가 나도 대체 데이터로 계속 동작합니다.', pills: ['5분 캐시', 'Fallback'] },
    { tag: '서버리스 보안 · 로컬 DX', title: '비밀 키는 서버 함수에만', body: 'ANTHROPIC 키와 공공데이터 키는 Vercel api/*.js 안에만 있고 브라우저와 GitHub에는 없습니다. vite.config.js의 localApi 플러그인으로 로컬에서도 같은 구조로 돌립니다.', pills: ['Vercel', 'localApi'] },
  ]
  return (
    <div className="slide slide-s5">
      <p className="slide-kicker s-item" style={{ '--i': 0 }}>IP · 기술</p>
      <h2 className="slide-title s-item" style={{ '--i': 1, fontSize: 'clamp(2.2rem, 3.6vw, 3.4rem)' }}>이렇게 <i>만들었습니다</i></h2>
      <div className="bento bento3">
        {CARDS.map((c, i) => (
          <div key={c.tag} className="glass bento-card s-item" style={{ '--i': 2 + i }}>
            <div>
              <span className="num">{c.tag}</span>
              <h3>{c.title}</h3>
              <p>{c.body}</p>
            </div>
            <div className="pills">
              {c.pills.map((p) => <span key={p} className="pill cyan">{p}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// 6. 마무리 (원래 디자인: 가운데 정렬 + QR 카드)
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

const SLIDES = [Slide1, Overview, Slide2, Slide3, Slide4, Slide5, Slide6]

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
      {index === 4 && <div className="deck-halla" ref={hallaHost} />}
      <div className="deck-vignette" />
      <div className="deck-stage" key={index}>
        <Current />
      </div>
      <div className="deck-hud">
        <span>{String(index + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')} · {CHAPTERS[index]}</span>
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
