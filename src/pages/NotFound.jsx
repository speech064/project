import { Link } from 'react-router-dom'

export default function NotFound() {
  return (
    <div className="notfound">
      <p className="eyebrow">404</p>
      <h1>빛이 닿지 않는 곳이에요</h1>
      <Link to="/" className="pill">홈으로</Link>
    </div>
  )
}
