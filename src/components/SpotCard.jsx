import HeartIcon from './HeartIcon'
import { useAppStore } from '../store/useAppStore'

// 사진 중심 명소 카드 (마우스를 올리면 사진이 부드럽게 확대)
export default function SpotCard({ spot, selected, onSelect }) {
  const found = useAppStore((s) => s.images[spot.id])
  const image = spot.photo ?? found // 검수한 고정 사진 → 없으면 API 로 찾은 사진
  const fav = useAppStore((s) => s.favorites.some((f) => f.spot_id === spot.id))
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)

  return (
    <article className={`spot ${spot.best}${selected ? ' on' : ''}`} data-reveal>
      <button className="spot-open" onClick={() => onSelect(spot.id)} aria-pressed={selected}>
        <div className="spot-img">
          <div className="spot-bg" style={{ backgroundImage: image ? `url(${image})` : `linear-gradient(160deg, ${spot.tint[0]}, ${spot.tint[1]})`, ...(spot.photo && spot.photoFit && { backgroundSize: spot.photoFit.size, backgroundPosition: spot.photoFit.pos }) }} />
          <div className="spot-shade" />
          <div className="spot-cap">
            <small>{spot.en}</small>
            <h3>{spot.name}</h3>
          </div>
        </div>
        <p>{spot.blurb.split('|').map((l, i) => <span key={i}>{l}</span>)}</p>
      </button>
      <button className={`spot-fav${fav ? ' on' : ''}`} onClick={() => toggleFavorite(spot.id)} aria-label={fav ? '즐겨찾기 해제' : '즐겨찾기'} aria-pressed={fav}>
        <HeartIcon filled={fav} size={16} />
      </button>
    </article>
  )
}
