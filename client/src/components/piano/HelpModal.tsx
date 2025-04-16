import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { MusicIcon, ZapIcon, ArrowUpDownIcon, VolumeIcon, XIcon } from "lucide-react";

interface HelpModalProps {
  onClose: () => void;
}

export default function HelpModal({ onClose }: HelpModalProps) {
  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white rounded-xl p-5 w-4/5 max-w-sm mx-auto">
        <DialogHeader className="flex justify-between items-center mb-4">
          <DialogTitle className="font-semibold text-lg">How to Play</DialogTitle>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="p-1 rounded-full hover:bg-gray-100">
              <XIcon className="h-5 w-5" />
            </Button>
          </DialogClose>
        </DialogHeader>
        
        <ul className="text-sm text-gray-600 space-y-3 mb-4">
          <li className="flex items-start gap-2">
            <MusicIcon className="h-4 w-4 text-blue-500 mt-0.5" />
            <span>Tap any square to play a piano note</span>
          </li>
          <li className="flex items-start gap-2">
            <ZapIcon className="h-4 w-4 text-blue-500 mt-0.5" />
            <span>Tap multiple squares quickly to create melodies</span>
          </li>
          <li className="flex items-start gap-2">
            <ArrowUpDownIcon className="h-4 w-4 text-blue-500 mt-0.5" />
            <span>Change octave to access higher or lower notes</span>
          </li>
          <li className="flex items-start gap-2">
            <VolumeIcon className="h-4 w-4 text-blue-500 mt-0.5" />
            <span>Adjust volume in the volume settings</span>
          </li>
        </ul>
        
        <Button 
          className="w-full py-2 bg-blue-500 text-white rounded-lg mt-2 font-medium"
          onClick={onClose}
        >
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
