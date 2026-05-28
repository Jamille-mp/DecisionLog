ALTER TABLE `users`
  ADD COLUMN `departmentId` VARCHAR(191) NULL;

ALTER TABLE `users`
  ADD CONSTRAINT `users_departmentId_fkey`
  FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;

