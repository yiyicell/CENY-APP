-- Politicas de visualización
create policy "usuarios_ver_propio"
on usuarios  for select
using (auth.uid() = id);

create policy "ver_gastos_usuarios"
on gastos for select
using (auth.uid()= usuario_id);

create policy "ver_ingresos_usuarios"
on ingresos for select
using (auth.uid() = usuario_id);

create policy "ver_metas_usuarios"
on metas for select
using (auth.uid() = usuario_id);

create policy "ver_aportes_usuarios"
on aportes for select
using (
  meta_id in (
    select id
    from metas
    where usuario_id = auth.uid()
  )
);

create policy "ver_categorias"
on categorias for select
using (
  usuario_id is null
  or
  usuario_id = auth.uid()
);

create policy "ver_prioridades"
on prioridades_personalizadas for select
using (auth.uid() = usuario_id);

-- Politicas de creación 
create policy "crear_gastos_propios"
on gastos for insert
with check (auth.uid() = usuario_id);

create policy "crear_metas_propias"
on metas for insert 
with check (auth.uid() = usuario_id);

create policy "crear_ingresos_propios"
on ingresos for insert
with check (auth.uid() = usuario_id);

create policy "crear_categoria"
on categorias for insert
with check (auth.uid() = usuario_id);

create policy "crear_prioridades_personalizadas"
on prioridades_personalizadas for insert
with check (auth.uid() = usuario_id);

create policy "crear_aportes"
on aportes for insert
with check (
  meta_id in (
    select id
    from metas
    where usuario_id = auth.uid()
  )
);

-- Politica de Actualización
create policy "editar_usuario"
on usuarios for update
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "editar_gastos_propios"
on gastos for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "editar_metas_propios"
on metas for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "editar_ingresos_propios"
on ingresos for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "editar_categorias_propios"
on categorias for update
using (auth.uid() = usuario_id)
with check (auth.uid() = usuario_id);

create policy "editar_aportes_propios"
on aportes for update
using (
  meta_id in (
    select id 
    from metas 
    where usuario_id = auth.uid()
    )
)
with check (
  meta_id in (
    select id 
    from metas 
    where usuario_id = auth.uid()
    )
);

-- Politica de Eliminación
create policy "eliminar_gasto"
on gastos for delete
using (auth.uid() = usuario_id);

create policy "eliminar_categoria"
on categorias for delete
using (auth.uid() = usuario_id);

create policy "eliminar_metas"
on metas for delete
using (auth.uid() = usuario_id);

create policy "eliminar_prioridades_personalizadas"
on prioridades_personalizadas for delete
using (auth.uid() = usuario_id);