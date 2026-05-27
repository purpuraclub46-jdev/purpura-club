import { Module } from '@nestjs/common';
import { HomeCategoriesController } from './home-categories.controller';
import { HomeCategoriesService } from './home-categories.service';
import { HomeCategoriesRepository } from './repositories/home-categories.repository';

@Module({
  controllers: [HomeCategoriesController],
  providers: [HomeCategoriesService, HomeCategoriesRepository],
  exports: [HomeCategoriesService, HomeCategoriesRepository],
})
export class HomeCategoriesModule {}
