# GOLDEN HOUR — 제주 일출·일몰 사진 명소 가이드

제주의 일출·일몰 명소를 실제 날씨 데이터로 비교하고, 3D 하늘·바다로 보여주고, AI 에이전트가 가장 좋은 곳을 골라 주고, 주변 관광지까지 찾아 주는 웹앱.
Vite + React + Router + Zustand + three.js + Supabase, 서버 함수는 Vercel `api/`.

## 사이트 소개
**기획 의도:** 제주의 바다와 빛을 사진으로 남기고 싶은 사람에게, 오늘 어디서 언제 찍으면 좋은지 실제 날씨 데이터로 알려 주는 일출·일몰 가이드입니다.

| 탭 | 하는 일 |
|---|---|
| **홈** | 일출·일몰 명소 9곳을 구름양·풍속·비 가능성으로 비교합니다. 3D 하늘에서 해·달·별·구름이 시간에 따라 움직이고, 명소 카드를 누르면 그 자리의 일출·일몰 방향이 보입니다. |
| **AI 가이드** | 질문하면 Claude 에이전트가 일출·일몰 시각, 구름 예보, 한라산 등반 날씨 도구를 스스로 골라 호출해 답합니다. 화면에 "호출한 도구" 목록이 보이고, 답변 아래 버튼으로 빛 리포트나 한라산 리포트 창을 열 수 있습니다. |
| **주변 탐색** | 제주 지도에서 명소를 고르면 반경 3·5·10km 안의 관광지·음식점·행사를 보여 줍니다. |
| **즐겨찾기** | 명소와 주변 장소를 저장합니다. 로그인하면 내 계정에, 아니면 닉네임 기준으로 새로고침 후에도 남습니다. |
| **HALLA 1947** | 한라산 등반 날씨 판정기입니다. 성판악·관음사·어리목·영실 코스를 골라 정상부 날씨를 좋음·주의·위험으로 판정하고, 일출·일몰에 맞춘 출발·하산 시각을 계산합니다. |

**알아 두실 점**
- HALLA 1947 의 3D 한라산은 실제 지형(DEM)이 아니라 정해진 난수로 만든 **개념적 시각화**입니다. 등산로 선도 장식용이며 실제 경로가 아닙니다.
- 코스 거리·소요시간은 공식 자료로 확인하지 못해 화면에 표시하지 않습니다. 입산 통제와 탐방 예약은 한라산국립공원 공식 안내를 확인해 주세요.
- 날씨 판정은 예보를 바탕으로 한 참고 정보이며, 기준은 `shared/hallasan.js` 의 `RULES` 표에 적혀 있습니다.

## 사용한 API
| API | 용도 | 키 (환경변수) |
|---|---|---|
| sunrise-sunset.org v2 | 일출·일몰·골든아워·방위각 | 없음 |
| Open-Meteo 예보 · 바다 | 구름양(저/중/고층)·풍속·파도, 한라산 고도 지정 예보 | 없음 |
| 기상청 단기예보조회서비스 (공공데이터포털) | 공식 하늘상태·강수확률 | `DATA_GO_KR_KEY_KMA` |
| 한국관광공사 국문 관광정보 (공공데이터포털) | 명소 카드 사진·좌표 찾기 | `DATA_GO_KR_KEY_KTO` |
| 제주관광공사 비짓제주 관광정보 | NEARBY 탭: 명소 주변 관광지·음식점·숙박 | `VISITJEJU_API_KEY` |
| Claude (Anthropic) | AI 에이전트 | `ANTHROPIC_API_KEY` |
| Supabase | 즐겨찾기·대화 기록 | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` |

## 실행
```bash
npm install
cp .env.example .env     # 값 채우기 (.env 는 .gitignore 에 들어 있음)
npm run dev              # http://localhost:5173  — /api 서버 함수도 함께 실행됩니다
```
`npm run dev` 는 `vite.config.js` 의 `localApi` 플러그인이 `api/*.js` 를 그대로 실행해 주므로 `vercel dev` 가 필요 없습니다.
키가 없는 API 는 그 부분만 꺼지고 앱은 계속 동작합니다 (기상청 → Open-Meteo 로 대체, 사진 → 기본 배경, NEARBY → 안내 문구).

## 구조
```
api/        Vercel 서버 함수 — 비밀 키는 여기서만 사용
  agent.js    Claude 에이전트 루프 (도구 3개를 필요한 순서로 호출)
  sun.js      일출·일몰 (sunrise-sunset.org v2: KST·골든아워·방위각)
  weather.js  시간별 구름·풍속·파도 (Open-Meteo) + 기상청 단기예보(하늘상태·강수확률)
  nearby.js   명소 주변 관광지 (비짓제주)
  tour.js     명소 사진 (한국관광공사 TourAPI 우선, 없으면 비짓제주 사진)
  hallasan.js 한라산 등반 날씨 판정 (Open-Meteo 를 고도 지정해 호출, 판정 기준은 shared/hallasan.js)
server/     외부 API 호출·도구 정의 (api/ 가 사용). 같은 요청 5분 캐시(cache.js)
            kma.js(격자 변환·발표 시각) · visitjeju.js(전체 목록 1시간 캐시 + 거리 계산)
shared/     화면과 서버가 함께 쓰는 값: 명소 목록, 점수 기준표, 날짜 도구
src/
  pages/        Home · Agent · Nearby · Saved · Halla(HALLA 1947) · Hallasan(판정기 본문)
  components/   + HallaRouteMap(코스 지도·제주 위치도) · HallaReportModal(에이전트 위 한라산 리포트 창)
  three/        + hallaScene(한라산 3D, 개념적 시각화)
  components/   SkyScene(3D) · TimeControl · SpotCard · InfoPanel · ScoreCard · ToolSteps
  three/        createScene(하늘·태양·바다·구름·별) · palette · silhouettes
  store/        Zustand 전역 상태
  api/client.js 화면 → /api 호출
supabase/schema.sql   즐겨찾기·대화 기록 테이블
scripts/find-coords.mjs   비짓제주·TourAPI 로 명소 좌표 후보 찾기
```

## 명소 추가·수정
`shared/spots.js` 에서 `lat` / `lng` 를 채우면 화면과 에이전트에 자동으로 나타납니다 (`null` 이면 숨김).
좌표가 빈 곳은 `node --env-file=.env scripts/find-coords.mjs` 로 비짓제주·TourAPI 후보를 찾아 확인한 뒤 옮겨 적으세요. (현재 9곳 모두 채워짐)

## 사진 점수 기준 바꾸기
`shared/score.js` 위쪽의 `CLOUD_TABLE` / `ADJUST` 표만 고치면 화면과 에이전트 답변 기준이 함께 바뀝니다.

## 배포 (Vercel)
1. GitHub 에 올립니다. (`.env` 가 올라가지 않았는지 확인)
2. Vercel 에서 Import → **Settings → Environment Variables** 에 `.env` 와 **같은 이름**으로 입력합니다. (Production·Preview 모두 체크)

   | 이름 | 값 |
   |---|---|
   | `ANTHROPIC_API_KEY` | Claude 키 |
   | `DATA_GO_KR_KEY_KMA` | 포털 Decoding 키 (기상청) |
   | `DATA_GO_KR_KEY_KTO` | 포털 Decoding 키 (한국관광공사) |
   | `VISITJEJU_API_KEY` | 비짓제주 apiKey |
   | `VITE_SUPABASE_URL` | Supabase URL |
   | `VITE_SUPABASE_ANON_KEY` | Supabase anon 키 |

3. Deploy. `VITE_` 로 시작하는 값은 빌드할 때 들어가므로, 값을 바꾸면 **Redeploy** 해야 반영됩니다.
