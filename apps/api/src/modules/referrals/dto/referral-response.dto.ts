import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReferralUserRefDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;
  @ApiProperty()
  email!: string;
  @ApiProperty()
  firstName!: string;
  @ApiProperty()
  lastName!: string;
}

export class ReferralResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ type: () => ReferralUserRefDto })
  referrer!: ReferralUserRefDto;

  @ApiProperty({ type: () => ReferralUserRefDto })
  referred!: ReferralUserRefDto;

  @ApiProperty({
    description: 'true cuando el referido ya hizo su primera compra elegible.',
  })
  rewarded!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true, format: 'date-time' })
  rewardedAt!: Date | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;
}
