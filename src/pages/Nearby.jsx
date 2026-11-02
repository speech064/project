import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { readySpots, getSpot } from '../../shared/spots'
import { fetchNearby } from '../api/client'
import BalancedChips, { useMedia } from '../components/BalancedChips'
import HeartIcon from '../components/HeartIcon'
import JejuMap from '../components/JejuMap'
import { kind, rank } from '../lib/kinds'
import { useAppStore } from '../store/useAppStore'

const RADIUS = 5 // 반경은 5km 로 고정 (3km 는 너무 좁고 10km 이상은 수백 곳이라 "주변"이라 하기엔 넓음)
const PAGE = 6 // 처음에 용도별로 보여줄 개수이자, "더 보기"를 누를 때마다 늘어나는 개수

// 명소를 위치(동쪽/서쪽)로 묶어 두 줄로 보여줌
const AREAS = [
  { key: 'sunrise', label: '제주 동쪽' },
  { key: 'sunset', label: '제주 서쪽' },
]

// 명소 주변의 관광지·음식점·쇼핑·축제 (제주관광공사 비짓제주 API)
export default function Nearby() {
  const spotId = useAppStore((s) => s.spotId)
  const selectSpot = useAppStore((s) => s.selectSpot)
  const spot = getSpot(spotId)
  const narrow = useMedia('(max-width: 640px)') // 좁은 화면: 지도는 위치만 보여주고 이름은 버튼으로 고름

  const radius = RADIUS
  const [category, setCategory] = useState('전체')
  const [shown, setShown] = useState({}) // 용도별로 지금 몇 개까지 보여 주는지
  const [state, setState] = useState({ loading: true, data: null, error: null })

  useEffect(() => {
    if (!spot) return
    let stale = false
    setState((s) => ({ ...s, loading: true, error: null }))
    fetchNearby(spot, radius)
      .then((data) => !stale && setState({ loading: false, data, error: null }))
      .catch((e) => !stale && setState({ loading: false, data: null, error: e.message }))
    return () => { stale = true }
  }, [spot, radius])

  useEffect(() => { setCategory('전체'); setShown({}) }, [spotId])

  const all = useMemo(() => state.data?.items ?? [], [state.data])
  const categories = useMemo(() => [...(state.data?.categories ?? [])].sort((a, b) => rank(a.label) - rank(b.label)), [state.data])
  // 태그는 지금 보이는 모든 장소에서 많이 쓰인 순서로 고름 (많이 쓰인 태그일수록 어느 장소에서나 비교하기 쉬워서)
  const tagFreq = useMemo(() => {
    const m = new Map()
    all.forEach((p) => tagsOf(p).forEach((t) => m.set(t, (m.get(t) ?? 0) + 1)))
    return m
  }, [all])

  // 전체 보기: 용도별 구역 / 분류 선택: 그 분류만
  const groups = useMemo(() => {
    const list = category === '전체' ? categories : categories.filter((c) => c.label === category)
    return list.map((c) => ({ ...c, items: all.filter((p) => p.category === c.label) }))
  }, [all, categories, category])

  const spotChips = readySpots.map((s) => ({ key: s.id, area: s.best, label: s.name, active: s.id === spotId, onClick: () => selectSpot(s.id) }))
  const catChips = [
    { key: '전체', label: `전체 ${state.data?.total ?? all.length}`, active: category === '전체', onClick: () => setCategory('전체') },
    ...categories.map((c) => ({ key: c.label, label: `${c.label} ${c.count}`, active: category === c.label, color: kind(c.label).c, mark: kind(c.label).mark, onClick: () => setCategory(c.label) })),
  ]

  return (
    <>
      <section className="page-head">
        <p className="eyebrow">주변 탐색 · 비짓제주</p>
        <h1>Around the light.</h1>
        <p className="intent">명소 주변의 볼거리, 먹거리, 즐길 거리를 용도별로 모아 보여드려요.</p>
      </section>

      <section className="band">
        <div className="wrap">
          <JejuMap spots={readySpots} selectedId={spotId} onSelect={selectSpot} radius={radius} narrow={narrow} />
          {narrow && AREAS.map((a) => (
            <div key={a.key} className="area">
              <p className="area-label">{a.label}</p>
              <BalancedChips items={spotChips.filter((c) => c.area === a.key)} desktop={5} mobile={3} label={`${a.label} 명소`} />
            </div>
          ))}
          {spot && <p className="around"><b>{spot.name}</b> 주변 {radius}km</p>}

          <div className="filters">
            {categories.length > 0 && <BalancedChips items={catChips} desktop={4} mobile={3} label="용도 선택" />}
          </div>

          {state.loading && <p className="muted center">주변 장소를 불러오는 중…</p>}
          {state.error && <p className="notice">{state.error}</p>}
          {state.data?.disabled && <p className="notice">{state.data.disabled}</p>}
          {!state.loading && !state.error && !state.data?.disabled && all.length === 0 && (
            <p className="muted center">반경 {radius}km 안에 표시할 장소가 없어요.</p>
          )}

          {groups.map((g) => {
            const k = kind(g.label)
            const n = shown[g.label] ?? PAGE
            const visible = g.items.slice(0, n)
            return (
              <section key={g.label} className="kind" style={{ '--c': k.c }}>
                <header className="kind-head" data-reveal>
                  <i className="mark-dot big">{k.mark}</i>
                  <div><h2>{g.label}</h2><p>{k.sub}</p></div>
                  <span className="count">{g.count}곳{g.count > g.items.length && ` · 가까운 ${g.items.length}곳 표시`}</span>
                </header>
                <div className="places">{visible.map((p) => <Place key={p.id} p={p} spotId={spotId} tagFreq={tagFreq} />)}</div>
                {g.items.length > n && (
                  <button className="more" onClick={() => setShown((s) => ({ ...s, [g.label]: n + PAGE }))}>{g.label} 더 보기</button>
                )}
              </section>
            )
          })}
          {all.length > 0 && <p className="muted credit">출처: 제주관광공사 비짓제주 관광정보 Open API · 지도 경계: 통계청 행정구역(단순화)</p>}
        </div>
      </section>
    </>
  )
}

const TAG_MAX = 4 // 태그는 가장 많이 쓰인 4개만 (한 줄에 안 들어가면 3개)

// 음식점 등은 태그가 전각 쉼표(，)로 이어진 문자열 하나로 와서 나눠 줌. 모든 장소에 붙는 출처 표시(visitjeju·비짓제주)는 정보가 없어서 뺌
const SOURCE_TAGS = new Set(['visitjeju', '비짓제주'])
// 가게 이름과 같은 태그(띄어쓰기만 다른 것 포함)도 제목과 겹쳐서 뺌
const noSpace = (s) => String(s ?? '').replace(/\s/g, '')
const tagsOf = (p) => [...new Set((p.tags ?? []).flatMap((t) => String(t).split(/[,，、]/)).map((t) => t.replace(/^#/, '').trim()).filter((t) => t && !SOURCE_TAGS.has(t.toLowerCase()) && noSpace(t) !== noSpace(p.title)))]

// 많이 쓰인 순서의 태그 한 줄(줄바꿈 없음). 4개가 한 줄에 다 안 들어가면 마지막 하나를 빼서 3개만 보여줌
// (줄이 꺾이는지가 아니라 넘치는지를 재기 때문에, 숨기거나 보여도 줄 높이가 변하지 않아 결과가 흔들리지 않음)
function Tags({ tags }) {
  const ref = useRef(null)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const fit = () => {
      const kids = [...el.children]
      kids.forEach((k) => { k.hidden = false })
      let n = kids.length
      while (n > 1 && el.scrollWidth > el.clientWidth + 1) kids[--n].hidden = true
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    document.fonts?.ready.then(fit) // 글꼴이 늦게 불러와져 폭이 바뀐 경우에도 다시 확인
    return () => ro.disconnect()
  }, [tags])
  return <p className="tags" ref={ref}>{tags.map((t) => <span key={t}>#{t}</span>)}</p>
}

function Place({ p, spotId, tagFreq }) {
  const k = kind(p.category)
  const tags = useMemo(() => tagsOf(p).sort((a, b) => (tagFreq.get(b) ?? 0) - (tagFreq.get(a) ?? 0)).slice(0, TAG_MAX), [p, tagFreq])
  const saved = useAppStore((s) => s.placeFavs.some((f) => f.place_id === p.id && f.spot_id === spotId))
  const togglePlace = useAppStore((s) => s.togglePlace)
  return (
    <article className="place" style={{ '--c': k.c }} data-reveal>
      <div className="place-img" style={p.thumb ? { backgroundImage: `url(${p.thumb})` } : undefined}>
        {!p.thumb && <b>{k.mark}</b>}
        <span className="place-kind"><i>{k.mark}</i>{p.category}</span>
        <span className="dist">{p.distanceKm}km</span>
        <button className={`place-fav${saved ? ' on' : ''}`} onClick={() => togglePlace(p, spotId)} aria-label={saved ? '저장 해제' : '저장'} aria-pressed={saved}><HeartIcon filled={saved} /></button>
      </div>
      <div className="place-body">
        <h3>{p.title}</h3>
        {p.address && <p className="addr">{p.address}</p>}
        {p.intro && <p className="intro">{p.intro}</p>}
        {tags.length > 0 && <Tags tags={tags} />}
        <div className="place-act">
          <a href={`https://map.naver.com/p/search/${encodeURIComponent(p.title)}`} target="_blank" rel="noreferrer">지도에서 보기</a>
          {/[0-9]{3}/.test(p.phone) && <a href={`tel:${p.phone}`}>{p.phone}</a>}
        </div>
      </div>
    </article>
  )
}
