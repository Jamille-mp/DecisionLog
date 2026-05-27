ALTER TABLE `users`
  ADD COLUMN `termsAcceptedAt` DATETIME(3) NULL,
  ADD COLUMN `privacyAcceptedAt` DATETIME(3) NULL,
  ADD COLUMN `passwordResetTokenHash` VARCHAR(191) NULL,
  ADD COLUMN `passwordResetExpiresAt` DATETIME(3) NULL;

