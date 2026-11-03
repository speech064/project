import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { getSpot, readySpots } from '../../shared/spots'
import { todayKst } from '../../shared/date'
import { askAgent, fetchSun, fetchTour, fetchWeather } from '../api/client'
import { supabase } from '../lib/supabase'

// 이메일 없는 가입: 아이디 뒤에 가짜 도메인을 붙여 Supabase Auth 의 이메일 자리에 넣음 (Confirm email 은 꺼 둔 상태)
const FAKE_DOMAIN = '@jeju-light.local'
const toEmail = (username) => `${username.trim().toLowerCase()}${FAKE_DOMAIN}`
const ID_RE = /^[A-Za-z0-9]{3,20}$/
const needSql = (m) => (/user_id|display_name/i.test(m) ? '로그인 저장 열이 없어요. supabase/schema.sql 아래쪽 "로그인" 부분을 SQL Editor 에서 실행해 주세요' : m)
const userOf = (session) => {
  const u = session?.user
  if (!u) return null
  const meta = u.user_metadata ?? {}
  const username = meta.username ?? u.email?.replace(FAKE_DOMAIN, '') ?? ''
  return { id: u.id, username, displayName: meta.display_name || username }
}

let loadSeq = 0 // 빠르게 명소·날짜를 바꿀 때 오래된 응답이 덮어쓰지 않도록

// 앱 전체가 함께 쓰는 상태
//  · 장면(3D)·정보 패널이 같이 보는 값: spotId / date / minutes / sun / weather
//  · 즐겨찾기·대화 기록은 Supabase 에 저장
export const useAppStore = create(
  persist(
    (set, get) => ({
      // ── 로그인 (Supabase Auth) ──
      user: null, // { id, username, displayName } | null
      authReady: false,
      initAuth: async () => {
        if (!supabase) return set({ authReady: true })
        const { data } = await supabase.auth.getSession()
        set({ user: userOf(data.session), authReady: true })
        supabase.auth.onAuthStateChange((_event, session) => {
          const next = userOf(session)
          if (next?.id === get().user?.id) return
          set({ user: next, favorites: [], placeFavs: [], chatLogs: [], messages: next ? get().messages : [] })
          get().loadFavorites(); get().loadPlaceFavs(); get().loadChatLogs()
        })
        if (get().user) { get().loadFavorites(); get().loadPlaceFavs(); get().loadChatLogs() }
      },
      // 성공하면 null, 실패하면 보여줄 한국어 오류 문장을 돌려줌
      signUp: async (username, password, displayName) => {
        if (!supabase) return 'Supabase 설정(.env)이 필요해요'
        const id = username.trim(), name = displayName.trim()
        if (!ID_RE.test(id)) return '아이디는 영문·숫자 3~20자로 입력해 주세요'
        if (password.length < 6) return '비밀번호는 6자리 이상 입력해 주세요'
        if (!name) return '이름을 입력해 주세요'
        const { data, error } = await supabase.auth.signUp({ email: toEmail(id), password, options: { data: { username: id, display_name: name } } })
        if (error) {
          if (/already|registered|exists/i.test(error.message)) return '이미 누군가 사용 중인 아이디예요'
          if (/password/i.test(error.message)) return '비밀번호는 6자리 이상 입력해 주세요'
          return `가입하지 못했어요: ${error.message}`
        }
        if (!data.session) return '가입은 됐지만 바로 로그인되지 않았어요. Supabase 의 Confirm email 이 꺼져 있는지 확인해 주세요'
        get().toast(`${name}님 환영합니다!`)
        return null
      },
      signIn: async (username, password) => {
        if (!supabase) return 'Supabase 설정(.env)이 필요해요'
        const id = username.trim()
        if (!id) return '아이디를 입력해 주세요'
        if (!password) return '비밀번호를 입력해 주세요'
        const { data, error } = await supabase.auth.signInWithPassword({ email: toEmail(id), password })
        if (error) return /invalid|credentials/i.test(error.message) ? '아이디 또는 비밀번호가 맞지 않아요' : `로그인하지 못했어요: ${error.message}`
        get().toast(`${userOf(data.session)?.displayName ?? id}님 환영합니다!`)
        return null
      },
      signOut: async () => { await supabase?.auth.signOut(); get().toast('로그아웃했어요') },
      // 지금 저장 대상: 로그인했으면 내 계정(user_id), 아니면 예전처럼 닉네임
      ownerCols: () => {
        const { user, nickname } = get()
        return user ? { user_id: user.id, nickname: user.username, display_name: user.displayName } : { nickname: nickname || '익명' }
      },
      ownerFilter: (q) => {
        const { user, nickname } = get()
        return user ? q.eq('user_id', user.id) : q.eq('nickname', nickname || '익명') // 로그인 전: 예전처럼 닉네임으로 (로그인 계정의 행은 RLS 가 숨김)
      },

      // 날씨 미리보기(테스트용): null 이면 실제 날씨, 아니면 'clear' | 'cloudy' | 'fog' | 'rain' | 'snow'
      wxPreview: null,
      setWxPreview: (wxPreview) => set({ wxPreview }),
      // AI 가이드에서 주변 탐색으로 넘어갈 때 전할 명소와 분류 (주변 탐색 화면이 한 번 읽고 지움)
      nearbyHint: null,
      setNearbyHint: (nearbyHint) => set({ nearbyHint }),

      nickname: '',
      setNickname: (nickname) => { set({ nickname: nickname.trim() }); get().loadFavorites(); get().loadPlaceFavs(); get().loadChatLogs() },

      toasts: [],
      toast: (message, variant = 'ok') => {
        const id = Date.now() + Math.random()
        set({ toasts: [...get().toasts, { id, message, variant }] })
        setTimeout(() => set({ toasts: get().toasts.filter((t) => t.id !== id) }), 3200)
      },

      // ── 장면·데이터 ───────────────────────────────
      spotId: readySpots[0]?.id ?? null,
      date: todayKst(),
      minutes: new Date().getHours() * 60 + new Date().getMinutes(), // 하루 중 분 — 컴퓨터 현재 시각에서 시작해 명소를 바꿔도 그대로 이어짐
      sun: null,
      weather: null,
      sunErr: null,
      weatherErr: null,
      dataLoading: false,
      sunLoading: false,
      weatherLoading: false,
      images: {},

      setMinutes: (minutes) => set({ minutes }),
      selectSpot: (spotId) => { set({ spotId }); get().loadData() }, // 시각은 건드리지 않음
      setDate: (date) => { set({ date }); get().loadData() },
      // 에이전트가 추천한 명소·날짜·이벤트로 장면을 옮김
      focus: ({ spotId, date, event }) => { set({ spotId, date }); return get().loadData({ jump: event }) },

      // 해(일출·일몰)와 날씨를 따로 받아서, 먼저 온 쪽부터 화면에 보여줘요 (한쪽이 느리거나 실패해도 다른 쪽은 바로 보임).
      // 서로 다른 명소·날짜 요청이 겹치면 가장 마지막 요청만 반영합니다 (loadSeq).
      loadData: async ({ jump } = {}) => {
        const spot = getSpot(get().spotId)
        if (!spot) return
        const seq = ++loadSeq
        const { date } = get()
        set({ dataLoading: true, sunLoading: true, weatherLoading: true, sunErr: null, weatherErr: null })
        const done = (patch) => { // 마지막 요청일 때만 반영하고, 둘 다 끝나면 dataLoading 을 끔
          if (seq !== loadSeq) return false
          const s = { ...patch }
          const sunLoading = 'sunLoading' in s ? s.sunLoading : get().sunLoading
          const weatherLoading = 'weatherLoading' in s ? s.weatherLoading : get().weatherLoading
          set({ ...s, dataLoading: sunLoading || weatherLoading })
          return true
        }
        const pSun = fetchSun(spot, date).then(
          (v) => { done({ sun: v, sunErr: null, sunLoading: false }); return v },
          (e) => { done({ sun: null, sunErr: e.message, sunLoading: false }); return null },
        )
        const pWeather = fetchWeather(spot, date).then(
          (v) => done({ weather: v, weatherErr: null, weatherLoading: false }),
          (e) => done({ weather: null, weatherErr: e.message, weatherLoading: false }),
        )
        const [sun] = await Promise.all([pSun, pWeather])
        if (seq !== loadSeq) return
        if (jump && sun) { // 해가 수평선 근처인 시각(일출 +5분 / 일몰 -10분)으로 이동
          const ev = jump === true ? spot.best : jump
          set({ minutes: ev === 'sunrise' ? sun.sunriseMin + 5 : sun.sunsetMin - 10 })
        }
      },

      // 명소 카드 사진(한국관광공사 TourAPI). 키가 없거나 실패하면 조용히 기본 배경 사용
      loadImages: async () => {
        await Promise.all(readySpots.filter((s) => !s.photo).map(async (s) => {
          try {
            const { items } = await fetchTour(s.tourKeyword)
            const image = items.find((i) => i.image)?.image
            if (image) set({ images: { ...get().images, [s.id]: image } })
          } catch { /* 사진 없이 진행 */ }
        }))
      },

      // ── 즐겨찾기 (Supabase) ────────────────────────
      favorites: [],
      loadFavorites: async () => {
        if (!supabase) return
        const { data, error } = await get().ownerFilter(supabase.from('favorites').select('*')).order('created_at', { ascending: false })
        if (error) return get().toast(`즐겨찾기 불러오기 실패: ${error.message}`, 'bad')
        set({ favorites: data })
      },
      toggleFavorite: async (spotId) => {
        if (!supabase) return get().toast('Supabase 설정(.env)이 필요해요', 'warn')
        const existing = get().favorites.find((f) => f.spot_id === spotId)
        if (existing) {
          const { error } = await supabase.from('favorites').delete().eq('id', existing.id)
          if (error) return get().toast(error.message, 'bad')
          set({ favorites: get().favorites.filter((f) => f.id !== existing.id) })
        } else {
          const { data, error } = await supabase.from('favorites').insert({ ...get().ownerCols(), spot_id: spotId }).select().single()
          if (error) return get().toast(needSql(error.message), 'bad')
          set({ favorites: [data, ...get().favorites] })
          get().toast('즐겨찾기에 저장했어요')
        }
      },

      // ── 주변 장소 즐겨찾기 (Supabase favorite_places) ─────
      placeFavs: [],
      loadPlaceFavs: async () => {
        if (!supabase) return
        const { data, error } = await get().ownerFilter(supabase.from('favorite_places').select('*')).order('created_at', { ascending: false })
        if (error) return get().notePlaceTable(error)
        set({ placeFavs: data })
      },
      // 테이블을 아직 안 만들었을 때 한 번만 안내 (그 외 오류는 그대로 보여줌)
      notePlaceTable: (error) => {
        if (/user_id|display_name/i.test(error.message)) return get().toast(needSql(error.message), 'warn')
        const missing = /favorite_places|schema cache|does not exist/i.test(error.message)
        get().toast(missing ? '주변 장소 저장 테이블이 없어요. supabase/schema.sql 의 favorite_places 를 SQL Editor 에서 실행해 주세요' : error.message, missing ? 'warn' : 'bad')
      },
      togglePlace: async (p, spotId) => {
        if (!supabase) return get().toast('Supabase 설정(.env)이 필요해요', 'warn')
        const existing = get().placeFavs.find((f) => f.place_id === p.id && f.spot_id === spotId)
        if (existing) {
          const { error } = await supabase.from('favorite_places').delete().eq('id', existing.id)
          if (error) return get().notePlaceTable(error)
          return set({ placeFavs: get().placeFavs.filter((f) => f.id !== existing.id) })
        }
        const row = {
          ...get().ownerCols(), spot_id: spotId, place_id: p.id, title: p.title, category: p.category,
          thumb: p.thumb || p.image || null, address: p.address || null, distance_km: p.distanceKm, lat: p.lat, lng: p.lng,
        }
        const { data, error } = await supabase.from('favorite_places').insert(row).select().single()
        if (error) return get().notePlaceTable(error)
        set({ placeFavs: [data, ...get().placeFavs] })
        get().toast('즐겨찾기에 추가했어요')
      },

      // ── AI 에이전트 대화 (+ Supabase 에 기록) ──────
      messages: [],
      chatLoading: false,
      chatLogs: [],
      sendMessage: async (text) => {
        const msgs = get().messages
        // 서버에는 오류 말풍선과 그 질문을 빼고 보냄 (user/assistant 가 번갈아 가야 함)
        const history = msgs
          .filter((m, i) => !m.error && !msgs[i + 1]?.error)
          .map((m) => ({ role: m.role, content: m.text }))
        set({ messages: [...msgs, { role: 'user', text }], chatLoading: true })
        try {
          const r = await askAgent(text, history)
          set({ messages: [...get().messages, { role: 'assistant', text: r.answer, steps: r.steps, focus: r.focus, hallasan: r.hallasan, nearby: r.nearby }] })
          if (r.focus) {
            await get().focus(r.focus)
            const name = getSpot(r.focus.spotId)?.name
            get().toast(`3D 장면을 ${name} · ${r.focus.event === 'sunrise' ? '일출' : '일몰'}로 옮겼어요`)
          }
          get().saveChatLog(text, r)
        } catch (e) {
          set({ messages: [...get().messages, { role: 'assistant', text: e.message, steps: [], error: true }] })
        } finally {
          set({ chatLoading: false })
        }
      },
      saveChatLog: async (question, r) => {
        if (!supabase) return
        const tools = (r.steps ?? []).map((s) => ({ tool: s.tool, ok: s.ok }))
        const { error } = await supabase.from('chat_logs').insert({ ...get().ownerCols(), question, answer: r.answer, tools })
        if (error) get().toast(`대화 저장 실패: ${needSql(error.message)}`, 'bad')
      },
      loadChatLogs: async () => {
        if (!supabase) return
        const { data, error } = await get().ownerFilter(supabase.from('chat_logs').select('*')).order('created_at', { ascending: false }).limit(20)
        if (!error) set({ chatLogs: data })
      },
    }),
    {
      name: 'golden-hour-store',
      // 닉네임·고른 명소를 기억 → 새로고침하거나 다시 열어도 고른 명소(예: 차귀도) 주변이 바로 보임. 로그인은 Supabase 세션이 따로 기억
      partialize: (s) => ({ nickname: s.nickname, spotId: s.spotId }),
      merge: (saved, current) => ({ ...current, ...saved, spotId: getSpot(saved?.spotId) ? saved.spotId : current.spotId }),
    },
  ),
)
