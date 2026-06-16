/*
  Warnings:

  - A unique constraint covering the columns `[passwordResetTokenHash]` on the table `AdminUser` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "AdminUser" ADD COLUMN     "passwordResetExpiresAt" TIMESTAMP(3),
ADD COLUMN     "passwordResetTokenHash" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "AdminUser_passwordResetTokenHash_key" ON "AdminUser"("passwordResetTokenHash");
