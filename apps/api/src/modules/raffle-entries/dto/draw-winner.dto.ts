import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class DrawWinnerDto {
  @ApiPropertyOptional({
    description:
      'Optional explicit ticket number to declare as the winning entry. If omitted, a random PAID entry is selected.',
    minimum: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  ticketNumber?: number;
}
