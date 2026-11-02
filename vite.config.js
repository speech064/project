import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// `npm run dev` 에서도 /api/*.js (Vercel 서버 함수)를 그대로 실행해 주는 개발용 플러그인.
// .env 의 값은 서버 함수(process.env)에만 들어가고 브라우저 코드에는 들어가지 않습니다.
function localApi() {
  return {
    name: 'local-api',
    configureServer(server) {
      for (const [k, v] of Object.entries(loadEnv(server.config.mode, process.cwd(), ''))) process.env[k] ??= v

      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, 'http://localhost')
        const m = url.pathname.match(/^\/api\/([a-z-]+)$/)
        if (!m) return next()

        try {
          let body = ''
          for await (const chunk of req) body += chunk
          req.query = Object.fromEntries(url.searchParams)
          req.body = body ? JSON.parse(body) : {}
          res.status = (code) => { res.statusCode = code; return res }
          res.json = (obj) => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(obj)) }

          const mod = await server.ssrLoadModule(`/api/${m[1]}.js`)
          await mod.default(req, res)
        } catch (e) {
          const missing = /Failed to load url|Cannot find module/i.test(e.message)
          res.statusCode = missing ? 404 : 500
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(JSON.stringify({ error: missing ? '없는 API 예요' : e.message }))
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), localApi()],
})
