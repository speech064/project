import { Link } from 'react-router-dom'
import { readySpots } from '../../shared/spots'
import { isSupabaseReady } from '../lib/supabase'
import { kind, rank } from '../lib/kinds'
import { useAppStore } from '../store/useAppStore'

export default function Saved() {
  const { nickname, favorites, placeFavs, chatLogs, user } = useAppStore()
  const setNickname = useAppStore((s) => s.setNickname)
  const toggleFavorite = useAppStore((s) => s.toggleFavorite)
  const togglePlace = useAppStore((s) => s.togglePlace)
  const selectSpot = useAppStore((s) => s.selectSpot)

  // 명소별로 묶기: 즐겨찾기한 명소 + 그 명소 주변에서 저장한 장소를 용도(음식점·관광지…)별로
  const ids = new Set([...favorites.map((f) => f.spot_id), ...placeFavs.map((p) => p.spot_id)])
  const groups = readySpots.filter((s) => ids.has(s.id)).map((spot) => {
    const places = placeFavs.filter((p) => p.spot_id === spot.id)
    const cats = [...new Set(places.map((p) => p.category))].sort((a, b) => rank(a) - rank(b))
    return {
      spot, isFav: favorites.some((f) => f.spot_id === spot.id),
      cats: cats.map((c) => ({ label: c, items: places.filter((p) => p.category === c).sort((a, b) => (a.distance_km ?? 99) - (b.distance_km ?? 99)) })),
    }
  })

  return (
    <>
      <section className="page-head">
        <h1>My Golden Hours</h1>
        <p className="intent">즐겨찾기한 명소와, 그 주변에서 눈여겨본 장소를 모아 봤어요.</p>
      </section>

      <section className="band">
        <div className="wrap narrow">
          {!isSupabaseReady && (
            <p className="notice">Supabase 설정(.env)이 없어서 즐겨찾기·조회가 꺼져 있어요. <code>.env.example</code> 을 참고하세요.</p>
          )}

          {user ? (
            <p className="nick welcome" data-reveal><b>{user.displayName}님 환영합니다!</b><small>내 계정의 즐겨찾기와 AI 대화만 보여요.</small></p>
          ) : (
            <label className="nick" data-reveal>
              <span>닉네임</span>
              <input defaultValue={nickname} placeholder="익명" onBlur={(e) => e.target.value.trim() !== nickname && setNickname(e.target.value)} />
              <small>로그인하지 않으면 이 이름으로 즐겨찾기와 대화 기록이 저장돼요. 위쪽 로그인으로 내 계정에 보관할 수도 있어요.</small>
            </label>
          )}

          {groups.length === 0 ? (
            <p className="muted saved-empty" data-reveal>아직 없어요. 홈에서 명소의 하트를, 주변 탐색에서 마음에 드는 장소의 하트를 눌러 보세요.</p>
          ) : groups.map(({ spot, isFav, cats }) => (
            <section key={spot.id} className="saved-spot" data-reveal>
              <header className="saved-spot-head">
                <h2>{spot.name}</h2>
                <div className="row-actions">
                  <Link to="/nearby" onClick={() => selectSpot(spot.id)}>주변 보기</Link>
                  {isFav && <button onClick={() => toggleFavorite(spot.id)}>즐겨찾기 해제</button>}
                </div>
              </header>

              {cats.length === 0 && <p className="muted saved-note">즐겨찾기한 주변 장소가 아직 없어요. 주변 탐색에서 하트를 눌러 보세요.</p>}

              <div className="saved-cats">
              {cats.map((c) => {
                const k = kind(c.label)
                return (
                  <div key={c.label} className="saved-cat" style={{ '--c': k.c, '--n': Math.min(c.items.length, 4) }}>
                    <h3><i>{k.mark}</i>{c.label}<small>{c.items.length}</small></h3>
                    <div className="saved-places">
                      {c.items.map((p) => (
                        <article key={p.id} className="saved-place">
                          <div className="saved-img" style={p.thumb ? { backgroundImage: `url(${p.thumb})` } : undefined}>
                            {!p.thumb && <b>{k.mark}</b>}
                            <button className="saved-x" onClick={() => togglePlace({ id: p.place_id }, p.spot_id)} aria-label={`${p.title} 저장 해제`}>✕</button>
                          </div>
                          <div className="saved-info">
                            <h4>{p.title}</h4>
                            <span>{p.distance_km != null ? `${p.distance_km}km` : ''}</span>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                )
              })}
              </div>
            </section>
          ))}

          <h2 className="saved-h" data-reveal>최근 AI 대화</h2>
          {chatLogs.length === 0 ? <p className="muted">AI 가이드에서 질문하면 여기에 기록돼요.</p> : (
            <ul className="list logs">
              {chatLogs.map((c) => (
                <li key={c.id} data-reveal>
                  <div>
                    <b>{c.question}</b>
                    <p>{c.answer}</p>
                    <small>{new Date(c.created_at).toLocaleString('ko-KR')} · 호출한 도구 {c.tools?.length ?? 0}개</small>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  )
}
