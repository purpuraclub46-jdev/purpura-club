import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';

export enum EntryDecision {
  APPROVE = 'approve',
  REJECT = 'reject',
}

export class DecideEntryDto {
  @ApiProperty({ enum: EntryDecision, enumName: 'EntryDecision' })
  @IsEnum(EntryDecision)
  decision!: EntryDecision;
}
