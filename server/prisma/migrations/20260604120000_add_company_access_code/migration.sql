ALTER TABLE `companies` ADD COLUMN `accessCode` VARCHAR(191) NULL;

UPDATE `companies`
SET `accessCode` = CONCAT('DL-', UPPER(SUBSTRING(REPLACE(`id`, '-', ''), 1, 8)))
WHERE `accessCode` IS NULL;

ALTER TABLE `companies` MODIFY `accessCode` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `companies_accessCode_key` ON `companies`(`accessCode`);
