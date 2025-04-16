import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'wouter';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import SequencerGrid from '@/components/sequencer/SequencerGrid';
import { Save, Download, ArrowLeft, Settings, Music } from 'lucide-react';

export default function Sequencer() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  
  // Audio setup
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [gainNode, setGainNode] = useState<GainNode | null>(null);
  
  // Sequencer settings
  const [bpm, setBpm] = useState(120);
  const [bars, setBars] = useState(4);
  const [beatDivision, setBeatDivision] = useState(4); // 4 = sixteenth notes
  const [selectedSoundPack, setSelectedSoundPack] = useState<number | null>(null);
  
  // Initialize audio context
  useEffect(() => {
    // Create audio context and gain node
    const ctx = new AudioContext();
    console.log('AudioContext created:', ctx.state);
    
    const gain = ctx.createGain();
    gain.gain.value = 0.5; // 50% volume
    gain.connect(ctx.destination);
    
    setAudioContext(ctx);
    setGainNode(gain);
    
    // Resume audio context if it's suspended (browser policy)
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        console.log('AudioContext resumed!');
      });
    }
    
    // Clean up when component unmounts
    return () => {
      gain.disconnect();
      ctx.close();
    };
  }, []);
  
  // Handle saving a pattern
  const handleSavePattern = (notes: any[]) => {
    if (notes.length === 0) {
      toast({
        title: 'Empty Pattern',
        description: 'Create some notes before saving your pattern.',
        variant: 'destructive'
      });
      return;
    }
    
    toast({
      title: 'Pattern Saved',
      description: `${notes.length} notes saved to your pattern.`
    });
    
    // Here you would typically save to a database or state
    console.log('Saved pattern:', notes);
  };
  
  // Handle exporting a pattern
  const handleExportPattern = () => {
    // Implement export functionality (e.g., MIDI or JSON)
    toast({
      title: 'Pattern Exported',
      description: 'Your pattern has been exported.'
    });
  };
  
  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Sequencer</h1>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleExportPattern}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar with controls */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Sequencer Settings</CardTitle>
              <CardDescription>
                Configure your pattern settings
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* BPM control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bpm">Tempo (BPM)</Label>
                  <Badge variant="outline">{bpm}</Badge>
                </div>
                <Slider 
                  id="bpm"
                  min={60} 
                  max={180} 
                  step={1} 
                  value={[bpm]} 
                  onValueChange={(values) => setBpm(values[0])} 
                />
              </div>
              
              <Separator />
              
              {/* Bars control */}
              <div className="space-y-2">
                <Label htmlFor="bars">Bars</Label>
                <Select
                  value={bars.toString()}
                  onValueChange={(value) => setBars(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select bars" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Bar</SelectItem>
                    <SelectItem value="2">2 Bars</SelectItem>
                    <SelectItem value="4">4 Bars</SelectItem>
                    <SelectItem value="8">8 Bars</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {/* Beat division control */}
              <div className="space-y-2">
                <Label htmlFor="division">Grid Division</Label>
                <Select
                  value={beatDivision.toString()}
                  onValueChange={(value) => setBeatDivision(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Quarter Notes</SelectItem>
                    <SelectItem value="2">Eighth Notes</SelectItem>
                    <SelectItem value="4">Sixteenth Notes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              {/* Sound selection */}
              <div className="space-y-2">
                <Label htmlFor="soundpack">Sound Pack</Label>
                <Select
                  value={selectedSoundPack?.toString() || "0"}
                  onValueChange={(value) => setSelectedSoundPack(value === "0" ? null : parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a sound pack" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Default Synth</SelectItem>
                    {/* You would map through available sound packs here */}
                    <SelectItem value="1">Piano Pack</SelectItem>
                    <SelectItem value="2">Drums</SelectItem>
                    <SelectItem value="3">Synth Leads</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Separator />
              
              {/* Save button */}
              <Button 
                className="w-full"
                onClick={handleSavePattern}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Pattern
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Main sequencer grid */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader>
              <CardTitle>Pattern Editor</CardTitle>
              <CardDescription>
                Click to add notes, drag to move them
              </CardDescription>
            </CardHeader>
            
            <CardContent>
              {audioContext && gainNode && (
                <SequencerGrid
                  audioContext={audioContext}
                  gainNode={gainNode}
                  bpm={bpm}
                  bars={bars}
                  beatDivision={beatDivision}
                  soundPack={selectedSoundPack}
                  onSavePattern={handleSavePattern}
                />
              )}
              
              {!audioContext && (
                <div className="h-96 flex items-center justify-center bg-gray-50 rounded-md">
                  <div className="text-center">
                    <Music className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-lg font-medium mb-2">Loading Audio Engine</h3>
                    <p className="text-gray-500 max-w-md mx-auto">
                      The audio engine is initializing. This should only take a moment.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}