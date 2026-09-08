CREATE TABLE public.categorias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  icono TEXT,
  creado_en TIMESTAMP WITH TIME ZONE DEFAULT timezone ('utc'::text, now()) NOT NULL
);