import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { VolumeIcon, Volume1Icon, XIcon } from "lucide-react";

interface VolumeModalProps {
  volume: number;
  onVolumeChange: (volume: number) => void;
  onClose: () => void;
}

export default function VolumeModal({ volume, onVolumeChange, onClose }: VolumeModalProps) {
  const [tempVolume, setTempVolume] = useState(volume * 100);

  useEffect(() => {
    setTempVolume(volume * 100);
  }, [volume]);

  const handleApply = () => {
    onVolumeChange(tempVolume / 100);
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white rounded-xl p-5 w-4/5 max-w-sm mx-auto">
        <DialogHeader className="flex justify-between items-center mb-4">
          <DialogTitle className="font-semibold text-lg">Volume</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="p-1 rounded-full hover:bg-gray-100">
              <XIcon className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <div className="flex items-center gap-3 mb-3">
          <Volume1Icon className="h-5 w-5 text-gray-500" />
          <Slider
            id="volumeSlider"
            min={0}
            max={100}
            step={1}
            value={[tempVolume]}
            onValueChange={(value) => setTempVolume(value[0])}
            className="w-full h-2 bg-gray-200 rounded-lg"
          />
          <VolumeIcon className="h-5 w-5 text-gray-500" />
        </div>
        
        <Button 
          className="w-full py-2 bg-blue-500 text-white rounded-lg mt-2 font-medium"
          onClick={handleApply}
        >
          Apply
        </Button>
      </DialogContent>
    </Dialog>
  );
}
