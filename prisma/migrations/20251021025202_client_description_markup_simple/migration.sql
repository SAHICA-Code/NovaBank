-- === CLIENT: email -> description =========================================
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "description" TEXT;

-- Copiamos el contenido de email (si existía) a description
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Client' AND column_name = 'email') THEN
    UPDATE "Client" SET "description" = COALESCE("email", '');
  END IF;
END$$;

-- Eliminamos la columna email si existía
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Client' AND column_name = 'email') THEN
    ALTER TABLE "Client" DROP COLUMN "email";
  END IF;
END$$;

-- ==========================================================================

-- === LOAN: nuevos campos amount, markupPercent, totalToRepay ===============
-- Los añadimos como NULL primero para poder hacer backfill
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "amount" DECIMAL(12,2);
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "markupPercent" INTEGER;
ALTER TABLE "Loan" ADD COLUMN IF NOT EXISTS "totalToRepay" DECIMAL(12,2);

-- Backfill desde el esquema anterior:
-- amount <- principal
-- markupPercent <- 0 (neutral si no había dato)
-- totalToRepay <- principal (si markup=0, total = principal)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Loan' AND column_name = 'principal') THEN
    UPDATE "Loan"
      SET "amount" = COALESCE("principal", 0),
          "markupPercent" = 0,
          "totalToRepay" = COALESCE("principal", 0)
      WHERE "amount" IS NULL
        OR "markupPercent" IS NULL
        OR "totalToRepay" IS NULL;
  ELSE
    -- Si por lo que sea ya no existe principal (caso raro), al menos inicializamos a 0
    UPDATE "Loan"
      SET "amount" = COALESCE("amount", 0),
          "markupPercent" = COALESCE("markupPercent", 0),
          "totalToRepay" = COALESCE("totalToRepay", 0);
  END IF;
END$$;

-- Ahora sí, las volvemos NOT NULL
ALTER TABLE "Loan" ALTER COLUMN "amount" SET NOT NULL;
ALTER TABLE "Loan" ALTER COLUMN "markupPercent" SET NOT NULL;
ALTER TABLE "Loan" ALTER COLUMN "totalToRepay" SET NOT NULL;

-- Eliminamos columnas antiguas si existen
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Loan' AND column_name = 'principal') THEN
    ALTER TABLE "Loan" DROP COLUMN "principal";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Loan' AND column_name = 'annualRatePct') THEN
    ALTER TABLE "Loan" DROP COLUMN "annualRatePct";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'Loan' AND column_name = 'monthlyPayment') THEN
    ALTER TABLE "Loan" DROP COLUMN "monthlyPayment";
  END IF;
END$$;

-- ==========================================================================

-- === PAYMENT: eliminamos desglose antiguo principal/interest ===============
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Payment' AND column_name = 'principal') THEN
    ALTER TABLE "Payment" DROP COLUMN "principal";
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.columns 
              WHERE table_name = 'Payment' AND column_name = 'interest') THEN
    ALTER TABLE "Payment" DROP COLUMN "interest";
  END IF;
END$$;

-- Listo. ====================================================================
