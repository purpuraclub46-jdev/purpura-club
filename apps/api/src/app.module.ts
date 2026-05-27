import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import appConfig from './config/app.config';
import authConfig from './config/auth.config';
import databaseConfig from './config/database.config';
import { validateEnv } from './config/env.validation';
import swaggerConfig from './config/swagger.config';
import { AuthModule } from './modules/auth/auth.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { ComplaintsModule } from './modules/complaints/complaints.module';
import { CustomersModule } from './modules/customers/customers.module';
import { EmailsModule } from './modules/emails/emails.module';
import { FiscalModule } from './modules/fiscal/fiscal.module';
import { HealthModule } from './modules/health/health.module';
import { HomeBannersModule } from './modules/home-banners/home-banners.module';
import { HomeCategoriesModule } from './modules/home-categories/home-categories.module';
import { HomeStoresModule } from './modules/home-stores/home-stores.module';
import { InventoryLocationsModule } from './modules/inventory-locations/inventory-locations.module';
import { InventoryTransfersModule } from './modules/inventory-transfers/inventory-transfers.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MembershipsModule } from './modules/memberships/memberships.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PosCashModule } from './modules/pos-cash/pos-cash.module';
import { PosContextModule } from './modules/pos-context/pos-context.module';
import { PosCreditNotesModule } from './modules/pos-credit-notes/pos-credit-notes.module';
import { PosSalesModule } from './modules/pos-sales/pos-sales.module';
import { ProductsModule } from './modules/products/products.module';
import { RaffleEntriesModule } from './modules/raffle-entries/raffle-entries.module';
import { RafflePrizesModule } from './modules/raffle-prizes/raffle-prizes.module';
import { RafflesModule } from './modules/raffles/raffles.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { ReceiptsModule } from './modules/receipts/receipts.module';
import { ReferralsModule } from './modules/referrals/referrals.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      envFilePath: ['.env.local', '.env'],
      load: [appConfig, authConfig, databaseConfig, swaggerConfig],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    FiscalModule,
    AuthModule,
    RbacModule,
    UsersModule,
    EmailsModule,
    MembershipsModule,
    ReferralsModule,
    RafflesModule,
    RaffleEntriesModule,
    RafflePrizesModule,
    HomeBannersModule,
    HomeCategoriesModule,
    HomeStoresModule,
    CategoriesModule,
    ComplaintsModule,
    ProductsModule,
    InventoryLocationsModule,
    InventoryModule,
    InventoryTransfersModule,
    OrdersModule,
    CustomersModule,
    ReceiptsModule,
    PosCashModule,
    PosSalesModule,
    PosCreditNotesModule,
    PosContextModule,
    HealthModule,
  ],
  providers: [
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: LoggingInterceptor,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,
    },
  ],
})
export class AppModule {}
