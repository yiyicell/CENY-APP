ALTER TABLE "public"."categorias"
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "public"."categorias"
  DROP COLUMN "descripcion";

ALTER TABLE "public"."categorias"
  DROP COLUMN "icono";

CREATE TABLE "public"."aportes" (
  "id"           uuid                     NOT NULL,
  "meta_id"      uuid                     NOT NULL,
  "valor"        numeric(12,2)            NOT NULL,
  "fecha_aporte" date                     NOT NULL,
  "creado_en"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "aportes_pkey" PRIMARY KEY (id),
  CONSTRAINT "aportes_valor_check" CHECK ((valor > (0)::numeric))
);

ALTER TABLE "public"."aportes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."gastos" (
  "id"           uuid                     NOT NULL,
  "usuario_id"   uuid                     NOT NULL,
  "categoria_id" uuid                     NOT NULL,
  "valor"        numeric(12,2)            NOT NULL,
  "fecha_gasto"  date                     NOT NULL,
  "descripcion"  text,
  "creado_en"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "gastos_pkey" PRIMARY KEY (id),
  CONSTRAINT "gastos_valor_check" CHECK ((valor > (0)::numeric))
);

ALTER TABLE "public"."gastos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."ingresos" (
  "id"            uuid                     NOT NULL,
  "usuario_id"    uuid                     NOT NULL,
  "descripcion"   text,
  "valor"         numeric(12,2)            NOT NULL,
  "fecha_ingreso" date                     NOT NULL,
  "creado_en"     timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "ingresos_pkey" PRIMARY KEY (id),
  CONSTRAINT "ingresos_valor_check" CHECK ((valor > (0)::numeric))
);

ALTER TABLE "public"."ingresos"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."metas" (
  "id"             uuid                     NOT NULL,
  "usuario_id"     uuid                     NOT NULL,
  "valor_objetivo" numeric(12,2)            NOT NULL,
  "nombre"         text                     NOT NULL,
  "fecha_objetivo" date                     NOT NULL,
  "creado_en"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "metas_pkey" PRIMARY KEY (id),
  CONSTRAINT "metas_valor_objetivo_check" CHECK ((valor_objetivo > (0)::numeric))
);

ALTER TABLE "public"."metas"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."prioridades_personalizadas" (
  "usuario_id"   uuid                     NOT NULL,
  "categoria_id" uuid                     NOT NULL,
  "creado_en"    timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "prioridades_personalizadas_pkey" PRIMARY KEY (usuario_id, categoria_id)
);

ALTER TABLE "public"."prioridades_personalizadas"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "public"."usuarios" (
  "id"        uuid                     NOT NULL,
  "nombre"    text                     NOT NULL,
  "creado_en" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "usuarios_pkey" PRIMARY KEY (id)
);

ALTER TABLE "public"."usuarios"
  ENABLE ROW LEVEL SECURITY;

ALTER TABLE "public"."categorias"
  ADD COLUMN "usuario_id" uuid;

ALTER TABLE "public"."categorias"
  ALTER COLUMN "creado_en" SET DEFAULT now();

CREATE TYPE "public"."estado_meta" AS ENUM (
  'por_cumplir',
  'no_cumplido',
  'cumplido'
);

ALTER TABLE "public"."metas"
  ADD COLUMN "estado" public.estado_meta NOT NULL DEFAULT 'por_cumplir'::public.estado_meta;

CREATE TYPE "public"."prioridad" AS ENUM (
  'alta',
  'media',
  'baja'
);

ALTER TABLE "public"."categorias"
  ADD COLUMN "prioridad" public.prioridad NOT NULL;

ALTER TABLE "public"."prioridades_personalizadas"
  ADD COLUMN "prioridad" public.prioridad NOT NULL;

CREATE TYPE "public"."tipo_frecuencia" AS ENUM (
  'mensual',
  'quincenal'
);

ALTER TABLE "public"."gastos"
  ADD COLUMN "frecuencia" public.tipo_frecuencia;

ALTER TABLE "public"."metas"
  ADD COLUMN "frecuencia_ahorro" public.tipo_frecuencia NOT NULL;

ALTER TABLE "public"."gastos"
  ADD CONSTRAINT "gastos_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) DEFERRABLE;

ALTER TABLE "public"."aportes"
  ADD CONSTRAINT "aportes_meta_id_fkey" FOREIGN KEY (meta_id) REFERENCES public.metas(id) ON DELETE CASCADE DEFERRABLE;

ALTER TABLE "public"."prioridades_personalizadas"
  ADD CONSTRAINT "prioridades_personalizadas_categoria_id_fkey" FOREIGN KEY (categoria_id) REFERENCES public.categorias(id) ON DELETE CASCADE DEFERRABLE;

ALTER TABLE "public"."usuarios"
  ADD CONSTRAINT "usuarios_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "public"."categorias"
  ADD CONSTRAINT "categorias_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE DEFERRABLE;

ALTER TABLE "public"."gastos"
  ADD CONSTRAINT "gastos_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE DEFERRABLE;

ALTER TABLE "public"."ingresos"
  ADD CONSTRAINT "ingresos_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE DEFERRABLE;

ALTER TABLE "public"."metas"
  ADD CONSTRAINT "metas_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE DEFERRABLE;

ALTER TABLE "public"."prioridades_personalizadas"
  ADD CONSTRAINT "prioridades_personalizadas_usuario_id_fkey" FOREIGN KEY (usuario_id) REFERENCES public.usuarios(id) ON DELETE CASCADE DEFERRABLE;

CREATE POLICY "crear_aportes" ON "public"."aportes"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((meta_id IN ( SELECT metas.id
   FROM public.metas
  WHERE (metas.usuario_id = auth.uid()))));

CREATE POLICY "editar_aportes_propios" ON "public"."aportes"
  FOR UPDATE
  TO PUBLIC
  USING ((meta_id IN ( SELECT metas.id
   FROM public.metas
  WHERE (metas.usuario_id = auth.uid()))))
  WITH CHECK ((meta_id IN ( SELECT metas.id
   FROM public.metas
  WHERE (metas.usuario_id = auth.uid()))));

CREATE POLICY "ver_aportes_usuarios" ON "public"."aportes"
  FOR SELECT
  TO PUBLIC
  USING ((meta_id IN ( SELECT metas.id
   FROM public.metas
  WHERE (metas.usuario_id = auth.uid()))));

CREATE POLICY "crear_categoria" ON "public"."categorias"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "editar_categorias_propios" ON "public"."categorias"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = usuario_id))
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "eliminar_categoria" ON "public"."categorias"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "ver_categorias" ON "public"."categorias"
  FOR SELECT
  TO PUBLIC
  USING (((usuario_id IS NULL) OR (usuario_id = auth.uid())));

CREATE POLICY "crear_gastos_propios" ON "public"."gastos"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "editar_gastos_propios" ON "public"."gastos"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = usuario_id))
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "eliminar_gasto" ON "public"."gastos"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "ver_gastos_usuarios" ON "public"."gastos"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "crear_ingresos_propios" ON "public"."ingresos"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "editar_ingresos_propios" ON "public"."ingresos"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = usuario_id))
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "ver_ingresos_usuarios" ON "public"."ingresos"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "crear_metas_propias" ON "public"."metas"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "editar_metas_propios" ON "public"."metas"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = usuario_id))
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "eliminar_metas" ON "public"."metas"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "ver_metas_usuarios" ON "public"."metas"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "crear_prioridades_personalizadas" ON "public"."prioridades_personalizadas"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((auth.uid() = usuario_id));

CREATE POLICY "eliminar_prioridades_personalizadas" ON "public"."prioridades_personalizadas"
  FOR DELETE
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "ver_prioridades" ON "public"."prioridades_personalizadas"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = usuario_id));

CREATE POLICY "editar_usuario" ON "public"."usuarios"
  FOR UPDATE
  TO PUBLIC
  USING ((auth.uid() = id))
  WITH CHECK ((auth.uid() = id));

CREATE POLICY "usuarios_ver_propio" ON "public"."usuarios"
  FOR SELECT
  TO PUBLIC
  USING ((auth.uid() = id));

COMMENT ON COLUMN "public"."usuarios"."id" IS 'Es el mismo de Supabase Auth';

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."aportes" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."gastos" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."ingresos" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."metas" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."prioridades_personalizadas" TO "anon", "authenticated", "postgres", "service_role";

GRANT DELETE, INSERT, MAINTAIN, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON TABLE "public"."usuarios" TO "anon", "authenticated", "postgres", "service_role";

GRANT USAGE ON TYPE "public"."estado_meta" TO "postgres";

GRANT USAGE ON TYPE "public"."prioridad" TO "postgres";

GRANT USAGE ON TYPE "public"."tipo_frecuencia" TO "postgres";
