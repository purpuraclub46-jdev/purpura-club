/*
 * Seed inicial Púrpura Club — Inventario multi-ubicación
 * ─────────────────────────────────────────────────────────
 * - Es idempotente: usar las claves naturales (slug, sku) para upserts.
 * - Crea ubicaciones de inventario (ECOMMERCE + SUCURSAL), el árbol
 *   jerárquico de categorías, productos demo premium, stock independiente
 *   por ubicación e historial inicial de movimientos.
 */

import {
  CategoryGroup,
  InventoryLocationType,
  InventoryMovementType,
  Prisma,
  PrismaClient,
  ReceiptSeriesType,
  Role,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── RBAC catálogo (espejo de src/modules/rbac/rbac.constants.ts) ────────
// Se duplica aquí únicamente porque el seed se ejecuta con un tsconfig
// aislado. La sincronización real en producción la hace `RbacBootstrap` en
// el arranque del API; este bloque garantiza que `db:seed` también deje el
// catálogo listo en entornos cleanos.

const SEED_PERMISSIONS: Array<{
  key: string;
  name: string;
  description: string;
  module: string;
}> = [
  { key: 'users.view', name: 'Ver usuarios', description: 'Listar y consultar usuarios.', module: 'Usuarios' },
  { key: 'users.create', name: 'Crear usuarios', description: 'Dar de alta cuentas.', module: 'Usuarios' },
  { key: 'users.edit', name: 'Editar usuarios', description: 'Actualizar datos, roles y permisos.', module: 'Usuarios' },
  { key: 'users.delete', name: 'Eliminar usuarios', description: 'Dar de baja cuentas.', module: 'Usuarios' },
  { key: 'customers.view', name: 'Ver clientes', description: 'Listar y consultar el CRM de clientes.', module: 'Clientes' },
  { key: 'customers.create', name: 'Crear clientes', description: 'Dar de alta clientes manualmente o desde el POS.', module: 'Clientes' },
  { key: 'customers.edit', name: 'Editar clientes', description: 'Actualizar datos, notas y membresía.', module: 'Clientes' },
  { key: 'customers.delete', name: 'Eliminar clientes', description: 'Eliminar clientes (solo SUPER_ADMIN).', module: 'Clientes' },
  { key: 'products.view', name: 'Ver productos', description: 'Consultar catálogo.', module: 'Productos' },
  { key: 'products.create', name: 'Crear productos', description: 'Registrar productos.', module: 'Productos' },
  { key: 'products.edit', name: 'Editar productos', description: 'Modificar productos.', module: 'Productos' },
  { key: 'products.delete', name: 'Eliminar productos', description: 'Eliminar productos.', module: 'Productos' },
  { key: 'inventory.view', name: 'Ver inventario', description: 'Consultar stock.', module: 'Inventario' },
  { key: 'inventory.adjust', name: 'Ajustar inventario', description: 'Movimientos y mermas.', module: 'Inventario' },
  { key: 'inventory.transfer', name: 'Transferencias', description: 'Transferir entre ubicaciones.', module: 'Inventario' },
  { key: 'pos.access', name: 'Acceder al POS', description: 'Ingresar al POS asignado.', module: 'POS' },
  { key: 'pos.sales', name: 'Generar ventas POS', description: 'Cobrar y emitir comprobantes.', module: 'POS' },
  { key: 'pos.cash.open', name: 'Abrir caja', description: 'Aperturar caja.', module: 'POS' },
  { key: 'pos.cash.close', name: 'Cerrar caja', description: 'Cerrar caja.', module: 'POS' },
  { key: 'pos.cash.movements', name: 'Registrar ingresos/egresos de caja', description: 'Ingresos y egresos manuales.', module: 'POS' },
  { key: 'pos.reports.view', name: 'Ver reportes POS', description: 'KPIs de la sucursal.', module: 'POS' },
  { key: 'raffles.view', name: 'Ver sorteos', description: 'Consultar sorteos y ganadores.', module: 'Sorteos' },
  { key: 'raffles.create', name: 'Crear sorteos', description: 'Configurar sorteos.', module: 'Sorteos' },
  { key: 'raffles.publish', name: 'Publicar sorteos y ganadores', description: 'Oficializar ganadores.', module: 'Sorteos' },
  { key: 'reports.view', name: 'Ver reportes', description: 'Tableros y KPIs.', module: 'Reportes' },
  { key: 'rbac.manage', name: 'Administrar roles y permisos', description: 'CRUD de roles y reasignación.', module: 'RBAC' },
];

const SEED_ROLES: Array<{
  slug: string;
  name: string;
  description: string;
  permissions: 'ALL' | string[];
}> = [
  {
    slug: 'super_admin',
    name: 'Super Administrador',
    description: 'Acceso total al sistema, sin restricción de sucursal.',
    permissions: 'ALL',
  },
  {
    slug: 'admin_sucursal',
    name: 'Administrador de Sucursal',
    description: 'Gestiona usuarios, inventario y ventas únicamente de su sucursal asignada.',
    permissions: [
      'users.view', 'users.create', 'users.edit',
      'customers.view', 'customers.create', 'customers.edit',
      'products.view', 'products.edit',
      'inventory.view', 'inventory.adjust', 'inventory.transfer',
      'pos.access', 'pos.sales', 'pos.cash.open', 'pos.cash.close',
      'pos.cash.movements', 'pos.reports.view',
      'raffles.view', 'reports.view',
    ],
  },
  {
    slug: 'cajero_pos',
    name: 'Cajero POS',
    description: 'Operador del punto de venta y caja en la sucursal asignada.',
    permissions: [
      'pos.access', 'pos.sales', 'pos.cash.open', 'pos.cash.close',
      'pos.cash.movements', 'pos.reports.view',
      'products.view', 'inventory.view',
      'customers.view', 'customers.create', 'customers.edit',
    ],
  },
  {
    slug: 'inventario',
    name: 'Encargado de Inventario',
    description: 'Gestiona stock, movimientos y transferencias de su ubicación asignada.',
    permissions: [
      'inventory.view', 'inventory.adjust', 'inventory.transfer',
      'products.view',
    ],
  },
];

async function seedRbac(): Promise<{ superAdminRoleId: string }> {
  console.log('• Catálogo RBAC (permisos y roles oficiales)');

  for (const p of SEED_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key: p.key },
      create: p,
      update: { name: p.name, description: p.description, module: p.module },
    });
  }
  console.log(`  ✓ ${SEED_PERMISSIONS.length} permisos sincronizados`);

  const allPerms = await prisma.permission.findMany({
    select: { id: true, key: true },
  });
  const idByKey = new Map(allPerms.map((p) => [p.key, p.id]));

  let superAdminRoleId = '';
  for (const def of SEED_ROLES) {
    const role = await prisma.appRole.upsert({
      where: { slug: def.slug },
      create: {
        slug: def.slug,
        name: def.name,
        description: def.description,
        active: true,
      },
      update: {
        name: def.name,
        description: def.description,
        active: true,
      },
    });

    if (def.slug === 'super_admin') superAdminRoleId = role.id;

    const targetIds =
      def.permissions === 'ALL'
        ? allPerms.map((p) => p.id)
        : def.permissions
            .map((k) => idByKey.get(k))
            .filter((id): id is string => !!id);

    // Reemplazo total de permisos por rol oficial.
    await prisma.appRolePermission.deleteMany({ where: { roleId: role.id } });
    if (targetIds.length > 0) {
      await prisma.appRolePermission.createMany({
        data: targetIds.map((permissionId) => ({
          roleId: role.id,
          permissionId,
        })),
        skipDuplicates: true,
      });
    }
  }
  console.log(`  ✓ ${SEED_ROLES.length} roles oficiales sincronizados\n`);

  return { superAdminRoleId };
}

async function seedSuperAdmin(superAdminRoleId: string): Promise<void> {
  const email = (process.env.SEED_SUPER_ADMIN_EMAIL ?? 'admin@purpura.club')
    .trim()
    .toLowerCase();
  const password = process.env.SEED_SUPER_ADMIN_PASSWORD ?? 'Purpura1234!';
  const firstName = process.env.SEED_SUPER_ADMIN_FIRST_NAME ?? 'Purpura';
  const lastName = process.env.SEED_SUPER_ADMIN_LAST_NAME ?? 'Admin';

  console.log(`• Super Admin inicial (${email})`);

  const passwordHash = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      password: passwordHash,
      firstName,
      lastName,
      role: Role.SUPER_ADMIN,
      active: true,
    },
    update: {
      role: Role.SUPER_ADMIN,
      active: true,
      firstName,
      lastName,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: user.id, roleId: superAdminRoleId } },
    create: { userId: user.id, roleId: superAdminRoleId },
    update: {},
  });

  console.log(`  ✓ Usuario super_admin: ${email} (password env: SEED_SUPER_ADMIN_PASSWORD)\n`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────

const slugify = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

const ph = (text: string, bg = '0a0a0a', fg = '9810fa'): string =>
  `https://placehold.co/800x800/${bg}/${fg}?text=${encodeURIComponent(text)}`;

interface UpsertLocationInput {
  slug: string;
  name: string;
  type: InventoryLocationType;
  address?: string;
  phone?: string;
}

async function upsertLocation(input: UpsertLocationInput) {
  return prisma.inventoryLocation.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      name: input.name,
      type: input.type,
      address: input.address,
      phone: input.phone,
      active: true,
    },
    update: {
      name: input.name,
      type: input.type,
      address: input.address,
      phone: input.phone,
      active: true,
    },
  });
}

/**
 * Crea (o repone) las series de comprobantes SUNAT-ready para una ubicación.
 *
 * Convención usada:
 *  - Boleta:      `B<scope>` (ej. B001 ecommerce, B101 Ica, B201 Lima)
 *  - Factura:     `F<scope>` (ej. F001, F101, F201)
 *  - Nota crédito de boleta:  `BC<scope>` (ej. BC01, BC11, BC21)
 *  - Nota crédito de factura: `FC<scope>` (ej. FC01, FC11, FC21)
 *
 * `inventoryLocationId = null` reserva las series para el canal ecommerce
 * (igual que `ReceiptsService.issue()` con location=null).
 */
async function ensureReceiptSeriesFor(opts: {
  inventoryLocationId: string | null;
  label: string;
  boleta: string;
  factura: string;
  ncBoleta: string;
  ncFactura: string;
}): Promise<void> {
  const seriesByType: Array<{ series: string; type: ReceiptSeriesType }> = [
    { series: opts.boleta, type: ReceiptSeriesType.BOLETA },
    { series: opts.factura, type: ReceiptSeriesType.FACTURA },
    { series: opts.ncBoleta, type: ReceiptSeriesType.NOTA_CREDITO },
    { series: opts.ncFactura, type: ReceiptSeriesType.NOTA_CREDITO },
  ];

  for (const { series, type } of seriesByType) {
    await prisma.receiptSeries.upsert({
      where: { series_type: { series, type } },
      create: {
        series,
        type,
        inventoryLocationId: opts.inventoryLocationId,
        nextNumber: 1,
        active: true,
      },
      update: {
        inventoryLocationId: opts.inventoryLocationId,
        active: true,
      },
    });
  }
  console.log(
    `  ✓ Series ${opts.label}: ${opts.boleta} (boleta), ${opts.factura} (factura), ${opts.ncBoleta}/${opts.ncFactura} (NC)`,
  );
}

interface UpsertCategoryInput {
  slug: string;
  name: string;
  group: CategoryGroup;
  parentId?: string | null;
  image?: string | null;
  order?: number;
}

async function upsertCategory(input: UpsertCategoryInput) {
  return prisma.category.upsert({
    where: { slug: input.slug },
    create: {
      slug: input.slug,
      name: input.name,
      group: input.group,
      parentId: input.parentId ?? null,
      image: input.image ?? null,
      order: input.order ?? 0,
      active: true,
    },
    update: {
      name: input.name,
      group: input.group,
      parentId: input.parentId ?? null,
      image: input.image ?? null,
      order: input.order ?? 0,
    },
  });
}

interface UpsertProductInput {
  sku: string;
  name: string;
  description: string;
  barcode: string;
  price: number;
  cost: number;
  /** Si se indica, el producto se sembrará con la oferta vigente. */
  discountPercentage?: number;
  featured?: boolean;
  imageText: string;
  categoryIds: string[];
  variant?: { name: string; value: string };
}

async function upsertProduct(input: UpsertProductInput) {
  const slug = slugify(input.name);

  const discount = input.discountPercentage;
  const product = await prisma.product.upsert({
    where: { sku: input.sku },
    create: {
      sku: input.sku,
      slug,
      name: input.name,
      description: input.description,
      barcode: input.barcode,
      price: new Prisma.Decimal(input.price),
      cost: new Prisma.Decimal(input.cost),
      discountPercentage:
        discount !== undefined ? new Prisma.Decimal(discount) : null,
      discountActive: discount !== undefined,
      discountStartsAt: null,
      discountEndsAt: null,
      featured: input.featured ?? false,
      active: true,
    },
    update: {
      slug,
      name: input.name,
      description: input.description,
      barcode: input.barcode,
      price: new Prisma.Decimal(input.price),
      cost: new Prisma.Decimal(input.cost),
      discountPercentage:
        discount !== undefined ? new Prisma.Decimal(discount) : null,
      discountActive: discount !== undefined,
      featured: input.featured ?? false,
    },
  });

  // Categorías: reemplazo total para mantener consistencia
  await prisma.productCategory.deleteMany({
    where: { productId: product.id },
  });
  if (input.categoryIds.length > 0) {
    await prisma.productCategory.createMany({
      data: input.categoryIds.map((categoryId) => ({
        productId: product.id,
        categoryId,
      })),
      skipDuplicates: true,
    });
  }

  // Imagen placeholder
  await prisma.productImage.deleteMany({ where: { productId: product.id } });
  await prisma.productImage.create({
    data: {
      productId: product.id,
      url: ph(input.imageText),
      order: 0,
    },
  });

  // Variante (mantiene unicidad)
  if (input.variant) {
    await prisma.productVariant.upsert({
      where: {
        productId_name_value: {
          productId: product.id,
          name: input.variant.name,
          value: input.variant.value,
        },
      },
      create: {
        productId: product.id,
        name: input.variant.name,
        value: input.variant.value,
      },
      update: {},
    });
  }

  return product;
}

async function ensureStock(
  locationId: string,
  locationName: string,
  productId: string,
  desiredStock: number,
  minimumStock: number,
): Promise<{ createdMovement: boolean }> {
  const previous = await prisma.inventoryStock.findUnique({
    where: {
      inventoryLocationId_productId: {
        inventoryLocationId: locationId,
        productId,
      },
    },
  });
  const previousStock = previous?.stock ?? 0;

  await prisma.inventoryStock.upsert({
    where: {
      inventoryLocationId_productId: {
        inventoryLocationId: locationId,
        productId,
      },
    },
    create: {
      inventoryLocationId: locationId,
      productId,
      stock: desiredStock,
      reservedStock: 0,
      minimumStock,
    },
    update: { stock: desiredStock, minimumStock },
  });

  // Asegurar disponibilidad activa en esta ubicación
  await prisma.productAvailability.upsert({
    where: {
      productId_inventoryLocationId: {
        productId,
        inventoryLocationId: locationId,
      },
    },
    create: {
      productId,
      inventoryLocationId: locationId,
      active: true,
    },
    update: { active: true },
  });

  const delta = desiredStock - previousStock;
  if (delta === 0) return { createdMovement: false };

  const seedReason = `Inventario inicial - ${locationName}`;
  const exists = await prisma.inventoryMovement.findFirst({
    where: { inventoryLocationId: locationId, productId, reason: seedReason },
    select: { id: true },
  });
  if (exists) return { createdMovement: false };

  await prisma.inventoryMovement.create({
    data: {
      inventoryLocationId: locationId,
      productId,
      quantity: delta,
      type: InventoryMovementType.RESTOCK,
      reason: seedReason,
    },
  });
  return { createdMovement: true };
}

// ─── Datos ────────────────────────────────────────────────────────────────

const MATERIAL_SUBCATEGORIES = [
  { slug: 'joyas-acero-dorado', name: 'Joyas en Acero Dorado' },
  { slug: 'joyas-acero-plateado', name: 'Joyas en Acero Plateado' },
  { slug: 'joyas-banadas-en-oro', name: 'Joyas Bañadas en Oro' },
  { slug: 'joyas-plata', name: 'Joyas de Plata' },
] as const;

type MaterialSlug = (typeof MATERIAL_SUBCATEGORIES)[number]['slug'];

const TYPES_DE_JOYAS = [
  { slug: 'collares', name: 'Collares' },
  { slug: 'aretes', name: 'Aretes' },
  { slug: 'pulseras', name: 'Pulseras' },
  { slug: 'puneras', name: 'Puñeras' },
  { slug: 'anillos', name: 'Anillos' },
] as const;

type JewelryTypeSlug = (typeof TYPES_DE_JOYAS)[number]['slug'];

const MATERIAL_VARIANT: Record<MaterialSlug, string> = {
  'joyas-acero-dorado': 'Acero Dorado',
  'joyas-acero-plateado': 'Acero Plateado',
  'joyas-banadas-en-oro': 'Bañado en Oro',
  'joyas-plata': 'Plata',
};

// ─── Seed entrypoint ──────────────────────────────────────────────────────

async function main() {
  console.log('▶ Seed Púrpura Club — Multi-ubicación\n');

  // 0) RBAC + Super Admin
  const { superAdminRoleId } = await seedRbac();
  await seedSuperAdmin(superAdminRoleId);

  // 1) UBICACIONES DE INVENTARIO
  console.log('• Ubicaciones de inventario');
  const ecommerceCentral = await upsertLocation({
    slug: 'ecommerce-central',
    name: 'Ecommerce Central',
    type: InventoryLocationType.ECOMMERCE,
    address: 'Almacén central — operación ecommerce',
  });
  const tiendaIca = await upsertLocation({
    slug: 'plaza-del-sol-ica',
    name: 'Purpura Store - Plaza del Sol ICA',
    type: InventoryLocationType.SUCURSAL,
    address: 'C.C. Plaza del Sol, Ica',
    phone: '+51 999 999 999',
  });
  console.log(`  ✓ ${ecommerceCentral.name} (${ecommerceCentral.type})`);
  console.log(`  ✓ ${tiendaIca.name} (${tiendaIca.type})\n`);

  // 1.5) SERIES FISCALES (SUNAT-ready) — boleta, factura, NC por ubicación
  console.log('• Series fiscales (SUNAT Perú)');
  await ensureReceiptSeriesFor({
    inventoryLocationId: null,
    label: 'Ecommerce',
    boleta: 'B001',
    factura: 'F001',
    ncBoleta: 'BC01',
    ncFactura: 'FC01',
  });
  await ensureReceiptSeriesFor({
    inventoryLocationId: tiendaIca.id,
    label: 'Plaza del Sol ICA',
    boleta: 'B101',
    factura: 'F101',
    ncBoleta: 'BC11',
    ncFactura: 'FC11',
  });
  console.log('');

  // 2) CATEGORÍAS RAÍZ
  console.log('• Categorías raíz');
  const perfumesRoot = await upsertCategory({
    slug: 'perfumes',
    name: 'Perfumes',
    group: CategoryGroup.PERFUMES,
    parentId: null,
    image: ph('Perfumes', '0a0a0a', 'ffffff'),
    order: 0,
  });
  const joyasRoot = await upsertCategory({
    slug: 'joyas',
    name: 'Joyas',
    group: CategoryGroup.JOYERIA,
    parentId: null,
    image: ph('Joyas', '0a0a0a', 'ffffff'),
    order: 1,
  });
  console.log('  ✓ Perfumes, Joyas\n');

  // 3) SUBCATEGORÍAS PERFUMES
  console.log('• Subcategorías de Perfumes');
  const perfumesMujer = await upsertCategory({
    slug: 'perfumes-mujer',
    name: 'Perfumes para Mujer',
    group: CategoryGroup.PERFUMES,
    parentId: perfumesRoot.id,
    image: ph('Perfumes Mujer'),
    order: 0,
  });
  const perfumesHombre = await upsertCategory({
    slug: 'perfumes-hombre',
    name: 'Perfumes para Hombre',
    group: CategoryGroup.PERFUMES,
    parentId: perfumesRoot.id,
    image: ph('Perfumes Hombre'),
    order: 1,
  });
  console.log('  ✓ Mujer, Hombre\n');

  // 4) JOYAS — material → tipo
  console.log('• Subcategorías de Joyas (material → tipo)');
  const leafByMaterialAndType: Record<
    MaterialSlug,
    Record<JewelryTypeSlug, string>
  > = {
    'joyas-acero-dorado': {} as Record<JewelryTypeSlug, string>,
    'joyas-acero-plateado': {} as Record<JewelryTypeSlug, string>,
    'joyas-banadas-en-oro': {} as Record<JewelryTypeSlug, string>,
    'joyas-plata': {} as Record<JewelryTypeSlug, string>,
  };

  for (let i = 0; i < MATERIAL_SUBCATEGORIES.length; i++) {
    const mat = MATERIAL_SUBCATEGORIES[i];
    const materialCat = await upsertCategory({
      slug: mat.slug,
      name: mat.name,
      group: CategoryGroup.JOYERIA,
      parentId: joyasRoot.id,
      image: ph(mat.name),
      order: i,
    });

    for (let j = 0; j < TYPES_DE_JOYAS.length; j++) {
      const type = TYPES_DE_JOYAS[j];
      const leafSlug = `${type.slug}-${mat.slug.replace(/^joyas-/, '')}`;
      const leaf = await upsertCategory({
        slug: leafSlug,
        name: type.name,
        group: CategoryGroup.JOYERIA,
        parentId: materialCat.id,
        image: ph(`${type.name} ${mat.name.replace(/^Joyas (de |en |Bañadas? en )?/, '')}`),
        order: j,
      });
      leafByMaterialAndType[mat.slug][type.slug] = leaf.id;
    }
  }
  console.log(
    `  ✓ ${MATERIAL_SUBCATEGORIES.length} materiales × ${TYPES_DE_JOYAS.length} tipos\n`,
  );

  // 5) PRODUCTOS DEMO
  console.log('• Productos demo');

  const perfumes: Array<
    UpsertProductInput & { categorySlug: 'perfumes-mujer' | 'perfumes-hombre' }
  > = [
    {
      sku: 'PER-MUJ-001',
      name: 'Perfume Aurora Femme 100ml',
      description:
        'Eau de parfum femenino con notas de jazmín, vainilla y maderas blancas. Estela duradera y elegante.',
      barcode: '7501000000011',
      price: 320,
      cost: 110,
      discountPercentage: 10,
      featured: true,
      imageText: 'Aurora Femme',
      categorySlug: 'perfumes-mujer',
      categoryIds: [],
      variant: { name: 'Capacidad', value: '100ml' },
    },
    {
      sku: 'PER-MUJ-002',
      name: 'Perfume Velvet Noir Femme 50ml',
      description:
        'Composición intensa con pachulí, rosa damascena y almizcle. Para una mujer sofisticada.',
      barcode: '7501000000028',
      price: 195,
      cost: 70,
      imageText: 'Velvet Noir',
      categorySlug: 'perfumes-mujer',
      categoryIds: [],
      variant: { name: 'Capacidad', value: '50ml' },
    },
    {
      sku: 'PER-HOM-001',
      name: 'Perfume Onyx Homme 100ml',
      description:
        'Fragancia masculina amaderada con bergamota, cedro y cuero. Carácter moderno y elegante.',
      barcode: '7501000000035',
      price: 295,
      cost: 100,
      discountPercentage: 12,
      featured: true,
      imageText: 'Onyx Homme',
      categorySlug: 'perfumes-hombre',
      categoryIds: [],
      variant: { name: 'Capacidad', value: '100ml' },
    },
    {
      sku: 'PER-HOM-002',
      name: 'Perfume Royal Oud Homme 75ml',
      description:
        'Oud premium con azafrán, ámbar y maderas preciosas. Una experiencia olfativa imperial.',
      barcode: '7501000000042',
      price: 350,
      cost: 130,
      imageText: 'Royal Oud',
      categorySlug: 'perfumes-hombre',
      categoryIds: [],
      variant: { name: 'Capacidad', value: '75ml' },
    },
  ];

  for (const p of perfumes) {
    const catId =
      p.categorySlug === 'perfumes-mujer'
        ? perfumesMujer.id
        : perfumesHombre.id;
    p.categoryIds = [catId];
  }

  interface JewelInput {
    sku: string;
    name: string;
    description: string;
    barcode: string;
    price: number;
    cost: number;
    discountPercentage?: number;
    featured?: boolean;
    imageText: string;
    material: MaterialSlug;
    type: JewelryTypeSlug;
  }

  const joyas: JewelInput[] = [
    // ── Acero Dorado
    {
      sku: 'JOY-AD-COL-001',
      name: 'Collar Eternidad Acero Dorado',
      description:
        'Cadena delicada con dije circular en acero quirúrgico bañado en oro. Hipoalergénico.',
      barcode: '7501000010011',
      price: 129,
      cost: 35,
      discountPercentage: 15,
      featured: true,
      imageText: 'Collar Eternidad',
      material: 'joyas-acero-dorado',
      type: 'collares',
    },
    {
      sku: 'JOY-AD-ARE-001',
      name: 'Aretes Aurora Acero Dorado',
      description:
        'Aretes argolla con micro-zirconias en acero dorado. Brillo permanente y livianos.',
      barcode: '7501000010028',
      price: 89,
      cost: 22,
      imageText: 'Aretes Aurora',
      material: 'joyas-acero-dorado',
      type: 'aretes',
    },
    {
      sku: 'JOY-AD-ANI-001',
      name: 'Anillo Lumière Acero Dorado',
      description:
        'Banda fina con detalle entrelazado. Resistente al agua y al sudor.',
      barcode: '7501000010035',
      price: 99,
      cost: 24,
      imageText: 'Anillo Lumiere',
      material: 'joyas-acero-dorado',
      type: 'anillos',
    },
    {
      sku: 'JOY-AD-PUL-001',
      name: 'Pulsera Soleil Acero Dorado',
      description:
        'Pulsera ajustable con eslabones tipo cordón en acero dorado. Cierre seguro.',
      barcode: '7501000010042',
      price: 119,
      cost: 30,
      imageText: 'Pulsera Soleil',
      material: 'joyas-acero-dorado',
      type: 'pulseras',
    },
    // ── Acero Plateado
    {
      sku: 'JOY-AP-COL-001',
      name: 'Collar Luna Acero Plateado',
      description:
        'Gargantilla con dije de luna creciente. Acabado satinado, antialérgico.',
      barcode: '7501000020011',
      price: 119,
      cost: 32,
      imageText: 'Collar Luna',
      material: 'joyas-acero-plateado',
      type: 'collares',
    },
    {
      sku: 'JOY-AP-ARE-001',
      name: 'Aretes Estrella Acero Plateado',
      description:
        'Aretes mini con estrella tallada. Cierre presión, ideales para uso diario.',
      barcode: '7501000020028',
      price: 79,
      cost: 18,
      imageText: 'Aretes Estrella',
      material: 'joyas-acero-plateado',
      type: 'aretes',
    },
    {
      sku: 'JOY-AP-ANI-001',
      name: 'Anillo Halo Acero Plateado',
      description: 'Anillo solitario con piedra zirconia central. Brillo intenso.',
      barcode: '7501000020035',
      price: 89,
      cost: 22,
      imageText: 'Anillo Halo',
      material: 'joyas-acero-plateado',
      type: 'anillos',
    },
    {
      sku: 'JOY-AP-PUL-001',
      name: 'Pulsera Diamante Acero Plateado',
      description:
        'Pulsera tipo tennis con zirconias en línea. Acero quirúrgico de alta resistencia.',
      barcode: '7501000020042',
      price: 109,
      cost: 28,
      imageText: 'Pulsera Diamante',
      material: 'joyas-acero-plateado',
      type: 'pulseras',
    },
    // ── Bañado en Oro
    {
      sku: 'JOY-BO-COL-001',
      name: 'Collar Imperial Bañado en Oro 18k',
      description:
        'Cadena de eslabones cubanos con baño 18k. Acabado pulido espejo.',
      barcode: '7501000030011',
      price: 189,
      cost: 55,
      featured: true,
      imageText: 'Collar Imperial',
      material: 'joyas-banadas-en-oro',
      type: 'collares',
    },
    {
      sku: 'JOY-BO-ARE-001',
      name: 'Aretes Versalles Bañados en Oro',
      description:
        'Aretes barrocos con detalle floral. Baño de oro 18k garantizado.',
      barcode: '7501000030028',
      price: 129,
      cost: 38,
      imageText: 'Aretes Versalles',
      material: 'joyas-banadas-en-oro',
      type: 'aretes',
    },
    {
      sku: 'JOY-BO-ANI-001',
      name: 'Anillo Florencia Bañado en Oro',
      description:
        'Anillo tipo signet con sello clásico. Una pieza atemporal.',
      barcode: '7501000030035',
      price: 159,
      cost: 45,
      imageText: 'Anillo Florencia',
      material: 'joyas-banadas-en-oro',
      type: 'anillos',
    },
    {
      sku: 'JOY-BO-PUN-001',
      name: 'Puñera Cleopatra Bañada en Oro',
      description:
        'Puñera tipo brazalete con grabado egipcio. Acabado lujoso 18k.',
      barcode: '7501000030059',
      price: 219,
      cost: 70,
      imageText: 'Puñera Cleopatra',
      material: 'joyas-banadas-en-oro',
      type: 'puneras',
    },
    // ── Plata
    {
      sku: 'JOY-PL-COL-001',
      name: 'Collar Selene Plata 925',
      description:
        'Collar de plata esterlina con dije de luna llena. Pulido a mano.',
      barcode: '7501000040011',
      price: 179,
      cost: 55,
      featured: true,
      imageText: 'Collar Selene',
      material: 'joyas-plata',
      type: 'collares',
    },
    {
      sku: 'JOY-PL-ARE-001',
      name: 'Aretes Iris Plata 925',
      description:
        'Aretes de plata esterlina con piedra natural. Cierre tipo monachina.',
      barcode: '7501000040028',
      price: 139,
      cost: 42,
      imageText: 'Aretes Iris',
      material: 'joyas-plata',
      type: 'aretes',
    },
    {
      sku: 'JOY-PL-ANI-001',
      name: 'Anillo Afrodita Plata 925',
      description:
        'Anillo con detalle de flor en relieve. Plata esterlina certificada.',
      barcode: '7501000040035',
      price: 199,
      cost: 60,
      imageText: 'Anillo Afrodita',
      material: 'joyas-plata',
      type: 'anillos',
    },
    {
      sku: 'JOY-PL-PUL-001',
      name: 'Pulsera Diosa Plata 925',
      description:
        'Pulsera tejida en plata 925. Diseño minimalista de alta joyería.',
      barcode: '7501000040042',
      price: 229,
      cost: 75,
      imageText: 'Pulsera Diosa',
      material: 'joyas-plata',
      type: 'pulseras',
    },
  ];

  interface ProductSeed extends UpsertProductInput {
    /** Stock ecommerce */
    ecommerceStock: number;
    /** Stock sucursal ICA */
    storeStock: number;
    /** Stock mínimo (mismo para ambas) */
    minimumStock: number;
  }

  const productInputs: ProductSeed[] = [];

  for (const p of perfumes) {
    productInputs.push({
      sku: p.sku,
      name: p.name,
      description: p.description,
      barcode: p.barcode,
      price: p.price,
      discountPercentage: p.discountPercentage,
      cost: p.cost,
      featured: p.featured,
      imageText: p.imageText,
      categoryIds: p.categoryIds,
      variant: p.variant,
      ecommerceStock: 30,
      storeStock: 12,
      minimumStock: 5,
    });
  }

  for (const j of joyas) {
    productInputs.push({
      sku: j.sku,
      name: j.name,
      description: j.description,
      barcode: j.barcode,
      price: j.price,
      discountPercentage: j.discountPercentage,
      cost: j.cost,
      featured: j.featured,
      imageText: j.imageText,
      categoryIds: [leafByMaterialAndType[j.material][j.type]],
      variant: { name: 'Material', value: MATERIAL_VARIANT[j.material] },
      ecommerceStock: 22,
      storeStock: 8,
      minimumStock: 4,
    });
  }

  let productCount = 0;
  let movementCount = 0;
  for (const input of productInputs) {
    const product = await upsertProduct(input);
    const a = await ensureStock(
      ecommerceCentral.id,
      ecommerceCentral.name,
      product.id,
      input.ecommerceStock,
      input.minimumStock,
    );
    const b = await ensureStock(
      tiendaIca.id,
      tiendaIca.name,
      product.id,
      input.storeStock,
      input.minimumStock,
    );
    if (a.createdMovement) movementCount += 1;
    if (b.createdMovement) movementCount += 1;
    productCount += 1;
  }

  console.log(`  ✓ ${productCount} productos (perfumes + joyería)`);
  console.log(
    `  ✓ Stock independiente en Ecommerce Central y Plaza del Sol ICA`,
  );
  console.log(`  ✓ ${movementCount} movimientos iniciales\n`);

  console.log('✔ Seed completado.');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
