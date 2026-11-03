// GOLDEN HOUR 발표 PPTX 생성 (16:9, 7장)
// 실행: 프로젝트 루트에서  node scripts/generate-ppt.mjs
// 결과: GOLDEN_HOUR_Presentation.pptx (프로젝트 루트)
// 웹 슬라이드(/slides)의 텍스트와 구조를 옮긴 것이며, 모든 요소는 파워포인트에서 편집할 수 있는 도형·텍스트입니다.
// 시연 영상(이승우_시연영상.mp4)은 파일이 커서(약 320MB) 넣지 않고, 3번 장에 위치 안내만 적었습니다.

import pptxgen from 'pptxgenjs'

const GOLD = 'F5B82E'
const MINT = '5EEAD4'
const CORAL = 'FF6B6B'
const WHITE = 'FFFFFF'
const BODY = 'E2E8F0'
const MUTED = '94A3B8'
const CARD = '161926'
const CARD_LINE = '3A3F58'
const PILL = '25334A'
const PILL_TEXT = '93C5FD'
const SANS = 'Pretendard'
const SERIF = 'Georgia'

const W = 13.333
const H = 7.5
const LEFT = 1.0

const pres = new pptxgen()
pres.layout = 'LAYOUT_WIDE'
pres.title = 'GOLDEN HOUR 발표'
pres.author = '이승우'

// 배경: 노을 테마(1~4), 밤바다 테마(5~6), 여명 테마(7)
function background(slide, base, band) {
  slide.background = { color: base }
  if (band) slide.addShape(pres.shapes.RECTANGLE, { x: 0, y: H * 0.7, w: W, h: H * 0.3, fill: { color: band, transparency: 50 }, line: { type: 'none' } })
}

function pagination(slide, n, label) {
  slide.addText(`${String(n).padStart(2, '0')} / 07 · ${label}`, {
    x: 0, y: 6.95, w: W, h: 0.3, align: 'center', fontFace: SANS, fontSize: 10, color: MUTED, margin: 0, isTextBox: true,
  })
}

function sectionLabel(slide, text) {
  slide.addText(text, { x: LEFT, y: 0.55, w: 8, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: GOLD, charSpacing: 2, margin: 0, isTextBox: true })
}

// 제목: runs 배열 [{text, color?, italic?}] 로 강조 단어 지정
function title(slide, runs, opts = {}) {
  slide.addText(runs.map((r) => ({ text: r.text, options: { color: r.color || WHITE, italic: !!r.italic, fontFace: r.serif ? SERIF : SANS } })), {
    x: LEFT, y: 0.9, w: 11.3, h: 0.95, fontSize: opts.size || 30, bold: true, margin: 0, isTextBox: true, valign: 'middle',
  })
}

function card(slide, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x, y, w, h, rectRadius: 0.15,
    fill: { color: opts.fill || CARD, transparency: opts.transparency ?? 18 },
    line: { color: opts.line || CARD_LINE, width: 1 },
  })
}

function pill(slide, x, y, text, color = PILL_TEXT, w) {
  const width = w || Math.max(1.2, text.length * 0.12 + 0.5)
  slide.addShape(pres.shapes.ROUNDED_RECTANGLE, { x, y, w: width, h: 0.36, rectRadius: 0.18, fill: { color: PILL }, line: { color: '3E4F6E', width: 0.75 } })
  slide.addText(text, { x, y, w: width, h: 0.36, align: 'center', valign: 'middle', fontFace: SANS, fontSize: 11, bold: true, color, margin: 0, isTextBox: true })
  return width
}

// ── 1. 표지 ──
{
  const s = pres.addSlide()
  background(s, '2A1B3D', '6E354B')
  s.addText('제주 IP × 공공데이터 × AI 에이전트', { x: LEFT, y: 1.5, w: 10, h: 0.35, fontFace: SANS, fontSize: 13, bold: true, color: GOLD, charSpacing: 2, margin: 0, isTextBox: true })
  s.addText([
    { text: 'GOLDEN ', options: { color: WHITE, fontFace: SERIF } },
    { text: 'HOUR', options: { color: GOLD, italic: true, fontFace: SERIF } },
  ], { x: LEFT, y: 1.95, w: 11, h: 1.5, fontSize: 66, bold: true, margin: 0, isTextBox: true, valign: 'middle' })
  s.addText('Beyond the clouds, chasing the light in Jeju.', { x: LEFT, y: 3.6, w: 11, h: 0.6, fontFace: SERIF, italic: true, fontSize: 22, color: BODY, margin: 0, isTextBox: true })
  s.addText('오늘 어디서, 언제 찍을지 실제 날씨 데이터로 골라 주는 제주 일출·일몰 3D 사진 가이드', { x: LEFT, y: 4.3, w: 11, h: 0.4, fontFace: SANS, fontSize: 16, color: MUTED, margin: 0, isTextBox: true })
  let px = LEFT
  for (const [t, c] of [['🌊 3D 날씨 · 해녀 · 한라산', GOLD], ['🤖 Claude 6-도구 에이전트', CORAL], ['📊 공공데이터 3종 · 실시간 판정', MINT]]) {
    px += pill(s, px, 5.5, t, c) + 0.25
  }
  pagination(s, 1, '표지')
}

// ── 2. 프로젝트 한눈에 ──
{
  const s = pres.addSlide()
  background(s, '3B243F', '6E354B')
  sectionLabel(s, '프로젝트 한눈에')
  title(s, [{ text: '숫자로 보는 ' }, { text: 'GOLDEN HOUR', color: GOLD }])
  const ITEMS = [
    { big: '9 SPOTS', title: '제주 일출·일몰 명소', body: '명소 9곳의 구름·풍속·강수확률을 비교해 100점 촬영 점수를 냅니다.', pts: ['일출·일몰 시각에 맞춘 점수', '구름 30~50%를 최적 가점으로 계산', '3D 태양·달·별 궤적으로 보여 줌'] },
    { big: '1947m', title: '한라산 4대 등반 코스', body: '성판악·관음사·어리목·영실의 고도별 날씨를 판정합니다.', pts: ['좋음 · 주의 · 위험 3단계 판정', '일출 산행 출발 시각 계산', '하산 마감은 일몰 30분 전'] },
    { big: '6 TOOLS', title: 'Claude AI 에이전트', body: '질문에 맞는 도구를 골라 연속으로 호출하고 답합니다.', pts: ['호출한 도구 목록을 화면에 표시', '없는 날씨 수치는 지어내지 않음', '결과에 따라 리포트 버튼 생성'] },
    { big: '3+2 APIs', title: '공공데이터 · 실시간 3D', body: '기상청·관광공사·비짓제주 3종에 보조 API 2종을 더합니다.', pts: ['기상청 · TourAPI · 비짓제주', '보조: Open-Meteo · sunrise-sunset', 'Three.js 날씨 시뮬레이션'] },
  ]
  ITEMS.forEach((k, i) => {
    const x = LEFT + i * 2.95
    card(s, x, 2.1, 2.75, 4.5)
    s.addText(k.big, { x: x + 0.25, y: 2.35, w: 2.3, h: 0.7, fontFace: SERIF, fontSize: 30, bold: true, color: GOLD, margin: 0, isTextBox: true })
    s.addText(k.title, { x: x + 0.25, y: 3.1, w: 2.3, h: 0.45, fontFace: SANS, fontSize: 15, bold: true, color: WHITE, margin: 0, isTextBox: true })
    s.addText(k.body, { x: x + 0.25, y: 3.6, w: 2.3, h: 0.9, fontFace: SANS, fontSize: 12, color: BODY, margin: 0, valign: 'top', isTextBox: true })
    s.addShape(pres.shapes.LINE, { x: x + 0.25, y: 4.6, w: 2.25, h: 0, line: { color: CARD_LINE, width: 1 } })
    s.addText(k.pts.map((p, j) => ({ text: p, options: { bullet: true, breakLine: j < k.pts.length - 1 } })), {
      x: x + 0.25, y: 4.75, w: 2.3, h: 1.7, fontFace: SANS, fontSize: 12, color: BODY, margin: 0, paraSpaceAfter: 6, valign: 'top', isTextBox: true,
    })
  })
  pagination(s, 2, '프로젝트 한눈에')
}

// ── 3. 기획 배경 ──
{
  const s = pres.addSlide()
  background(s, '3B243F', '6E354B')
  sectionLabel(s, '기획 배경')
  title(s, [{ text: '구름만 가득하면 ' }, { text: '어떡하죠?', color: GOLD }])
  const PROBLEM = [
    { t: '변덕스러운 제주의 구름과 해무', b: '일출·일몰 시각만 알고 갔다가 먹구름만 보고 돌아옵니다.' },
    { t: '한라산 고지대 기상 악화', b: '해안가 날씨만 믿고 올라갔다가 백록담 강풍·안개로 통제되기도 합니다.' },
    { t: '흩어진 기상·관광 정보', b: '기상청, 천문 시각, 주변 관광지를 각각 따로 검색해야 합니다.' },
  ]
  const SOLUTION = [
    { n: '01', t: '3D 바다·하늘과 해녀 IP', b: '해녀와 테왁이 떠 있는 3D 바다와 하늘에 실제 날씨 효과를 얹고, 명소 9곳을 구름·풍속·강수로 100점 만점 점수로 보여 줍니다.', tags: ['Three.js', '맑음·흐림·해무·비·눈', 'sunrise-sunset'] },
    { n: '02', t: '한라산 1947 · 등반 날씨 판정기', b: '성판악·관음사·어리목·영실 4개 코스의 고도별 기온·풍속·강수를 좋음·주의·위험 3단계로 판정하고, 코스별 출발·하산 시각을 계산합니다.', tags: ['고도별 기상 예보', 'shared/hallasan.js', '공식 입산통제 링크'] },
    { n: '03', t: 'AI GUIDE & NEARBY · 기상부터 주변 관광까지', b: '기상청·천문 시각·비짓제주 API를 통합해, Claude 에이전트가 촬영지를 추천하고 명소 반경 5km 내 관광지·음식점·행사를 한 번에 보여 줍니다.', tags: ['Claude Tool Use', '비짓제주 5km', 'TourAPI'] },
  ]
  PROBLEM.forEach((p, i) => {
    const y = 2.05 + i * 1.6
    card(s, LEFT, y, 5.0, 1.42, { line: GOLD })
    s.addShape(pres.shapes.RECTANGLE, { x: LEFT, y: y + 0.15, w: 0.06, h: 1.12, fill: { color: GOLD }, line: { type: 'none' } })
    s.addText(`PROBLEM ${String(i + 1).padStart(2, '0')}`, { x: LEFT + 0.3, y: y + 0.14, w: 4.5, h: 0.25, fontFace: SANS, fontSize: 10, bold: true, color: GOLD, margin: 0, isTextBox: true })
    s.addText(p.t, { x: LEFT + 0.3, y: y + 0.4, w: 4.5, h: 0.4, fontFace: SANS, fontSize: 15, bold: true, color: WHITE, margin: 0, isTextBox: true })
    s.addText(p.b, { x: LEFT + 0.3, y: y + 0.8, w: 4.5, h: 0.5, fontFace: SANS, fontSize: 12, color: BODY, margin: 0, valign: 'top', isTextBox: true })
    s.addText('→', { x: 6.1, y: y + 0.45, w: 0.6, h: 0.5, align: 'center', valign: 'middle', fontFace: SANS, fontSize: 28, bold: true, color: GOLD, margin: 0, isTextBox: true })
    const q = SOLUTION[i]
    card(s, 6.8, y, 5.5, 1.42)
    s.addText(q.n, { x: 10.9, y: y + 0.02, w: 1.3, h: 0.9, align: 'right', fontFace: SERIF, fontSize: 56, bold: true, color: '2DD4BF', transparency: 80, margin: 0, isTextBox: true })
    s.addText(q.t, { x: 7.05, y: y + 0.12, w: 4.6, h: 0.35, fontFace: SANS, fontSize: 14, bold: true, color: WHITE, margin: 0, isTextBox: true })
    s.addText(q.b, { x: 7.05, y: y + 0.48, w: 4.9, h: 0.5, fontFace: SANS, fontSize: 11, color: BODY, margin: 0, valign: 'top', isTextBox: true })
    let tx = 7.05
    for (const t of q.tags) tx += pill(s, tx, y + 1.0, t, '7DD3FC') + 0.1
  })
  pagination(s, 3, '기획 배경')
}

// ── 4. 라이브 시연 ──
{
  const s = pres.addSlide()
  background(s, '3B243F', '6E354B')
  sectionLabel(s, '라이브 시연')
  title(s, [{ text: '이렇게 ' }, { text: '동작합니다', color: GOLD }])
  // 브라우저 목업
  const bx = LEFT, by = 2.05, bw = 7.3, bh = 4.75
  card(s, bx, by, bw, bh, { fill: '0B0E17', transparency: 0, line: '2A3350' })
  s.addShape(pres.shapes.RECTANGLE, { x: bx, y: by, w: bw, h: 0.45, fill: { color: '1A2033' }, line: { type: 'none' } })
  ;['FB7185', GOLD, MINT].forEach((c, i) => s.addShape(pres.shapes.OVAL, { x: bx + 0.2 + i * 0.22, y: by + 0.16, w: 0.13, h: 0.13, fill: { color: c }, line: { type: 'none' } }))
  s.addText('GOLDEN HOUR', { x: bx + 1.0, y: by + 0.1, w: 5, h: 0.25, fontFace: SANS, fontSize: 10, color: MUTED, margin: 0, isTextBox: true })
  // 로그인 모달 (웹 시연 1번 장면)
  const mx = bx + bw / 2 - 1.6, my = by + 0.85
  card(s, mx, my, 3.2, 3.2, { fill: '161926', transparency: 0, line: '3A3F58' })
  s.addText('GOLDEN HOUR', { x: mx, y: my + 0.2, w: 3.2, h: 0.3, align: 'center', fontFace: SERIF, fontSize: 14, color: WHITE, charSpacing: 2, margin: 0, isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx + 0.3, y: my + 0.7, w: 2.6, h: 0.42, rectRadius: 0.1, fill: { color: '0F1422' }, line: { color: CARD_LINE, width: 0.75 } })
  s.addText('아이디', { x: mx + 0.45, y: my + 0.7, w: 2.3, h: 0.42, valign: 'middle', fontFace: SANS, fontSize: 10, color: MUTED, margin: 0, isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx + 0.3, y: my + 1.3, w: 2.6, h: 0.42, rectRadius: 0.1, fill: { color: '0F1422' }, line: { color: CARD_LINE, width: 0.75 } })
  s.addText('비밀번호', { x: mx + 0.45, y: my + 1.3, w: 2.3, h: 0.42, valign: 'middle', fontFace: SANS, fontSize: 10, color: MUTED, margin: 0, isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: mx + 0.3, y: my + 1.95, w: 2.6, h: 0.45, rectRadius: 0.22, fill: { color: CORAL }, line: { type: 'none' } })
  s.addText('로그인', { x: mx + 0.3, y: my + 1.95, w: 2.6, h: 0.45, align: 'center', valign: 'middle', fontFace: SANS, fontSize: 12, bold: true, color: WHITE, margin: 0, isTextBox: true })
  s.addText('시연 영상: 이승우_시연영상.mp4 (파일이 커서 PPT에 넣지 않았습니다. 발표 때 이 장에서 영상을 여세요)', { x: bx + 0.3, y: by + bh - 0.5, w: bw - 0.6, h: 0.35, align: 'center', fontFace: SANS, fontSize: 9, color: MUTED, margin: 0, isTextBox: true })
  // 스텝 카드
  const STEPS = [
    { n: '01', t: '회원가입 · 로그인', d: '계정을 만들고 로그인합니다', c: '계정별 분리' },
    { n: '02', t: 'HOME · 골든아워 3D', d: '날씨 효과, 명소 비교, 빛 리포트', c: '날씨 토글 · 며칠 뒤 예보' },
    { n: '03', t: 'HALLA 1947', d: '코스 선택, 등반 날씨 판정, 공식 안내', c: '3D 회전 · 등반 판정' },
    { n: '04', t: 'AI GUIDE', d: '질문하면 도구를 골라 호출하고 답합니다', c: '도구 연속 호출 · 환각 방지' },
    { n: '05', t: 'NEARBY · SAVED', d: '저장 후 새로고침해도 남아 있는지 확인', c: '비짓제주 저장 · 새로고침 유지' },
  ]
  STEPS.forEach((st, i) => {
    const y = 2.05 + i * 0.97
    card(s, 8.7, y, 3.65, 0.86, { transparency: 15 })
    s.addText(st.n, { x: 8.85, y: y + 0.1, w: 0.7, h: 0.66, valign: 'middle', fontFace: SERIF, fontSize: 22, bold: true, color: GOLD, margin: 0, isTextBox: true })
    s.addText(st.t, { x: 9.55, y: y + 0.06, w: 2.7, h: 0.28, fontFace: SANS, fontSize: 12, bold: true, color: WHITE, margin: 0, isTextBox: true })
    s.addText(st.d, { x: 9.55, y: y + 0.33, w: 2.7, h: 0.22, fontFace: SANS, fontSize: 9, color: BODY, margin: 0, isTextBox: true })
    s.addText(`확인 포인트 · ${st.c}`, { x: 9.55, y: y + 0.56, w: 2.7, h: 0.22, fontFace: SANS, fontSize: 9, bold: true, color: MINT, margin: 0, isTextBox: true })
  })
  pagination(s, 4, '라이브 시연')
}

// ── 5. AI 에이전트 ──
{
  const s = pres.addSlide()
  background(s, '0B0E17', '121829')
  sectionLabel(s, 'AI 에이전트')
  title(s, [{ text: '지어내지 ' }, { text: '않습니다', color: GOLD }])
  const FLOW = [
    { t: '사용자 질문', d: '자연어로 묻습니다' },
    { t: 'Vercel API', d: 'api/agent.js 가 요청을 받습니다' },
    { t: 'Claude 도구 선택', d: '필요한 도구를 골라 연속 호출합니다' },
    { t: '실측 데이터 답변', d: '수치로 답하고 리포트 버튼을 만듭니다' },
  ]
  FLOW.forEach((f, i) => {
    const x = LEFT + i * 2.95
    card(s, x, 2.05, 2.6, 0.95)
    s.addText(f.t, { x: x + 0.15, y: 2.12, w: 2.3, h: 0.35, align: 'center', fontFace: SANS, fontSize: 13, bold: true, color: WHITE, margin: 0, isTextBox: true })
    s.addText(f.d, { x: x + 0.15, y: 2.5, w: 2.3, h: 0.4, align: 'center', fontFace: SANS, fontSize: 10, color: BODY, margin: 0, isTextBox: true })
    if (i < FLOW.length - 1) s.addText('→', { x: x + 2.6, y: 2.2, w: 0.35, h: 0.6, align: 'center', valign: 'middle', fontFace: SANS, fontSize: 22, bold: true, color: GOLD, margin: 0, isTextBox: true })
  })
  // 6 TOOLS
  card(s, LEFT, 3.3, 5.7, 3.45)
  s.addText('6 TOOLS', { x: LEFT + 0.25, y: 3.45, w: 5, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: MINT, charSpacing: 2, margin: 0, isTextBox: true })
  const TOOLS = [
    ['list_photo_spots', '제주 일출·일몰 명소 9곳 목록과 좌표 조회'],
    ['get_sun_times', '명소별 일출·일몰·골든아워 시각과 방위각'],
    ['get_cloud_cover', '기상청·Open-Meteo 시간별 구름양·풍속·강수'],
    ['list_trails', '한라산 4대 등반 코스 정보와 정상 고도'],
    ['get_elevation', '특정 위경도 좌표의 해발고도 조회'],
    ['get_mountain_weather', '고도 지정 한라산 기상과 등반 판정(RULES)'],
  ]
  TOOLS.forEach(([n, d], i) => {
    const x = LEFT + 0.25 + (i % 2) * 2.7
    const y = 3.85 + Math.floor(i / 2) * 0.93
    card(s, x, y, 2.55, 0.82, { transparency: 30 })
    s.addText(n, { x: x + 0.12, y: y + 0.07, w: 2.3, h: 0.28, fontFace: SANS, fontSize: 11, bold: true, color: GOLD, margin: 0, isTextBox: true })
    s.addText(d, { x: x + 0.12, y: y + 0.36, w: 2.3, h: 0.42, fontFace: SANS, fontSize: 9, color: BODY, margin: 0, valign: 'top', isTextBox: true })
  })
  // HALLUCINATION ZERO
  card(s, 6.9, 3.3, 5.45, 3.45)
  s.addText('HALLUCINATION ZERO', { x: 7.15, y: 3.45, w: 5, h: 0.3, fontFace: SANS, fontSize: 11, bold: true, color: MINT, charSpacing: 2, margin: 0, isTextBox: true })
  s.addText('Case A · 복합 질문 (도구 연속 호출)', { x: 7.15, y: 3.82, w: 5, h: 0.28, fontFace: SANS, fontSize: 11, bold: true, color: MINT, margin: 0, isTextBox: true })
  pill(s, 7.15, 4.12, '내일 일출 찍기 좋은 곳 추천해주고 성판악 날씨도 알려줘', WHITE, 4.6)
  s.addText([
    { text: 'list_photo_spots →', options: { breakLine: true } },
    { text: 'get_sun_times →', options: { breakLine: true } },
    { text: 'get_cloud_cover →', options: { breakLine: true } },
    { text: 'get_mountain_weather' },
  ], { x: 7.15, y: 4.6, w: 4.6, h: 1.0, fontFace: SANS, fontSize: 11, bold: true, color: GOLD, margin: 0, valign: 'top', isTextBox: true })
  s.addText('수치 기반으로 추천하고 [빛 리포트] · [한라산 리포트] 버튼을 만듭니다.', { x: 7.15, y: 5.6, w: 4.9, h: 0.3, fontFace: SANS, fontSize: 10, color: BODY, margin: 0, isTextBox: true })
  s.addText('Case B · 예보 범위 밖 (지어내지 않음)', { x: 7.15, y: 5.92, w: 5, h: 0.28, fontFace: SANS, fontSize: 11, bold: true, color: MINT, margin: 0, isTextBox: true })
  s.addText([
    { text: '일출·일몰 시각만 안내하고, 구름과 날씨는 예보 범위를 벗어나 판단할 수 없다고 답합니다. ', options: { color: BODY } },
    { text: '숫자 날조 0%', options: { color: CORAL, bold: true } },
  ], { x: 7.15, y: 6.2, w: 4.9, h: 0.45, fontFace: SANS, fontSize: 10, margin: 0, valign: 'top', isTextBox: true })
  pagination(s, 5, 'AI 에이전트')
}

// ── 6. IP · 기술 ──
{
  const s = pres.addSlide()
  background(s, '0B0E17', '121829')
  sectionLabel(s, 'IP · 기술')
  title(s, [{ text: '이렇게 ' }, { text: '만들었습니다', color: GOLD }])
  const CARDS = [
    { c: '공공데이터 API 3종', t: '기상청 · 관광공사 · 비짓제주', b: '기상청 단기예보(하늘·강수확률), 한국관광공사 TourAPI(명소 사진·좌표), 비짓제주(명소 반경 5km 내 관광지·음식점·행사)를 실데이터로 연동합니다.', p: ['기상청', 'TourAPI', '비짓제주'] },
    { c: 'Three.js 프로시저럴 3D', t: '외부 이미지 없이 코드로', b: '해·달·별자리·구름·파도·해녀와 테왁·한라산을 셰이더로 그리고, 맑음·흐림·해무·비·눈 날씨를 애니메이션으로 보여 줍니다.', p: ['Three.js', 'Shader'] },
    { c: 'React + Zustand', t: 'pages · components · store · api · three', b: 'Zustand로 전역 상태를 나누고 ToolSteps, ReportModal, HallaReportModal 같은 공용 컴포넌트를 재사용합니다.', p: ['React', 'Zustand'] },
    { c: 'Supabase DB · 계정 분리', t: 'favorites · favorite_places · chat_logs', b: '명소 즐겨찾기, 주변 장소, AI 대화를 로그인 계정별로 저장합니다. 비로그인 시 닉네임으로 구분하고 새로고침 뒤에도 유지합니다.', p: ['Supabase', 'RLS'] },
    { c: '무중단 폴백', t: 'Open-Meteo · sunrise-sunset 보조', b: '보조 API를 결합하고 서버에서 5분 캐시를 씁니다. 키가 없거나 장애가 나도 대체 데이터로 계속 동작합니다.', p: ['5분 캐시', 'Fallback'] },
    { c: '서버리스 보안 · 로컬 DX', t: '비밀 키는 서버 함수에만', b: 'ANTHROPIC 키와 공공데이터 키는 Vercel api/*.js 안에만 있고 브라우저와 GitHub에는 없습니다. vite.config.js의 localApi 플러그인으로 로컬에서도 같은 구조로 돌립니다.', p: ['Vercel', 'localApi'] },
  ]
  CARDS.forEach((k, i) => {
    const x = LEFT + (i % 3) * 3.85
    const y = 2.05 + Math.floor(i / 3) * 2.45
    card(s, x, y, 3.6, 2.25)
    s.addText(k.c, { x: x + 0.22, y: y + 0.16, w: 3.2, h: 0.28, fontFace: SANS, fontSize: 11, bold: true, color: MINT, margin: 0, isTextBox: true })
    s.addText(k.t, { x: x + 0.22, y: y + 0.46, w: 3.2, h: 0.32, fontFace: SANS, fontSize: 13, bold: true, color: WHITE, margin: 0, isTextBox: true })
    s.addText(k.b, { x: x + 0.22, y: y + 0.82, w: 3.2, h: 0.9, fontFace: SANS, fontSize: 10, color: BODY, margin: 0, valign: 'top', isTextBox: true })
    let tx = x + 0.22
    for (const t of k.p) tx += pill(s, tx, y + 1.8, t, '7DD3FC') + 0.08
  })
  pagination(s, 6, 'IP · 기술')
}

// ── 7. 마무리 ──
{
  const s = pres.addSlide()
  background(s, '231934')
  s.addText('THANK YOU · Q&A', { x: 0, y: 1.0, w: W, h: 0.4, align: 'center', fontFace: SANS, fontSize: 16, bold: true, color: GOLD, charSpacing: 4, margin: 0, isTextBox: true })
  s.addText([
    { text: 'Beyond the clouds,', options: { breakLine: true } },
    { text: 'chasing the light in Jeju.' },
  ], { x: 0, y: 1.55, w: W, h: 1.5, align: 'center', valign: 'middle', fontFace: SERIF, italic: true, fontSize: 40, color: WHITE, margin: 0, isTextBox: true })
  card(s, 3.67, 3.35, 6.0, 3.4, { transparency: 15 })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 4.55, y: 3.6, w: 2.25, h: 0.5, rectRadius: 0.25, fill: { color: GOLD }, line: { type: 'none' } })
  s.addText('배포 주소 ↗', { x: 4.55, y: 3.6, w: 2.25, h: 0.5, align: 'center', valign: 'middle', fontFace: SANS, fontSize: 13, bold: true, color: '1F1400', margin: 0, isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 7.05, y: 3.6, w: 2.0, h: 0.5, rectRadius: 0.25, fill: { color: '2A2F45' }, line: { color: CARD_LINE, width: 1 } })
  s.addText('GitHub ↗', { x: 7.05, y: 3.6, w: 2.0, h: 0.5, align: 'center', valign: 'middle', fontFace: SANS, fontSize: 13, bold: true, color: WHITE, margin: 0, isTextBox: true })
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x: 5.67, y: 4.3, w: 2.0, h: 2.0, rectRadius: 0.12, fill: { color: WHITE }, line: { type: 'none' } })
  s.addImage({ path: 'public/images/qr.png', x: 5.76, y: 4.39, w: 1.82, h: 1.82 })
  s.addText('📱 모바일로 바로 체험하기', { x: 4.0, y: 6.4, w: 5.3, h: 0.3, align: 'center', fontFace: SANS, fontSize: 11, color: BODY, margin: 0, isTextBox: true })
  pagination(s, 7, '마무리')
}

await pres.writeFile({ fileName: 'GOLDEN_HOUR_Presentation.pptx' })
console.log('wrote GOLDEN_HOUR_Presentation.pptx')
