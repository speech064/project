// 일출·일몰 사진 명소 목록 (화면과 서버 도구가 함께 씁니다)
// lat / lng 가 null 이면 아직 좌표가 확정되지 않은 곳이라 화면·에이전트에서 제외됩니다.
// 좌표를 채우면 자동으로 나타납니다. verified: true = 출처 확인됨
//  · 차귀도: Open-Meteo 지오코딩  · 나머지: 제주관광공사 비짓제주 '관광지' 등록 좌표 (scripts/find-coords.mjs)
//   best     : 어느 쪽이 더 좋은 명소인지 'sunrise' | 'sunset'
//   shape    : 3D 실루엣 종류 (src/three/silhouettes.js)
//   tint     : 사진이 없을 때 카드 배경 그라데이션
//   photo    : 눈으로 확인해 고른 대표 사진 (풍경 위주, 사람·건물·배 같은 장애물이 적은 것)
export const SPOTS = [
  { id: 'seongsan', name: '성산일출봉', en: 'Seongsan Ilchulbong', best: 'sunrise', lat: 33.462147, lng: 126.936424, verified: true,
    shape: 'crown', tourKeyword: '성산일출봉', photo: 'https://api.cdn.visitjeju.net/photomng/imgpath/202409/20/b2087c57-7cb6-420d-a840-c6e7e581072e.webp', photoBy: '제주관광공사 비짓제주',
    tint: ['#f6b27a', '#7a5b8a'],
    blurb: '분화구 왕관 위로|떠오르는 제주 대표 일출' },
  { id: 'seopji', name: '섭지코지', en: 'Seopjikoji', best: 'sunrise', lat: 33.4236948, lng: 126.9296022, verified: true,
    shape: 'cape', tourKeyword: '섭지코지', photo: 'https://api.cdn.visitjeju.net/photomng/imgpath/202408/16/6efa0dd8-7e17-47b9-8265-caf514b7ccef.webp', photoBy: '제주관광공사 비짓제주',
    tint: ['#f4c48a', '#5f7f93'],
    blurb: '등대와 초원이|이어지는 동쪽 곶' },
  { id: 'hamdeok', name: '함덕해수욕장', en: 'Hamdeok Beach', best: 'sunrise', lat: 33.5427261, lng: 126.6690893, verified: true,
    shape: 'beach', tourKeyword: '함덕해수욕장', photo: 'https://tong.visitkorea.or.kr/cms/resource/00/3354600_image2_1.jpg', photoBy: '한국관광공사',
    tint: ['#9fd6cf', '#f1c9a3'],
    blurb: '에메랄드빛 얕은 바다와|한라산 능선' },
  { id: 'suwol', name: '수월봉', en: 'Suwolbong', best: 'sunset', lat: 33.294754, lng: 126.16345, verified: true,
    shape: 'cliff', tourKeyword: '수월봉', photo: 'https://api.cdn.visitjeju.net/photomng/imgpath/202205/02/0879b989-7adf-44ce-b110-1cb4d96ec6ee.webp', photoBy: '제주관광공사 비짓제주',
    tint: ['#ef8a5a', '#43406e'],
    blurb: '화산재 절벽 너머로|지는 서쪽 노을' },
  { id: 'hyeopjae', name: '협재해수욕장', en: 'Hyeopjae Beach', best: 'sunset', lat: 33.3924809, lng: 126.2389861, verified: true,
    shape: 'beach', tourKeyword: '협재해수욕장', photo: 'https://tong.visitkorea.or.kr/cms/resource/69/4107969_image2_1.JPG', photoBy: '한국관광공사',
    tint: ['#7fd0d4', '#f08f6a'],
    blurb: '비양도 위로|번지는 황금빛 저녁' },
  { id: 'chagwi', name: '차귀도', en: 'Chagwido', best: 'sunset', lat: 33.3115, lng: 126.14888, verified: true,
    shape: 'island', tourKeyword: '차귀도', photo: 'https://api.cdn.visitjeju.net/photomng/imgpath/202111/02/3a0bec1b-9fb0-401f-94e8-6be5dab724a0.webp', photoBy: '제주관광공사 비짓제주',
    tint: ['#ff9a5a', '#3a3568'],
    blurb: '바다 위 외딴 섬 곁으로|지는 해' },
  { id: 'yongmeori', name: '용머리해안', en: 'Yongmeori Coast', best: 'sunset', lat: 33.2334272, lng: 126.313741, verified: true,
    shape: 'cliff', tourKeyword: '용머리해안', photo: 'https://api.cdn.visitjeju.net/photomng/imgpath/202409/25/4297007f-2918-4bb5-bc75-066410fa520e.webp', photoBy: '제주관광공사 비짓제주',
    tint: ['#e8a06a', '#4a5f7a'],
    blurb: '용이 바다로 들어가는|모양의 해안 절벽' },
  { id: 'sinchang', name: '신창풍차해안', en: 'Sinchang Windmill Coast', best: 'sunset', lat: 33.3430267, lng: 126.17217, verified: true,
    shape: 'cape', tourKeyword: '신창풍차해안', photo: 'https://api.cdn.visitjeju.net/photomng/imgpath/201804/30/16e93d32-005e-48c0-a4f0-896c16e2c9e6.webp', photoBy: '제주관광공사 비짓제주',
    tint: ['#f2a86a', '#54607f'],
    blurb: '풍력발전기 사이로|지는 해안도로 노을' },
  { id: 'saryeoni', name: '사려니숲길 입구', en: 'Saryeoni Forest Gate', best: 'sunrise', lat: 33.4180631, lng: 126.6534847, verified: true,
    shape: 'forest', tourKeyword: '사려니숲길', photo: 'https://api.cdn.visitjeju.net/photomng/imgpath/201908/19/4a7384f3-3ea5-4b56-a519-20cd569686b1.webp', photoBy: '제주관광공사 비짓제주',
    tint: ['#a9c79a', '#e9d3a0'],
    blurb: '삼나무 사이로|스며드는 아침 빛' },
]

// 일출/일몰 명소 표기: 카드 배지·필터·정보 사진에서 같이 씀 (색으로 한눈에 구분)
export const BEST = {
  sunrise: { emoji: '🌅', en: 'SUNRISE', ko: '일출', color: '#F0A81B' },
  sunset: { emoji: '🌇', en: 'SUNSET', ko: '일몰', color: '#6667AB' },
}

export const isReady = (s) => typeof s.lat === 'number' && typeof s.lng === 'number'
export const readySpots = SPOTS.filter(isReady)
export const getSpot = (id) => readySpots.find((s) => s.id === id)
