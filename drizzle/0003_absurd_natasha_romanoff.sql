ALTER TABLE `profiles` ADD `age` int;--> statement-breakpoint
ALTER TABLE `profiles` ADD `gender` enum('male','female');--> statement-breakpoint
ALTER TABLE `profiles` ADD `height` float;--> statement-breakpoint
ALTER TABLE `profiles` ADD `weight` float;--> statement-breakpoint
ALTER TABLE `profiles` ADD `bmr` float;--> statement-breakpoint
ALTER TABLE `profiles` ADD `matchGenderPreference` enum('all','male','female') DEFAULT 'all';--> statement-breakpoint
ALTER TABLE `profiles` ADD `profileCompleted` boolean DEFAULT false NOT NULL;