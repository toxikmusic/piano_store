import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { Search, Plus, Star, Download, ArrowUpDown, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { SoundPack } from '@shared/schema';
import { queryClient, getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

export default function Marketplace() {
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSoundPack, setSelectedSoundPack] = useState<SoundPack | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('newest');
  const { toast } = useToast();
  
  // Fetch sound packs
  const soundPacksQuery = useQuery({
    queryKey: ['/api/soundpacks'],
    queryFn: getQueryFn<SoundPack[]>({ on401: 'returnNull' }),
  });
  
  const soundPacks = soundPacksQuery.data || [];
  
  // Purchase a sound pack
  const purchaseMutation = useMutation({
    mutationFn: async (packId: number) => {
      return await fetch(`/api/users/1/purchases`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: 1, packId }),
        credentials: 'include',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users/1/purchases'] });
      toast({
        title: 'Success!',
        description: 'Sound pack purchased successfully.',
      });
      setSelectedSoundPack(null);
    },
    onError: (error) => {
      console.error('Error purchasing sound pack:', error);
      toast({
        title: 'Purchase failed',
        description: 'There was an error processing your purchase.',
        variant: 'destructive',
      });
    },
  });
  
  // Filter sound packs
  const filteredSoundPacks = soundPacks
    .filter(pack => {
      // Apply search filter
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = pack.name.toLowerCase().includes(searchLower);
        const descMatch = pack.description?.toLowerCase().includes(searchLower) || false;
        if (!nameMatch && !descMatch) return false;
      }
      
      // Apply category filter
      if (selectedFilter === 'free') {
        return pack.price === 0;
      } else if (selectedFilter === 'premium') {
        return pack.price > 0;
      }
      
      return true;
    })
    .sort((a, b) => {
      // Apply sorting
      if (sortOrder === 'newest') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortOrder === 'oldest') {
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortOrder === 'name-asc') {
        return a.name.localeCompare(b.name);
      } else if (sortOrder === 'name-desc') {
        return b.name.localeCompare(a.name);
      } else if (sortOrder === 'price-asc') {
        return a.price - b.price;
      } else if (sortOrder === 'price-desc') {
        return b.price - a.price;
      } else if (sortOrder === 'rating') {
        return b.rating - a.rating;
      } else if (sortOrder === 'popular') {
        return b.downloads - a.downloads;
      }
      return 0;
    });
  
  // Format price from cents to dollars
  const formatPrice = (price: number) => {
    return price === 0 ? 'Free' : `$${(price / 100).toFixed(2)}`;
  };
  
  // Open preview dialog for a sound pack
  const openPreviewDialog = (pack: SoundPack) => {
    setSelectedSoundPack(pack);
  };
  
  // Handle purchase of a sound pack
  const handlePurchase = (packId: number) => {
    purchaseMutation.mutate(packId);
  };
  
  if (soundPacksQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex justify-between mb-8">
          <h1 className="text-3xl font-bold">Sound Pack Marketplace</h1>
        </div>
        <div className="flex justify-center py-16">
          <div className="animate-pulse flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-gray-200 mb-4"></div>
            <div className="h-4 w-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12 max-w-6xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <h1 className="text-3xl font-bold">Sound Pack Marketplace</h1>
        <Button onClick={() => navigate('/create-soundpack')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Sound Pack
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row gap-4 mb-8">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search sound packs..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <Select value={selectedFilter} onValueChange={setSelectedFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Packs</SelectItem>
              <SelectItem value="free">Free Only</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-1">
                <ArrowUpDown className="h-4 w-4" />
                Sort
                <ChevronDown className="h-4 w-4 ml-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel>Sort By</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => setSortOrder('newest')}>
                  Newest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('oldest')}>
                  Oldest
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('name-asc')}>
                  Name (A-Z)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('name-desc')}>
                  Name (Z-A)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('price-asc')}>
                  Price (Low to High)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('price-desc')}>
                  Price (High to Low)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('rating')}>
                  Highest Rated
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setSortOrder('popular')}>
                  Most Popular
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      
      {filteredSoundPacks.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSoundPacks.map((soundPack) => (
            <Card 
              key={soundPack.id}
              className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => openPreviewDialog(soundPack)}
            >
              <div 
                className="h-48 bg-cover bg-center"
                style={{ 
                  backgroundImage: soundPack.imageUrl 
                    ? `url(${soundPack.imageUrl})` 
                    : 'linear-gradient(to right, #4f46e5, #7c3aed)' 
                }}
              />
              <CardContent className="pt-4">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-lg font-bold">{soundPack.name}</h3>
                  <Badge variant={soundPack.price > 0 ? "default" : "secondary"}>
                    {formatPrice(soundPack.price)}
                  </Badge>
                </div>
                <p className="text-sm text-gray-500 line-clamp-2 mb-3">
                  {soundPack.description || 'No description available.'}
                </p>
              </CardContent>
              <CardFooter className="border-t pt-3 pb-3 flex justify-between items-center">
                <div className="flex gap-4">
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 mr-1" />
                    <span className="text-xs">{soundPack.rating || '-'}</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <Download className="h-4 w-4 mr-1" />
                    <span className="text-xs">{soundPack.downloads}</span>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/soundpack/${soundPack.id}/edit`);
                  }}
                >
                  Edit
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="bg-gray-100 rounded-full p-4 mb-4">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium mb-1">No sound packs found</h3>
          <p className="text-gray-500 max-w-md">
            {searchTerm
              ? `No results for "${searchTerm}". Try a different search term or filter.`
              : 'Try a different filter or create your own sound pack.'}
          </p>
        </div>
      )}
      
      {/* Sound Pack Preview Dialog */}
      {selectedSoundPack && (
        <Dialog open={!!selectedSoundPack} onOpenChange={() => setSelectedSoundPack(null)}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedSoundPack.name}</DialogTitle>
              <DialogDescription>
                Created by {selectedSoundPack.userId === 1 ? 'You' : 'Another User'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid gap-4 py-4">
              {selectedSoundPack.imageUrl && (
                <div 
                  className="h-48 bg-cover bg-center rounded-md"
                  style={{ backgroundImage: `url(${selectedSoundPack.imageUrl})` }}
                />
              )}
              
              <div className="flex flex-col gap-1.5">
                <h3 className="font-medium">Description</h3>
                <p className="text-sm text-gray-500">
                  {selectedSoundPack.description || 'No description available'}
                </p>
              </div>
              
              <div className="flex justify-between items-center my-2">
                <div className="flex gap-4">
                  <Badge variant={selectedSoundPack.price > 0 ? "default" : "secondary"}>
                    {formatPrice(selectedSoundPack.price)}
                  </Badge>
                  <div className="flex items-center text-amber-500">
                    <Star className="h-4 w-4 mr-1" />
                    <span>{selectedSoundPack.rating || '-'}</span>
                  </div>
                  <div className="flex items-center text-gray-500">
                    <Download className="h-4 w-4 mr-1" />
                    <span>{selectedSoundPack.downloads}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  {selectedSoundPack.userId === 1 ? (
                    <Button 
                      onClick={() => navigate(`/soundpack/${selectedSoundPack.id}/edit`)}
                    >
                      Edit Pack
                    </Button>
                  ) : (
                    <Button
                      onClick={() => handlePurchase(selectedSoundPack.id)}
                      disabled={purchaseMutation.isPending}
                    >
                      {selectedSoundPack.price > 0 ? 'Purchase' : 'Get for Free'}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}