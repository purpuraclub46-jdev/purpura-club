import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, Min } from 'class-validator';

export class AssignWinnerDto {
  @ApiProperty({
    description:
      'Número de ticket ganador ingresado manualmente por el admin. Debe existir en el sorteo y estar PAGADO.',
    example: 231,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  ticketNumber!: number;
}
