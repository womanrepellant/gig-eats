CREATE TABLE `reviews` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`author` text NOT NULL,
	`rating` integer NOT NULL,
	`dish` text NOT NULL,
	`body` text NOT NULL,
	`spend` integer NOT NULL,
	`visited_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `review_user_restaurant` ON `reviews` (`user_id`,`restaurant_id`);--> statement-breakpoint
CREATE TABLE `spots` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`restaurant_id` text NOT NULL,
	`status` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `spot_user_restaurant` ON `spots` (`user_id`,`restaurant_id`);