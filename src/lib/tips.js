import { addDays, todayKst } from '../../shared/date'
import { hm as hmOf } from '../../shared/date'
import { weatherAt } from './solar'

// 실제 날씨 데이터(구름·강수·바람)로 한 줄 촬영 팁과 AI 가이드 첫인사를 만든다
const josa = (name, a, b) => { const c = name.charCodeAt(name.length - 1) - 0xac00; return c >= 0 && c <= 11171 && c % 28 !== 0 ? a : b }

export function dayLabel(date) {
  const t = todayKst()
  return date === t ? '오늘' : date === addDays(t, 1) ? '내일' : date === addDays(t, -1) ? '어제' : `${Number(date.slice(5, 7))}월 ${Number(date.slice(8))}일`
}

// 선택한 명소의 일출/일몰(추천 쪽) 시각 기준 날씨 요약. 데이터가 없으면 null
export function eventWeather({ spot, sun, weather }) {
  if (!spot || !sun || !weather) return null
  const ev = spot.best
  const min = ev === 'sunrise' ? sun.sunriseMin : sun.sunsetMin
  const now = weatherAt(weather, min)
  if (!now || now.total == null) return null
  const kma = weather.hours?.[Math.min(23, Math.round(min / 60))]?.kma
  const rain = !!kma && ((kma.ptyLabel && kma.ptyLabel !== '없음') || (kma.pop ?? 0) >= 60)
  return { evKo: ev === 'sunrise' ? '일출' : '일몰', cloud: Math.round(now.total), wind: now.wind, rain, time: hmOf(min) }
}

// 사진 지수 카드의 '오늘의 촬영 팁': 구름량만으로 결과를 단정하지 않고 가능한 상황을 조심스럽게 안내
const minusMin = (hmStr, n) => { const [h, m] = hmStr.split(':').map(Number); const t = (h * 60 + m - n + 1440) % 1440; return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}` }
export function shootingTip(w) {
  if (!w) return null
  const { evKo, cloud: c, wind, rain, time } = w
  const start = time ? `${evKo === '일출' ? '해 뜨기' : '해 지기'} 20분 전(${minusMin(time, 20)})부터` : `${evKo === '일출' ? '해 뜨기' : '해 지기'} 20분 전부터`
  let tip
  if (rain) tip = `비나 눈 예보가 있어 촬영이 어려울 수 있어요. 하늘이 갠 다른 날도 함께 살펴보세요.`
  else if (c < 10) tip = `구름이 ${c}%로 예보돼요. 하늘이 맑아 해가 또렷하게 보일 가능성이 있지만 색은 단조로울 수 있어요. 바다와 실루엣을 함께 담아 보세요.`
  else if (c < 25) tip = `구름이 ${c}%로 예보돼요. 구름 가장자리에 ${evKo === '일출' ? '여명' : '노을'} 색이 번질 가능성이 있으니, ${start} 촬영을 시작해 보세요.`
  else if (c < 60) tip = `구름이 ${c}%로 예보돼요. 구름 사이로 빛줄기가 보일 수 있어요. ${start} 시작하고 노출을 조금 낮추면 하늘 색이 더 진하게 담겨요.`
  else if (c < 85) tip = `구름이 ${c}%로 많은 편이에요. 구름 틈이 열리는 순간이 있을 수 있으니, ${start} 자리를 잡고 기다려 보세요.`
  else tip = `구름이 ${c}%로 하늘이 대부분 덮일 것 같아요. 해는 보기 어려울 수 있지만 부드러운 흐린 빛은 풍경 사진에 어울려요.`
  if (!rain && wind >= 9) tip += ` 바람이 ${Math.round(wind)}m/s로 센 편이니 삼각대를 단단히 고정하세요.`
  return tip
}

// 한국 시간 기준 지금이 하루 중 몇 분인지 (컴퓨터 시간대와 상관없이)
export function kstNowMin(now = new Date()) {
  const [h, m] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Seoul', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(now).split(':').map(Number)
  return h * 60 + m
}
const kstDate = (d = new Date()) => new Date(d.getTime() + 9 * 3600e3).toISOString().slice(0, 10)
const minOfHm = (s) => { const [h, m] = s.split(':').map(Number); return h * 60 + m }

// 지금 시각에 맞는 예시 질문 3개. 평균 일출 07:00·일몰 18:00 (오늘 sun 데이터가 있으면 그 값)
const Q = {
  riseToday: '오늘 일출은 어디서 보는 게 좋아?', setToday: '오늘 일몰 사진 찍기 가장 좋은 명소는?',
  riseTomorrow: '내일 일출은 어디서 보는 게 좋아?', setTomorrow: '내일 일몰 사진 찍기 가장 좋은 명소는?',
  weekend: '이번 주말 일몰 구름 비교해 줘',
}
export function exampleQuestions({ sun, now = new Date() } = {}) {
  const todaySun = sun?.date === kstDate(now) ? sun : null
  const rise = todaySun?.sunriseMin ?? 7 * 60, set = todaySun?.sunsetMin ?? 18 * 60
  const m = kstNowMin(now)
  if (m < rise) return [Q.riseToday, Q.setToday, Q.weekend]            // 해 뜨기 전: 오늘 일출·일몰
  if (m < set) return [Q.setToday, Q.riseTomorrow, Q.weekend]          // 낮: 오늘 일몰, 내일 일출
  return [Q.riseTomorrow, Q.setTomorrow, Q.weekend]                    // 해 진 뒤: 내일 일출·일몰
}

// AI 가이드 첫인사 (두 줄). 데이터가 확인된 값만 보여 주고, 없으면 일반 인사
export function greeting({ spot, date, w, name, now = new Date() }) {
  const hi = name ? `${name}님, 안녕하세요!` : '안녕하세요!'
  if (!spot || !w) return [`${hi} 제주의 일출·일몰 명소를 실제 날씨로 비교해 드려요.`, '궁금한 날짜나 명소를 물어보세요.']
  // 오늘 날짜인데 그 일출·일몰이 이미 지났다면 "함께 살펴볼게요"가 어색하니 지났다고 알려 줌
  if (date === kstDate(now) && kstNowMin(now) > minOfHm(w.time) + 30)
    return [`${hi} ${spot.name}의 오늘 ${w.evKo}(${w.time})은 이미 지났어요.`, '내일이나 이번 주말의 일출·일몰을 물어보세요.']
  return [`${hi} 지금 선택한 ${spot.name}의 ${dayLabel(date)} ${w.evKo}을 함께 살펴볼게요.`, `${dayLabel(date)} ${w.evKo} ${w.time} · 예상 구름량 ${w.cloud}%`]
}
