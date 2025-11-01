/*
  Warnings:

  - You are about to drop the `PersonalInstallment` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `PersonalLoan` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "ClientLoanType" AS ENUM ('MORTGAGE', 'CAR', 'PERSONAL', 'STUDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "ClientInstallmentStatus" AS ENUM ('PENDING', 'PAID');

-- DropForeignKey
ALTER TABLE "public"."PersonalInstallment" DROP CONSTRAINT "PersonalInstallment_loanId_fkey";

-- DropForeignKey
ALTER TABLE "public"."PersonalLoan" DROP CONSTRAINT "PersonalLoan_clientId_fkey";

-- DropTable
DROP TABLE "public"."PersonalInstallment";

-- DropTable
DROP TABLE "public"."PersonalLoan";

-- DropEnum
DROP TYPE "public"."AmortizationMode";

-- DropEnum
DROP TYPE "public"."InstallmentStatus";

-- DropEnum
DROP TYPE "public"."LoanType";

-- CreateTable
CREATE TABLE "ClientLoan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "ClientLoanType" NOT NULL DEFAULT 'OTHER',
    "startDate" TIMESTAMP(3) NOT NULL,
    "months" INTEGER NOT NULL,
    "monthlyPayment" DECIMAL(12,2) NOT NULL,
    "monthlyExtras" DECIMAL(12,2),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientInstallment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profileId" TEXT NOT NULL,
    "title" TEXT,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "ClientInstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ClientLoan_userId_idx" ON "ClientLoan"("userId");

-- CreateIndex
CREATE INDEX "ClientLoan_profileId_idx" ON "ClientLoan"("profileId");

-- CreateIndex
CREATE INDEX "ClientLoan_startDate_idx" ON "ClientLoan"("startDate");

-- CreateIndex
CREATE INDEX "ClientInstallment_userId_idx" ON "ClientInstallment"("userId");

-- CreateIndex
CREATE INDEX "ClientInstallment_profileId_idx" ON "ClientInstallment"("profileId");

-- CreateIndex
CREATE INDEX "ClientInstallment_dueDate_idx" ON "ClientInstallment"("dueDate");

-- CreateIndex
CREATE INDEX "ClientInstallment_status_idx" ON "ClientInstallment"("status");

-- AddForeignKey
ALTER TABLE "ClientLoan" ADD CONSTRAINT "ClientLoan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientLoan" ADD CONSTRAINT "ClientLoan_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInstallment" ADD CONSTRAINT "ClientInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "ClientLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInstallment" ADD CONSTRAINT "ClientInstallment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientInstallment" ADD CONSTRAINT "ClientInstallment_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;
