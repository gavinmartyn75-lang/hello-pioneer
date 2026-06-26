-- RLS is already enabled; drop the previous catch-all policy and replace with explicit ones
drop policy if exists "Users can manage their own notes" on notes;

create policy "anyone can read notes"
  on notes
  for select
  using (true);

create policy "anyone can write a note"
  on notes
  for insert
  with check (true);
