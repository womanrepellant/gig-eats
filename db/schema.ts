import { integer, sqliteTable, text, uniqueIndex, index } from "drizzle-orm/sqlite-core";
export const reviews = sqliteTable("reviews", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(),
  restaurantId: text("restaurant_id").notNull(), author: text("author").notNull(),
  rating: integer("rating").notNull(), dish: text("dish").notNull(), body: text("body").notNull(),
  spend: integer("spend").notNull(), visitedAt: text("visited_at").notNull(), updatedAt: text("updated_at").notNull(),
}, (t) => [uniqueIndex("review_user_restaurant").on(t.userId, t.restaurantId),index("review_restaurant_updated").on(t.restaurantId,t.updatedAt,t.id)]);
export const spots = sqliteTable("spots", {
  id: text("id").primaryKey(), userId: text("user_id").notNull(),
  restaurantId: text("restaurant_id").notNull(), status: text("status").notNull(),
}, (t) => [uniqueIndex("spot_user_restaurant").on(t.userId, t.restaurantId)]);

export const authLimits = sqliteTable("auth_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  expiresAt: integer("expires_at").notNull(),
});
