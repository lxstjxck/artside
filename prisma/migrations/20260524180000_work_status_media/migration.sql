ALTER TABLE "Work" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'published';
ALTER TABLE "Work" ADD COLUMN "thumbnailUrl" TEXT;
ALTER TABLE "Work" ADD COLUMN "thumbnailKey" TEXT;
ALTER TABLE "Work" ADD COLUMN "thumbnailWidth" INTEGER;
ALTER TABLE "Work" ADD COLUMN "thumbnailHeight" INTEGER;

CREATE TABLE "WorkImage" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
  "workId" INTEGER NOT NULL,
  "url" TEXT NOT NULL,
  "key" TEXT,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "WorkImage_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "WorkImage" ("workId", "url", "key", "width", "height", "sortOrder")
SELECT "id", "imageUrl", "imageKey", "imageWidth", "imageHeight", 0
FROM "Work"
WHERE "imageUrl" IS NOT NULL AND "imageUrl" != '';

CREATE INDEX "Work_status_createdAt_idx" ON "Work"("status", "createdAt");
CREATE INDEX "WorkImage_workId_sortOrder_idx" ON "WorkImage"("workId", "sortOrder");
