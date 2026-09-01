-- AlterTable
ALTER TABLE "User" ADD COLUMN     "interests" TEXT[],
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "opportunityTypes" TEXT[],
ADD COLUMN     "preferredLocations" TEXT[];
