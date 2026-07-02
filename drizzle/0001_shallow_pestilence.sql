CREATE TABLE `jobs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`jobId` varchar(255) NOT NULL,
	`title` text NOT NULL,
	`companyName` text NOT NULL,
	`location` text,
	`description` text,
	`jobType` varchar(100),
	`salary` varchar(100),
	`shareLink` text,
	`thumbnail` text,
	`via` varchar(100),
	`postedAt` timestamp,
	`rawData` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `jobs_id` PRIMARY KEY(`id`),
	CONSTRAINT `jobs_jobId_unique` UNIQUE(`jobId`)
);
--> statement-breakpoint
CREATE TABLE `searchHistory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`query` text,
	`filters` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `searchHistory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `jobId_idx` ON `jobs` (`jobId`);--> statement-breakpoint
CREATE INDEX `companyName_idx` ON `jobs` (`companyName`);--> statement-breakpoint
CREATE INDEX `jobType_idx` ON `jobs` (`jobType`);--> statement-breakpoint
CREATE INDEX `createdAt_idx` ON `jobs` (`createdAt`);--> statement-breakpoint
CREATE INDEX `userId_idx` ON `searchHistory` (`userId`);