-- MY LAB: chạy MỘT LẦN trong Supabase → SQL Editor → New query → Run.
-- An toàn khi chạy lại nhiều lần.

-- 1) Dữ liệu lab: mỗi tài khoản một dòng, chỉ chủ tài khoản đọc/ghi được.
create table if not exists public.lab_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  version integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint lab_state_size check (pg_column_size(data) < 8000000)
);
alter table public.lab_state enable row level security;
revoke all on public.lab_state from anon;
grant select, insert, update, delete on public.lab_state to authenticated;

drop policy if exists "lab_state_select_own" on public.lab_state;
drop policy if exists "lab_state_insert_own" on public.lab_state;
drop policy if exists "lab_state_update_own" on public.lab_state;
drop policy if exists "lab_state_delete_own" on public.lab_state;
create policy "lab_state_select_own" on public.lab_state for select to authenticated using (user_id = (select auth.uid()));
create policy "lab_state_insert_own" on public.lab_state for insert to authenticated with check (user_id = (select auth.uid()));
create policy "lab_state_update_own" on public.lab_state for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "lab_state_delete_own" on public.lab_state for delete to authenticated using (user_id = (select auth.uid()));

-- 2) Kho tệp tài liệu: riêng tư, mỗi người chỉ thấy thư mục mang id của mình, tối đa 50 MB / tệp.
insert into storage.buckets (id, name, public, file_size_limit)
values ('lab-files', 'lab-files', false, 52428800)
on conflict (id) do update set public = false, file_size_limit = 52428800;

drop policy if exists "lab_files_select_own" on storage.objects;
drop policy if exists "lab_files_insert_own" on storage.objects;
drop policy if exists "lab_files_update_own" on storage.objects;
drop policy if exists "lab_files_delete_own" on storage.objects;
create policy "lab_files_select_own" on storage.objects for select to authenticated using (bucket_id = 'lab-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "lab_files_insert_own" on storage.objects for insert to authenticated with check (bucket_id = 'lab-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "lab_files_update_own" on storage.objects for update to authenticated using (bucket_id = 'lab-files' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "lab_files_delete_own" on storage.objects for delete to authenticated using (bucket_id = 'lab-files' and (storage.foldername(name))[1] = (select auth.uid())::text);

-- 3) Chỉ một chủ lab: sau khi có tài khoản đầu tiên, mọi đăng ký mới bị từ chối.
create or replace function public.lab_single_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if exists (select 1 from auth.users) then
    raise exception 'Signups not allowed: lab already has an owner';
  end if;
  return new;
end;
$$;
drop trigger if exists lab_single_owner_trg on auth.users;
create trigger lab_single_owner_trg before insert on auth.users
for each row execute function public.lab_single_owner();
