-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "isFree" BOOLEAN;

-- CreateIndex
CREATE INDEX "Opportunity_isFree_idx" ON "Opportunity"("isFree");
