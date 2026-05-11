-- AlterTable
ALTER TABLE "Profile" ADD COLUMN "notifyLikes" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "notifyComments" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Profile" ADD COLUMN "emailNotifications" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'system';
ALTER TABLE "Notification" ADD COLUMN "href" TEXT;
ALTER TABLE "Notification" ADD COLUMN "actorId" TEXT;
ALTER TABLE "Notification" ADD COLUMN "workId" INTEGER;
