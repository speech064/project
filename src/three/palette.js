// 태양 고도에 따른 하늘 색 — 일출(보라·분홍)과 일몰(주황·황금)을 따로 둡니다.
const D2R = Math.PI / 180
const hex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
export const lerp = (a, b, t) => a + (b - a) * t
export const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) }
const mix3 = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)]

//             -18        -8        -3        0         4         10        25        60   (고도, 도)
const EL = [-18, -8, -3, 0, 4, 10, 25, 60]
const K = {
  topMorning: [0x04061a, 0x161a45, 0x3b3b7d, 0x5a5a9e, 0x6f86c4, 0x5f95d6, 0x3f84d6, 0x2a72cf].map(hex),
  topEvening: [0x04061a, 0x1b1442, 0x3f2d6e, 0x57457f, 0x5f78b8, 0x5a8fd0, 0x3f84d6, 0x2a72cf].map(hex),
  horMorning: [0x0a1233, 0x3d2f6b, 0xb8628c, 0xff9873, 0xffc89a, 0xe9dcc6, 0xb9dcf3, 0x9fd0f2].map(hex),
  horEvening: [0x0a1233, 0x5a2f63, 0xd4546a, 0xff7a3c, 0xffb347, 0xf6dca8, 0xb9dcf3, 0x9fd0f2].map(hex),
  sun: [0xff6a2a, 0xff6a2a, 0xff6a2a, 0xff7f3a, 0xffb056, 0xffd9a0, 0xfff1d6, 0xfffaf0].map(hex),
}

function sample(arr, elDeg) {
  const e = clamp(elDeg, EL[0], EL.at(-1))
  let i = 0
  while (i < EL.length - 2 && e > EL[i + 1]) i++
  return mix3(arr[i], arr[i + 1], (e - EL[i]) / (EL[i + 1] - EL[i]))
}

// el: 태양 고도(라디안), morning: 남중 전이면 true, overcast: 0~1 (구름이 많을수록 회색빛)
export function skyColors(el, morning, overcast = 0) {
  const d = el / D2R
  let top = sample(morning ? K.topMorning : K.topEvening, d)
  let horizon = sample(morning ? K.horMorning : K.horEvening, d)
  const sun = sample(K.sun, d)
  const night = smoothstep(-4, -16, d)

  // 구름이 많으면 채도를 낮추되, 해가 수평선 가까울 때(일출·일몰)는 구름이 노을빛을 받아 물드니 덜 낮춤
  const oc = overcast * (0.35 + 0.65 * smoothstep(4, 24, d))
  if (oc > 0) {
    const g = (c) => { const l = c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11; return [l, l, l] }
    top = mix3(top, g(top), 0.5 * oc)
    horizon = mix3(horizon, g(horizon), 0.45 * oc)
  }
  return { top, horizon, sun, night }
}
