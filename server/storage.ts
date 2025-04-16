import { 
  users, 
  soundPacks, 
  sounds, 
  reviews, 
  purchases,
  type User, 
  type InsertUser,
  type SoundPack,
  type InsertSoundPack,
  type Sound,
  type InsertSound,
  type Review,
  type InsertReview,
  type Purchase,
  type InsertPurchase
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Sound pack methods
  getSoundPack(id: number): Promise<SoundPack | undefined>;
  getAllSoundPacks(options?: { userId?: number, isPublic?: boolean }): Promise<SoundPack[]>;
  createSoundPack(soundPack: InsertSoundPack): Promise<SoundPack>;
  updateSoundPack(id: number, updates: Partial<SoundPack>): Promise<SoundPack | undefined>;
  deleteSoundPack(id: number): Promise<boolean>;
  
  // Sound methods
  getSound(id: number): Promise<Sound | undefined>;
  getSoundsByPackId(packId: number): Promise<Sound[]>;
  createSound(sound: InsertSound): Promise<Sound>;
  updateSound(id: number, updates: Partial<Sound>): Promise<Sound | undefined>;
  deleteSound(id: number): Promise<boolean>;
  
  // Review methods
  getReviewsByPackId(packId: number): Promise<Review[]>;
  createReview(review: InsertReview): Promise<Review>;
  
  // Purchase methods
  getUserPurchases(userId: number): Promise<Purchase[]>;
  createPurchase(purchase: InsertPurchase): Promise<Purchase>;
  hasPurchased(userId: number, packId: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private soundPacks: Map<number, SoundPack>;
  private sounds: Map<number, Sound>;
  private reviews: Map<number, Review>;
  private purchases: Map<number, Purchase>;
  
  private userIdCounter: number;
  private soundPackIdCounter: number;
  private soundIdCounter: number;
  private reviewIdCounter: number;
  private purchaseIdCounter: number;

  constructor() {
    this.users = new Map();
    this.soundPacks = new Map();
    this.sounds = new Map();
    this.reviews = new Map();
    this.purchases = new Map();
    
    this.userIdCounter = 1;
    this.soundPackIdCounter = 1;
    this.soundIdCounter = 1;
    this.reviewIdCounter = 1;
    this.purchaseIdCounter = 1;
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const createdAt = new Date();
    const user: User = { ...insertUser, id, createdAt };
    this.users.set(id, user);
    return user;
  }
  
  // Sound pack methods
  async getSoundPack(id: number): Promise<SoundPack | undefined> {
    return this.soundPacks.get(id);
  }
  
  async getAllSoundPacks(options?: { userId?: number, isPublic?: boolean }): Promise<SoundPack[]> {
    let packs = Array.from(this.soundPacks.values());
    
    if (options?.userId !== undefined) {
      packs = packs.filter(pack => pack.userId === options.userId);
    }
    
    if (options?.isPublic !== undefined) {
      packs = packs.filter(pack => pack.isPublic === options.isPublic);
    }
    
    return packs;
  }
  
  async createSoundPack(insertSoundPack: InsertSoundPack): Promise<SoundPack> {
    const id = this.soundPackIdCounter++;
    const createdAt = new Date();
    const updatedAt = createdAt;
    const downloads = 0;
    const rating = 0;
    
    // Ensure all required fields are present with proper types
    const soundPack: SoundPack = {
      id,
      name: insertSoundPack.name,
      description: insertSoundPack.description || null,
      userId: insertSoundPack.userId,
      price: insertSoundPack.price || 0,
      isPublic: insertSoundPack.isPublic ?? true,
      downloads,
      rating,
      imageUrl: insertSoundPack.imageUrl || null,
      createdAt,
      updatedAt
    };
    
    this.soundPacks.set(id, soundPack);
    return soundPack;
  }
  
  async updateSoundPack(id: number, updates: Partial<SoundPack>): Promise<SoundPack | undefined> {
    const soundPack = await this.getSoundPack(id);
    
    if (!soundPack) {
      return undefined;
    }
    
    const updatedPack: SoundPack = {
      ...soundPack,
      ...updates,
      updatedAt: new Date(),
      id // Ensure the id doesn't change
    };
    
    this.soundPacks.set(id, updatedPack);
    return updatedPack;
  }
  
  async deleteSoundPack(id: number): Promise<boolean> {
    // First, delete all related sounds
    const packSounds = await this.getSoundsByPackId(id);
    for (const sound of packSounds) {
      await this.deleteSound(sound.id);
    }
    
    return this.soundPacks.delete(id);
  }
  
  // Sound methods
  async getSound(id: number): Promise<Sound | undefined> {
    return this.sounds.get(id);
  }
  
  async getSoundsByPackId(packId: number): Promise<Sound[]> {
    return Array.from(this.sounds.values()).filter(sound => sound.packId === packId);
  }
  
  async createSound(insertSound: InsertSound): Promise<Sound> {
    const id = this.soundIdCounter++;
    const createdAt = new Date();
    
    // Ensure all required fields are present with proper types
    const sound: Sound = {
      id,
      name: insertSound.name,
      packId: insertSound.packId,
      note: insertSound.note,
      octave: insertSound.octave || 4,
      soundFile: insertSound.soundFile || null,
      waveform: insertSound.waveform || 'sine',
      envelope: insertSound.envelope || {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.7,
        release: 0.5
      },
      createdAt
    };
    
    this.sounds.set(id, sound);
    return sound;
  }
  
  async updateSound(id: number, updates: Partial<Sound>): Promise<Sound | undefined> {
    const sound = await this.getSound(id);
    
    if (!sound) {
      return undefined;
    }
    
    const updatedSound: Sound = {
      ...sound,
      ...updates,
      id // Ensure the id doesn't change
    };
    
    this.sounds.set(id, updatedSound);
    return updatedSound;
  }
  
  async deleteSound(id: number): Promise<boolean> {
    return this.sounds.delete(id);
  }
  
  // Review methods
  async getReviewsByPackId(packId: number): Promise<Review[]> {
    return Array.from(this.reviews.values()).filter(review => review.packId === packId);
  }
  
  async createReview(insertReview: InsertReview): Promise<Review> {
    const id = this.reviewIdCounter++;
    const createdAt = new Date();
    
    // Create review object with proper typing
    const review: Review = {
      id,
      createdAt,
      userId: insertReview.userId,
      packId: insertReview.packId,
      rating: insertReview.rating,
      comment: insertReview.comment === undefined ? null : insertReview.comment
    };
    
    this.reviews.set(id, review);
    
    // Update the average rating of the sound pack
    const packReviews = await this.getReviewsByPackId(insertReview.packId);
    const totalRating = packReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = Math.round(totalRating / packReviews.length);
    
    await this.updateSoundPack(insertReview.packId, { rating: averageRating });
    
    return review;
  }
  
  // Purchase methods
  async getUserPurchases(userId: number): Promise<Purchase[]> {
    return Array.from(this.purchases.values()).filter(purchase => purchase.userId === userId);
  }
  
  async createPurchase(insertPurchase: InsertPurchase): Promise<Purchase> {
    const id = this.purchaseIdCounter++;
    const createdAt = new Date();
    
    const purchase: Purchase = {
      ...insertPurchase,
      id,
      createdAt
    };
    
    this.purchases.set(id, purchase);
    
    // Increment the download count for the sound pack
    const soundPack = await this.getSoundPack(insertPurchase.packId);
    if (soundPack) {
      await this.updateSoundPack(insertPurchase.packId, { 
        downloads: soundPack.downloads + 1 
      });
    }
    
    return purchase;
  }
  
  async hasPurchased(userId: number, packId: number): Promise<boolean> {
    // Check if the user has purchased this pack
    const userPurchases = await this.getUserPurchases(userId);
    return userPurchases.some(purchase => purchase.packId === packId);
  }
}

export const storage = new MemStorage();
