-- DropForeignKey
ALTER TABLE "userWatch" DROP CONSTRAINT "userWatch_telegramUserId_fkey";

-- AddForeignKey
ALTER TABLE "userWatch" ADD CONSTRAINT "userWatch_telegramUserId_fkey" FOREIGN KEY ("telegramUserId") REFERENCES "user"("telegramId") ON DELETE RESTRICT ON UPDATE CASCADE;
