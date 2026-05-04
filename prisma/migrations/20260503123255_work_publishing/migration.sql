/*
  Warnings:

  - You are about to drop the column `kind` on the `SavedWork` table. All the data in the column will be lost.
  - You are about to drop the column `targetId` on the `SavedWork` table. All the data in the column will be lost.
  - You are about to drop the column `externalId` on the `Work` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Work` table. All the data in the column will be lost.
  - Added the required column `workId` to the `SavedWork` table without a default value. This is not possible if the table is not empty.
  - Added the required column `authorId` to the `Work` table without a default value. This is not possible if the table is not empty.
  - Added the required column `description` to the `Work` table without a default value. This is not possible if the table is not empty.
  - Added the required column `imageUrl` to the `Work` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tags` to the `Work` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SavedWork" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" TEXT NOT NULL,
    "workId" INTEGER NOT NULL,
    "savedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SavedWork_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SavedWork_workId_fkey" FOREIGN KEY ("workId") REFERENCES "Work" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_SavedWork" ("id", "savedAt", "userId", "workId") SELECT "id", "savedAt", "userId", "targetId" FROM "SavedWork";
DROP TABLE "SavedWork";
ALTER TABLE "new_SavedWork" RENAME TO "SavedWork";
CREATE UNIQUE INDEX "SavedWork_userId_workId_key" ON "SavedWork"("userId", "workId");
CREATE TABLE "new_Work" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "authorId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "tags" TEXT NOT NULL,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Work_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Work" ("authorId", "category", "createdAt", "description", "featured", "id", "imageUrl", "tags", "title", "updatedAt")
SELECT "userId", "category", "createdAt", '', "featured", "id", '', '[]', "title", "updatedAt" FROM "Work";
DROP TABLE "Work";
ALTER TABLE "new_Work" RENAME TO "Work";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
