CREATE TYPE "prioridad" AS ENUM (
  'alta',
  'media',
  'baja'
);

CREATE TYPE "tipo_frecuencia" AS ENUM (
  'mensual',
  'quincenal'
);

CREATE TYPE "estado_meta" AS ENUM (
  'por_cumplir',
  'no_cumplido',
  'cumplido'
);

CREATE TABLE "usuarios" (
  "id" uuid PRIMARY KEY,
  "nombre" text NOT NULL,
  "creado_en" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "categorias" (
  "id" uuid PRIMARY KEY,
  "nombre" text NOT NULL,
  "prioridad" prioridad NOT NULL,
  "usuario_id" uuid,
  "creado_en" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "prioridades_personalizadas" (
  "usuario_id" uuid NOT NULL,
  "categoria_id" uuid NOT NULL,
  "prioridad" prioridad NOT NULL,
  "creado_en" timestamptz NOT NULL DEFAULT (now()),
  PRIMARY KEY ("usuario_id", "categoria_id")
);

CREATE TABLE "metas" (
  "id" uuid PRIMARY KEY,
  "usuario_id" uuid NOT NULL,
  "valor_objetivo" numeric(12,2) NOT NULL,
  "estado" estado_meta NOT NULL DEFAULT 'por_cumplir',
  "nombre" text NOT NULL,
  "frecuencia_ahorro" tipo_frecuencia NOT NULL,
  "fecha_objetivo" date NOT NULL,
  "creado_en" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "aportes" (
  "id" uuid PRIMARY KEY,
  "meta_id" uuid NOT NULL,
  "valor" numeric(12,2) NOT NULL,
  "fecha_aporte" date NOT NULL,
  "creado_en" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "ingresos" (
  "id" uuid PRIMARY KEY,
  "usuario_id" uuid NOT NULL,
  "descripcion" text,
  "valor" numeric(12,2) NOT NULL,
  "fecha_ingreso" date NOT NULL,
  "creado_en" timestamptz NOT NULL DEFAULT (now())
);

CREATE TABLE "gastos" (
  "id" uuid PRIMARY KEY,
  "usuario_id" uuid NOT NULL,
  "categoria_id" uuid NOT NULL,
  "valor" numeric(12,2) NOT NULL,
  "fecha_gasto" date NOT NULL,
  "descripcion" text,
  "frecuencia" tipo_frecuencia,
  "creado_en" timestamptz NOT NULL DEFAULT (now())
);

COMMENT ON COLUMN "usuarios"."id" IS 'Es el mismo de Supabase Auth';

ALTER TABLE "usuarios" ADD FOREIGN KEY ("id") REFERENCES auth.users ("id") ON DELETE CASCADE;

ALTER TABLE "categorias" ADD FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "prioridades_personalizadas" ADD FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "prioridades_personalizadas" ADD FOREIGN KEY ("categoria_id") REFERENCES "categorias" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "metas" ADD FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "aportes" ADD FOREIGN KEY ("meta_id") REFERENCES "metas" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "ingresos" ADD FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gastos" ADD FOREIGN KEY ("usuario_id") REFERENCES "usuarios" ("id") ON DELETE CASCADE DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gastos" ADD FOREIGN KEY ("categoria_id") REFERENCES "categorias" ("id") DEFERRABLE INITIALLY IMMEDIATE;

ALTER TABLE "gastos" ADD CHECK ("valor" > 0);
ALTER TABLE "ingresos" ADD CHECK ("valor" > 0);
ALTER TABLE "aportes" ADD CHECK ("valor" > 0);
ALTER TABLE "metas" ADD CHECK ("valor_objetivo" > 0);

INSERT INTO "categorias" ("id", "nombre", "prioridad", "usuario_id")
VALUES (gen_random_uuid(), 'Otros', 'media', NULL);