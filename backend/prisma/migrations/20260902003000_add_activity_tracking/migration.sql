-- CreateEnum
CREATE TYPE "InteractionType" AS ENUM ('VIEW', 'BOOKMARK', 'REGISTER_CLICK', 'RECOMMENDATION_CLICK');

-- AlterTable
ALTER TABLE "SearchInteraction" ADD COLUMN     "category" "Category",
ADD COLUMN     "location" TEXT;

-- CreateTable
CREATE TABLE "OpportunityInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "opportunityId" TEXT NOT NULL,
    "type" "InteractionType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OpportunityInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "OpportunityInteraction_userId_idx" ON "OpportunityInteraction"("userId");

-- CreateIndex
CREATE INDEX "OpportunityInteraction_opportunityId_idx" ON "OpportunityInteraction"("opportunityId");

-- CreateIndex
CREATE INDEX "OpportunityInteraction_type_idx" ON "OpportunityInteraction"("type");

-- CreateIndex
CREATE INDEX "OpportunityInteraction_createdAt_idx" ON "OpportunityInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "SearchInteraction_category_idx" ON "SearchInteraction"("category");

-- CreateIndex
CREATE INDEX "SearchInteraction_location_idx" ON "SearchInteraction"("location");

-- AddForeignKey
ALTER TABLE "OpportunityInteraction" ADD CONSTRAINT "OpportunityInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OpportunityInteraction" ADD CONSTRAINT "OpportunityInteraction_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
