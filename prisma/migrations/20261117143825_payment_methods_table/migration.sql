-- Convert PaymentMethod from a fixed enum to a per-user editable table,
-- mirroring Category. Existing enum values map to seeded per-user rows.

-- 1. Free the "PaymentMethod" name. Postgres shares the type/relation
--    namespace: the enum type must be renamed before a table of the same
--    name can be created.
ALTER TYPE "PaymentMethod" RENAME TO "PaymentMethod_legacy";

-- 2. New table. Prisma's cuid() default is client-side; SQL-seeded rows use
--    gen_random_uuid()::text (PG13+). Any unique non-empty text is a valid
--    Prisma String id.
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "PaymentMethod_userId_name_key" ON "PaymentMethod"("userId", "name");
CREATE INDEX "PaymentMethod_userId_sortOrder_idx" ON "PaymentMethod"("userId", "sortOrder");
ALTER TABLE "PaymentMethod"
  ADD CONSTRAINT "PaymentMethod_userId_fkey" FOREIGN KEY ("userId")
  REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 3. Seed one default set per existing user (enum value -> display name).
INSERT INTO "PaymentMethod" ("id", "userId", "name", "sortOrder", "isHidden")
SELECT gen_random_uuid()::text, u."id", d."name", d."sortOrder", false
FROM "User" u
CROSS JOIN (VALUES
    ('Cash', 0), ('Credit Card', 1), ('Debit Card', 2),
    ('Bank Transfer', 3), ('Digital Wallet', 4), ('Other', 5)
) AS d("name", "sortOrder");

-- 4. Nullable FK columns, then backfill via enum->name mapping per user.
ALTER TABLE "Transaction" ADD COLUMN "paymentMethodId" TEXT;
ALTER TABLE "RecurringTemplate" ADD COLUMN "paymentMethodId" TEXT;

UPDATE "Transaction" t
SET "paymentMethodId" = pm."id"
FROM "PaymentMethod" pm
JOIN (VALUES
    ('CASH','Cash'), ('CREDIT_CARD','Credit Card'), ('DEBIT_CARD','Debit Card'),
    ('BANK_TRANSFER','Bank Transfer'), ('DIGITAL_WALLET','Digital Wallet'), ('OTHER','Other')
) AS m("enum_val", "name") ON pm."name" = m."name"
WHERE pm."userId" = t."userId" AND t."paymentMethod"::text = m."enum_val";

UPDATE "RecurringTemplate" rt
SET "paymentMethodId" = pm."id"
FROM "PaymentMethod" pm
JOIN (VALUES
    ('CASH','Cash'), ('CREDIT_CARD','Credit Card'), ('DEBIT_CARD','Debit Card'),
    ('BANK_TRANSFER','Bank Transfer'), ('DIGITAL_WALLET','Digital Wallet'), ('OTHER','Other')
) AS m("enum_val", "name") ON pm."name" = m."name"
WHERE pm."userId" = rt."userId" AND rt."paymentMethod"::text = m."enum_val";

-- 5. Enforce + FK (Restrict backstop for the app-level delete guard).
--    SET NOT NULL fails loudly if any backfill row missed, rolling back.
ALTER TABLE "Transaction" ALTER COLUMN "paymentMethodId" SET NOT NULL;
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentMethodId_fkey"
  FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RecurringTemplate" ALTER COLUMN "paymentMethodId" SET NOT NULL;
ALTER TABLE "RecurringTemplate" ADD CONSTRAINT "RecurringTemplate_paymentMethodId_fkey"
  FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- 6. Drop the old enum columns and the renamed enum type.
ALTER TABLE "Transaction" DROP COLUMN "paymentMethod";
ALTER TABLE "RecurringTemplate" DROP COLUMN "paymentMethod";
DROP TYPE "PaymentMethod_legacy";
