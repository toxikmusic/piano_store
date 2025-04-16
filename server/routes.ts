import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import path from "path";
import { fileURLToPath } from "url";
import { 
  insertSoundPackSchema, 
  insertSoundSchema, 
  insertReviewSchema, 
  insertPurchaseSchema 
} from "@shared/schema";
import { ZodError } from "zod";
import multer from "multer";
import fs from "fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Set up file upload storage
const uploadDir = path.join(__dirname, "../uploads");
// Create the uploads directory if it doesn't exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for file uploads
const storage_config = multer.diskStorage({
  destination: function (req, file, cb) {
    // Create user directory if it doesn't exist
    const userId = req.body.userId || 1; // Default to user 1 if not specified
    const userDir = path.join(uploadDir, `user_${userId}`);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    cb(null, userDir);
  },
  filename: function (req, file, cb) {
    // Generate a unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage_config });

export async function registerRoutes(app: Express): Promise<Server> {
  // API routes
  const apiRouter = express.Router();
  
  // Middleware to handle validation errors
  const validateRequest = (schema: any) => {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        req.body = schema.parse(req.body);
        next();
      } catch (error) {
        if (error instanceof ZodError) {
          return res.status(400).json({
            status: 'error',
            message: 'Validation error',
            errors: error.errors
          });
        }
        next(error);
      }
    };
  };
  
  // Serve static files from uploads directory
  app.use('/uploads', express.static(uploadDir));
  
  // Health check endpoint
  apiRouter.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'OK' });
  });
  
  // Sound Pack Routes
  
  // Get all sound packs
  apiRouter.get('/soundpacks', async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
      const isPublic = req.query.isPublic === 'true' ? true : 
                       req.query.isPublic === 'false' ? false : undefined;
      
      const soundPacks = await storage.getAllSoundPacks({ userId, isPublic });
      res.json(soundPacks);
    } catch (error) {
      console.error('Error fetching sound packs:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch sound packs' 
      });
    }
  });
  
  // Get a single sound pack by ID
  apiRouter.get('/soundpacks/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const soundPack = await storage.getSoundPack(id);
      
      if (!soundPack) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Sound pack not found' 
        });
      }
      
      // Get sounds associated with this pack
      const sounds = await storage.getSoundsByPackId(id);
      
      // Get reviews for this pack
      const reviews = await storage.getReviewsByPackId(id);
      
      res.json({
        ...soundPack,
        sounds,
        reviews
      });
    } catch (error) {
      console.error('Error fetching sound pack:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch sound pack' 
      });
    }
  });
  
  // Create a new sound pack
  apiRouter.post(
    '/soundpacks', 
    upload.single('image'),
    async (req: Request, res: Response) => {
      try {
        // Parse and validate the data from the form
        const formData = {
          name: req.body.name,
          description: req.body.description || '',
          userId: parseInt(req.body.userId),
          price: parseInt(req.body.price),
          isPublic: req.body.isPublic === 'true',
        };

        try {
          // Validate using the schema
          insertSoundPackSchema.parse(formData);
        } catch (validationError) {
          if (validationError instanceof ZodError) {
            return res.status(400).json({
              status: 'error',
              message: 'Validation error',
              errors: validationError.errors
            });
          }
          throw validationError;
        }
        
        let imageUrl = '';
        
        // If an image was uploaded, set the URL
        if (req.file) {
          imageUrl = `/uploads/user_${formData.userId}/${req.file.filename}`;
        }
        
        const soundPack = await storage.createSoundPack({
          ...formData,
          imageUrl
        });
        
        res.status(201).json(soundPack);
      } catch (error) {
        console.error('Error creating sound pack:', error);
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to create sound pack' 
        });
      }
    }
  );
  
  // Update a sound pack
  apiRouter.patch(
    '/soundpacks/:id',
    upload.single('image'),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const existingPack = await storage.getSoundPack(id);
        
        if (!existingPack) {
          return res.status(404).json({ 
            status: 'error', 
            message: 'Sound pack not found' 
          });
        }
        
        let updates = req.body;
        
        // If an image was uploaded, set the URL
        if (req.file) {
          updates.imageUrl = `/uploads/user_${existingPack.userId}/${req.file.filename}`;
        }
        
        const updatedPack = await storage.updateSoundPack(id, updates);
        res.json(updatedPack);
      } catch (error) {
        console.error('Error updating sound pack:', error);
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to update sound pack' 
        });
      }
    }
  );
  
  // Delete a sound pack
  apiRouter.delete('/soundpacks/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSoundPack(id);
      
      if (!success) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Sound pack not found' 
        });
      }
      
      res.json({ status: 'success', message: 'Sound pack deleted' });
    } catch (error) {
      console.error('Error deleting sound pack:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to delete sound pack' 
      });
    }
  });
  
  // Sound Routes
  
  // Get sounds by pack ID
  apiRouter.get('/soundpacks/:packId/sounds', async (req: Request, res: Response) => {
    try {
      const packId = parseInt(req.params.packId);
      const sounds = await storage.getSoundsByPackId(packId);
      res.json(sounds);
    } catch (error) {
      console.error('Error fetching sounds:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch sounds' 
      });
    }
  });
  
  // Add a sound to a pack
  apiRouter.post(
    '/soundpacks/:packId/sounds',
    upload.single('soundFile'),
    async (req: Request, res: Response) => {
      try {
        const packId = parseInt(req.params.packId);
        
        // Verify the sound pack exists
        const soundPack = await storage.getSoundPack(packId);
        if (!soundPack) {
          return res.status(404).json({ 
            status: 'error', 
            message: 'Sound pack not found' 
          });
        }
        
        // Parse envelope if it's a string
        let envelope = req.body.envelope;
        if (typeof envelope === 'string') {
          try {
            envelope = JSON.parse(envelope);
          } catch (e) {
            envelope = {
              attack: 0.1,
              decay: 0.2,
              sustain: 0.7,
              release: 0.5
            };
          }
        } else if (!envelope) {
          envelope = {
            attack: 0.1,
            decay: 0.2,
            sustain: 0.7,
            release: 0.5
          };
        }
        
        // Parse and validate form data manually
        const formData = {
          name: req.body.name,
          note: req.body.note,
          octave: parseInt(req.body.octave),
          packId: packId,
          waveform: req.body.waveform || 'sine',
          envelope: envelope
        };
        
        // Handle the sound file if it was uploaded
        let soundFilePath = undefined; // undefined matches the optional string in the schema
        if (req.file) {
          soundFilePath = `/uploads/user_${soundPack.userId}/${req.file.filename}`;
        }
        
        // Create the sound
        const sound = await storage.createSound({
          ...formData,
          soundFile: soundFilePath
        });
        
        res.status(201).json(sound);
      } catch (error) {
        console.error('Error creating sound:', error);
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to create sound',
          details: error instanceof Error ? error.message : String(error)
        });
      }
    }
  );
  
  // Update a sound
  apiRouter.patch(
    '/sounds/:id',
    upload.single('soundFile'),
    async (req: Request, res: Response) => {
      try {
        const id = parseInt(req.params.id);
        const existingSound = await storage.getSound(id);
        
        if (!existingSound) {
          return res.status(404).json({ 
            status: 'error', 
            message: 'Sound not found' 
          });
        }
        
        let updates = req.body;
        
        // If a sound file was uploaded, set the URL
        if (req.file) {
          const soundPack = await storage.getSoundPack(existingSound.packId);
          if (soundPack) {
            updates.soundFile = `/uploads/user_${soundPack.userId}/${req.file.filename}`;
          }
        }
        
        const updatedSound = await storage.updateSound(id, updates);
        res.json(updatedSound);
      } catch (error) {
        console.error('Error updating sound:', error);
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to update sound' 
        });
      }
    }
  );
  
  // Delete a sound
  apiRouter.delete('/sounds/:id', async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteSound(id);
      
      if (!success) {
        return res.status(404).json({ 
          status: 'error', 
          message: 'Sound not found' 
        });
      }
      
      res.json({ status: 'success', message: 'Sound deleted' });
    } catch (error) {
      console.error('Error deleting sound:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to delete sound' 
      });
    }
  });
  
  // Review Routes
  
  // Get reviews for a sound pack
  apiRouter.get('/soundpacks/:packId/reviews', async (req: Request, res: Response) => {
    try {
      const packId = parseInt(req.params.packId);
      const reviews = await storage.getReviewsByPackId(packId);
      res.json(reviews);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch reviews' 
      });
    }
  });
  
  // Add a review to a sound pack
  apiRouter.post(
    '/soundpacks/:packId/reviews',
    validateRequest(insertReviewSchema),
    async (req: Request, res: Response) => {
      try {
        const packId = parseInt(req.params.packId);
        
        // Verify the sound pack exists
        const soundPack = await storage.getSoundPack(packId);
        if (!soundPack) {
          return res.status(404).json({ 
            status: 'error', 
            message: 'Sound pack not found' 
          });
        }
        
        const review = await storage.createReview({
          ...req.body,
          packId
        });
        
        res.status(201).json(review);
      } catch (error) {
        console.error('Error creating review:', error);
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to create review' 
        });
      }
    }
  );
  
  // Purchase Routes
  
  // Get purchases for a user
  apiRouter.get('/users/:userId/purchases', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const purchases = await storage.getUserPurchases(userId);
      
      // Get the full sound pack details for each purchase
      const purchasesWithDetails = await Promise.all(
        purchases.map(async purchase => {
          const soundPack = await storage.getSoundPack(purchase.packId);
          return {
            ...purchase,
            soundPack
          };
        })
      );
      
      res.json(purchasesWithDetails);
    } catch (error) {
      console.error('Error fetching purchases:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to fetch purchases' 
      });
    }
  });
  
  // Create a purchase
  apiRouter.post(
    '/users/:userId/purchases',
    async (req: Request, res: Response) => {
      try {
        // Parse the parameters
        const userId = parseInt(req.params.userId);
        const packId = parseInt(req.body.packId);
        
        if (isNaN(userId) || isNaN(packId)) {
          return res.status(400).json({
            status: 'error',
            message: 'Invalid user ID or pack ID'
          });
        }
        
        // Check if user already purchased this pack
        const alreadyPurchased = await storage.hasPurchased(userId, packId);
        if (alreadyPurchased) {
          return res.status(400).json({
            status: 'error',
            message: 'User has already purchased this sound pack'
          });
        }
        
        // Verify the sound pack exists
        const soundPack = await storage.getSoundPack(packId);
        if (!soundPack) {
          return res.status(404).json({ 
            status: 'error', 
            message: 'Sound pack not found' 
          });
        }
        
        // Create the purchase
        const purchase = await storage.createPurchase({
          userId,
          packId,
          price: soundPack.price // Use the current price from the sound pack
        });
        
        res.status(201).json(purchase);
      } catch (error) {
        console.error('Error creating purchase:', error);
        res.status(500).json({ 
          status: 'error', 
          message: 'Failed to create purchase' 
        });
      }
    }
  );
  
  // Check if a user has purchased a sound pack
  apiRouter.get('/users/:userId/purchases/:packId', async (req: Request, res: Response) => {
    try {
      const userId = parseInt(req.params.userId);
      const packId = parseInt(req.params.packId);
      
      const hasPurchased = await storage.hasPurchased(userId, packId);
      
      res.json({ hasPurchased });
    } catch (error) {
      console.error('Error checking purchase status:', error);
      res.status(500).json({ 
        status: 'error', 
        message: 'Failed to check purchase status' 
      });
    }
  });
  
  // Apply API routes with /api prefix
  app.use('/api', apiRouter);
  
  const httpServer = createServer(app);
  
  return httpServer;
}
