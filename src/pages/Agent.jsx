import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { trailById } from '../../shared/trails'
import { hm } from '../../shared/date'
import { getSpot } from '../../shared/spots'
import Lines from '../components/Lines'
import ReportModal from '../components/ReportModal'
import HallaReportModal from '../components/HallaReportModal'
import ToolSteps from '../components/ToolSteps'
import { eventWeather, exampleQuestions, greeting } from '../lib/tips'
import { useAppStore } from '../store/useAppStore'

export default function Agent() {
  const messages = useAppStore((s) => s.messages)
  const loading = useAppStore((s) => s.chatLoading)
  const sendMessage = useAppStore((s) => s.sendMessage)
  const { spotId, date, minutes, sun, weather, user } = useAppStore()
  const focusScene = useAppStore((s) => s.focus)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportDates, setReportDates] = useState(null) // 사용자가 비교한 날짜들 (2개 이상일 때만)
  const [hallaReport, setHallaReport] = useState(null) // 한라산 리포트 창에 띄울 { trail, date }
  const [pendingNearby, setPendingNearby] = useState(null) // 주변 탐색으로 넘어가기 전 확인 창에 쓸 { spotId, category }
  const navigate = useNavigate()
  const hello = greeting({ spot: getSpot(spotId), date, w: eventWeather({ spot: getSpot(spotId), sun, weather }), name: user?.displayName })
  const examples = exampleQuestions({ sun }) // 한국 시간 기준 지금에 맞는 예시 질문
  const [input, setInput] = useState('')
  const logRef = useRef(null)

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, loading])

  // 답변 아래 버튼: 홈으로 가지 않고, 이 화면 위에 빛 리포트 미니 창을 바로 띄움
  const openReport = (focus) => {
    setReportDates(focus.dates?.length >= 2 ? focus.dates : null)
    setReportOpen(true) // 먼저 열어서 불러오는 상태를 바로 보여줌
    const s = useAppStore.getState()
    const loaded = s.spotId === focus.spotId && s.date === focus.date && (s.sun || s.sunLoading) && (s.weather || s.weatherLoading)
    if (!loaded) focusScene(focus) // 이미 불러온 값(답변 직후)이 있으면 다시 요청하지 않음
  }

  // 확인 후 주변 탐색 탭으로 이동: 그 명소를 고르고, 물어본 분류로 맞춰 둠
  const goNearby = () => {
    const n = pendingNearby
    setPendingNearby(null)
    useAppStore.getState().setNearbyHint({ category: n.category })
    useAppStore.getState().selectSpot(n.spotId)
    navigate('/nearby')
  }

  const ask = (text) => {
    if (!text.trim() || loading) return
    sendMessage(text.trim())
    setInput('')
  }

  return (
    <section className="hero hero--agent">
      <div className="hero-inner small">
        <p className="eyebrow rise" style={{ '--d': '0.1s' }}>AI 가이드 · CLAUDE</p>
        <h1 className="rise" style={{ '--d': '0.2s' }}>Ask the light.</h1>
        <p className="intent rise" style={{ '--d': '0.35s' }}><span className="ln">질문하면 에이전트가 일출·일몰 시각과 구름 예보를 직접 조회해서</span><span className="ln">가장 좋은 명소를 골라 드려요.</span></p>
      </div>

      <div className="chat glass">
        <div className="now"><span>지금 보는 곳</span> {getSpot(spotId)?.name} · {date} · {hm(minutes)}</div>

        <div className="log" ref={logRef}>
          {messages.length === 0 && (
            <div className="empty">
              <div className="greet-box">{hello.map((l, i) => <p key={i} className={i ? 'sub' : undefined}>{l}</p>)}</div>
              <div className="chips">{examples.map((e) => <button key={e} onClick={() => ask(e)}>{e}</button>)}</div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}${m.error ? ' error' : ''}`}>
              {m.role === 'assistant' && <ToolSteps steps={m.steps} />}
              <p>{m.role === 'assistant' && !m.error ? <Lines text={m.text} /> : m.text}</p>
              {m.focus && getSpot(m.focus.spotId) && (
                <button type="button" className="go" onClick={() => openReport(m.focus)}>{getSpot(m.focus.spotId).name} 빛 리포트 보기 ↗</button>
              )}
              {m.nearby && getSpot(m.nearby.spotId) && (
                <button type="button" className="go" onClick={() => setPendingNearby(m.nearby)}>{getSpot(m.nearby.spotId).name} 주변 {m.nearby.category || '장소'} 더 찾아보기 ↗</button>
              )}
              {m.hallasan && trailById(m.hallasan.trail) && (
                <button type="button" className="go" onClick={() => setHallaReport(m.hallasan)}>{trailById(m.hallasan.trail).name} 한라산 리포트 보기 ↗</button>
              )}
            </div>
          ))}
          {loading && <div className="msg assistant pending"><span className="dots"><i /><i /><i /></span> 도구를 호출하는 중…</div>}
        </div>

        <form className="ask" onSubmit={(e) => { e.preventDefault(); ask(input) }}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="예) 내일 가장 좋은 일몰 명소는?" maxLength={500} aria-label="질문" />
          <button type="submit" disabled={loading || !input.trim()}>보내기</button>
        </form>
      </div>
      {reportOpen && <ReportModal dates={reportDates} onClose={() => setReportOpen(false)} />}
      {pendingNearby && (
        <div className="report-overlay" onMouseDown={(e) => e.target === e.currentTarget && setPendingNearby(null)}>
          <div className="nearby-ask" role="dialog" aria-modal="true" aria-label="주변 탐색으로 이동">
            <p>주변 탐색에서 더 찾아볼까요?</p>
            <div className="nearby-ask-btns">
              <button type="button" onClick={() => setPendingNearby(null)}>취소</button>
              <button type="button" className="primary" onClick={goNearby}>이동</button>
            </div>
          </div>
        </div>
      )}
      {hallaReport && <HallaReportModal trail={hallaReport.trail} date={hallaReport.date} onClose={() => setHallaReport(null)} />}
    </section>
  )
}
