import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

// 로그인 / 새로 가입하기 모달 (이메일 없이 아이디·비밀번호·사용자 이름만)
export default function AuthModal({ onClose }) {
  const signIn = useAppStore((s) => s.signIn)
  const signUp = useAppStore((s) => s.signUp)
  const [tab, setTab] = useState('in') // 'in' 로그인 | 'up' 가입
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const first = useRef(null)

  useEffect(() => {
    first.current?.focus()
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  useEffect(() => { setError('') }, [tab])

  const submit = async (e) => {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    const msg = tab === 'in' ? await signIn(username, password) : await signUp(username, password, displayName)
    setBusy(false)
    if (msg) setError(msg); else onClose()
  }

  return (
    <div className="auth-overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="auth-modal" role="dialog" aria-modal="true" aria-label="로그인">
        <button className="auth-x" onClick={onClose} aria-label="닫기">✕</button>
        <p className="auth-title">GOLDEN HOUR</p>
        <div className={`auth-tabs ${tab}`} role="tablist">
          <i aria-hidden="true" />
          <button type="button" role="tab" aria-selected={tab === 'in'} onClick={() => setTab('in')}>로그인</button>
          <button type="button" role="tab" aria-selected={tab === 'up'} onClick={() => setTab('up')}>새로 가입하기</button>
        </div>

        <form onSubmit={submit} noValidate>
          <label>
            <span>아이디</span>
            <input ref={first} value={username} onChange={(e) => setUsername(e.target.value)} placeholder="영문·숫자 3~20자" autoComplete="username" autoCapitalize="none" spellCheck={false} />
          </label>
          <label>
            <span>비밀번호</span>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="6자리 이상" autoComplete={tab === 'in' ? 'current-password' : 'new-password'} />
          </label>
          {tab === 'up' && (
            <label>
              <span>사용자 이름</span>
              <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="화면에 보일 이름 (한글 가능)" maxLength={20} autoComplete="nickname" />
            </label>
          )}
          {error && <p className="auth-err" role="alert">{error}</p>}
          <button type="submit" className="auth-go" disabled={busy}>{busy ? '잠시만요…' : tab === 'in' ? '로그인' : '가입하고 시작하기'}</button>
        </form>
        <p className="auth-note">이메일 없이 아이디만으로 가입해요. 로그인하면 저장한 명소와 AI 대화가 내 계정에 따로 보관돼요.</p>
      </div>
    </div>
  )
}
