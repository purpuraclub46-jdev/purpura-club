/**
 * Catálogo canónico de permisos y roles del sistema RBAC.
 *
 * Este archivo es la fuente única de verdad para:
 *  - Las claves de permisos válidos (`PERMISSION_KEYS`).
 *  - Los metadatos de cada permiso (nombre, descripción, módulo).
 *  - Los slugs de los roles oficiales (`OFFICIAL_ROLES`).
 *  - La matriz inicial de permisos por rol que se siembra al boot.
 *
 * Reglas del sistema:
 *  - SUPER_ADMIN tiene acceso total: no se evalúa el guard de permisos.
 *  - El resto de los roles se evalúa contra los permisos efectivos del usuario,
 *    que es la unión de los permisos de sus roles y los overrides personales.
 *  - Si un permiso es marcado como `allowed=false` en `UserPermission`, gana
 *    sobre cualquier permiso heredado de un rol.
 */

// ─── Permisos ────────────────────────────────────────────────────────────

export const PERMISSION_MODULES = {
  USUARIOS: 'Usuarios',
  CLIENTES: 'Clientes',
  PRODUCTOS: 'Productos',
  INVENTARIO: 'Inventario',
  POS: 'POS',
  SORTEOS: 'Sorteos',
  REPORTES: 'Reportes',
  RBAC: 'RBAC',
} as const;

export type PermissionModule =
  (typeof PERMISSION_MODULES)[keyof typeof PERMISSION_MODULES];

export interface PermissionDefinition {
  key: string;
  name: string;
  description: string;
  module: PermissionModule;
}

export const PERMISSIONS: PermissionDefinition[] = [
  // Usuarios
  {
    key: 'users.view',
    name: 'Ver usuarios',
    description: 'Listar y consultar usuarios del sistema.',
    module: PERMISSION_MODULES.USUARIOS,
  },
  {
    key: 'users.create',
    name: 'Crear usuarios',
    description: 'Dar de alta nuevas cuentas.',
    module: PERMISSION_MODULES.USUARIOS,
  },
  {
    key: 'users.edit',
    name: 'Editar usuarios',
    description: 'Actualizar datos, roles y permisos de cuentas existentes.',
    module: PERMISSION_MODULES.USUARIOS,
  },
  {
    key: 'users.delete',
    name: 'Eliminar usuarios',
    description: 'Dar de baja cuentas de forma permanente.',
    module: PERMISSION_MODULES.USUARIOS,
  },

  // Clientes (CRM)
  {
    key: 'customers.view',
    name: 'Ver clientes',
    description: 'Listar y consultar el CRM de clientes.',
    module: PERMISSION_MODULES.CLIENTES,
  },
  {
    key: 'customers.create',
    name: 'Crear clientes',
    description: 'Dar de alta clientes manualmente o desde el POS.',
    module: PERMISSION_MODULES.CLIENTES,
  },
  {
    key: 'customers.edit',
    name: 'Editar clientes',
    description: 'Actualizar datos de contacto, notas y membresía.',
    module: PERMISSION_MODULES.CLIENTES,
  },
  {
    key: 'customers.delete',
    name: 'Eliminar clientes',
    description: 'Eliminar clientes (solo SUPER_ADMIN).',
    module: PERMISSION_MODULES.CLIENTES,
  },

  // Productos
  {
    key: 'products.view',
    name: 'Ver productos',
    description: 'Consultar el catálogo de productos.',
    module: PERMISSION_MODULES.PRODUCTOS,
  },
  {
    key: 'products.create',
    name: 'Crear productos',
    description: 'Registrar nuevos productos en el catálogo.',
    module: PERMISSION_MODULES.PRODUCTOS,
  },
  {
    key: 'products.edit',
    name: 'Editar productos',
    description: 'Modificar productos existentes y su pricing.',
    module: PERMISSION_MODULES.PRODUCTOS,
  },
  {
    key: 'products.delete',
    name: 'Eliminar productos',
    description: 'Eliminar productos del catálogo.',
    module: PERMISSION_MODULES.PRODUCTOS,
  },

  // Inventario
  {
    key: 'inventory.view',
    name: 'Ver inventario',
    description: 'Consultar niveles de stock y movimientos.',
    module: PERMISSION_MODULES.INVENTARIO,
  },
  {
    key: 'inventory.adjust',
    name: 'Ajustar inventario',
    description: 'Registrar entradas, salidas, ajustes y mermas.',
    module: PERMISSION_MODULES.INVENTARIO,
  },
  {
    key: 'inventory.transfer',
    name: 'Transferencias de inventario',
    description: 'Crear y completar transferencias entre ubicaciones.',
    module: PERMISSION_MODULES.INVENTARIO,
  },

  // POS
  {
    key: 'pos.access',
    name: 'Acceder al POS',
    description: 'Ingresar al punto de venta de su sucursal asignada.',
    module: PERMISSION_MODULES.POS,
  },
  {
    key: 'pos.sales',
    name: 'Generar ventas POS',
    description: 'Cobrar y emitir comprobantes en el POS.',
    module: PERMISSION_MODULES.POS,
  },
  {
    key: 'pos.cash.open',
    name: 'Abrir caja',
    description: 'Aperturar la caja del turno con monto inicial.',
    module: PERMISSION_MODULES.POS,
  },
  {
    key: 'pos.cash.close',
    name: 'Cerrar caja',
    description: 'Cerrar la caja del turno y conciliar movimientos.',
    module: PERMISSION_MODULES.POS,
  },
  {
    key: 'pos.cash.movements',
    name: 'Registrar ingresos/egresos de caja',
    description:
      'Registrar ingresos manuales (cambio, ajustes) o egresos (movilidad, retiros) en la sesión activa.',
    module: PERMISSION_MODULES.POS,
  },
  {
    key: 'pos.reports.view',
    name: 'Ver reportes POS',
    description:
      'Ver ventas del día, mes, ingresos/egresos y diferencias de caja de la sucursal.',
    module: PERMISSION_MODULES.POS,
  },
  {
    key: 'pos.returns.view',
    name: 'Ver devoluciones y notas de crédito',
    description:
      'Consultar historial de devoluciones, anulaciones y notas de crédito de la sucursal.',
    module: PERMISSION_MODULES.POS,
  },
  {
    key: 'pos.returns.create',
    name: 'Emitir devoluciones y notas de crédito',
    description:
      'Procesar devoluciones totales, parciales, cambios de producto y anulaciones de venta.',
    module: PERMISSION_MODULES.POS,
  },

  // Sorteos
  {
    key: 'raffles.view',
    name: 'Ver sorteos',
    description: 'Consultar sorteos, participaciones y ganadores.',
    module: PERMISSION_MODULES.SORTEOS,
  },
  {
    key: 'raffles.create',
    name: 'Crear sorteos',
    description: 'Configurar nuevos sorteos y premios.',
    module: PERMISSION_MODULES.SORTEOS,
  },
  {
    key: 'raffles.publish',
    name: 'Publicar sorteos y ganadores',
    description: 'Publicar sorteos y oficializar ganadores con foto/video.',
    module: PERMISSION_MODULES.SORTEOS,
  },

  // Reportes
  {
    key: 'reports.view',
    name: 'Ver reportes',
    description: 'Acceder a tableros, KPIs y reportes globales.',
    module: PERMISSION_MODULES.REPORTES,
  },

  // RBAC (auto-gestión del sistema)
  {
    key: 'rbac.manage',
    name: 'Administrar roles y permisos',
    description: 'Crear, editar y eliminar roles y reasignar permisos.',
    module: PERMISSION_MODULES.RBAC,
  },
];

export const PERMISSION_KEYS = PERMISSIONS.map((p) => p.key) as readonly string[];

// ─── Roles oficiales ─────────────────────────────────────────────────────

export const OFFICIAL_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN_SUCURSAL: 'admin_sucursal',
  CAJERO_POS: 'cajero_pos',
  INVENTARIO: 'inventario',
} as const;

export type OfficialRoleSlug =
  (typeof OFFICIAL_ROLES)[keyof typeof OFFICIAL_ROLES];

export interface OfficialRoleDefinition {
  slug: OfficialRoleSlug;
  name: string;
  description: string;
  /** Lista de permisos por defecto. SUPER_ADMIN siempre recibe todos. */
  permissions: 'ALL' | string[];
}

export const OFFICIAL_ROLE_DEFINITIONS: OfficialRoleDefinition[] = [
  {
    slug: OFFICIAL_ROLES.SUPER_ADMIN,
    name: 'Super Administrador',
    description: 'Acceso total al sistema, sin restricción de sucursal.',
    permissions: 'ALL',
  },
  {
    slug: OFFICIAL_ROLES.ADMIN_SUCURSAL,
    name: 'Administrador de Sucursal',
    description:
      'Gestiona usuarios, inventario y ventas únicamente de su sucursal asignada.',
    permissions: [
      'users.view',
      'users.create',
      'users.edit',
      'customers.view',
      'customers.create',
      'customers.edit',
      'products.view',
      'products.edit',
      'inventory.view',
      'inventory.adjust',
      'inventory.transfer',
      'pos.access',
      'pos.sales',
      'pos.cash.open',
      'pos.cash.close',
      'pos.cash.movements',
      'pos.reports.view',
      'pos.returns.view',
      'pos.returns.create',
      'raffles.view',
      'reports.view',
    ],
  },
  {
    slug: OFFICIAL_ROLES.CAJERO_POS,
    name: 'Cajero POS',
    description: 'Operador del punto de venta y caja en la sucursal asignada.',
    permissions: [
      'pos.access',
      'pos.sales',
      'pos.cash.open',
      'pos.cash.close',
      'pos.cash.movements',
      'pos.reports.view',
      'pos.returns.view',
      'pos.returns.create',
      'products.view',
      'inventory.view',
      'customers.view',
      'customers.create',
      'customers.edit',
    ],
  },
  {
    slug: OFFICIAL_ROLES.INVENTARIO,
    name: 'Encargado de Inventario',
    description:
      'Gestiona stock, movimientos y transferencias de su ubicación asignada.',
    permissions: [
      'inventory.view',
      'inventory.adjust',
      'inventory.transfer',
      'products.view',
    ],
  },
];

// ─── Mapeo de nivel de acceso legacy ─────────────────────────────────────

/**
 * Mapea el rol RBAC dinámico al enum `Role` legacy del campo `User.role`.
 * El enum legacy se sigue usando para guardas existentes en el resto del API
 * y para emitir un JWT con un nivel coarse-grained.
 */
export const ROLE_SLUG_TO_LEGACY: Record<OfficialRoleSlug, 'USER' | 'ADMIN' | 'SUPER_ADMIN'> = {
  [OFFICIAL_ROLES.SUPER_ADMIN]: 'SUPER_ADMIN',
  [OFFICIAL_ROLES.ADMIN_SUCURSAL]: 'ADMIN',
  [OFFICIAL_ROLES.CAJERO_POS]: 'ADMIN',
  [OFFICIAL_ROLES.INVENTARIO]: 'ADMIN',
};
