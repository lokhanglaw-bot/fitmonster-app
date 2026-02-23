ALTER TABLE `friendships` ADD `hideLocation` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `profiles` ADD `matchRadius` float DEFAULT 5 NOT NULL;