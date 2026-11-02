import { createBrowserRouter } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home'
import Agent from './pages/Agent'
import Nearby from './pages/Nearby'
import Halla from './pages/Halla'
import Saved from './pages/Saved'
import NotFound from './pages/NotFound'

// 페이지 추가: ① pages/ 에 파일 만들기 ② NAV_ITEMS 에 한 줄 ③ routes 에 한 줄
export const NAV_ITEMS = [
  { to: '/', label: 'Home' },
  { to: '/halla', label: 'HALLA 1947' },
  { to: '/agent', label: 'AI Guide' },
  { to: '/nearby', label: 'Nearby' },
  { to: '/saved', label: 'Saved' },
]

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    errorElement: <NotFound />,
    children: [
      { index: true, element: <Home /> },
      { path: 'agent', element: <Agent /> },
      { path: 'nearby', element: <Nearby /> },
      { path: 'halla', element: <Halla /> },
      { path: 'saved', element: <Saved /> },
    ],
  },
])
