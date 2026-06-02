-- CreateTable
CREATE TABLE `companies` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `companies_slug_key`(`slug`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `company_domains` (
    `id` VARCHAR(191) NOT NULL,
    `companyId` VARCHAR(191) NOT NULL,
    `domain` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `company_domains_domain_key`(`domain`),
    INDEX `company_domains_companyId_idx`(`companyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Seed base companies used by the demonstration environment.
INSERT INTO `companies` (`id`, `name`, `slug`, `active`, `createdAt`, `updatedAt`)
VALUES
  ('00000000-0000-4000-8000-000000000001', 'DecisionLog', 'decisionlog', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('00000000-0000-4000-8000-000000000002', 'AESA', 'aesa', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

INSERT INTO `company_domains` (`id`, `companyId`, `domain`, `active`, `createdAt`, `updatedAt`)
VALUES
  ('00000000-0000-4000-8000-000000000101', '00000000-0000-4000-8000-000000000001', 'decisionlog.local', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('00000000-0000-4000-8000-000000000102', '00000000-0000-4000-8000-000000000002', 'aesa-cesa.br', true, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));

-- AlterTable
ALTER TABLE `users` ADD COLUMN `companyId` VARCHAR(191) NULL;
ALTER TABLE `departments` ADD COLUMN `companyId` VARCHAR(191) NULL;
ALTER TABLE `decisions` ADD COLUMN `companyId` VARCHAR(191) NULL;

-- Backfill current records.
UPDATE `users`
SET `companyId` = '00000000-0000-4000-8000-000000000001'
WHERE `companyId` IS NULL;

UPDATE `users`
SET `companyId` = '00000000-0000-4000-8000-000000000002',
    `role` = CASE
      WHEN `email` = '2024130015@aesa-cesa.br' THEN 'admin'
      ELSE `role`
    END
WHERE LOWER(`email`) LIKE '%@aesa-cesa.br';

UPDATE `departments`
SET `companyId` = '00000000-0000-4000-8000-000000000001'
WHERE `companyId` IS NULL;

UPDATE `decisions` d
LEFT JOIN `users` u ON u.`id` = d.`userId`
SET d.`companyId` = COALESCE(u.`companyId`, '00000000-0000-4000-8000-000000000001')
WHERE d.`companyId` IS NULL;

-- Make tenant ownership required after backfill.
ALTER TABLE `users` MODIFY `companyId` VARCHAR(191) NOT NULL;
ALTER TABLE `departments` MODIFY `companyId` VARCHAR(191) NOT NULL;
ALTER TABLE `decisions` MODIFY `companyId` VARCHAR(191) NOT NULL;

-- Department names are unique inside each company, not globally.
DROP INDEX `departments_name_key` ON `departments`;
CREATE UNIQUE INDEX `departments_companyId_name_key` ON `departments`(`companyId`, `name`);

-- Indexes
CREATE INDEX `users_companyId_idx` ON `users`(`companyId`);
CREATE INDEX `departments_companyId_idx` ON `departments`(`companyId`);
CREATE INDEX `decisions_companyId_idx` ON `decisions`(`companyId`);

-- AddForeignKey
ALTER TABLE `company_domains` ADD CONSTRAINT `company_domains_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `users` ADD CONSTRAINT `users_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `departments` ADD CONSTRAINT `departments_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE `decisions` ADD CONSTRAINT `decisions_companyId_fkey` FOREIGN KEY (`companyId`) REFERENCES `companies`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
