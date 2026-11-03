import { useEffect, useState } from 'react'
import { useAppStore } from '../store/useAppStore'

// 날씨 미리보기 토글 (테스트·체험용): 실제 날씨 대신 골라 본 날씨를 3D 장면에 보여 줘요.
const OPTIONS = [['real', '실제날씨'], ['clear', '맑음'], ['cloudy', '흐림'], ['rain', '비'], ['fog', '안개'], ['snow', '눈']]

export default function WeatherPreview() {
  const wxPreview = useAppStore((s) => s.wxPreview)
  const setWxPreview = useAppStore((s) => s.setWxPreview)
  const [inSky, setInSky] = useState(true) // 3D 하늘이 보이는 첫 화면에서만 표시
  useEffect(() => {
    const onScroll = () => setInSky(window.scrollY < window.innerHeight * 0.5)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const current = wxPreview ?? 'real'
  if (!inSky) return null
  return (
    <div className="wx-preview" role="group" aria-label="날씨 미리보기 (테스트용)">
      <span className="wx-k" aria-hidden="true">🌦️ 날씨 미리보기</span>
      {OPTIONS.map(([value, label]) => (
        <button key={value} type="button" aria-pressed={current === value} className={current === value ? 'on' : ''}
          onClick={() => setWxPreview(value === 'real' ? null : value)}>{label}</button>
      ))}
    </div>
  )
}
