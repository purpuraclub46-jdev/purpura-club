import { PartialType } from '@nestjs/swagger';
import { CreateInventoryLocationDto } from './create-inventory-location.dto';

export class UpdateInventoryLocationDto extends PartialType(
  CreateInventoryLocationDto,
) {}
