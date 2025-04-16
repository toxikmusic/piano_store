import { useState, useEffect } from 'react';
import { useLocation, useParams } from 'wouter';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { 
  ArrowLeft, 
  Music, 
  Plus, 
  Trash2, 
  Upload, 
  Music2, 
  PlayCircle,
  PauseCircle,
  Edit,
  Save
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';

import { Sound, SoundPack, insertSoundSchema } from '@shared/schema';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { queryClient, getQueryFn, apiRequest } from '@/lib/queryClient';
import { ADSREnvelope } from '@/components/piano/SoundSettings';

// Note frequencies
const getNoteFrequency = (note: string, octave: number): number => {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const noteIndex = notes.indexOf(note);
  
  if (noteIndex === -1) return 440; // Default to A4 frequency
  
  // Formula for calculating frequency: f = 2^(n/12) * 440Hz
  // where n is the number of semitones away from A4 (A4 = 0)
  const semitoneFromA4 = (octave - 4) * 12 + (noteIndex - 9);
  return 440 * Math.pow(2, semitoneFromA4 / 12);
};

// Schema for creating a new sound
const createSoundSchema = insertSoundSchema.extend({
  name: z.string().min(3, { message: 'Name must be at least 3 characters long' }).max(50),
  note: z.string().min(1, { message: 'Note is required' }),
  octave: z.coerce.number().min(1).max(8),
  soundFile: z.instanceof(File).optional(),
  envelope: z.object({
    attack: z.number().min(0).max(2),
    decay: z.number().min(0).max(2),
    sustain: z.number().min(0).max(1),
    release: z.number().min(0).max(5),
  }).optional(),
  waveform: z.enum(['sine', 'square', 'sawtooth', 'triangle']).default('sine'),
});

type CreateSoundFormValues = z.infer<typeof createSoundSchema>;

export default function SoundPackEditor() {
  const { id } = useParams<{ id: string }>();
  const packId = parseInt(id);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // UI States
  const [isAddSoundDialogOpen, setIsAddSoundDialogOpen] = useState(false);
  const [playingSound, setPlayingSound] = useState<number | null>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [oscillator, setOscillator] = useState<OscillatorNode | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  const [soundFile, setSoundFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize the audio context
  useEffect(() => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    setAudioContext(ctx);
    
    // Create a gain node for volume control
    const gain = ctx.createGain();
    gain.gain.value = 0.5; // Set initial volume
    gain.connect(ctx.destination);
    setGainNode(gain);
    
    return () => {
      // Clean up audio nodes when component unmounts
      if (oscillator) {
        oscillator.stop();
        oscillator.disconnect();
      }
      ctx.close();
    };
  }, []);
  
  // Fetch sound pack and sounds
  const soundPackQuery = useQuery({
    queryKey: ['/api/soundpacks', packId],
    queryFn: getQueryFn<SoundPack & { sounds: Sound[] }>({ on401: 'returnNull' }),
    enabled: !isNaN(packId)
  });
  
  const soundPack = soundPackQuery.data;
  const sounds = soundPack?.sounds || [];
  
  // Form for adding a new sound
  const form = useForm<CreateSoundFormValues>({
    resolver: zodResolver(createSoundSchema),
    defaultValues: {
      name: '',
      note: 'C',
      octave: 4,
      waveform: 'sine',
      envelope: {
        attack: 0.1,
        decay: 0.2,
        sustain: 0.7,
        release: 0.5
      }
    },
  });
  
  // Add sound mutation
  const addSoundMutation = useMutation({
    mutationFn: async (data: CreateSoundFormValues) => {
      const formData = new FormData();
      formData.append('name', data.name);
      formData.append('note', data.note);
      formData.append('octave', data.octave.toString());
      formData.append('waveform', data.waveform);
      
      if (data.envelope) {
        formData.append('envelope', JSON.stringify(data.envelope));
      }
      
      if (data.soundFile) {
        formData.append('soundFile', data.soundFile);
      }
      
      // Use custom fetch to handle file upload
      return fetch(`/api/soundpacks/${packId}/sounds`, {
        method: 'POST',
        body: formData,
      }).then(res => {
        if (!res.ok) {
          return res.json().then(err => {
            console.error('Server validation error:', err);
            throw new Error('Failed to add sound: ' + (err.message || 'Unknown error'));
          });
        }
        return res.json();
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soundpacks', packId] });
      toast({
        title: 'Sound added!',
        description: 'Your sound has been added to the pack.',
      });
      handleDialogClose();
    },
    onError: (error) => {
      console.error('Error adding sound:', error);
      toast({
        title: 'Failed to add sound',
        description: 'There was an error adding your sound. Please try again.',
        variant: 'destructive',
      });
      setIsSubmitting(false);
    },
  });
  
  // Delete sound mutation
  const deleteSoundMutation = useMutation({
    mutationFn: (soundId: number) => {
      return apiRequest(`/api/sounds/${soundId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/soundpacks', packId] });
      toast({
        title: 'Sound deleted',
        description: 'The sound has been removed from your pack.',
      });
    },
    onError: (error) => {
      console.error('Error deleting sound:', error);
      toast({
        title: 'Failed to delete sound',
        description: 'There was an error deleting the sound. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  // Submit handler for adding a new sound
  const onSubmit = (data: CreateSoundFormValues) => {
    console.log('Submitting form data:', data);
    
    // Log any validation errors
    if (Object.keys(form.formState.errors).length > 0) {
      console.log('Form validation errors:', form.formState.errors);
    }
    
    setIsSubmitting(true);
    addSoundMutation.mutate(data);
  };
  
  // Handle sound file upload
  const handleSoundFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      form.setValue('soundFile', file);
      setSoundFile(file);
    }
  };
  
  // Handle dialog close
  const handleDialogClose = () => {
    setIsAddSoundDialogOpen(false);
    setIsSubmitting(false);
    form.reset();
    setSoundFile(null);
  };
  
  // Play a sound for preview
  const playSound = (sound: Sound) => {
    if (!audioContext || !gainNode) return;
    
    // Stop any currently playing sound
    if (oscillator) {
      oscillator.stop();
      oscillator.disconnect();
      setOscillator(null);
    }
    
    if (playingSound === sound.id) {
      setPlayingSound(null);
      return;
    }
    
    if (sound.waveform !== 'custom' && sound.soundFile === '') {
      // Create a new oscillator for synthesized sounds
      const osc = audioContext.createOscillator();
      osc.type = sound.waveform as OscillatorType;
      osc.frequency.value = getNoteFrequency(sound.note, sound.octave);
      
      // Apply envelope
      const envelope = sound.envelope as ADSREnvelope;
      
      // Reset gain and start at 0
      gainNode.gain.cancelScheduledValues(audioContext.currentTime);
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      
      // Attack
      gainNode.gain.linearRampToValueAtTime(
        0.7, 
        audioContext.currentTime + envelope.attack
      );
      
      // Decay to sustain
      gainNode.gain.linearRampToValueAtTime(
        envelope.sustain * 0.7, 
        audioContext.currentTime + envelope.attack + envelope.decay
      );
      
      // Connect the oscillator to the gain node
      osc.connect(gainNode);
      
      // Start the oscillator
      osc.start();
      setOscillator(osc);
      setPlayingSound(sound.id);
      
      // Schedule release and cleanup after a short time
      setTimeout(() => {
        if (gainNode) {
          gainNode.gain.linearRampToValueAtTime(
            0, 
            audioContext.currentTime + envelope.release
          );
        }
        
        setTimeout(() => {
          if (osc === oscillator) {
            osc.stop();
            osc.disconnect();
            setOscillator(null);
            setPlayingSound(null);
          }
        }, envelope.release * 1000);
      }, 1000); // Play for 1 second before release
      
    } else if (sound.soundFile) {
      // Play a recorded audio file
      const audio = new Audio(sound.soundFile);
      audio.play();
      setPlayingSound(sound.id);
      
      // Reset after playback ends
      audio.onended = () => {
        setPlayingSound(null);
      };
    }
  };
  
  // Handle delete sound
  const handleDeleteSound = (soundId: number) => {
    if (window.confirm('Are you sure you want to delete this sound?')) {
      deleteSoundMutation.mutate(soundId);
    }
  };
  
  if (soundPackQuery.isLoading) {
    return (
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid gap-6">
          <div className="h-32 bg-gray-100 rounded animate-pulse"></div>
          <div className="h-64 bg-gray-100 rounded animate-pulse"></div>
        </div>
      </div>
    );
  }
  
  if (!soundPack) {
    return (
      <div className="container mx-auto px-4 py-12 text-center">
        <h1 className="text-xl font-medium mb-4">Sound Pack Not Found</h1>
        <p className="text-gray-500 mb-6">The sound pack you're looking for doesn't exist or you don't have access to it.</p>
        <Button onClick={() => navigate('/marketplace')}>
          Back to Marketplace
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/marketplace')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">{soundPack.name} - Editor</h1>
        </div>
        
        <Badge variant={soundPack.isPublic ? "default" : "outline"}>
          {soundPack.isPublic ? 'Public' : 'Private'}
        </Badge>
      </div>
      
      {/* Sound Pack Details */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {soundPack.imageUrl && (
              <div 
                className="w-full md:w-1/3 h-48 bg-cover bg-center rounded-md"
                style={{ backgroundImage: `url(${soundPack.imageUrl})` }}
              ></div>
            )}
            
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-2">{soundPack.name}</h2>
              
              <p className="text-gray-500 mb-4">
                {soundPack.description || 'No description available.'}
              </p>
              
              <div className="flex flex-wrap gap-4 text-sm">
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Price:</span> 
                  <Badge variant="outline">
                    {soundPack.price === 0 ? 'Free' : `$${(soundPack.price / 100).toFixed(2)}`}
                  </Badge>
                </div>
                
                <div className="flex items-center">
                  <span className="text-gray-500 mr-2">Sounds:</span> 
                  <Badge variant="secondary">{sounds.length}</Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Sounds Section */}
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-2xl font-bold">Sounds</h2>
        
        <Button onClick={() => setIsAddSoundDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Sound
        </Button>
      </div>
      
      {sounds.length === 0 ? (
        <div className="bg-gray-50 border border-gray-100 rounded-md p-8 text-center">
          <Music2 className="h-12 w-12 mx-auto text-gray-300 mb-4" />
          <h3 className="text-lg font-medium mb-2">No sounds yet</h3>
          <p className="text-gray-500 mb-6 max-w-md mx-auto">
            Your sound pack doesn't have any sounds yet. Add some sounds to make it playable on the piano.
          </p>
          <Button onClick={() => setIsAddSoundDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Sound
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sounds.map((sound) => (
            <Card key={sound.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex justify-between items-start">
                  <span>{sound.name}</span>
                  <Badge>{sound.note}{sound.octave}</Badge>
                </CardTitle>
              </CardHeader>
              
              <CardContent className="pb-3">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="outline">{sound.waveform}</Badge>
                  
                  {sound.soundFile ? (
                    <span className="text-xs text-gray-500">Custom Audio</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Synthesized</span>
                    </div>
                  )}
                </div>
                
                <div className="mt-2">
                  <div className="text-xs font-medium text-gray-500 mb-1">Envelope</div>
                  <div className="flex gap-2 justify-between text-xs">
                    <div className="flex flex-col items-center">
                      <span>A</span>
                      <span>{(sound.envelope as ADSREnvelope).attack.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>D</span>
                      <span>{(sound.envelope as ADSREnvelope).decay.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>S</span>
                      <span>{(sound.envelope as ADSREnvelope).sustain.toFixed(1)}</span>
                    </div>
                    <div className="flex flex-col items-center">
                      <span>R</span>
                      <span>{(sound.envelope as ADSREnvelope).release.toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
              
              <CardFooter className="flex justify-between pt-2">
                <Button 
                  variant="secondary" 
                  size="sm" 
                  className="h-8 px-3 py-1"
                  onClick={() => playSound(sound)}
                >
                  {playingSound === sound.id ? (
                    <>
                      <PauseCircle className="h-4 w-4 mr-1" />
                      Stop
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-4 w-4 mr-1" />
                      Play
                    </>
                  )}
                </Button>
                
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDeleteSound(sound.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
      
      {/* Add Sound Dialog */}
      <Dialog open={isAddSoundDialogOpen} onOpenChange={(open) => {
        if (!open) {
          handleDialogClose();
        }
        setIsAddSoundDialogOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <div className="absolute right-4 top-4">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleDialogClose}
            >
              <span className="sr-only">Close</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </Button>
          </div>
          <DialogHeader>
            <DialogTitle>Add a New Sound</DialogTitle>
            <DialogDescription>
              Create a sound to add to your sound pack.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} encType="multipart/form-data" className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Sound Name</FormLabel>
                    <FormControl>
                      <Input placeholder="Piano C4" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="note"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Note</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select note" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="C">C</SelectItem>
                            <SelectItem value="C#">C#</SelectItem>
                            <SelectItem value="D">D</SelectItem>
                            <SelectItem value="D#">D#</SelectItem>
                            <SelectItem value="E">E</SelectItem>
                            <SelectItem value="F">F</SelectItem>
                            <SelectItem value="F#">F#</SelectItem>
                            <SelectItem value="G">G</SelectItem>
                            <SelectItem value="G#">G#</SelectItem>
                            <SelectItem value="A">A</SelectItem>
                            <SelectItem value="A#">A#</SelectItem>
                            <SelectItem value="B">B</SelectItem>
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="octave"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Octave</FormLabel>
                      <FormControl>
                        <Select 
                          value={field.value.toString()}
                          onValueChange={(value) => field.onChange(parseInt(value))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select octave" />
                          </SelectTrigger>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map((octave) => (
                              <SelectItem key={octave} value={octave.toString()}>
                                {octave}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="waveform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Waveform</FormLabel>
                    <FormControl>
                      <Select 
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select waveform" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sine">Sine</SelectItem>
                          <SelectItem value="square">Square</SelectItem>
                          <SelectItem value="sawtooth">Sawtooth</SelectItem>
                          <SelectItem value="triangle">Triangle</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div>
                <h3 className="text-sm font-medium mb-2">ADSR Envelope</h3>
                
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="envelope.attack"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex justify-between">
                          <FormLabel className="text-xs">Attack: {field.value.toFixed(2)}s</FormLabel>
                        </div>
                        <FormControl>
                          <Slider 
                            min={0} 
                            max={2} 
                            step={0.01} 
                            value={[field.value]} 
                            onValueChange={(values) => field.onChange(values[0])} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="envelope.decay"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex justify-between">
                          <FormLabel className="text-xs">Decay: {field.value.toFixed(2)}s</FormLabel>
                        </div>
                        <FormControl>
                          <Slider 
                            min={0} 
                            max={2} 
                            step={0.01} 
                            value={[field.value]} 
                            onValueChange={(values) => field.onChange(values[0])} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="envelope.sustain"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex justify-between">
                          <FormLabel className="text-xs">Sustain: {field.value.toFixed(2)}</FormLabel>
                        </div>
                        <FormControl>
                          <Slider 
                            min={0} 
                            max={1} 
                            step={0.01} 
                            value={[field.value]} 
                            onValueChange={(values) => field.onChange(values[0])} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="envelope.release"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <div className="flex justify-between">
                          <FormLabel className="text-xs">Release: {field.value.toFixed(2)}s</FormLabel>
                        </div>
                        <FormControl>
                          <Slider 
                            min={0} 
                            max={5} 
                            step={0.01} 
                            value={[field.value]} 
                            onValueChange={(values) => field.onChange(values[0])} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
              
              <Separator />
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-sm font-medium">Sound File (Optional)</h3>
                  <div className="flex items-center">
                    <Switch id="use-custom-audio" />
                    <label 
                      htmlFor="use-custom-audio" 
                      className="text-xs text-gray-500 ml-2"
                    >
                      Use Custom Audio
                    </label>
                  </div>
                </div>
                
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center cursor-pointer" onClick={() => document.getElementById('sound-upload')?.click()}>
                  <input
                    id="sound-upload"
                    type="file"
                    className="hidden"
                    accept=".mp3,.wav"
                    onChange={handleSoundFileChange}
                  />
                  
                  {soundFile ? (
                    <div className="flex flex-col items-center">
                      <Music className="h-8 w-8 text-primary mb-2" />
                      <p className="text-sm text-gray-600 mb-1">{soundFile.name}</p>
                      <p className="text-xs text-gray-400">
                        {(soundFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <Upload className="h-8 w-8 text-gray-400 mb-2" />
                      <p className="text-sm text-gray-500 mb-1">
                        Click to upload audio file
                      </p>
                      <p className="text-xs text-gray-400">
                        MP3, WAV or OGG (max. 5MB)
                      </p>
                    </div>
                  )}
                </div>
                
                {soundFile && (
                  <div className="flex justify-center mt-2">
                    <button
                      type="button"
                      className="text-xs text-primary hover:underline"
                      onClick={() => {
                        form.setValue('soundFile', undefined);
                        setSoundFile(null);
                      }}
                    >
                      Remove file
                    </button>
                  </div>
                )}
                
                <p className="text-xs text-gray-500 mt-2">
                  If provided, this audio file will be used instead of the synthesized sound.
                </p>
              </div>
              
              <DialogFooter>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={handleDialogClose}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={isSubmitting || addSoundMutation.isPending}
                >
                  {isSubmitting ? 'Adding...' : 'Add Sound'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}