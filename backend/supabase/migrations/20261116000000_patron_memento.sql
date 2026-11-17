-- Migración para soporte completo en PostgreSQL del Patrón Memento (Gestión de Ahorro)
-- 1. Tabla de snapshots (Mementos) de metas de ahorro
CREATE TABLE IF NOT EXISTS "public"."meta_mementos" (
  "id"             uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "meta_id"        uuid                     NOT NULL,
  "monto_actual"   numeric(12,2)            NOT NULL DEFAULT 0,
  "estado"         text                     NOT NULL DEFAULT 'EN_PROGRESO',
  "fecha_registro" timestamp with time zone NOT NULL DEFAULT now(),
  "nota"           text,
  "aportes_ids"    jsonb                    DEFAULT '[]'::jsonb,
  "creado_en"      timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "meta_mementos_pkey" PRIMARY KEY (id),
  CONSTRAINT "meta_mementos_meta_id_fkey" FOREIGN KEY (meta_id)
    REFERENCES public.metas(id) ON DELETE CASCADE DEFERRABLE
);

ALTER TABLE "public"."meta_mementos" ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para meta_mementos vinculadas al usuario propietario de la meta
CREATE POLICY "ver_mementos_propios" ON "public"."meta_mementos"
  FOR SELECT
  TO PUBLIC
  USING ((meta_id IN (
    SELECT metas.id FROM public.metas WHERE (metas.usuario_id = auth.uid())
  )));

CREATE POLICY "crear_mementos_propios" ON "public"."meta_mementos"
  FOR INSERT
  TO PUBLIC
  WITH CHECK ((meta_id IN (
    SELECT metas.id FROM public.metas WHERE (metas.usuario_id = auth.uid())
  )));

CREATE POLICY "eliminar_mementos_propios" ON "public"."meta_mementos"
  FOR DELETE
  TO PUBLIC
  USING ((meta_id IN (
    SELECT metas.id FROM public.metas WHERE (metas.usuario_id = auth.uid())
  )));

GRANT DELETE, INSERT, SELECT, UPDATE ON TABLE "public"."meta_mementos"
  TO "anon", "authenticated", "postgres", "service_role";

-- 2. Política de eliminación en aportes para permitir deshacer/restaurar aportes desde Memento
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'aportes'
      AND policyname = 'eliminar_aportes_propios'
  ) THEN
    CREATE POLICY "eliminar_aportes_propios" ON "public"."aportes"
      FOR DELETE
      TO PUBLIC
      USING ((meta_id IN (
        SELECT metas.id FROM public.metas WHERE (metas.usuario_id = auth.uid())
      )));
  END IF;
END $$;
