-- CreateExtension
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('customer', 'staff', 'owner', 'admin');

-- CreateEnum
CREATE TYPE "SalonRole" AS ENUM ('owner', 'staff');

-- CreateEnum
CREATE TYPE "SalonStatus" AS ENUM ('pending', 'active', 'suspended');

-- CreateEnum
CREATE TYPE "QueueStatus" AS ENUM ('open', 'paused', 'closed');

-- CreateEnum
CREATE TYPE "EntrySource" AS ENUM ('walkin', 'remote', 'appointment');

-- CreateEnum
CREATE TYPE "EntryState" AS ENUM ('waiting', 'notified', 'checked_in', 'in_service', 'completed', 'no_show', 'cancelled', 'bumped');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('en', 'hi');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'cancelled', 'fulfilled');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('none', 'pending', 'paid', 'refunded');

-- CreateEnum
CREATE TYPE "ComplaintStatus" AS ENUM ('open', 'in_review', 'resolved', 'dismissed');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "phone" TEXT,
    "email" TEXT,
    "passwordHash" TEXT,
    "name" TEXT,
    "role" "Role" NOT NULL DEFAULT 'customer',
    "locale" "Locale" NOT NULL DEFAULT 'en',
    "travelBufferMin" INTEGER NOT NULL DEFAULT 10,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salons" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "ownerId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "status" "SalonStatus" NOT NULL DEFAULT 'pending',
    "geom" geography(Point, 4326),
    "address" TEXT,
    "city" TEXT,
    "queueStatus" "QueueStatus" NOT NULL DEFAULT 'closed',
    "bufferConfig" JSONB,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salon_staff" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "SalonRole" NOT NULL DEFAULT 'staff',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "salon_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "estimatedMinutes" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff_services" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonStaffId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "salonId" UUID NOT NULL,

    CONSTRAINT "staff_services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chairs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chairs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queues" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "status" "QueueStatus" NOT NULL DEFAULT 'closed',
    "queueVersion" BIGINT NOT NULL DEFAULT 0,
    "tokenSeq" INTEGER NOT NULL DEFAULT 0,
    "sequenceSeq" BIGINT NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queues_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_entries" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "queueId" UUID NOT NULL,
    "salonId" UUID NOT NULL,
    "customerId" UUID,
    "serviceId" UUID NOT NULL,
    "source" "EntrySource" NOT NULL,
    "tokenNumber" INTEGER NOT NULL,
    "sequenceNo" BIGINT NOT NULL,
    "state" "EntryState" NOT NULL DEFAULT 'waiting',
    "chairId" UUID,
    "staffId" UUID,
    "scheduledAt" TIMESTAMP(3),
    "graceExpiresAt" TIMESTAMP(3),
    "estStartAt" TIMESTAMP(3),
    "etaMinutes" INTEGER,
    "delayMinutes" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "paymentStatus" "PaymentStatus" DEFAULT 'none',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "queue_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "serviceId" UUID NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "customerId" UUID NOT NULL,
    "entryId" UUID NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "tags" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "operating_hours" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "weekday" INTEGER NOT NULL,
    "openTime" TEXT NOT NULL,
    "closeTime" TEXT NOT NULL,

    CONSTRAINT "operating_hours_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB,
    "sentAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "platform" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "reporterId" UUID NOT NULL,
    "salonId" UUID,
    "entryId" UUID,
    "status" "ComplaintStatus" NOT NULL DEFAULT 'open',
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entryId" UUID,
    "customerId" UUID NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'none',
    "providerRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_audit" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "salonId" UUID NOT NULL,
    "entryId" UUID,
    "actorId" UUID,
    "action" TEXT NOT NULL,
    "before" JSONB,
    "after" JSONB,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "queue_audit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "salons_ownerId_idx" ON "salons"("ownerId");

-- CreateIndex
CREATE INDEX "salons_status_idx" ON "salons"("status");

-- CreateIndex
CREATE INDEX "salon_staff_salonId_idx" ON "salon_staff"("salonId");

-- CreateIndex
CREATE INDEX "salon_staff_userId_idx" ON "salon_staff"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "salon_staff_salonId_userId_key" ON "salon_staff"("salonId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "salon_staff_id_salonId_key" ON "salon_staff"("id", "salonId");

-- CreateIndex
CREATE INDEX "services_salonId_idx" ON "services"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "services_id_salonId_key" ON "services"("id", "salonId");

-- CreateIndex
CREATE INDEX "staff_services_serviceId_idx" ON "staff_services"("serviceId");

-- CreateIndex
CREATE INDEX "staff_services_salonId_idx" ON "staff_services"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_services_salonStaffId_serviceId_key" ON "staff_services"("salonStaffId", "serviceId");

-- CreateIndex
CREATE INDEX "chairs_salonId_idx" ON "chairs"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "queues_salonId_key" ON "queues"("salonId");

-- CreateIndex
CREATE INDEX "queue_entries_salonId_state_idx" ON "queue_entries"("salonId", "state");

-- CreateIndex
CREATE INDEX "queue_entries_queueId_sequenceNo_idx" ON "queue_entries"("queueId", "sequenceNo");

-- CreateIndex
CREATE INDEX "queue_entries_customerId_createdAt_idx" ON "queue_entries"("customerId", "createdAt");

-- CreateIndex
CREATE INDEX "appointments_salonId_scheduledAt_idx" ON "appointments"("salonId", "scheduledAt");

-- CreateIndex
CREATE UNIQUE INDEX "reviews_entryId_key" ON "reviews"("entryId");

-- CreateIndex
CREATE INDEX "reviews_salonId_idx" ON "reviews"("salonId");

-- CreateIndex
CREATE INDEX "operating_hours_salonId_idx" ON "operating_hours"("salonId");

-- CreateIndex
CREATE UNIQUE INDEX "operating_hours_salonId_weekday_key" ON "operating_hours"("salonId", "weekday");

-- CreateIndex
CREATE INDEX "notifications_userId_idx" ON "notifications"("userId");

-- CreateIndex
CREATE INDEX "device_tokens_userId_idx" ON "device_tokens"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "complaints_entryId_idx" ON "complaints"("entryId");

-- CreateIndex
CREATE INDEX "payments_entryId_idx" ON "payments"("entryId");

-- CreateIndex
CREATE INDEX "queue_audit_salonId_at_idx" ON "queue_audit"("salonId", "at");

-- CreateIndex
CREATE UNIQUE INDEX "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "refresh_tokens_userId_revokedAt_idx" ON "refresh_tokens"("userId", "revokedAt");

-- AddForeignKey
ALTER TABLE "salons" ADD CONSTRAINT "salons_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_staff" ADD CONSTRAINT "salon_staff_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salon_staff" ADD CONSTRAINT "salon_staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_salonStaffId_salonId_fkey" FOREIGN KEY ("salonStaffId", "salonId") REFERENCES "salon_staff"("id", "salonId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff_services" ADD CONSTRAINT "staff_services_serviceId_salonId_fkey" FOREIGN KEY ("serviceId", "salonId") REFERENCES "services"("id", "salonId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chairs" ADD CONSTRAINT "chairs_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queues" ADD CONSTRAINT "queues_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_queueId_fkey" FOREIGN KEY ("queueId") REFERENCES "queues"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_chairId_fkey" FOREIGN KEY ("chairId") REFERENCES "chairs"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_entries" ADD CONSTRAINT "queue_entries_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "salon_staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "services"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "queue_entries"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "operating_hours" ADD CONSTRAINT "operating_hours_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "queue_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "queue_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_audit" ADD CONSTRAINT "queue_audit_salonId_fkey" FOREIGN KEY ("salonId") REFERENCES "salons"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_audit" ADD CONSTRAINT "queue_audit_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


-- ============================================================
-- Manually-managed objects (not expressible in schema.prisma).
-- See prisma/README.md → "Manually-managed database objects".
-- ============================================================

-- GIST index for geospatial discovery (ST_DWithin / ST_Distance).
CREATE INDEX "salons_geom_gist_idx" ON "salons" USING GIST ("geom");

-- Review rating domain check (1..5).
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_rating_check" CHECK ("rating" >= 1 AND "rating" <= 5);
