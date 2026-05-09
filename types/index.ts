export type Rol = 'admin' | 'cliente'

export interface Perfil {
  id: string
  nombre: string
  email: string
  rol: Rol
  telefono?: string
  activo: boolean
  created_at: string
}

export interface Cliente {
  id: string
  user_id?: string
  nombre: string
  apellido: string
  telefono?: string
  email?: string
  dni?: string
  direccion?: string
  notas?: string
  activo: boolean
  created_at: string
  updated_at: string
  // computed
  deuda_total?: number
  prestamos_activos?: number
}

export interface Prestamo {
  id: string
  cliente_id: string
  descripcion: string
  monto_total: number
  monto_pagado: number
  cantidad_cuotas: number
  cuotas_pagadas: number
  monto_cuota: number
  fecha_inicio: string
  fecha_vencimiento?: string
  estado: 'activo' | 'pagado' | 'vencido' | 'cancelado'
  notas?: string
  created_at: string
  updated_at: string
  // join
  cliente?: Cliente
}

export interface Pago {
  id: string
  prestamo_id: string
  cliente_id: string
  monto: number
  fecha_pago: string
  numero_cuota?: number
  metodo_pago: 'efectivo' | 'transferencia' | 'tarjeta' | 'otro'
  notas?: string
  created_at: string
  // join
  prestamo?: Prestamo
  cliente?: Cliente
}

export interface ResumenAdmin {
  total_clientes: number
  clientes_al_dia: number
  clientes_con_deuda: number
  total_prestado: number
  total_cobrado: number
  total_pendiente: number
  pagos_hoy: number
  ingresos_hoy: number
}
