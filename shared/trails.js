// 한라산 탐방로 (한라산 등반 날씨 판정기)
// 좌표 출처: 어리목·영실·관음사·백록담은 비짓제주(공식 관광 데이터), 성판악 입구는 OpenStreetMap.
//  고도(elev, m)와 거리·시간은 널리 알려진 어림값이에요. 고도는 get_elevation(Open-Meteo 지형모델)으로 따로 확인해서 화면에 같이 보여줍니다.
//  윗세오름은 믿을 만한 좌표를 못 구해서, 날씨는 정상부 격자 좌표에 '고도 1700m'를 지정해서 봅니다(approx).
//  돈내코 코스는 탐방로 입구 좌표를 확인하지 못해서 아직 넣지 않았어요.
const SUMMIT = { name: '백록담 정상', lat: 33.3623, lng: 126.5333, elev: 1947, summit: true }
const UPPER = { name: '윗세오름 대피소', lat: 33.3623, lng: 126.5333, elev: 1700, approx: true }

// 거리·소요시간은 공식 자료로 아직 확인하지 못했어요(언론·블로그 수치가 서로 달라요).
// 확인 전에는 화면에 표시하지 않고, 계획 계산에만 어림값으로 씁니다. 확인되면 true 로 바꾸세요.
export const ROUTE_STATS_VERIFIED = false

export const TRAILS = [
  {
    id: 'seongpanak', name: '성판악 코스', level: '어려움',
    start: { name: '성판악 탐방로 입구', lat: 33.3851, lng: 126.6204, elev: 750 },
    goal: SUMMIT, km: 9.6, upH: 4.5, downH: 3.5,
    note: '백록담 정상까지 오를 수 있는 가장 긴 코스예요. 오르막이 길고 완만해요.',
  },
  {
    id: 'gwaneumsa', name: '관음사 코스', level: '매우 어려움',
    start: { name: '관음사 탐방로 입구', lat: 33.4216, lng: 126.5503, elev: 620 },
    goal: SUMMIT, km: 8.7, upH: 5, downH: 4,
    note: '백록담 정상까지 오를 수 있고, 성판악보다 짧지만 훨씬 가팔라요.',
  },
  {
    id: 'eorimok', name: '어리목 코스', level: '보통',
    start: { name: '어리목 탐방안내소', lat: 33.39223, lng: 126.49457, elev: 970 },
    goal: UPPER, km: 4.7, upH: 2.5, downH: 2,
    note: '윗세오름 대피소까지 가는 코스예요. 정상(백록담)까지는 갈 수 없어요.',
  },
  {
    id: 'yeongsil', name: '영실 코스', level: '보통',
    start: { name: '영실 탐방안내소', lat: 33.3402, lng: 126.4792, elev: 1020 },
    goal: UPPER, km: 5.8, upH: 3, downH: 2.5,
    note: '윗세오름 대피소까지 가는 코스예요. 병풍바위와 선작지왓 풍경이 유명해요. 정상(백록담)까지는 갈 수 없어요.',
  },
]

export const trailById = (id) => TRAILS.find((t) => t.id === id)
