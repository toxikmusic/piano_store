import { useState } from 'react';
import { useLocation } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Trash2, Upload } from 'lucide-react';

import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

import { insertSoundPackSchema } from '@shared/schema';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, apiRequest } from '@/lib/queryClient';

// Extended schema for form validation
const createSoundPackSchema = insertSoundPackSchema.extend({
  name: z.string().min(3, { message: 'Name must be at least 3 characters long' }).max(50),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long' }).max(500).optional(),
  price: z.coerce.number().min(0, { message: 'Price must be at least 0' }),
  isPublic: z.boolean().default(false),
  imageFile: z.instanceof(File).optional(),
});

type CreateSoundPackFormValues = z.infer<typeof createSoundPackSchema>;

export default function CreateSoundPack() {
  const [, navigate] = useLocation();
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<CreateSoundPackFormValues>({
    resolver: zodResolver(createSoundPackSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      isPublic: false,
      userId: 1, // Hardcoded for demo
    },
  });
  
  // Create sound pack mutation
  const createSoundPackMutation = useMutation({
    mutationFn: async (data: CreateSoundPackFormValues) => {
      // The API expects form body parameters to be passed as JSON first
      // Since we're using validateRequest middleware with insertSoundPackSchema
      const soundPackData = {
        name: data.name,
        price: data.price,
        isPublic: data.isPublic,
        userId: 1, // Hardcoded for demo
        description: data.description || '',
      };
      
      // For file uploads, we need to use FormData
      const formData = new FormData();
      
      // Add the JSON data as a string
      formData.append('name', data.name);
      formData.append('price', data.price.toString());
      formData.append('isPublic', data.isPublic.toString());
      formData.append('userId', '1'); // Hardcoded for demo
      
      if (data.description) {
        formData.append('description', data.description);
      }
      
      // Add the image file if present
      if (data.imageFile) {
        formData.append('image', data.imageFile);
      }
      
      // Send a direct fetch instead of apiRequest to handle multipart/form-data properly
      return fetch('/api/soundpacks', {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            console.error('Server validation error:', err);
            throw new Error('Failed to create sound pack: ' + (err.message || 'Unknown error'));
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soundpacks'] });
      toast({
        title: 'Sound pack created!',
        description: 'Your sound pack has been created successfully.',
      });
      navigate('/marketplace');
    },
    onError: (error) => {
      console.error('Error creating sound pack:', error);
      toast({
        title: 'Failed to create sound pack',
        description: 'There was an error creating your sound pack. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });
  
  const onSubmit = async (data: CreateSoundPackFormValues) => {
    setIsSubmitting(true);
    createSoundPackMutation.mutate(data);
  };
  
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('imageFile', file);
      
      // Create a preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };
  
  const clearImage = () => {
    form.setValue('imageFile', undefined);
    setImagePreview(null);
    // Also clear the file input
    const fileInput = document.getElementById('image-upload') as HTMLInputElement;
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Create Sound Pack</h1>
        <Button variant="ghost" onClick={() => navigate('/marketplace')}>
          Cancel
        </Button>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <Card>
            <CardContent className="pt-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sound Pack Name</FormLabel>
                    <FormControl>
                      <Input placeholder="My Awesome Sound Pack" {...field} />
                    </FormControl>
                    <FormDescription>
                      Give your sound pack a clear, descriptive name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="mt-6">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Describe your sound pack..." 
                        className="min-h-24"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Explain what makes your sound pack special
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="mt-6">
                <FormLabel htmlFor="image-upload">Pack Image</FormLabel>
                <div className="mt-2">
                  {imagePreview ? (
                    <div className="relative w-full h-48 mb-4">
                      <img 
                        src={imagePreview} 
                        alt="Sound pack preview" 
                        className="w-full h-full object-cover rounded-md"
                      />
                      <button 
                        type="button"
                        onClick={clearImage}
                        className="absolute top-2 right-2 p-1 bg-black/60 rounded-full text-white hover:bg-black/80"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-300 rounded-md p-8 text-center mb-4">
                      <div className="flex flex-col items-center">
                        <Upload className="h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-sm text-gray-500 mb-1">
                          Click to upload or drag and drop
                        </p>
                        <p className="text-xs text-gray-400">
                          PNG, JPG or GIF (max. 2MB)
                        </p>
                      </div>
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleImageChange}
                      />
                    </div>
                  )}
                  <label 
                    htmlFor="image-upload" 
                    className="cursor-pointer inline-flex items-center rounded-md font-medium text-sm text-primary hover:underline"
                  >
                    {imagePreview ? 'Change image' : 'Upload an image'}
                  </label>
                  <FormDescription className="mt-1">
                    A cover image will make your sound pack more attractive
                  </FormDescription>
                </div>
              </div>
              
              <Separator className="my-6" />
              
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (in cents)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min="0"
                        step="1"
                        {...field} 
                      />
                    </FormControl>
                    <FormDescription>
                      Set to 0 for a free sound pack. Otherwise, enter price in cents (e.g. 499 = $4.99)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="isPublic"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between mt-6">
                    <div className="space-y-0.5">
                      <FormLabel>Make Public</FormLabel>
                      <FormDescription>
                        When enabled, your sound pack will be visible to everyone in the marketplace
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>
          
          <div className="flex flex-col space-y-2">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Creating...' : 'Create Sound Pack'}
            </Button>
            <p className="text-sm text-center text-muted-foreground">
              After creating your sound pack, you'll be able to add sounds to it
            </p>
          </div>
        </form>
      </Form>
    </div>
  );
}