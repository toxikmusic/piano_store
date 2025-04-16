import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Music, MusicIcon, ChevronDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { Sound, SoundPack, ADSREnvelope } from '@shared/schema';
import { getQueryFn } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface SoundPackApplierProps {
  onApplySoundPack: (sounds: Sound[]) => void;
  onSetEnvelope: (envelope: ADSREnvelope) => void;
  currentSoundPack: string | null;
}

export default function SoundPackApplier({ 
  onApplySoundPack,
  onSetEnvelope,
  currentSoundPack
}: SoundPackApplierProps) {
  const { toast } = useToast();
  
  // Fetch all sound packs
  const soundPacksQuery = useQuery({
    queryKey: ['/api/soundpacks'],
    queryFn: getQueryFn<SoundPack[]>({ on401: 'returnNull' }),
  });
  
  // Fetch user purchases
  const purchasesQuery = useQuery({
    queryKey: ['/api/users/1/purchases'],
    queryFn: getQueryFn<any[]>({ on401: 'returnNull' }),
  });
  
  const soundPacks = soundPacksQuery.data || [];
  const purchases = purchasesQuery.data || [];
  
  // Get the packs the user has access to
  const availablePacks = soundPacks.filter(pack => {
    // User owns the pack
    if (pack.userId === 1) return true;
    
    // Pack is free
    if (pack.price === 0) return true;
    
    // User has purchased the pack
    return purchases.some(purchase => purchase.packId === pack.id);
  });
  
  // Handle applying a sound pack
  const handleApplySoundPack = async (packId: number) => {
    try {
      // Fetch sounds for this pack
      const response = await fetch(`/api/soundpacks/${packId}/sounds`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch sounds');
      }
      
      const sounds = await response.json();
      
      if (sounds.length === 0) {
        toast({
          title: 'Empty Sound Pack',
          description: 'This sound pack doesn\'t contain any sounds yet.',
          variant: 'destructive',
        });
        return;
      }
      
      // Apply sounds to the piano
      onApplySoundPack(sounds);
      
      // If there's an envelope in the first sound, use it as default
      if (sounds.length > 0 && sounds[0].envelope) {
        onSetEnvelope(sounds[0].envelope as ADSREnvelope);
      }
      
      // Find the sound pack name
      const packName = soundPacks.find(pack => pack.id === packId)?.name || 'Custom pack';
      
      toast({
        title: 'Sound Pack Applied',
        description: `Now using "${packName}" sound pack`,
      });
    } catch (error) {
      console.error('Error applying sound pack:', error);
      toast({
        title: 'Failed to Apply Sound Pack',
        description: 'There was an error loading the sound pack.',
        variant: 'destructive',
      });
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <MusicIcon className="h-4 w-4" />
          <span>Sound Packs</span>
          <ChevronDown className="h-4 w-4 ml-1" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56">
        <DropdownMenuLabel>Select a Sound Pack</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {availablePacks.length === 0 ? (
          <DropdownMenuItem disabled>No sound packs available</DropdownMenuItem>
        ) : (
          <DropdownMenuGroup>
            {availablePacks.map((pack) => (
              <DropdownMenuItem 
                key={pack.id}
                onClick={() => handleApplySoundPack(pack.id)}
              >
                <Music className="h-4 w-4 mr-2" />
                <span>{pack.name}</span>
                
                {currentSoundPack === pack.name && (
                  <span className="text-xs ml-auto text-green-500">
                    Active
                  </span>
                )}
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
        
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => window.location.href = "/marketplace"}>
          Browse Marketplace
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}