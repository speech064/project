// 웹 발표(/slides)를 브라우저로 직접 읽어 PPTX 두 가지를 만든다.
//   perfect  : 7장을 고해상도 PNG로 캡처해 한 장씩 꽉 채워 넣은 PPTX (화면과 100% 동일, 편집 불가)
//   editable : 배경은 3D 화면 캡처, 카드·글자는 DOM 실측 좌표로 도형·글상자를 만든 PPTX (글자 편집 가능)
// 실행 (개발 서버가 떠 있어야 함):  node scripts/make-ppt-from-web.mjs [perfect|editable]
// 기본 주소는 http://localhost:5173 (BASE_URL 환경변수로 바꿀 수 있음). 설치된 Chrome 을 사용한다.

import { chromium } from 'playwright-core'
import pptxgen from 'pptxgenjs'

const BASE = process.env.BASE_URL || 'http://localhost:5173'
const ONLY = process.argv[2]
const SLIDE_COUNT = 7
const W = 13.333
const H = 7.5
const K = W / 1920 // 웹 1px → 인치 (1920px 폭 기준)
const PT_PER_PX = 0.5 // 13.333in = 960pt, 1920px 기준: 1px = 0.5pt (글자 크기 환산)

async function openBrowser() {
  for (const channel of ['chrome', 'msedge']) {
    try {
      return await chromium.launch({ channel, headless: true })
    } catch (e) {
      console.warn(`${channel} 실행 실패:`, e.message.split('\n')[0])
    }
  }
  throw new Error('설치된 Chrome 또는 Edge 를 찾지 못했습니다.')
}

// 슬라이드 i 로 이동 (키보드 ← → 로 한 장씩). 입력창에 포커스가 있으면 키가 안 먹으므로 먼저 포커스를 뺀다.
async function gotoSlide(page, i, first) {
  if (first) {
    await page.goto(`${BASE}/slides`, { waitUntil: 'load' })
    await page.waitForTimeout(3500)
    return
  }
  await page.evaluate(() => { const a = document.activeElement; if (a && a !== document.body) a.blur() })
  await page.keyboard.press('ArrowRight')
  await page.waitForTimeout(3500) // 등장 애니메이션과 3D 장면 전환이 끝날 때까지
}

// ── perfect: 화면 그대로 캡처 ──
async function buildPerfect(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE'
  pres.title = 'GOLDEN HOUR 발표 (화면 캡처)'
  pres.author = '이승우'
  for (let i = 0; i < SLIDE_COUNT; i++) {
    await gotoSlide(page, i, i === 0)
    const png = await page.screenshot({ type: 'png' })
    const s = pres.addSlide()
    s.addImage({ data: 'image/png;base64,' + png.toString('base64'), x: 0, y: 0, w: W, h: H })
    console.log(`perfect: ${i + 1}/${SLIDE_COUNT} 캡처`)
  }
  await ctx.close()
  await pres.writeFile({ fileName: 'GOLDEN_HOUR_Perfect.pptx' })
  console.log('wrote GOLDEN_HOUR_Perfect.pptx')
}

// 브라우저 안에서 실행: 화면의 상자·글자·그림을 좌표와 함께 목록으로 뽑는다.
function measureInPage() {
  const BLOCKISH = ['block', 'flex', 'grid', 'list-item', 'table', 'flow-root']
  const parseC = (s) => {
    const m = s.match(/rgba?\(([^)]+)\)/)
    if (!m) return null
    const p = m[1].split(',').map((v) => parseFloat(v))
    const a = p.length > 3 ? p[3] : 1
    return { hex: p.slice(0, 3).map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase(), a }
  }
  const hasBox = (cs) => {
    const bg = parseC(cs.backgroundColor)
    const bw = parseFloat(cs.borderTopWidth) || 0
    return (bg && bg.a > 0) || (bw > 0 && cs.borderTopStyle !== 'none')
  }
  const isTextBlock = (el) => {
    if (!el.innerText || !el.innerText.trim()) return false
    for (const c of el.children) {
      const ccs = getComputedStyle(c)
      if (ccs.display === 'none') continue
      if (hasBox(ccs)) return false
      if (BLOCKISH.includes(ccs.display) && c.innerText && c.innerText.trim()) return false
    }
    return true
  }
  const runsOf = (el) => {
    const out = []
    const walk = (node) => {
      for (const n of node.childNodes) {
        if (n.nodeType === 3) {
          const t = n.textContent.replace(/\s+/g, ' ')
          if (t) {
            const cs = getComputedStyle(node.nodeType === 1 ? node : n.parentElement)
            const c = parseC(cs.color) || { hex: '000000', a: 1 }
            out.push({
              text: t,
              hex: c.hex,
              a: c.a,
              size: parseFloat(cs.fontSize) || 16,
              family: cs.fontFamily,
              weight: parseInt(cs.fontWeight, 10) || 400,
              italic: cs.fontStyle === 'italic',
              ls: parseFloat(cs.letterSpacing) || 0,
            })
          }
        } else if (n.nodeType === 1) {
          if (n.tagName === 'BR') { out.push({ br: true }); continue }
          const ccs = getComputedStyle(n)
          if (ccs.display === 'none' || ccs.visibility === 'hidden') continue
          walk(n)
        }
      }
    }
    walk(el)
    return out
  }
  const items = []
  let picIdx = 0
  const visit = (el) => {
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') return
    const r = el.getBoundingClientRect()
    if (r.width < 1 || r.height < 1) return
    const base = { x: r.x, y: r.y, w: r.width, h: r.height }
    if (el.tagName === 'IMG' || el.classList.contains('live-frame')) {
      el.setAttribute('data-ppt-idx', String(picIdx))
      items.push({ type: 'pic', idx: picIdx++, ...base })
      return
    }
    if (['IFRAME', 'CANVAS', 'SVG', 'SCRIPT', 'STYLE'].includes(el.tagName)) return
    if (hasBox(cs)) {
      const bg = parseC(cs.backgroundColor)
      const bw = parseFloat(cs.borderTopWidth) || 0
      const bc = parseC(cs.borderTopColor)
      items.push({
        type: 'shape',
        ...base,
        fill: bg && bg.a > 0 ? bg : null,
        line: bw > 0 && cs.borderTopStyle !== 'none' && bc ? { hex: bc.hex, a: bc.a, w: bw } : null,
        radius: parseFloat(cs.borderTopLeftRadius) || 0,
      })
    }
    if (isTextBlock(el)) {
      items.push({ type: 'text', ...base, align: cs.textAlign, lh: cs.lineHeight, runs: runsOf(el) })
      return
    }
    for (const c of el.children) visit(c)
  }
  for (const root of document.querySelectorAll('.deck-stage, .deck-hud')) visit(root)
  return items
}

const PPT_FONT = (family) => {
  const first = (family || '').split(',')[0].replace(/["']/g, '').trim()
  return /Cormorant|Georgia|Playfair/i.test(first) ? 'Georgia' : 'Pretendard'
}

// ── editable: 배경 캡처 + DOM 실측 좌표 ──
async function buildEditable(browser) {
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 2 })
  const page = await ctx.newPage()
  const pres = new pptxgen()
  pres.layout = 'LAYOUT_WIDE'
  pres.title = 'GOLDEN HOUR 발표 (편집 가능)'
  pres.author = '이승우'
  for (let i = 0; i < SLIDE_COUNT; i++) {
    await gotoSlide(page, i, i === 0)
    // 1) 배경만: 글자·카드·진행 표시를 숨기고 3D 화면만 캡처
    await page.evaluate(() => {
      for (const sel of ['.deck-stage', '.deck-hud']) document.querySelectorAll(sel).forEach((el) => { el.style.visibility = 'hidden' })
    })
    const bg = await page.screenshot({ type: 'png' })
    await page.evaluate(() => {
      for (const sel of ['.deck-stage', '.deck-hud']) document.querySelectorAll(sel).forEach((el) => { el.style.visibility = '' })
    })
    // 2) 요소 좌표 실측
    const items = await page.evaluate(measureInPage)
    const s = pres.addSlide()
    s.addImage({ data: 'image/png;base64,' + bg.toString('base64'), x: 0, y: 0, w: W, h: H })
    for (const it of items) {
      const x = it.x * K
      const y = it.y * K
      const w = it.w * K
      const h = it.h * K
      if (it.type === 'shape') {
        const rounded = it.radius > 0
        const rr = rounded ? Math.min(it.radius * K, Math.min(w, h) / 2) : 0
        s.addShape(rounded ? pres.shapes.ROUNDED_RECTANGLE : pres.shapes.RECTANGLE, {
          x, y, w, h,
          ...(rounded ? { rectRadius: rr } : {}),
          fill: it.fill ? { color: it.fill.hex, transparency: Math.round((1 - it.fill.a) * 100) } : { color: '000000', transparency: 100 },
          line: it.line ? { color: it.line.hex, width: it.line.w * PT_PER_PX, transparency: Math.round((1 - it.line.a) * 100) } : { type: 'none' },
        })
      } else if (it.type === 'pic') {
        const buf = await page.locator(`[data-ppt-idx="${it.idx}"]`).screenshot({ type: 'png' })
        s.addImage({ data: 'image/png;base64,' + buf.toString('base64'), x, y, w, h })
      } else if (it.type === 'text') {
        const runs = []
        for (const r of it.runs) {
          if (r.br) { if (runs.length) runs[runs.length - 1].options.breakLine = true; continue }
          runs.push({
            text: r.text,
            options: {
              color: r.hex,
              transparency: Math.round((1 - r.a) * 100),
              fontFace: PPT_FONT(r.family),
              fontSize: r.size * PT_PER_PX,
              bold: r.weight >= 600,
              italic: r.italic,
              ...(r.ls ? { charSpacing: r.ls * PT_PER_PX } : {}),
            },
          })
        }
        if (!runs.length) continue
        runs[0].text = runs[0].text.replace(/^\s+/, '')
        runs[runs.length - 1].text = runs[runs.length - 1].text.replace(/\s+$/, '')
        const lh = parseFloat(it.lh)
        const align = it.align === 'center' ? 'center' : it.align === 'right' || it.align === 'end' ? 'right' : 'left'
        s.addText(runs, {
          x, y, w: w + 0.15, h, // 여유 0.15in: 줄바꿈으로 깨지지 않게
          align,
          valign: 'top',
          margin: 0,
          ...(Number.isFinite(lh) && it.lh.endsWith('px') ? { lineSpacing: lh * PT_PER_PX } : {}),
          isTextBox: true,
        })
      }
    }
    console.log(`editable: ${i + 1}/${SLIDE_COUNT} (요소 ${items.length}개)`)
  }
  await ctx.close()
  await pres.writeFile({ fileName: 'GOLDEN_HOUR_Editable.pptx' })
  console.log('wrote GOLDEN_HOUR_Editable.pptx')
}

const browser = await openBrowser()
try {
  if (!ONLY || ONLY === 'perfect') await buildPerfect(browser)
  if (!ONLY || ONLY === 'editable') await buildEditable(browser)
} finally {
  await browser.close()
}
