import { Test } from '@nestjs/testing';
import { EmailsModule } from './emails.module';

/**
 * F2.7-E / E4 — Test del guard de boot del EmailsModule.
 *
 * Garantiza que en producción no se cuele un `NoopEmailProvider` sin
 * opt-in explícito.
 */
describe('EmailsModule production guard', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalAllowNoop = process.env.EMAIL_ALLOW_NOOP;

  afterEach(() => {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalAllowNoop === undefined) delete process.env.EMAIL_ALLOW_NOOP;
    else process.env.EMAIL_ALLOW_NOOP = originalAllowNoop;
  });

  it('T14.20 — boot en production sin EMAIL_ALLOW_NOOP → throw', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.EMAIL_ALLOW_NOOP;

    await expect(
      Test.createTestingModule({ imports: [EmailsModule] })
        .compile()
        .then((m) => m.init()),
    ).rejects.toThrow(/NoopEmailProvider/);
  });

  it('T14.21 — boot en production + EMAIL_ALLOW_NOOP=true → permitido', async () => {
    process.env.NODE_ENV = 'production';
    process.env.EMAIL_ALLOW_NOOP = 'true';

    const module = await Test.createTestingModule({
      imports: [EmailsModule],
    }).compile();

    await expect(module.init()).resolves.not.toThrow();
    await module.close();
  });

  it('boot en development → permitido aunque sea noop', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.EMAIL_ALLOW_NOOP;

    const module = await Test.createTestingModule({
      imports: [EmailsModule],
    }).compile();

    await expect(module.init()).resolves.not.toThrow();
    await module.close();
  });

  it('boot en test → permitido (NODE_ENV !== production)', async () => {
    process.env.NODE_ENV = 'test';
    delete process.env.EMAIL_ALLOW_NOOP;

    const module = await Test.createTestingModule({
      imports: [EmailsModule],
    }).compile();

    await expect(module.init()).resolves.not.toThrow();
    await module.close();
  });
});
