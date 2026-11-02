import { useEffect, useState } from 'react'

export function useMedia(query) {
  const [match, setMatch] = useState(() => matchMedia(query).matches)
  useEffect(() => {
    const mq = matchMedia(query)
    const on = () => setMatch(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

// 한 줄에 최대 perRow 개씩, 줄마다 개수를 고르게 나눠요 (예: 9개 → 5+4, 모바일 3+3+3). 마지막 줄만 혼자 남지 않도록.
export function balancedRows(n, perRow) {
  const rows = Math.max(1, Math.ceil(n / perRow))
  const base = Math.floor(n / rows), extra = n % rows
  return Array.from({ length: rows }, (_, i) => base + (i < extra ? 1 : 0))
}

// items: [{ key, label, active, color?, mark?, onClick }]
export default function BalancedChips({ items, desktop = 5, mobile = 3, label }) {
  const narrow = useMedia('(max-width: 640px)')
  const perRow = narrow ? mobile : desktop
  const sizes = balancedRows(items.length, perRow)
  const gap = 8

  let at = 0
  return (
    <div className="chiprows" role="group" aria-label={label}>
      {sizes.map((n, r) => {
        const row = items.slice(at, (at += n))
        return (
          <div key={r} className="chiprow" style={{ '--n': n, '--w': `min(184px, calc((100% - ${(perRow - 1) * gap}px) / ${perRow}))` }}>
            {row.map((it) => (
              <button key={it.key} className={`chip${it.active ? ' on' : ''}`} style={it.color ? { '--c': it.color } : undefined} onClick={it.onClick} aria-pressed={it.active}>
                {it.mark && <i className="mark-dot">{it.mark}</i>}
                <span>{it.label}</span>
              </button>
            ))}
          </div>
        )
      })}
    </div>
  )
}
