-- CreateEnum
CREATE TYPE "Category" AS ENUM ('HACKATHON', 'INTERNSHIP', 'WORKSHOP', 'COMPETITION', 'CONFERENCE', 'SCHOLARSHIP');

-- CreateEnum
CREATE TYPE "Mode" AS ENUM ('ONLINE', 'OFFLINE', 'HYBRID');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "college" TEXT,
    "course" TEXT,
    "year" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Opportunity" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "Category" NOT NULL,
    "location" TEXT NOT NULL,
    "mode" "Mode" NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "registrationDeadline" TIMESTAMP(3) NOT NULL,
    "organizer" TEXT NOT NULL,
    "eligibility" TEXT NOT NULL,
    "skills" TEXT[],
    "tags" TEXT[],
    "registrationUrl" TEXT NOT NULL,
    "relevanceScore" INTEGER NOT NULL DEFAULT 70,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Opportunity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SearchInteraction" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "query" TEXT NOT NULL,
    "interpretedIntent" JSONB,
    "resultsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SearchInteraction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recommendation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "opportunityId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Recommendation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "Opportunity_category_idx" ON "Opportunity"("category");

-- CreateIndex
CREATE INDEX "Opportunity_location_idx" ON "Opportunity"("location");

-- CreateIndex
CREATE INDEX "Opportunity_mode_idx" ON "Opportunity"("mode");

-- CreateIndex
CREATE INDEX "Opportunity_registrationDeadline_idx" ON "Opportunity"("registrationDeadline");

-- CreateIndex
CREATE INDEX "Opportunity_featured_idx" ON "Opportunity"("featured");

-- CreateIndex
CREATE INDEX "Bookmark_userId_idx" ON "Bookmark"("userId");

-- CreateIndex
CREATE INDEX "Bookmark_opportunityId_idx" ON "Bookmark"("opportunityId");

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_opportunityId_key" ON "Bookmark"("userId", "opportunityId");

-- CreateIndex
CREATE INDEX "SearchInteraction_userId_idx" ON "SearchInteraction"("userId");

-- CreateIndex
CREATE INDEX "SearchInteraction_createdAt_idx" ON "SearchInteraction"("createdAt");

-- CreateIndex
CREATE INDEX "Recommendation_userId_idx" ON "Recommendation"("userId");

-- CreateIndex
CREATE INDEX "Recommendation_score_idx" ON "Recommendation"("score");

-- CreateIndex
CREATE UNIQUE INDEX "Recommendation_userId_opportunityId_key" ON "Recommendation"("userId", "opportunityId");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SearchInteraction" ADD CONSTRAINT "SearchInteraction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_opportunityId_fkey" FOREIGN KEY ("opportunityId") REFERENCES "Opportunity"("id") ON DELETE CASCADE ON UPDATE CASCADE;
