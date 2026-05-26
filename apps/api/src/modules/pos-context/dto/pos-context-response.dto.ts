import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { InventoryLocationType, ReceiptSeriesType } from '@prisma/client';

export class PosLocationDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  name!: string;
  @ApiProperty()
  slug!: string;
  @ApiProperty({
    enum: InventoryLocationType,
    enumName: 'InventoryLocationType',
  })
  type!: InventoryLocationType;
  @ApiProperty()
  active!: boolean;
  @ApiProperty()
  cashRegistersCount!: number;
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  activeSessionId!: string | null;
}

export class PosBootstrapDto {
  @ApiProperty({ type: [PosLocationDto] })
  availableLocations!: PosLocationDto[];
  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  defaultLocationId!: string | null;
}

export class PosLocationReceiptSeriesDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty({ enum: ReceiptSeriesType, enumName: 'ReceiptSeriesType' })
  type!: ReceiptSeriesType;
  @ApiProperty()
  series!: string;
  @ApiProperty()
  nextNumber!: number;
  @ApiProperty()
  active!: boolean;
}

export class PosReportsDto {
  @ApiProperty({ type: Number })
  salesToday!: number;
  @ApiProperty()
  ordersToday!: number;
  @ApiProperty({ type: Number })
  salesMonth!: number;
  @ApiProperty()
  ordersMonth!: number;
  @ApiProperty({ type: Number })
  incomeToday!: number;
  @ApiProperty({ type: Number })
  expenseToday!: number;
  /** Diferencia acumulada (suma de differenceAmount de sesiones cerradas hoy). */
  @ApiProperty({ type: Number })
  cashDifferenceToday!: number;
}
