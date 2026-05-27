import { PartialType } from '@nestjs/swagger';
import { CreateHomeStoreDto } from './create-home-store.dto';

export class UpdateHomeStoreDto extends PartialType(CreateHomeStoreDto) {}
