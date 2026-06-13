-- 既存テーブルを削除（順番重要）
drop table if exists chat_messages cascade;
drop table if exists tasks cascade;
drop table if exists project_members cascade;
drop table if exists projects cascade;
drop function if exists update_updated_at cascade;

-- プロジェクトテーブル
create table projects (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  description text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- プロジェクトメンバーテーブル
create table project_members (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  user_email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz default now(),
  unique(project_id, user_email)
);

-- タスクテーブル
create table tasks (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade,
  parent_id uuid references tasks(id) on delete cascade,
  title text not null,
  status text not null default 'pending' check (status in ('pending', 'done', 'overdue')),
  assignee text, -- user email or 'cortex'
  due_date date,
  source text not null default 'manual' check (source in ('manual', 'tabula', 'cortex')),
  tabula_node_id text,
  memo text,
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- チャットメッセージテーブル（プロジェクト単位）
create table chat_messages (
  id uuid default gen_random_uuid() primary key,
  project_id uuid references projects(id) on delete cascade not null,
  sender_email text not null, -- user email or 'cortex'
  content text not null,
  created_at timestamptz default now()
);

-- updated_at自動更新
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger projects_updated_at
  before update on projects
  for each row execute function update_updated_at();

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

-- RLS有効化
alter table projects enable row level security;
alter table project_members enable row level security;
alter table tasks enable row level security;
alter table chat_messages enable row level security;

-- ポリシー: 自分がメンバーのプロジェクトのみ見える
create policy "members can view their projects"
  on projects for select to authenticated
  using (
    exists (
      select 1 from project_members
      where project_id = projects.id
      and user_email = auth.jwt() ->> 'email'
    )
  );

create policy "authenticated users can create projects"
  on projects for insert to authenticated
  with check (true);

create policy "owners can update projects"
  on projects for update to authenticated
  using (
    exists (
      select 1 from project_members
      where project_id = projects.id
      and user_email = auth.jwt() ->> 'email'
      and role = 'owner'
    )
  );

-- ポリシー: project_members
create policy "members can view project members"
  on project_members for select to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
      and pm.user_email = auth.jwt() ->> 'email'
    )
  );

create policy "owners can manage members"
  on project_members for all to authenticated
  using (
    exists (
      select 1 from project_members pm
      where pm.project_id = project_members.project_id
      and pm.user_email = auth.jwt() ->> 'email'
      and pm.role = 'owner'
    )
  );

create policy "users can join as member"
  on project_members for insert to authenticated
  with check (user_email = auth.jwt() ->> 'email');

-- ポリシー: tasks（プロジェクトメンバーのみ）
create policy "members can manage tasks"
  on tasks for all to authenticated
  using (
    exists (
      select 1 from project_members
      where project_id = tasks.project_id
      and user_email = auth.jwt() ->> 'email'
    )
  )
  with check (
    exists (
      select 1 from project_members
      where project_id = tasks.project_id
      and user_email = auth.jwt() ->> 'email'
    )
  );

-- ポリシー: chat_messages（プロジェクトメンバーのみ）
create policy "members can manage chat"
  on chat_messages for all to authenticated
  using (
    exists (
      select 1 from project_members
      where project_id = chat_messages.project_id
      and user_email = auth.jwt() ->> 'email'
    )
  )
  with check (
    exists (
      select 1 from project_members
      where project_id = chat_messages.project_id
      and user_email = auth.jwt() ->> 'email'
    )
  );

-- リアルタイム有効化
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table project_members;
