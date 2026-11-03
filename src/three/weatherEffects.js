import * as THREE from 'three'

// 실제 날씨를 3D 장면에 보여 주는 효과 (이미지 없이 Three.js 기본 도구만 씀)
//  · 흐림: 구름 색을 젖은 회색으로, 해빛을 줄임 (구름 양은 기존 구름 층이 맡음)
//  · 안개: 장면 안개 밀도를 높임 (안개 색은 지평선 하늘색과 맞춤)
//  · 비: 사선으로 떨어지는 빗줄기 (바람이 세면 더 기울어짐), 바다 물결도 조금 거칠어짐
//  · 눈: 부드러운 둥근 눈송이 (gl_PointCoord 로 원을 그림), 바람에 살랑임
//  세기는 목표값을 향해 천천히 바뀌어서 시간·명소를 바꿔도 뚝 끊기지 않음

// 날씨 종류: WMO 날씨 코드(예보 코드)가 있으면 그것으로, 없으면 강수량·가시거리·구름양으로 정함
export function weatherKind({ code, cloud, vis, precip, pop, temp } = {}) {
  if (code != null) {
    if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow'
    if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return 'rain'
    if (code === 45 || code === 48) return 'fog'
  }
  if (code == null && ((precip ?? 0) >= 0.2 || (pop ?? 0) >= 70)) return (temp ?? 10) <= 1 ? 'snow' : 'rain'
  if (vis != null && vis < 1000) return 'fog'
  if (cloud != null && cloud >= 70) return 'cloudy'
  return 'clear'
}

const rnd = (a, b) => a + Math.random() * (b - a)

const SNOW_VERT = `
uniform float uSize;
uniform float uPixel;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = uSize * uPixel / -mv.z;
  gl_Position = projectionMatrix * mv;
}`
const SNOW_FRAG = `
uniform vec3 uColor;
uniform float uOpacity;
void main() {
  float d = length(gl_PointCoord - vec2(0.5));
  float a = smoothstep(0.5, 0.15, d) * uOpacity;
  gl_FragColor = vec4(uColor, a);
}`

// zc: 날씨가 내리는 구간의 가운데 z (음수 = 바라보는 쪽 앞). fog: 장면 안개를 이 효과가 맡을지
export function createWeatherFx(scene, { mobile = false, fog = false, zc = -24 } = {}) {
  const S = { rain: 0, snow: 0, fog: 0, overcast: 0, wind: 2, wave: 0.6 } // 0~1 세기 (목표값을 따라감)
  const group = new THREE.Group() // 바라보는 방향(yaw)에 맞춰 돌림
  scene.add(group)

  // ── 비 ──
  const RAIN = mobile ? 420 : 1000
  const drops = Array.from({ length: RAIN }, () => ({ x: rnd(-40, 40), y: rnd(-2, 26), z: zc + rnd(-22, 22), v: rnd(20, 28) }))
  const rainPos = new Float32Array(RAIN * 6)
  const rainGeo = new THREE.BufferGeometry()
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3))
  const rainMat = new THREE.LineBasicMaterial({ color: 0xc9dcff, transparent: true, opacity: 0, depthWrite: false, fog: false })
  const rainLines = new THREE.LineSegments(rainGeo, rainMat)
  rainLines.frustumCulled = false; rainLines.visible = false
  group.add(rainLines)

  // ── 눈 ──
  const SNOW = mobile ? 380 : 900
  const flakes = Array.from({ length: SNOW }, () => ({ x: rnd(-40, 40), y: rnd(-2, 26), z: zc + rnd(-22, 22), v: rnd(0.8, 1.6), ph: rnd(0, Math.PI * 2) }))
  const snowPos = new Float32Array(SNOW * 3)
  const snowGeo = new THREE.BufferGeometry()
  snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3))
  const snowMat = new THREE.ShaderMaterial({
    vertexShader: SNOW_VERT, fragmentShader: SNOW_FRAG, transparent: true, depthWrite: false,
    uniforms: { uSize: { value: 0.18 }, uPixel: { value: 900 }, uColor: { value: new THREE.Color(0xf4f8ff) }, uOpacity: { value: 0 } },
  })
  const snow = new THREE.Points(snowGeo, snowMat)
  snow.frustumCulled = false; snow.visible = false
  group.add(snow)

  // ── 안개 (장면 안개를 이 효과가 맡을 때만) ──
  const fogObj = fog ? new THREE.FogExp2(0x9fb0c0, 0) : null
  if (fogObj) scene.fog = fogObj

  return {
    // t: { kind, wind(m/s), wave(m) }, yaw: 바라보는 방향, horizon: 지평선 하늘색 [r,g,b] (안개 색에 씀)
    update(dt, time, t = {}, yaw = 0, horizon = null) {
      const kind = t.kind ?? 'clear'
      const k = 1 - Math.exp(-dt * 1.2)
      S.rain += ((kind === 'rain' ? 1 : 0) - S.rain) * k
      S.snow += ((kind === 'snow' ? 1 : 0) - S.snow) * k
      S.fog += ((kind === 'fog' ? 1 : 0) - S.fog) * k
      S.overcast += ((kind === 'clear' ? 0 : 1) - S.overcast) * k
      S.wind += ((t.wind ?? 2) - S.wind) * k
      S.wave += ((t.wave ?? 0.6) - S.wave) * k
      const wind = S.wind
      group.rotation.y = -yaw

      if (S.rain > 0.01) {
        rainLines.visible = true
        rainMat.opacity = S.rain * 0.42
        rainGeo.setDrawRange(0, Math.round(RAIN * S.rain) * 2)
        for (let i = 0; i < RAIN; i++) {
          const d = drops[i]
          d.y -= d.v * dt * (1 + wind * 0.02)
          d.x += wind * 0.4 * dt
          if (d.y < -2) { d.y = 26; d.x = rnd(-40, 40) }
          if (d.x > 40) d.x -= 80
          if (d.x < -40) d.x += 80
          const o = i * 6
          rainPos[o] = d.x; rainPos[o + 1] = d.y; rainPos[o + 2] = d.z
          rainPos[o + 3] = d.x - wind * 0.05; rainPos[o + 4] = d.y + 1.1; rainPos[o + 5] = d.z // 바람 방향으로 기울어진 빗줄기
        }
        rainGeo.attributes.position.needsUpdate = true
      } else rainLines.visible = false

      if (S.snow > 0.01) {
        snow.visible = true
        snowMat.uniforms.uOpacity.value = S.snow * 0.85
        snowGeo.setDrawRange(0, Math.round(SNOW * S.snow))
        for (let i = 0; i < SNOW; i++) {
          const f = flakes[i]
          f.y -= f.v * dt
          f.x += (Math.sin(time * 0.8 + f.ph) * 0.9 + wind * 0.35) * dt // 좌우로 살랑이며 바람에 밀림
          if (f.y < -2) { f.y = 26; f.x = rnd(-40, 40) }
          if (f.x > 40) f.x -= 80
          if (f.x < -40) f.x += 80
          snowPos[i * 3] = f.x; snowPos[i * 3 + 1] = f.y; snowPos[i * 3 + 2] = f.z
        }
        snowGeo.attributes.position.needsUpdate = true
      } else snow.visible = false

      if (fogObj) {
        if (horizon) fogObj.color.setRGB(horizon[0], horizon[1], horizon[2], THREE.SRGBColorSpace)
        fogObj.density = 0.0024 * S.fog + 0.0006 * (S.rain + S.snow)
      }
      return S
    },
    dispose() {
      scene.remove(group)
      rainGeo.dispose(); rainMat.dispose(); snowGeo.dispose(); snowMat.dispose()
      if (fogObj && scene.fog === fogObj) scene.fog = null
    },
  }
}
