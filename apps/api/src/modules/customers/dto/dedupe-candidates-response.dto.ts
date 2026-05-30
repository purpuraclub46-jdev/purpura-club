import { ApiProperty } from '@nestjs/swagger';

/**
 * Respuesta del endpoint `GET /customers/dedupe-candidates` (D5).
 *
 * Acceso restringido a SUPER_ADMIN — operación de gobierno de datos,
 * no operativa.
 *
 * Lista:
 *   - `candidatesByDni`: pares User huérfano + Customer huérfano con
 *     mismo DNI. AUTO-LINKABLES vía POST /customers/:id/link-user.
 *   - `candidatesByEmail`: pares con mismo email (sin link automático
 *     — el admin debe revisar manualmente, política aprobada FASE 0.5).
 *
 * Cap: 100 por categoría para evitar respuestas excesivas. El campo
 * `meta.capped` indica si hubo truncamiento.
 */
export class DedupeCandidateByDniDto {
  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty()
  customerFullName!: string;

  @ApiProperty({ description: 'DNI compartido.' })
  matchedDni!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty({ format: 'email', nullable: true })
  userEmail!: string | null;

  @ApiProperty()
  userFirstName!: string;

  @ApiProperty()
  userLastName!: string;
}

export class DedupeCandidateByEmailDto {
  @ApiProperty({ format: 'uuid' })
  customerId!: string;

  @ApiProperty()
  customerFullName!: string;

  @ApiProperty({ format: 'email' })
  matchedEmail!: string;

  @ApiProperty({ format: 'uuid' })
  userId!: string;

  @ApiProperty()
  userFirstName!: string;

  @ApiProperty()
  userLastName!: string;
}

export class DedupeCandidatesMetaDto {
  @ApiProperty({ description: 'true si el dataset fue truncado al cap.' })
  capped!: boolean;

  @ApiProperty()
  capLimit!: number;
}

export class DedupeCandidatesResponseDto {
  @ApiProperty({
    type: [DedupeCandidateByDniDto],
    description: 'Pares User-Customer huérfanos con DNI coincidente. Auto-linkables.',
  })
  candidatesByDni!: DedupeCandidateByDniDto[];

  @ApiProperty({
    type: [DedupeCandidateByEmailDto],
    description:
      'Pares con email coincidente (informativo — el admin debe verificar manualmente que es la misma persona).',
  })
  candidatesByEmail!: DedupeCandidateByEmailDto[];

  @ApiProperty({ type: DedupeCandidatesMetaDto })
  meta!: DedupeCandidatesMetaDto;
}
