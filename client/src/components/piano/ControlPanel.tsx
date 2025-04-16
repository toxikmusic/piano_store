import { Button } from "@/components/ui/button";
import { VolumeIcon, PlusIcon, MinusIcon, HelpCircleIcon, Settings } from "lucide-react";

interface ControlPanelProps {
  octave: number;
  onOctaveChange: (octave: number) => void;
  onVolumeClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
}

export default function ControlPanel({ 
  octave, 
  onOctaveChange,
  onVolumeClick,
  onHelpClick,
  onSettingsClick
}: ControlPanelProps) {
  return (
    <div className="bg-white rounded-lg p-3 shadow-sm mb-5 flex justify-between items-center">
      <div className="flex items-center gap-4">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onVolumeClick}
          className="text-gray-700"
          aria-label="Volume"
        >
          <VolumeIcon className="h-5 w-5" />
        </Button>
        
        <div className="flex items-center gap-2">
          <Button
            size="icon" 
            variant="ghost"
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200"
            onClick={() => onOctaveChange(octave - 1)}
            disabled={octave <= 1}
          >
            <MinusIcon className="h-4 w-4" />
          </Button>
          <span className="text-sm font-medium">Octave {octave}</span>
          <Button
            size="icon"
            variant="ghost" 
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-700 hover:bg-gray-200"
            onClick={() => onOctaveChange(octave + 1)}
            disabled={octave >= 7}
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onSettingsClick}
          className="text-gray-700"
          aria-label="Sound Settings"
        >
          <Settings className="h-5 w-5" />
        </Button>
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={onHelpClick}
          className="text-gray-700"
          aria-label="Help"
        >
          <HelpCircleIcon className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
