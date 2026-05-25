import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MembershipBenefitType } from '@prisma/client';

export class MembershipUserRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty()
  firstName!: string;
  @ApiProperty()
  lastName!: string;
}

export class MembershipResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: () => MembershipUserRefDto })
  user!: MembershipUserRefDto;

  @ApiProperty({
    description:
      'true si el flag está habilitado Y la fecha de expiración aún no pasó.',
  })
  active!: boolean;

  @ApiProperty({ type: String, format: 'date-time' })
  startedAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  expiresAt!: Date;

  @ApiProperty({ description: 'Días restantes hasta la expiración.' })
  daysRemaining!: number;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  lastPurchaseAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}

export class MembershipBenefitLogResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ enum: MembershipBenefitType })
  type!: MembershipBenefitType;

  @ApiProperty()
  description!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  amount!: number | null;

  @ApiProperty({ type: () => MembershipUserRefDto })
  user!: MembershipUserRefDto;

  @ApiPropertyOptional({
    description: 'Número del pedido asociado (si aplica).',
    nullable: true,
  })
  orderNumber!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
