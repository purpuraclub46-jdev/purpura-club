import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient<Prisma.PrismaClientOptions, 'query' | 'error' | 'warn'>
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(configService: ConfigService) {
    const isProduction = configService.get<string>('app.nodeEnv') === 'production';

    super({
      datasources: {
        db: {
          url: configService.get<string>('database.url'),
        },
      },
      log: isProduction
        ? [
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ]
        : [
            { emit: 'event', level: 'query' },
            { emit: 'event', level: 'error' },
            { emit: 'event', level: 'warn' },
          ],
      errorFormat: isProduction ? 'minimal' : 'pretty',
    });
  }

  async onModuleInit(): Promise<void> {
    this.$on('error', (event) => {
      this.logger.error(event.message, event.target);
    });

    this.$on('warn', (event) => {
      this.logger.warn(event.message);
    });

    this.$on('query', (event) => {
      this.logger.debug(
        `Query: ${event.query} | Params: ${event.params} | Duration: ${event.duration}ms`,
      );
    });

    try {
      await this.$connect();
      this.logger.log('Prisma connected to the database');
    } catch (error) {
      this.logger.error('Failed to connect to the database', error);
      throw error;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from the database');
  }

  async cleanDatabase(): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('cleanDatabase is not allowed in production');
    }

    const modelNames = Prisma.dmmf.datamodel.models.map((model) => model.name);

    await this.$transaction(
      modelNames.map((name) =>
        (this as unknown as Record<string, { deleteMany: () => Prisma.PrismaPromise<unknown> }>)[
          this.toCamelCase(name)
        ].deleteMany(),
      ),
    );
  }

  private toCamelCase(value: string): string {
    return value.charAt(0).toLowerCase() + value.slice(1);
  }
}
