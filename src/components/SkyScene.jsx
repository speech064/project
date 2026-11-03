import { useEffect, useRef, useState } from 'react'
import { createScene } from '../three/createScene'
import { dayOfYear } from '../../shared/date'
import { getSpot } from '../../shared/spots'
import { weatherAt } from '../lib/solar'
import { weatherKind } from '../three/weatherEffects'
import { useAppStore } from '../store/useAppStore'

// 화면 전체 뒤에 깔리는 3D 하늘·바다. 스토어 값이 바뀌면 장면 목표값만 갱신합니다 (React 리렌더 없음).
export default function SkyScene() {
  const ref = useRef(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    // 캔버스는 effect 마다 새로 만듭니다 (개발 모드의 이중 실행·정리 때 WebGL 컨텍스트를 재사용하면 실패)
    const canvas = document.createElement('canvas')
    canvas.className = 'sky'
    canvas.setAttribute('aria-hidden', 'true')
    ref.current.appendChild(canvas)
    const mobile = matchMedia('(max-width: 767px), (pointer: coarse)').matches
    let scene
    try { scene = createScene(canvas, { mobile }) }
    catch (e) { console.error('3D 장면을 만들지 못했어요:', e); canvas.remove(); setFailed(true); return } // WebGL 이 안 되면 CSS 그라데이션으로 대체

    const apply = (s) => {
      const spot = getSpot(s.spotId)
      if (!spot) return
      const w = weatherAt(s.weather, s.minutes)
      scene.setTarget({
        minutes: s.minutes, lat: spot.lat, doy: dayOfYear(s.date), shape: spot.shape, best: spot.best,
        sunriseAz: s.sun?.sunriseAzimuth, sunsetAz: s.sun?.sunsetAzimuth, // API 가 준 일출·일몰 방위각 (실루엣 위치)
        moonriseMin: s.sun?.moonriseMin ?? null, moonsetMin: s.sun?.moonsetMin ?? null,
        moonIllum: s.sun?.moonIllumination ?? null, moonWaxing: /Waxing|First/.test(s.sun?.moonPhase ?? ''),
        solarNoon: s.sun?.solarNoonMin ?? 750, sunriseMin: s.sun?.sunriseMin ?? 400, sunsetMin: s.sun?.sunsetMin ?? 1080,
        // 예보가 없는 날짜는 임의로 만들지 않고 "구름 적당·잔잔한 바다" 기본 연출만 씁니다
        total: w?.total ?? 25, low: w?.low ?? 8, mid: w?.mid ?? 12, high: w?.high ?? 12, wave: w?.wave ?? 0.6,
        // 실제 날씨(예보 코드·구름양)로 날씨 종류를 정하고, 테스트용 미리보기 토글이 켜져 있으면 그 값을 씀
        wx: { kind: s.wxPreview ?? weatherKind({ code: w?.code, cloud: w?.total }), wind: w?.wind ?? 2, wave: w?.wave ?? 0.6 },
      })
    }
    if (import.meta.env.DEV) window.__sky = scene // 개발 중 점검용
    apply(useAppStore.getState())
    const unsub = useAppStore.subscribe(apply)

    const resize = () => scene.resize(window.innerWidth, window.innerHeight)
    resize()
    window.addEventListener('resize', resize)

    const onMove = (e) => scene.setPointer((e.clientX / innerWidth) * 2 - 1, -((e.clientY / innerHeight) * 2 - 1))
    if (!mobile) window.addEventListener('pointermove', onMove)

    // 3D 가 완전히 가려질 만큼 스크롤했거나 탭이 숨겨지면 그리기를 멈춰 배터리·성능 절약
    const sync = () => scene.setPaused(document.hidden || window.scrollY > window.innerHeight * 1.6)
    window.addEventListener('scroll', sync, { passive: true })
    document.addEventListener('visibilitychange', sync)

    return () => {
      unsub()
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('scroll', sync)
      document.removeEventListener('visibilitychange', sync)
      scene.dispose()
      canvas.remove()
    }
  }, [])

  return <div ref={ref} className={failed ? 'sky sky--fallback' : undefined} aria-hidden="true" />
}
