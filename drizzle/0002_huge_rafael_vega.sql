ALTER TABLE `jobs` ADD `workMode` varchar(20);--> statement-breakpoint
CREATE INDEX `workMode_idx` ON `jobs` (`workMode`);