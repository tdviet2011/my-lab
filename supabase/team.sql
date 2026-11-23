-- MY LAB · Nhóm NCKH chung. Chạy MỘT LẦN trong Supabase → SQL Editor (sau setup.sql). An toàn khi chạy lại.
-- Mỗi người vẫn có lab riêng (lab_state). Nhóm là nơi chung: biểu đồ, báo cáo, hình ảnh.

-- 0) Cho phép MỌI NGƯỜI đăng ký (gỡ giới hạn "một chủ lab" của setup.sql).
drop trigger if exists lab_single_owner_trg on auth.users;

-- 1) Bảng
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '' check (char_length(description) <= 2000),
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.teams add column if not exists github_url text not null default '' check (github_url = '' or github_url ~ '^https://github\.com/[A-Za-z0-9_.-]+(/[A-Za-z0-9_.-]+)?/?$');
create table if not exists public.team_members (
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  email text not null,
  role text not null check (role in ('owner','editor','viewer')),
  added_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create table if not exists public.team_invites (
  team_id uuid not null references public.teams(id) on delete cascade,
  email text not null,
  role text not null check (role in ('editor','viewer')),
  primary key (team_id, email)
);
create table if not exists public.team_items (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  kind text not null check (kind in ('chart','file','note')),
  title text not null check (char_length(title) between 1 and 160),
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 1000000),
  file_path text,
  file_name text,
  file_type text,
  file_size bigint,
  created_by uuid not null references auth.users(id) on delete cascade,
  author_email text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists team_items_team_idx on public.team_items(team_id, kind, updated_at desc);

-- 2) Hàm hỗ trợ (security definer để tránh vòng lặp RLS)
create or replace function public.team_role(t uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.team_members where team_id = t and user_id = (select auth.uid())
$$;
create or replace function public.team_can_write(t uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce(public.team_role(t) in ('owner','editor'), false)
$$;

-- 3) RLS
alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_items enable row level security;
revoke all on public.teams, public.team_members, public.team_invites, public.team_items from anon;
grant select, insert, update, delete on public.teams, public.team_members, public.team_invites, public.team_items to authenticated;

drop policy if exists teams_select on public.teams;
drop policy if exists teams_insert on public.teams;
drop policy if exists teams_update on public.teams;
drop policy if exists teams_delete on public.teams;
create policy teams_select on public.teams for select to authenticated using (public.team_role(id) is not null);
create policy teams_insert on public.teams for insert to authenticated with check (owner_id = (select auth.uid()));
create policy teams_update on public.teams for update to authenticated using (public.team_role(id) = 'owner') with check (public.team_role(id) = 'owner');
create policy teams_delete on public.teams for delete to authenticated using (public.team_role(id) = 'owner');

drop policy if exists tm_select on public.team_members;
create policy tm_select on public.team_members for select to authenticated using (public.team_role(team_id) is not null);
-- Thêm / sửa / xóa thành viên chỉ qua hàm bên dưới (không cho ghi trực tiếp).

drop policy if exists ti_select on public.team_invites;
create policy ti_select on public.team_invites for select to authenticated using (public.team_role(team_id) = 'owner');

drop policy if exists items_select on public.team_items;
drop policy if exists items_insert on public.team_items;
drop policy if exists items_update on public.team_items;
drop policy if exists items_delete on public.team_items;
create policy items_select on public.team_items for select to authenticated using (public.team_role(team_id) is not null);
create policy items_insert on public.team_items for insert to authenticated with check (public.team_can_write(team_id) and created_by = (select auth.uid()));
create policy items_update on public.team_items for update to authenticated using (public.team_can_write(team_id)) with check (public.team_can_write(team_id));
create policy items_delete on public.team_items for delete to authenticated using (public.team_can_write(team_id));

-- 4) Hàm RPC
create or replace function public.create_team(team_name text, team_desc text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid; me uuid := (select auth.uid()); mail text;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  select email into mail from auth.users where id = me;
  insert into public.teams(name, description, owner_id) values (left(trim(team_name),120), left(coalesce(team_desc,''),2000), me) returning id into tid;
  insert into public.team_members(team_id, user_id, email, role) values (tid, me, coalesce(mail,''), 'owner');
  return tid;
end $$;

create or replace function public.add_team_member(t uuid, member_email text, member_role text default 'editor') returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid; mail text := lower(trim(member_email));
begin
  if public.team_role(t) is distinct from 'owner' then raise exception 'Chỉ chủ nhóm được thêm thành viên'; end if;
  if member_role not in ('editor','viewer') then raise exception 'Vai trò không hợp lệ'; end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Email không hợp lệ'; end if;
  select id into uid from auth.users where lower(email) = mail;
  if uid is not null then
    insert into public.team_members(team_id, user_id, email, role) values (t, uid, mail, member_role)
    on conflict (team_id, user_id) do update set role = excluded.role where public.team_members.role <> 'owner';
    return 'added';
  end if;
  insert into public.team_invites(team_id, email, role) values (t, mail, member_role)
  on conflict (team_id, email) do update set role = excluded.role;
  return 'invited';
end $$;

create or replace function public.remove_team_member(t uuid, member uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(t) is distinct from 'owner' and member <> (select auth.uid()) then raise exception 'Chỉ chủ nhóm được xóa thành viên'; end if;
  delete from public.team_members where team_id = t and user_id = member and role <> 'owner';
end $$;

create or replace function public.cancel_team_invite(t uuid, mail text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if public.team_role(t) is distinct from 'owner' then raise exception 'Chỉ chủ nhóm'; end if;
  delete from public.team_invites where team_id = t and email = lower(trim(mail));
end $$;

-- Gọi mỗi lần đăng nhập: nhận các lời mời gửi tới email của mình.
create or replace function public.claim_team_invites() returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); mail text; n integer;
begin
  if me is null then return 0; end if;
  select lower(email) into mail from auth.users where id = me;
  with moved as (
    delete from public.team_invites where email = mail returning team_id, role
  ), ins as (
    insert into public.team_members(team_id, user_id, email, role)
    select team_id, me, mail, role from moved
    on conflict (team_id, user_id) do nothing returning 1
  ) select count(*) into n from ins;
  return coalesce(n, 0);
end $$;
revoke all on function public.create_team(text,text), public.add_team_member(uuid,text,text), public.remove_team_member(uuid,uuid), public.cancel_team_invite(uuid,text), public.claim_team_invites() from public, anon;
grant execute on function public.create_team(text,text), public.add_team_member(uuid,text,text), public.remove_team_member(uuid,uuid), public.cancel_team_invite(uuid,text), public.claim_team_invites() to authenticated;

-- 5) Kho tệp chung của nhóm: thư mục đầu tiên của đường dẫn là id nhóm.
insert into storage.buckets (id, name, public, file_size_limit)
values ('team-files', 'team-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;
drop policy if exists team_files_select on storage.objects;
drop policy if exists team_files_insert on storage.objects;
drop policy if exists team_files_delete on storage.objects;
create policy team_files_select on storage.objects for select to authenticated
  using (bucket_id = 'team-files' and public.team_role(((storage.foldername(name))[1])::uuid) is not null);
create policy team_files_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'team-files' and public.team_can_write(((storage.foldername(name))[1])::uuid));
create policy team_files_delete on storage.objects for delete to authenticated
  using (bucket_id = 'team-files' and public.team_can_write(((storage.foldername(name))[1])::uuid));

-- 6) Siết an toàn: người tạo / email tác giả do máy chủ ghi, không cho giả mạo; giới hạn số lượng để chống phá hoại.
create or replace function public.team_items_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); mail text; n integer;
begin
  select email into mail from auth.users where id = me;
  if tg_op = 'INSERT' then
    select count(*) into n from public.team_items where team_id = new.team_id;
    if n >= 3000 then raise exception 'Nhóm đã đạt giới hạn 3.000 mục'; end if;
    new.created_by := me; new.author_email := coalesce(mail, ''); new.created_at := now(); new.updated_at := now();
    if new.kind = 'file' and (new.file_path is null or split_part(new.file_path, '/', 1) <> new.team_id::text) then raise exception 'Đường dẫn tệp không hợp lệ'; end if;
  else
    new.id := old.id; new.team_id := old.team_id; new.kind := old.kind; new.created_by := old.created_by; new.author_email := old.author_email;
    new.created_at := old.created_at; new.file_path := old.file_path; new.file_name := old.file_name; new.file_type := old.file_type; new.file_size := old.file_size;
    new.updated_at := now();
  end if;
  return new;
end $$;
drop trigger if exists team_items_guard_trg on public.team_items;
create trigger team_items_guard_trg before insert or update on public.team_items for each row execute function public.team_items_guard();

create or replace function public.teams_guard() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.id := old.id; new.owner_id := old.owner_id; new.created_at := old.created_at; return new;
end $$;
drop trigger if exists teams_guard_trg on public.teams;
create trigger teams_guard_trg before update on public.teams for each row execute function public.teams_guard();

-- Tối đa 30 nhóm mỗi người tạo, 50 thành viên + lời mời mỗi nhóm.
create or replace function public.create_team(team_name text, team_desc text default '') returns uuid
language plpgsql security definer set search_path = '' as $$
declare tid uuid; me uuid := (select auth.uid()); mail text;
begin
  if me is null then raise exception 'Chưa đăng nhập'; end if;
  if (select count(*) from public.teams where owner_id = me) >= 30 then raise exception 'Bạn đã tạo tối đa 30 nhóm'; end if;
  if char_length(trim(coalesce(team_name,''))) = 0 then raise exception 'Cần tên nhóm'; end if;
  select email into mail from auth.users where id = me;
  insert into public.teams(name, description, owner_id) values (left(trim(team_name),120), left(coalesce(team_desc,''),2000), me) returning id into tid;
  insert into public.team_members(team_id, user_id, email, role) values (tid, me, coalesce(mail,''), 'owner');
  return tid;
end $$;
create or replace function public.add_team_member(t uuid, member_email text, member_role text default 'editor') returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid; mail text := lower(trim(member_email));
begin
  if public.team_role(t) is distinct from 'owner' then raise exception 'Chỉ chủ nhóm được thêm thành viên'; end if;
  if member_role not in ('editor','viewer') then raise exception 'Vai trò không hợp lệ'; end if;
  if mail !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' or char_length(mail) > 254 then raise exception 'Email không hợp lệ'; end if;
  if (select count(*) from public.team_members where team_id = t) + (select count(*) from public.team_invites where team_id = t) >= 50 then raise exception 'Nhóm tối đa 50 người'; end if;
  select id into uid from auth.users where lower(email) = mail and email_confirmed_at is not null;
  if uid is not null then
    insert into public.team_members(team_id, user_id, email, role) values (t, uid, mail, member_role)
    on conflict (team_id, user_id) do update set role = excluded.role where public.team_members.role <> 'owner';
    return 'added';
  end if;
  insert into public.team_invites(team_id, email, role) values (t, mail, member_role)
  on conflict (team_id, email) do update set role = excluded.role;
  return 'invited';
end $$;
-- Chỉ nhận lời mời khi email đã được xác nhận (chống đăng ký giả email người khác để chiếm lời mời).
create or replace function public.claim_team_invites() returns integer
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); mail text; n integer;
begin
  if me is null then return 0; end if;
  select lower(email) into mail from auth.users where id = me and email_confirmed_at is not null;
  if mail is null then return 0; end if;
  with moved as (
    delete from public.team_invites where email = mail returning team_id, role
  ), ins as (
    insert into public.team_members(team_id, user_id, email, role)
    select team_id, me, mail, role from moved
    on conflict (team_id, user_id) do nothing returning 1
  ) select count(*) into n from ins;
  return coalesce(n, 0);
end $$;
-- Tệp nhóm: chỉ nhận các loại tài liệu / hình ảnh / dữ liệu thường dùng.
update storage.buckets set allowed_mime_types = array[
  'application/pdf','image/png','image/jpeg','image/webp','image/gif','image/svg+xml',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/msword',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation','application/vnd.ms-powerpoint',
  'text/plain','text/csv','application/zip','application/x-zip-compressed','application/json','application/octet-stream'
] where id = 'team-files';

-- 7) Thư mục trong nhóm (Thư mục chính, thư mục con). Mỗi mục lưu thư mục ở data.folder.
alter table public.team_items drop constraint if exists team_items_kind_check;
alter table public.team_items add constraint team_items_kind_check check (kind in ('chart','file','note','folder'));

-- 8) Ảnh đại diện nhóm (ảnh PNG/JPEG/WebP nhỏ, lưu dạng data URL, tối đa ~300 KB).
alter table public.teams add column if not exists avatar text not null default '';
alter table public.teams drop constraint if exists teams_avatar_check;
alter table public.teams add constraint teams_avatar_check check (avatar = '' or (avatar ~ '^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$' and char_length(avatar) < 400000));

-- 9) Công cụ NCKH: tiến độ (mốc, việc), nhật ký thí nghiệm, tài liệu tham khảo.
alter table public.team_items drop constraint if exists team_items_kind_check;
alter table public.team_items add constraint team_items_kind_check check (kind in ('chart','file','note','folder','task','milestone','experiment','ref'));

-- 10) Lịch sử hoạt động (chỉ thêm, không ai sửa / xóa được): ai truy cập, thêm, sửa, tải lên, xóa, đổi thành viên.
create table if not exists public.team_activity (
  id bigserial primary key,
  team_id uuid not null references public.teams(id) on delete cascade,
  user_id uuid,
  email text not null default '',
  action text not null,
  item_kind text not null default '',
  item_title text not null default '',
  detail text not null default '',
  at timestamptz not null default now()
);
create index if not exists team_activity_idx on public.team_activity(team_id, at desc);
alter table public.team_activity enable row level security;
revoke all on public.team_activity from anon, authenticated;
grant select on public.team_activity to authenticated;
drop policy if exists act_select on public.team_activity;
create policy act_select on public.team_activity for select to authenticated using (public.team_role(team_id) is not null);

create or replace function public.team_log(t uuid, act text, kind text, title text, det text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid()); mail text;
begin
  select email into mail from auth.users where id = me;
  insert into public.team_activity(team_id, user_id, email, action, item_kind, item_title, detail)
  values (t, me, coalesce(mail,''), act, coalesce(kind,''), left(coalesce(title,''),200), left(coalesce(det,''),300));
end $$;
revoke all on function public.team_log(uuid,text,text,text,text) from public, anon, authenticated;

create or replace function public.team_items_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare det text := '';
begin
  if tg_op = 'INSERT' then
    perform public.team_log(new.team_id, case when new.kind = 'file' then 'upload' else 'create' end, new.kind, new.title, coalesce(new.file_name,''));
  elsif tg_op = 'UPDATE' then
    if new.title is distinct from old.title then det := 'đổi tên từ “' || left(old.title,80) || '”'; end if;
    if (new.data->>'folder') is distinct from (old.data->>'folder') then det := trim(det || ' chuyển thư mục'); end if;
    if (new.data->>'status') is distinct from (old.data->>'status') then det := trim(det || ' trạng thái → ' || coalesce(new.data->>'status','')); end if;
    if (new.data->>'done') is distinct from (old.data->>'done') then det := trim(det || case when (new.data->>'done')::boolean then ' đánh dấu xong' else ' mở lại' end); end if;
    perform public.team_log(new.team_id, 'update', new.kind, new.title, det);
  else
    -- Không ghi khi cả nhóm bị xóa (dòng nhóm đã biến mất).
    if exists (select 1 from public.teams where id = old.team_id) then
      perform public.team_log(old.team_id, 'delete', old.kind, old.title, coalesce(old.file_name,''));
    end if;
  end if;
  return null;
end $$;
drop trigger if exists team_items_audit_trg on public.team_items;
create trigger team_items_audit_trg after insert or update or delete on public.team_items for each row execute function public.team_items_audit();

create or replace function public.team_members_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public.team_log(new.team_id, 'member_add', 'member', new.email, new.role);
  elsif tg_op = 'UPDATE' then perform public.team_log(new.team_id, 'member_role', 'member', new.email, old.role || ' → ' || new.role);
  elsif exists (select 1 from public.teams where id = old.team_id) then perform public.team_log(old.team_id, 'member_remove', 'member', old.email, old.role);
  end if;
  return null;
end $$;
drop trigger if exists team_members_audit_trg on public.team_members;
create trigger team_members_audit_trg after insert or update or delete on public.team_members for each row execute function public.team_members_audit();

create or replace function public.team_invites_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'INSERT' then perform public.team_log(new.team_id, 'invite', 'member', new.email, new.role);
  end if;
  return null;
end $$;
drop trigger if exists team_invites_audit_trg on public.team_invites;
create trigger team_invites_audit_trg after insert on public.team_invites for each row execute function public.team_invites_audit();

create or replace function public.teams_audit() returns trigger
language plpgsql security definer set search_path = '' as $$
declare det text := '';
begin
  if new.name is distinct from old.name then det := 'đổi tên từ “' || left(old.name,80) || '”'; end if;
  if new.avatar is distinct from old.avatar then det := trim(det || ' đổi ảnh đại diện'); end if;
  if new.github_url is distinct from old.github_url then det := trim(det || ' đổi liên kết GitHub'); end if;
  if new.description is distinct from old.description then det := trim(det || ' sửa mô tả'); end if;
  perform public.team_log(new.id, 'team_update', 'team', new.name, det);
  return null;
end $$;
drop trigger if exists teams_audit_trg on public.teams;
create trigger teams_audit_trg after update on public.teams for each row execute function public.teams_audit();

-- Ghi lượt truy cập (tối đa 1 lần / 30 phút / người / nhóm) và lượt mở tệp.
create or replace function public.log_team_access(t uuid, what text default 'access', title text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare me uuid := (select auth.uid());
begin
  if public.team_role(t) is null then return; end if;
  if what = 'access' then
    if exists (select 1 from public.team_activity where team_id = t and user_id = me and action = 'access' and at > now() - interval '30 minutes') then return; end if;
    perform public.team_log(t, 'access', 'team', '', '');
  elsif what = 'open' then
    perform public.team_log(t, 'open', 'file', title, '');
  end if;
end $$;
revoke all on function public.log_team_access(uuid,text,text) from public, anon;
grant execute on function public.log_team_access(uuid,text,text) to authenticated;

create or replace function public.cancel_team_invite(t uuid, mail text) returns void
language plpgsql security definer set search_path = '' as $$
declare r text;
begin
  if public.team_role(t) is distinct from 'owner' then raise exception 'Chỉ chủ nhóm'; end if;
  delete from public.team_invites where team_id = t and email = lower(trim(mail)) returning role into r;
  if r is not null then perform public.team_log(t, 'invite_cancel', 'member', lower(trim(mail)), r); end if;
end $$;
