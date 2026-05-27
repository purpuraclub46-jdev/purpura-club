-- LIBRO DE RECLAMACIONES (Peru INDECOPI)
--
-- Registro digital del Libro de Reclamaciones requerido por el Código de
-- Protección y Defensa del Consumidor (Ley 29571 / D.S. 011-2011-PCM).
-- Cada submission queda inmutable en su payload original; el admin solo
-- gestiona el estado y la respuesta oficial.

-- CreateEnum
CREATE TYPE "ComplaintType" AS ENUM ('RECLAMO', 'QUEJA');

-- CreateEnum
CREATE TYPE "ComplaintSubjectType" AS ENUM ('PRODUCTO', 'SERVICIO');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('PENDIENTE', 'EN_REVISION', 'RESUELTO');

-- CreateEnum
CREATE TYPE "ComplaintDocumentType" AS ENUM ('DNI', 'CE', 'PASSPORT', 'RUC');

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ticketNumber" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "documentType" "ComplaintDocumentType" NOT NULL DEFAULT 'DNI',
    "documentNumber" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "isMinor" BOOLEAN NOT NULL DEFAULT false,
    "guardianFullName" TEXT,
    "guardianDocument" TEXT,
    "type" "ComplaintType" NOT NULL,
    "subjectType" "ComplaintSubjectType" NOT NULL,
    "subjectDetail" TEXT NOT NULL,
    "amount" DECIMAL(12,2),
    "description" TEXT NOT NULL,
    "consumerRequest" TEXT NOT NULL,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'PENDIENTE',
    "response" TEXT,
    "internalNotes" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "resolvedByUserId" UUID,
    "submittedIp" TEXT,
    "submittedUserAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "complaints_ticketNumber_key" ON "complaints"("ticketNumber");

-- CreateIndex — listado admin por estado, más reciente primero.
CREATE INDEX "complaints_status_createdAt_idx" ON "complaints"("status", "createdAt" DESC);

-- CreateIndex — búsqueda por documento del consumidor.
CREATE INDEX "complaints_documentNumber_idx" ON "complaints"("documentNumber");

-- CreateIndex — búsqueda por correo.
CREATE INDEX "complaints_email_idx" ON "complaints"("email");
