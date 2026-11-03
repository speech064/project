import { useEffect, useState } from 'react'

// 3D 화면 구석의 작은 안내: 드래그를 한 번 하면 사라짐.
// 홈은 3D 하늘이 보이는 첫 화면에서만, 한라산 탭은 항상 보여 줌.
export default function DragHint({ corner = 'left', hideOnScroll = false }) {
  const [done, setDone] = useState(false)
  const [away, setAway] = useState(false)
  useEffect(() => {
    const onDrag = () => setDone(true)
    window.addEventListener('sky-drag', onDrag, { once: true })
    return () => window.removeEventListener('sky-drag', onDrag)
  }, [])
  useEffect(() => {
    if (!hideOnScroll) return undefined
    const onScroll = () => setAway(window.scrollY > window.innerHeight * 0.5)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [hideOnScroll])
  if (done || away) return null
  return <div className={`drag-hint ${corner}`} role="note">🖱️ 마우스로 드래그해 3D 시점을 회전해보세요</div>
}
