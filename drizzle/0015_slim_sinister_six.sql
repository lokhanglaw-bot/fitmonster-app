CREATE TABLE `battleRounds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`battleId` int NOT NULL,
	`roundNumber` int NOT NULL,
	`player1Move` varchar(20),
	`player2Move` varchar(20),
	`player1Damage` float NOT NULL DEFAULT 0,
	`player2Damage` float NOT NULL DEFAULT 0,
	`result` varchar(10),
	`player1HpAfter` float,
	`player2HpAfter` float,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `battleRounds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `bodyStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` varchar(64) NOT NULL,
	`date` varchar(10) NOT NULL,
	`muscleScore` float NOT NULL DEFAULT 50,
	`fatScore` float NOT NULL DEFAULT 50,
	`bodyType` varchar(20) NOT NULL DEFAULT 'standard',
	`calorieBalance` int NOT NULL DEFAULT 0,
	`proteinAdequate` boolean NOT NULL DEFAULT false,
	`hadStrengthTraining` boolean NOT NULL DEFAULT false,
	`hadCardio` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `bodyStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `exercises` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(100) NOT NULL,
	`nameZh` varchar(100),
	`category` varchar(50) NOT NULL,
	`muscleGroup` varchar(50) NOT NULL,
	`secondaryMuscles` varchar(200),
	`equipment` varchar(50),
	`difficulty` enum('beginner','intermediate','advanced') NOT NULL DEFAULT 'beginner',
	`instructions` text,
	`isCompound` boolean NOT NULL DEFAULT false,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `exercises_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `personalRecords` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exerciseId` int,
	`exerciseName` varchar(100) NOT NULL,
	`recordType` enum('weight','reps','volume','duration') NOT NULL DEFAULT 'weight',
	`value` float NOT NULL,
	`previousValue` float,
	`workoutSetId` int,
	`achievedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `personalRecords_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workoutSets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`workoutId` int,
	`exerciseId` int,
	`exerciseName` varchar(100) NOT NULL,
	`setNumber` int NOT NULL,
	`setType` enum('warmup','working','failure','drop','super') NOT NULL DEFAULT 'working',
	`weight` float,
	`reps` int,
	`duration` int,
	`rpe` float,
	`isPR` boolean NOT NULL DEFAULT false,
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workoutSets_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `battles` ADD `player1Hp` float DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `battles` ADD `player2Hp` float DEFAULT 100 NOT NULL;--> statement-breakpoint
ALTER TABLE `battles` ADD `currentRound` int DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `battles` ADD `p1FitnessBonus` json;--> statement-breakpoint
ALTER TABLE `battles` ADD `p2FitnessBonus` json;--> statement-breakpoint
ALTER TABLE `foodLogs` ADD `addedSugar` float;--> statement-breakpoint
ALTER TABLE `foodLogs` ADD `saturatedFat` float;--> statement-breakpoint
ALTER TABLE `foodLogs` ADD `sodium` float;--> statement-breakpoint
ALTER TABLE `foodLogs` ADD `glycemicIndex` varchar(10);--> statement-breakpoint
ALTER TABLE `foodLogs` ADD `fiber` float;--> statement-breakpoint
ALTER TABLE `monsters` ADD `muscleScore` float DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `fatScore` float DEFAULT 50 NOT NULL;--> statement-breakpoint
ALTER TABLE `monsters` ADD `bodyType` varchar(20) DEFAULT 'standard' NOT NULL;--> statement-breakpoint
ALTER TABLE `battleRounds` ADD CONSTRAINT `battleRounds_battleId_battles_id_fk` FOREIGN KEY (`battleId`) REFERENCES `battles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personalRecords` ADD CONSTRAINT `personalRecords_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personalRecords` ADD CONSTRAINT `personalRecords_exerciseId_exercises_id_fk` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `personalRecords` ADD CONSTRAINT `personalRecords_workoutSetId_workoutSets_id_fk` FOREIGN KEY (`workoutSetId`) REFERENCES `workoutSets`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workoutSets` ADD CONSTRAINT `workoutSets_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workoutSets` ADD CONSTRAINT `workoutSets_workoutId_workouts_id_fk` FOREIGN KEY (`workoutId`) REFERENCES `workouts`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `workoutSets` ADD CONSTRAINT `workoutSets_exerciseId_exercises_id_fk` FOREIGN KEY (`exerciseId`) REFERENCES `exercises`(`id`) ON DELETE no action ON UPDATE no action;