-- CreateEnum
CREATE TYPE "LoanType" AS ENUM ('MORTGAGE', 'CAR', 'PERSONAL', 'STUDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "AmortizationMode" AS ENUM ('FIXED_PAYMENT_MANUAL', 'STANDARD_WITH_INTEREST');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('PENDING', 'PAID', 'PARTIAL');

-- CreateTable
CREATE TABLE "ClientProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalLoan" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "LoanType" NOT NULL,
    "mode" "AmortizationMode" NOT NULL,
    "monthlyPayment" DECIMAL(12,2),
    "principal" DECIMAL(12,2),
    "annualRate" DECIMAL(7,4),
    "months" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "monthlyExtras" DECIMAL(12,2),
    "totalToPay" DECIMAL(12,2),
    "remainingToPay" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalLoan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PersonalInstallment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "principal" DECIMAL(12,2),
    "interest" DECIMAL(12,2),
    "extras" DECIMAL(12,2),
    "status" "InstallmentStatus" NOT NULL DEFAULT 'PENDING',
    "paidAt" TIMESTAMP(3),
    "actualPaid" DECIMAL(12,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PersonalInstallment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ClientProfile_userId_key" ON "ClientProfile"("userId");

-- CreateIndex
CREATE INDEX "PersonalLoan_clientId_idx" ON "PersonalLoan"("clientId");

-- CreateIndex
CREATE INDEX "PersonalLoan_startDate_idx" ON "PersonalLoan"("startDate");

-- CreateIndex
CREATE INDEX "PersonalInstallment_loanId_idx" ON "PersonalInstallment"("loanId");

-- CreateIndex
CREATE INDEX "PersonalInstallment_status_idx" ON "PersonalInstallment"("status");

-- CreateIndex
CREATE INDEX "PersonalInstallment_dueDate_idx" ON "PersonalInstallment"("dueDate");

-- AddForeignKey
ALTER TABLE "ClientProfile" ADD CONSTRAINT "ClientProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalLoan" ADD CONSTRAINT "PersonalLoan_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "ClientProfile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PersonalInstallment" ADD CONSTRAINT "PersonalInstallment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "PersonalLoan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
