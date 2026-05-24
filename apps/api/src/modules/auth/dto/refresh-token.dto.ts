import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsJWT, IsOptional } from 'class-validator';

export class RefreshTokenDto {
  @ApiPropertyOptional({
    description:
      'Refresh token. Optional when the token is provided via the secure HTTP-only cookie.',
    example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  })
  @IsOptional()
  @IsJWT()
  refreshToken?: string;
}
