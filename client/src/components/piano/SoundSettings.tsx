import { useState } from "react";
import { Slider } from "@/components/ui/slider";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export type WaveType = "sine" | "square" | "sawtooth" | "triangle";

interface SoundSettingsProps {
  envelope: ADSREnvelope;
  waveType: WaveType;
  onEnvelopeChange: (envelope: ADSREnvelope) => void;
  onWaveTypeChange: (waveType: WaveType) => void;
  onClose: () => void;
}

export default function SoundSettings({
  envelope,
  waveType,
  onEnvelopeChange,
  onWaveTypeChange,
  onClose
}: SoundSettingsProps) {
  // Local state to manage values before submitting
  const [localEnvelope, setLocalEnvelope] = useState<ADSREnvelope>(envelope);
  const [localWaveType, setLocalWaveType] = useState<WaveType>(waveType);

  // Handle ADSR changes
  const handleAttackChange = (value: number[]) => {
    setLocalEnvelope({ ...localEnvelope, attack: value[0] });
  };

  const handleDecayChange = (value: number[]) => {
    setLocalEnvelope({ ...localEnvelope, decay: value[0] });
  };

  const handleSustainChange = (value: number[]) => {
    setLocalEnvelope({ ...localEnvelope, sustain: value[0] });
  };

  const handleReleaseChange = (value: number[]) => {
    setLocalEnvelope({ ...localEnvelope, release: value[0] });
  };

  // Submit changes
  const handleApply = () => {
    onEnvelopeChange(localEnvelope);
    onWaveTypeChange(localWaveType);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sound Settings</DialogTitle>
          <DialogDescription>
            Adjust ADSR envelope and wave shape for your sounds
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">ADSR Envelope</h3>
            
            <div className="grid gap-4">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="attack">Attack: {(localEnvelope.attack).toFixed(2)}s</Label>
                </div>
                <Slider
                  id="attack"
                  min={0.01}
                  max={2}
                  step={0.01}
                  value={[localEnvelope.attack]}
                  onValueChange={handleAttackChange}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="decay">Decay: {(localEnvelope.decay).toFixed(2)}s</Label>
                </div>
                <Slider
                  id="decay"
                  min={0.01}
                  max={2}
                  step={0.01}
                  value={[localEnvelope.decay]}
                  onValueChange={handleDecayChange}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="sustain">Sustain: {(localEnvelope.sustain).toFixed(2)}</Label>
                </div>
                <Slider
                  id="sustain"
                  min={0}
                  max={1}
                  step={0.01}
                  value={[localEnvelope.sustain]}
                  onValueChange={handleSustainChange}
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="release">Release: {(localEnvelope.release).toFixed(2)}s</Label>
                </div>
                <Slider
                  id="release"
                  min={0.01}
                  max={3}
                  step={0.01}
                  value={[localEnvelope.release]}
                  onValueChange={handleReleaseChange}
                />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Wave Shape</h3>
            <RadioGroup value={localWaveType} onValueChange={(value) => setLocalWaveType(value as WaveType)}>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sine" id="sine" />
                  <Label htmlFor="sine">Sine</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="square" id="square" />
                  <Label htmlFor="square">Square</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="sawtooth" id="sawtooth" />
                  <Label htmlFor="sawtooth">Sawtooth</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="triangle" id="triangle" />
                  <Label htmlFor="triangle">Triangle</Label>
                </div>
              </div>
            </RadioGroup>
          </div>
        </div>
        
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleApply}>Apply</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}