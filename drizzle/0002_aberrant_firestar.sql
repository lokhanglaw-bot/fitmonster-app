CREATE TABLE `userLocations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`latitude` float NOT NULL,
	`longitude` float NOT NULL,
	`isSharing` boolean NOT NULL DEFAULT false,
	`lastUpdated` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `userLocations_id` PRIMARY KEY(`id`),
	CONSTRAINT `userLocations_userId_unique` UNIQUE(`userId`)
);
