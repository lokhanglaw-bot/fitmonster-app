ALTER TABLE `users` ADD `passwordHash` varchar(128);--> statement-breakpoint
ALTER TABLE `users` ADD `passwordSalt` varchar(64);