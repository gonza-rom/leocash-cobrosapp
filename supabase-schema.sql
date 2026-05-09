-- ================================================================
-- DevHub Cobros — Schema completo
-- Ejecutar en: Supabase Dashboard → SQL Editor → New Query
-- ================================================================

-- 1. Tabla de perfiles (extiende auth.users)
CREATE TABLE IF NOT EXISTS public.perfiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nombre      TEXT NOT NULL,
  email       TEXT NOT NULL,
  rol         TEXT NOT NULL DEFAULT 'cliente' CHECK (rol IN ('admin', 'cliente')),
  telefono    TEXT,
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tabla de clientes (gestionados por admin)
CREATE TABLE IF NOT EXISTS public.clientes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- si tiene login
  nombre      TEXT NOT NULL,
  apellido    TEXT NOT NULL,
  telefono    TEXT,
  email       TEXT,
  dni         TEXT,
  direccion   TEXT,
  notas       TEXT,
  activo      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Tabla de préstamos
CREATE TABLE IF NOT EXISTS public.prestamos (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cliente_id        UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  descripcion       TEXT NOT NULL,
  monto_total       NUMERIC(12,2) NOT NULL,
  monto_pagado      NUMERIC(12,2) DEFAULT 0,
  cantidad_cuotas   INT NOT NULL DEFAULT 1,
  cuotas_pagadas    INT DEFAULT 0,
  monto_cuota       NUMERIC(12,2) NOT NULL,
  fecha_inicio      DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_vencimiento DATE,
  estado            TEXT DEFAULT 'activo' CHECK (estado IN ('activo', 'pagado', 'vencido', 'cancelado')),
  notas             TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  updated_at        TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Tabla de pagos
CREATE TABLE IF NOT EXISTS public.pagos (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prestamo_id  UUID NOT NULL REFERENCES public.prestamos(id) ON DELETE CASCADE,
  cliente_id   UUID NOT NULL REFERENCES public.clientes(id) ON DELETE CASCADE,
  monto        NUMERIC(12,2) NOT NULL,
  fecha_pago   DATE NOT NULL DEFAULT CURRENT_DATE,
  numero_cuota INT,
  metodo_pago  TEXT DEFAULT 'efectivo' CHECK (metodo_pago IN ('efectivo', 'transferencia', 'tarjeta', 'otro')),
  notas        TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================================
-- TRIGGERS para actualizar monto_pagado y cuotas_pagadas
-- ================================================================
CREATE OR REPLACE FUNCTION actualizar_prestamo_tras_pago()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.prestamos
  SET
    monto_pagado   = (SELECT COALESCE(SUM(monto), 0) FROM public.pagos WHERE prestamo_id = NEW.prestamo_id),
    cuotas_pagadas = (SELECT COUNT(*) FROM public.pagos WHERE prestamo_id = NEW.prestamo_id),
    estado = CASE
      WHEN (SELECT COALESCE(SUM(monto), 0) FROM public.pagos WHERE prestamo_id = NEW.prestamo_id) >= monto_total THEN 'pagado'
      ELSE estado
    END,
    updated_at = NOW()
  WHERE id = NEW.prestamo_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_pago_insertado
  AFTER INSERT OR DELETE ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION actualizar_prestamo_tras_pago();

-- Trigger updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER clientes_updated_at BEFORE UPDATE ON public.clientes FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER prestamos_updated_at BEFORE UPDATE ON public.prestamos FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ================================================================
-- TRIGGER: crear perfil automáticamente al registrar usuario
-- ================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre, email, rol)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'nombre', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'rol', 'cliente')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================
ALTER TABLE public.perfiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos     ENABLE ROW LEVEL SECURITY;

-- Perfiles: cada uno ve el suyo; admin ve todos
CREATE POLICY "perfil_propio" ON public.perfiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "admin_perfiles" ON public.perfiles FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);

-- Clientes: solo admin
CREATE POLICY "admin_clientes" ON public.clientes FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);
-- Cliente ve su propio registro
CREATE POLICY "cliente_ve_suyo" ON public.clientes FOR SELECT USING (user_id = auth.uid());

-- Préstamos: admin ve todos; cliente ve los suyos
CREATE POLICY "admin_prestamos" ON public.prestamos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "cliente_prestamos" ON public.prestamos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clientes WHERE id = cliente_id AND user_id = auth.uid())
);

-- Pagos: admin ve todos; cliente ve los suyos
CREATE POLICY "admin_pagos" ON public.pagos FOR ALL USING (
  EXISTS (SELECT 1 FROM public.perfiles WHERE id = auth.uid() AND rol = 'admin')
);
CREATE POLICY "cliente_pagos" ON public.pagos FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.clientes WHERE id = cliente_id AND user_id = auth.uid())
);

-- ================================================================
-- DATOS DE PRUEBA (opcional, comentar en producción)
-- ================================================================
-- Ejecutar DESPUÉS de crear el usuario admin en Supabase Auth
-- INSERT INTO public.perfiles (id, nombre, email, rol)
-- VALUES ('UUID-DE-TU-USUARIO', 'Administrador', 'admin@devhub.com', 'admin')
-- ON CONFLICT (id) DO UPDATE SET rol = 'admin';
