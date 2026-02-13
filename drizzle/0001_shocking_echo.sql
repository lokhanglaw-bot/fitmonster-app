CREATE TABLE `battles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`challengerId` int NOT NULL,
	`opponentId` int NOT NULL,
	`challengerMonsterId` int NOT NULL,
	`opponentMonsterId` int NOT NULL,
	`winnerId` int,
	`battleType` enum('pvp','wild','friendly') NOT NULL DEFAULT 'pvp',
	`status` enum('pending','active','completed') NOT NULL DEFAULT 'pending',
	`expReward` int NOT NULL DEFAULT 0,
	`coinReward` int NOT NULL DEFAULT 0,
	`battleLog` json,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `battles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `dailyStats` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`date` varchar(10) NOT NULL,
	`steps` int NOT NULL DEFAULT 0,
	`caloriesIntake` int NOT NULL DEFAULT 0,
	`caloriesBurned` int NOT NULL DEFAULT 0,
	`proteinIntake` int NOT NULL DEFAULT 0,
	`workoutExp` int NOT NULL DEFAULT 0,
	`nutritionExp` int NOT NULL DEFAULT 0,
	`netExp` int NOT NULL DEFAULT 0,
	`healthScore` int NOT NULL DEFAULT 0,
	`workoutsCompleted` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `dailyStats_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `foodLogs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`foodName` varchar(200) NOT NULL,
	`calories` int NOT NULL,
	`protein` int NOT NULL,
	`carbs` int,
	`fats` int,
	`imageUrl` text,
	`mealType` enum('breakfast','lunch','dinner','snack'),
	`expEarned` int NOT NULL DEFAULT 0,
	`date` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `foodLogs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `friendships` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`friendId` int NOT NULL,
	`status` enum('pending','accepted','blocked') NOT NULL DEFAULT 'pending',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `friendships_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matchSwipes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`targetUserId` int NOT NULL,
	`swipeType` enum('like','nope','super_like') NOT NULL,
	`date` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `matchSwipes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `monsters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`name` varchar(100) NOT NULL,
	`monsterType` enum('bodybuilder','physique','powerlifter','athlete','colossus') NOT NULL DEFAULT 'bodybuilder',
	`level` int NOT NULL DEFAULT 1,
	`currentHp` int NOT NULL DEFAULT 100,
	`maxHp` int NOT NULL DEFAULT 100,
	`currentExp` int NOT NULL DEFAULT 0,
	`expToNextLevel` int NOT NULL DEFAULT 100,
	`strength` int NOT NULL DEFAULT 10,
	`defense` int NOT NULL DEFAULT 10,
	`agility` int NOT NULL DEFAULT 10,
	`evolutionProgress` int NOT NULL DEFAULT 0,
	`evolutionStage` int NOT NULL DEFAULT 1,
	`status` enum('rookie','in_battle','training','resting') NOT NULL DEFAULT 'rookie',
	`isActive` boolean NOT NULL DEFAULT true,
	`imageUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `monsters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`trainerName` varchar(100),
	`healthScore` int NOT NULL DEFAULT 0,
	`totalSteps` int NOT NULL DEFAULT 0,
	`totalExp` int NOT NULL DEFAULT 0,
	`coins` int NOT NULL DEFAULT 0,
	`dailyCalorieGoal` int NOT NULL DEFAULT 1800,
	`dailyProteinGoal` int NOT NULL DEFAULT 100,
	`dailyStepsGoal` int NOT NULL DEFAULT 10000,
	`currentStreak` int NOT NULL DEFAULT 0,
	`longestStreak` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `profiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `quests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`questType` varchar(50) NOT NULL,
	`title` varchar(200) NOT NULL,
	`description` text NOT NULL,
	`targetValue` int NOT NULL,
	`rewardCoins` int NOT NULL,
	`rewardExp` int NOT NULL,
	`icon` varchar(50),
	`isDaily` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userQuests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`questId` int NOT NULL,
	`currentProgress` int NOT NULL DEFAULT 0,
	`targetValue` int NOT NULL,
	`isCompleted` boolean NOT NULL DEFAULT false,
	`completedAt` timestamp,
	`date` varchar(10) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userQuests_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `workouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`exerciseType` varchar(100) NOT NULL,
	`exerciseName` varchar(200) NOT NULL,
	`duration` int NOT NULL,
	`metValue` float NOT NULL,
	`caloriesBurned` int NOT NULL,
	`expEarned` int NOT NULL,
	`date` timestamp NOT NULL DEFAULT (now()),
	`notes` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `workouts_id` PRIMARY KEY(`id`)
);
