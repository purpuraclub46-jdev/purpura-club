import { Module } from '@nestjs/common';
import { HomeBannersController } from './home-banners.controller';
import { HomeBannersService } from './home-banners.service';
import { HomeBannersRepository } from './repositories/home-banners.repository';

@Module({
  controllers: [HomeBannersController],
  providers: [HomeBannersService, HomeBannersRepository],
  exports: [HomeBannersService, HomeBannersRepository],
})
export class HomeBannersModule {}
