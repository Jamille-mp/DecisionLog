-- AlterTable
ALTER TABLE `users` ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'manager';

-- AlterTable
ALTER TABLE `decisions`
  ADD COLUMN `department` VARCHAR(191) NOT NULL DEFAULT 'Projeto',
  ADD COLUMN `impact` VARCHAR(191) NOT NULL DEFAULT 'medium',
  ADD COLUMN `active` BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN `deletedAt` DATETIME(3) NULL;
