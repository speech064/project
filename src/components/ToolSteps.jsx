// 도구 호출 기록은 사용자가 알 필요가 없어서 숨기고, 실패한 도구가 있을 때만 종류별로 한 줄씩 알려 줘요.
// (같은 도구가 여러 번·명소별로 실패해도 한 줄로 합침)
const FAIL_TEXT = {
  list_photo_spots: '명소 목록을 불러오는데 실패했습니다.',
  get_sun_times: '일출·일몰 정보를 불러오는데 실패했습니다.',
  get_cloud_cover: '구름 예보를 불러오는데 실패했습니다.',
  list_trails: '한라산 코스를 불러오는데 실패했습니다.',
  get_elevation: '고도 정보를 불러오는데 실패했습니다.',
  get_mountain_weather: '한라산 날씨를 불러오는데 실패했습니다.',
}

export default function ToolSteps({ steps }) {
  const failed = [...new Set((steps ?? []).filter((s) => !s.ok).map((s) => s.tool))]
  if (!failed.length) return null
  return (
    <div className="steps">
      <ul>
        {failed.map((tool) => (
          <li key={tool} className="bad" role="status">
            <span className="dot">✕</span>
            <span className="res">{FAIL_TEXT[tool] ?? '정보를 불러오는데 실패했습니다.'}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
