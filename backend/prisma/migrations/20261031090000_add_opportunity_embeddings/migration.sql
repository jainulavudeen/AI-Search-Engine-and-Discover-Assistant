-- AlterTable
ALTER TABLE "Opportunity" ADD COLUMN     "embedding" DOUBLE PRECISION[] DEFAULT ARRAY[]::DOUBLE PRECISION[],
ADD COLUMN     "embeddingHash" TEXT;
