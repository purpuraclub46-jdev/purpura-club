import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ComplaintDocumentType,
  ComplaintStatus,
  ComplaintSubjectType,
  ComplaintType,
} from '@prisma/client';

export class ComplaintResponseDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'LR-2026-000001' })
  ticketNumber!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty({
    enum: ComplaintDocumentType,
    enumName: 'ComplaintDocumentType',
  })
  documentType!: ComplaintDocumentType;

  @ApiProperty()
  documentNumber!: string;

  @ApiProperty()
  phone!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  address!: string;

  @ApiProperty()
  isMinor!: boolean;

  @ApiPropertyOptional({ type: String, nullable: true })
  guardianFullName!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  guardianDocument!: string | null;

  @ApiProperty({ enum: ComplaintType, enumName: 'ComplaintType' })
  type!: ComplaintType;

  @ApiProperty({
    enum: ComplaintSubjectType,
    enumName: 'ComplaintSubjectType',
  })
  subjectType!: ComplaintSubjectType;

  @ApiProperty()
  subjectDetail!: string;

  @ApiPropertyOptional({ type: Number, nullable: true })
  amount!: number | null;

  @ApiProperty()
  description!: string;

  @ApiProperty()
  consumerRequest!: string;

  @ApiProperty({ enum: ComplaintStatus, enumName: 'ComplaintStatus' })
  status!: ComplaintStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  response!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  internalNotes!: string | null;

  @ApiPropertyOptional({ type: String, format: 'date-time', nullable: true })
  resolvedAt!: Date | null;

  @ApiPropertyOptional({ type: String, format: 'uuid', nullable: true })
  resolvedByUserId!: string | null;

  @ApiProperty({ type: String, format: 'date-time' })
  createdAt!: Date;

  @ApiProperty({ type: String, format: 'date-time' })
  updatedAt!: Date;
}
