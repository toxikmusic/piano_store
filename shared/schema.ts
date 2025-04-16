import { pgTable, text, serial, integer, boolean, timestamp, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define sound packs table
export const soundPacks = pgTable("sound_packs", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  userId: integer("user_id").notNull().references(() => users.id),
  price: integer("price").notNull().default(0), // Price in cents (e.g., 499 = $4.99)
  isPublic: boolean("is_public").notNull().default(true),
  downloads: integer("downloads").notNull().default(0),
  rating: integer("rating").notNull().default(0), // Average rating (1-5)
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Define sounds within sound packs
export const sounds = pgTable("sounds", {
  id: serial("id").primaryKey(),
  packId: integer("pack_id").notNull().references(() => soundPacks.id),
  name: text("name").notNull(),
  note: text("note").notNull(), // Music note (C, C#, D, etc.)
  octave: integer("octave").notNull().default(4),
  soundFile: text("sound_file"), // Path or URL to sound file (optional)
  waveform: text("waveform").notNull().default("sine"), // sine, square, sawtooth, triangle, or custom
  envelope: json("envelope").notNull().default({
    attack: 0.1,
    decay: 0.2,
    sustain: 0.7,
    release: 0.5
  }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define sound pack reviews
export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  packId: integer("pack_id").notNull().references(() => soundPacks.id),
  userId: integer("user_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(), // Rating from 1-5
  comment: text("comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Define user purchases
export const purchases = pgTable("purchases", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  packId: integer("pack_id").notNull().references(() => soundPacks.id),
  price: integer("price").notNull(), // Price paid in cents
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertSoundPackSchema = createInsertSchema(soundPacks).pick({
  name: true,
  description: true,
  userId: true,
  price: true,
  isPublic: true,
  imageUrl: true,
});

export const insertSoundSchema = createInsertSchema(sounds).pick({
  packId: true,
  name: true,
  note: true,
  octave: true,
  waveform: true,
  envelope: true,
}).extend({
  soundFile: z.string().optional(),
});

export const insertReviewSchema = createInsertSchema(reviews).pick({
  packId: true,
  userId: true,
  rating: true,
  comment: true,
});

export const insertPurchaseSchema = createInsertSchema(purchases).pick({
  userId: true,
  packId: true,
  price: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertSoundPack = z.infer<typeof insertSoundPackSchema>;
export type SoundPack = typeof soundPacks.$inferSelect;

export type InsertSound = z.infer<typeof insertSoundSchema>;
export type Sound = typeof sounds.$inferSelect;

export type InsertReview = z.infer<typeof insertReviewSchema>;
export type Review = typeof reviews.$inferSelect;

export type InsertPurchase = z.infer<typeof insertPurchaseSchema>;
export type Purchase = typeof purchases.$inferSelect;

// Custom type for ADSREnvelope
export type ADSREnvelope = {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
};
