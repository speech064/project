-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요.

-- 즐겨찾기 명소
create table if not exists favorites (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '익명',
  spot_id text not null,
  created_at timestamptz not null default now(),
  unique (nickname, spot_id)
);

-- 에이전트 대화 기록 (질문·답·호출한 도구)
create table if not exists chat_logs (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '익명',
  question text not null,
  answer text not null,
  tools jsonb not null default '[]',
  created_at timestamptz not null default now()
);

-- 수업용: 로그인 없이 anon 키로 읽고 쓰게 엽니다. (실서비스라면 로그인 + 본인 행만 허용으로 바꾸세요)
alter table favorites enable row level security;
alter table chat_logs enable row level security;
drop policy if exists "anon all favorites" on favorites;
drop policy if exists "anon all chat_logs" on chat_logs;
create policy "anon all favorites" on favorites for all using (true) with check (true);
create policy "anon all chat_logs" on chat_logs for all using (true) with check (true);

-- 주변 장소 즐겨찾기: 어느 명소(spot_id)에서 찾은 음식점·카페·관광지인지까지 같이 저장
create table if not exists favorite_places (
  id uuid primary key default gen_random_uuid(),
  nickname text not null default '익명',
  spot_id text not null,        -- 기준 명소 id (예: seongsan)
  place_id text not null,       -- 비짓제주 contentsid
  title text not null,
  category text not null,       -- 관광지 / 음식점 / 쇼핑 / 축제/행사 ...
  thumb text,
  address text,
  distance_km numeric,          -- 기준 명소에서의 거리
  lat double precision,
  lng double precision,
  created_at timestamptz not null default now(),
  unique (nickname, spot_id, place_id)
);
alter table favorite_places enable row level security;
drop policy if exists "anon all favorite_places" on favorite_places;
create policy "anon all favorite_places" on favorite_places for all using (true) with check (true);


-- ───────────────────────────────────────────────────────────
-- 로그인(Supabase Auth, 이메일 없는 아이디 가입) — 사용자별 저장
-- · Dashboard → Authentication → Providers → Email → "Confirm email" 은 꺼 두세요.
-- · 앱은 아이디 뒤에 @jeju-light.local 을 붙여 가짜 이메일로 가입시킵니다.
-- · 로그인하지 않은 예전 방식(닉네임)은 그대로 동작하고, 로그인 계정의 행(user_id 있음)은 본인만 읽고 쓸 수 있어요.
-- ───────────────────────────────────────────────────────────
alter table favorites       add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table favorites       add column if not exists display_name text;
alter table favorite_places add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table favorite_places add column if not exists display_name text;
alter table chat_logs       add column if not exists user_id uuid references auth.users(id) on delete cascade;
alter table chat_logs       add column if not exists display_name text;

create index if not exists favorites_user_idx       on favorites (user_id);
create index if not exists favorite_places_user_idx on favorite_places (user_id);
create index if not exists chat_logs_user_idx       on chat_logs (user_id);

-- 기존 "누구나" 정책을 "user_id 가 없는 행(로그인 전) 또는 내 행만" 으로 교체
drop policy if exists "anon all favorites" on favorites;
drop policy if exists "anon all favorite_places" on favorite_places;
drop policy if exists "anon all chat_logs" on chat_logs;
drop policy if exists "owner or legacy favorites" on favorites;
drop policy if exists "owner or legacy favorite_places" on favorite_places;
drop policy if exists "owner or legacy chat_logs" on chat_logs;
create policy "owner or legacy favorites" on favorites for all
  using (user_id is null or user_id = auth.uid()) with check (user_id is null or user_id = auth.uid());
create policy "owner or legacy favorite_places" on favorite_places for all
  using (user_id is null or user_id = auth.uid()) with check (user_id is null or user_id = auth.uid());
create policy "owner or legacy chat_logs" on chat_logs for all
  using (user_id is null or user_id = auth.uid()) with check (user_id is null or user_id = auth.uid());
