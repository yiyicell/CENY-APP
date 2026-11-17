create policy "crear_usuarios"
on usuarios for insert
with check (auth.uid() = id);