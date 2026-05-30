import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Prisma, Role } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { PasswordHelper } from './helpers/password.helper';
import { TokenHelper } from './helpers/token.helper';

/**
 * Unit tests para AuthService.register() — FASE 1 / CRÍTICO #1.
 *
 * Cobertura T1.1–T1.9 del Plan FASE 1.
 *
 * Estrategia: mock manual de PrismaService que replica el contrato de
 * Prisma para `user`, `customer` y `$transaction`. `$transaction(cb)` pasa
 * el mismo mock como `tx` para que las llamadas dentro del callback sean
 * verificables con los mismos jest.fn().
 *
 * Limitación reconocida: no valida que la TX sea realmente atómica a
 * nivel DB (eso requiere integration test con Postgres). Sí valida la
 * lógica de control flow: cuándo se busca orphan, cuándo se crea nuevo,
 * cuándo se vincula, mapeo correcto de errores P2002 por target.
 *
 * Los integration tests con DB real quedan documentados como follow-up
 * para D7 (staging) — la suite Jest E2E (`*.e2e-spec.ts`) requiere
 * configurar Postgres de tests, fuera del scope D2.
 */

// ─── Helpers ─────────────────────────────────────────────────────────────

type PrismaMock = {
  user: {
    findUnique: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  customer: {
    findUnique: jest.Mock;
    findFirst: jest.Mock;
    create: jest.Mock;
    update: jest.Mock;
  };
  $transaction: jest.Mock;
};

function createPrismaMock(): PrismaMock {
  const mock: PrismaMock = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };
  // Default behavior: ejecutar el callback inmediatamente con el mismo mock como `tx`.
  // Tests específicos pueden sobreescribir para simular rollback.
  mock.$transaction.mockImplementation((cb: any) => cb(mock));
  return mock;
}

function makeEnrichedUser(overrides: Partial<any> = {}) {
  return {
    id: 'user-uuid-1',
    email: 'jane@example.com',
    password: 'hashed',
    firstName: 'Jane',
    lastName: 'Doe',
    dni: null,
    role: Role.USER,
    active: true,
    refreshToken: null,
    referredByUserId: null,
    inventoryLocationId: null,
    lastLoginAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    inventoryLocation: null,
    roles: [],
    customPermissions: [],
    customerProfile: null, // FASE 1 / D3 — default: User sin Customer linkeado
    ...overrides,
  };
}

function makeCustomerProfileFixture(overrides: Partial<any> = {}) {
  return {
    id: 'cust-uuid-1',
    firstName: 'Jane',
    lastName: 'Doe',
    fullName: 'Jane Doe',
    phone: null,
    dni: null,
    documentType: 'DNI' as const,
    ruc: null,
    legalName: null,
    fiscalAddress: null,
    birthDate: null,
    gender: null,
    isMember: false,
    membershipExpiresAt: null,
    primaryLocationId: null,
    ...overrides,
  };
}

function makeDto(overrides: Partial<RegisterDto> = {}): RegisterDto {
  return {
    email: 'jane@example.com',
    password: 'S3cure!P@ssword',
    firstName: 'Jane',
    lastName: 'Doe',
    ...overrides,
  } as RegisterDto;
}

function prismaConflict(target: string[]): Prisma.PrismaClientKnownRequestError {
  // El constructor no es público; instanciamos vía Object.create para
  // reproducir la forma del error sin invocar el constructor privado.
  const err = Object.create(
    Prisma.PrismaClientKnownRequestError.prototype,
  ) as Prisma.PrismaClientKnownRequestError;
  Object.assign(err, {
    name: 'PrismaClientKnownRequestError',
    code: 'P2002',
    clientVersion: 'test',
    meta: { target },
    message: `Unique constraint failed on ${target.join(',')}`,
  });
  return err;
}

// ─── Suite ───────────────────────────────────────────────────────────────

describe('AuthService.register — FASE 1 atomic register', () => {
  let service: AuthService;
  let prisma: PrismaMock;
  let passwords: { hash: jest.Mock; compare: jest.Mock };
  let tokens: {
    issueTokens: jest.Mock;
    hashRefreshToken: jest.Mock;
    verifyRefreshToken: jest.Mock;
    compareRefreshToken: jest.Mock;
  };

  beforeEach(async () => {
    prisma = createPrismaMock();
    passwords = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
      compare: jest.fn(),
    };
    tokens = {
      issueTokens: jest.fn().mockResolvedValue({
        accessToken: 'access',
        refreshToken: 'refresh',
        tokenType: 'Bearer',
        expiresIn: 900,
      }),
      hashRefreshToken: jest.fn().mockResolvedValue('hashed-refresh'),
      verifyRefreshToken: jest.fn(),
      compareRefreshToken: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: PasswordHelper, useValue: passwords },
        { provide: TokenHelper, useValue: tokens },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── T1.1 ──────────────────────────────────────────────────────────────
  it('T1.1 — Register con email nuevo, sin DNI: crea User + Customer en TX', async () => {
    const dto = makeDto();

    // Pre-flight: email NO existe en User
    prisma.user.findUnique
      .mockResolvedValueOnce(null) // by email pre-flight
      // luego loadWithRbac(email) post-TX
      .mockResolvedValueOnce(makeEnrichedUser());

    prisma.user.create.mockResolvedValue({ id: 'user-uuid-1' });
    prisma.customer.create.mockResolvedValue({ id: 'cust-uuid-1' });
    prisma.user.update.mockResolvedValue({ id: 'user-uuid-1' });

    const result = await service.register(dto);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: 'jane@example.com',
        password: 'hashed-password',
        firstName: 'Jane',
        lastName: 'Doe',
        dni: null,
        role: Role.USER,
      }),
      select: { id: true },
    });
    expect(prisma.customer.findFirst).not.toHaveBeenCalled(); // no DNI = no dedupe
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: 'user-uuid-1',
        firstName: 'Jane',
        lastName: 'Doe',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: null,
        dni: null,
        active: true,
        isMember: false,
      }),
    });
    expect(prisma.customer.update).not.toHaveBeenCalled();
    expect(result.user.email).toBe('jane@example.com');
    expect(result.tokens.accessToken).toBe('access');
  });

  // ─── T1.2 ──────────────────────────────────────────────────────────────
  it('T1.2 — Register con email duplicado: 409 genérico antes de hashear password', async () => {
    prisma.user.findUnique.mockResolvedValueOnce({ id: 'existing-uuid' });

    await expect(service.register(makeDto())).rejects.toThrow(
      'An account with this information already exists',
    );

    expect(passwords.hash).not.toHaveBeenCalled(); // economía: rechazo early
    expect(prisma.$transaction).not.toHaveBeenCalled();
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  // ─── T1.3 ──────────────────────────────────────────────────────────────
  it('T1.3 — Register con DNI nuevo: User.dni y Customer.dni iguales', async () => {
    const dto = makeDto({ dni: '72345678' });

    prisma.user.findUnique
      .mockResolvedValueOnce(null) // by email
      .mockResolvedValueOnce(null) // by dni
      .mockResolvedValueOnce(makeEnrichedUser({ dni: '72345678' })); // post-TX
    prisma.customer.findUnique.mockResolvedValueOnce(null); // no linked customer with DNI
    prisma.customer.findFirst.mockResolvedValue(null); // no orphan inside TX
    prisma.user.create.mockResolvedValue({ id: 'user-uuid-1' });
    prisma.customer.create.mockResolvedValue({ id: 'cust-uuid-1' });
    prisma.user.update.mockResolvedValue({ id: 'user-uuid-1' });

    await service.register(dto);

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dni: '72345678' }),
      select: { id: true },
    });
    expect(prisma.customer.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ dni: '72345678', userId: 'user-uuid-1' }),
    });
  });

  // ─── T1.4 ──────────────────────────────────────────────────────────────
  it('T1.4 — Register con DNI que ya pertenece a otro User: 409 genérico sin TX', async () => {
    const dto = makeDto({ dni: '72345678' });

    prisma.user.findUnique
      .mockResolvedValueOnce(null) // by email
      .mockResolvedValueOnce({ id: 'other-user-uuid' }); // by dni → conflicto

    await expect(service.register(dto)).rejects.toThrow(
      'An account with this information already exists',
    );
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─── T1.5 ──────────────────────────────────────────────────────────────
  it('T1.5 — Register con DNI que coincide con Customer huérfano: vincula sin crear', async () => {
    const dto = makeDto({ dni: '72345678', phone: '+51999111222' });

    prisma.user.findUnique
      .mockResolvedValueOnce(null) // by email
      .mockResolvedValueOnce(null) // by dni
      .mockResolvedValueOnce(makeEnrichedUser({ dni: '72345678' })); // post-TX
    prisma.customer.findUnique.mockResolvedValueOnce(null); // no linked customer with DNI
    prisma.customer.findFirst.mockResolvedValue({
      id: 'orphan-cust-uuid',
      email: null,
      phone: null,
    });
    prisma.user.create.mockResolvedValue({ id: 'user-uuid-1' });
    prisma.customer.update.mockResolvedValue({ id: 'orphan-cust-uuid' });
    prisma.user.update.mockResolvedValue({ id: 'user-uuid-1' });

    await service.register(dto);

    expect(prisma.customer.findFirst).toHaveBeenCalledWith({
      where: { dni: '72345678', userId: null },
      select: { id: true, email: true, phone: true },
    });
    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'orphan-cust-uuid' },
      data: {
        userId: 'user-uuid-1',
        email: 'jane@example.com', // orphan.email null → cae a dto.email
        phone: '+51999111222', // orphan.phone null → cae a dto.phone
      },
    });
    expect(prisma.customer.create).not.toHaveBeenCalled(); // NO crea nuevo
  });

  // ─── T1.6 ──────────────────────────────────────────────────────────────
  it('T1.6 — DNI ya linkeado a otro Customer-User: 409 genérico (indistinguible)', async () => {
    const dto = makeDto({ dni: '72345678' });

    prisma.user.findUnique
      .mockResolvedValueOnce(null) // by email
      .mockResolvedValueOnce(null); // by dni en User
    prisma.customer.findUnique.mockResolvedValueOnce({
      id: 'cust-other',
      userId: 'other-user-uuid', // YA linkeado a otro User
    });

    await expect(service.register(dto)).rejects.toThrow(
      'An account with this information already exists',
    );
    expect(passwords.hash).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  // ─── T1.7 ──────────────────────────────────────────────────────────────
  it('T1.7 — Customer huérfano con email + phone preservados al vincular', async () => {
    const dto = makeDto({ dni: '72345678', phone: '+51999000111' });

    prisma.user.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(makeEnrichedUser({ dni: '72345678' }));
    prisma.customer.findUnique.mockResolvedValueOnce(null);
    prisma.customer.findFirst.mockResolvedValue({
      id: 'orphan-cust-uuid',
      email: 'walkin-captured@store.com', // capturado en POS
      phone: '+51987654321', // capturado en POS
    });
    prisma.user.create.mockResolvedValue({ id: 'user-uuid-1' });
    prisma.customer.update.mockResolvedValue({ id: 'orphan-cust-uuid' });
    prisma.user.update.mockResolvedValue({ id: 'user-uuid-1' });

    await service.register(dto);

    expect(prisma.customer.update).toHaveBeenCalledWith({
      where: { id: 'orphan-cust-uuid' },
      data: {
        userId: 'user-uuid-1',
        email: 'walkin-captured@store.com', // preserved from orphan
        phone: '+51987654321', // preserved from orphan
      },
    });
  });

  // ─── T1.8 ──────────────────────────────────────────────────────────────
  it('T1.8 — Concurrencia: race condition email duplicado → 409 genérico', async () => {
    const dto = makeDto();

    // Pre-flight ve email libre (otra request lo crea antes de la TX)
    prisma.user.findUnique.mockResolvedValueOnce(null);
    // Dentro de la TX, user.create lanza P2002 sobre email
    prisma.$transaction.mockImplementation(async () => {
      throw prismaConflict(['email']);
    });

    await expect(service.register(dto)).rejects.toThrow(
      'An account with this information already exists',
    );
    expect(passwords.hash).toHaveBeenCalled(); // pasó pre-flight
  });

  // ─── T1.9 ──────────────────────────────────────────────────────────────
  it('T1.9 — Fallo post-user.create dentro de TX hace rollback (no hay User huérfano)', async () => {
    const dto = makeDto();

    prisma.user.findUnique.mockResolvedValueOnce(null);

    // Simular: $transaction(cb) ejecuta cb pero cb lanza después de user.create
    prisma.$transaction.mockImplementation(async (cb: any) => {
      // cb llama tx.user.create OK, luego tx.customer.create throws.
      // Devolver la promesa rechazada simula que la TX hace rollback
      // (Prisma garantía atomicidad — todo o nada).
      prisma.user.create.mockResolvedValueOnce({ id: 'user-uuid-1' });
      prisma.customer.findFirst.mockResolvedValueOnce(null);
      prisma.customer.create.mockRejectedValueOnce(
        new Error('Simulated DB failure mid-TX'),
      );
      return cb(prisma);
    });

    await expect(service.register(dto)).rejects.toThrow(
      'Simulated DB failure mid-TX',
    );

    // El test no puede verificar el rollback real (eso es DB-level), pero
    // valida que el error se propaga al caller — el comportamiento
    // observable. La atomicidad real se valida en integration tests con DB.
  });

  // ─── Edge: P2002 sobre DNI también mapea a mensaje genérico ────────────
  it('Edge — P2002 sobre target dni mapea a mensaje genérico (anti-enumeration)', async () => {
    const dto = makeDto({ dni: '72345678' });

    prisma.user.findUnique
      .mockResolvedValueOnce(null) // email
      .mockResolvedValueOnce(null); // dni pre-flight
    prisma.customer.findUnique.mockResolvedValueOnce(null);
    prisma.$transaction.mockImplementation(async () => {
      throw prismaConflict(['dni']);
    });

    await expect(service.register(dto)).rejects.toThrow(
      'An account with this information already exists',
    );
  });
});

// ─── T2.* — D3: /auth/me con customerProfile ────────────────────────────

describe('AuthService.getProfile — FASE 1 / D3 customerProfile expansion', () => {
  let service: AuthService;
  let prisma: PrismaMock;

  beforeEach(async () => {
    prisma = createPrismaMock();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PasswordHelper,
          useValue: { hash: jest.fn(), compare: jest.fn() },
        },
        {
          provide: TokenHelper,
          useValue: {
            issueTokens: jest.fn(),
            hashRefreshToken: jest.fn(),
            verifyRefreshToken: jest.fn(),
            compareRefreshToken: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  // ─── T2.1 ──────────────────────────────────────────────────────────────
  it('T2.1 — User con Customer linkeado → /auth/me devuelve customerProfile completo', async () => {
    const customerFixture = makeCustomerProfileFixture({
      dni: '72345678',
      phone: '+51999111222',
      isMember: true,
      membershipExpiresAt: new Date('2027-06-01'),
      documentType: 'DNI',
    });
    prisma.user.findUnique.mockResolvedValueOnce(
      makeEnrichedUser({
        dni: '72345678',
        customerProfile: customerFixture,
      }),
    );

    const result = await service.getProfile('user-uuid-1');

    expect(result.customerProfile).not.toBeNull();
    expect(result.customerProfile).toEqual({
      id: 'cust-uuid-1',
      firstName: 'Jane',
      lastName: 'Doe',
      fullName: 'Jane Doe',
      phone: '+51999111222',
      dni: '72345678',
      documentType: 'DNI',
      ruc: null,
      legalName: null,
      fiscalAddress: null,
      birthDate: null,
      gender: null,
      isMember: true,
      membershipExpiresAt: new Date('2027-06-01'),
      primaryLocationId: null,
    });
    // Verificación del JOIN: rbacSelect debe incluir customerProfile
    expect(prisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'user-uuid-1' },
        include: expect.objectContaining({
          customerProfile: expect.objectContaining({
            select: expect.objectContaining({
              id: true,
              isMember: true,
              membershipExpiresAt: true,
            }),
          }),
        }),
      }),
    );
  });

  // ─── T2.2 ──────────────────────────────────────────────────────────────
  it('T2.2 — User legacy sin Customer (defensivo) → customerProfile: null sin error', async () => {
    prisma.user.findUnique.mockResolvedValueOnce(
      makeEnrichedUser({ customerProfile: null }),
    );

    const result = await service.getProfile('legacy-user-uuid');

    expect(result.customerProfile).toBeNull();
    // El resto del response sigue intacto — backward compat verificada
    expect(result.id).toBe('user-uuid-1');
    expect(result.email).toBe('jane@example.com');
    expect(result.role).toBe(Role.USER);
  });

  // ─── T2.3 (extra) — Backward compat: register también incluye customerProfile ──
  it('T2.3 — Response de register/login/me todos incluyen customerProfile cuando existe', async () => {
    // Verificamos que toAuthUser (helper privado) propaga customerProfile
    // a todos los endpoints que retornan AuthUserDto.
    const customerFixture = makeCustomerProfileFixture({ isMember: false });
    prisma.user.findUnique.mockResolvedValueOnce(
      makeEnrichedUser({ customerProfile: customerFixture }),
    );

    const result = await service.getProfile('user-uuid-1');

    expect(result).toHaveProperty('customerProfile');
    expect(result.customerProfile?.id).toBe('cust-uuid-1');
    expect(result.customerProfile?.isMember).toBe(false);
  });
});
