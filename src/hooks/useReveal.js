import { useEffect } from 'react'

// [data-reveal] 요소가 화면에 들어오면 부드럽게 나타나게 함
export function useReveal() {
  useEffect(() => {
    const io = new IntersectionObserver((entries) => {
      for (const e of entries) if (e.isIntersecting) { e.target.classList.add('in'); shown.add(e.target); io.unobserve(e.target) }
    }, { threshold: 0.15 })
    const seen = new WeakSet(), shown = new WeakSet()
    const scan = () => document.querySelectorAll('[data-reveal]').forEach((el) => {
      if (!seen.has(el)) { seen.add(el); io.observe(el) }
      else if (shown.has(el) && !el.classList.contains('in')) el.classList.add('in') // React 가 className 을 다시 쓰면 사라진 'in' 복구
    })
    scan()
    const mo = new MutationObserver(scan) // 데이터가 늦게 와서 생긴 요소도 처리
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => { io.disconnect(); mo.disconnect() }
  }, [])
}
