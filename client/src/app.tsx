import { Switch, Route, Link } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import PianoSoundboard from "@/pages/PianoSoundboard";
import Marketplace from "@/pages/Marketplace";
import CreateSoundPack from "@/pages/CreateSoundPack";
import SoundPackEditor from "@/pages/SoundPackEditor";
import Sequencer from "@/pages/Sequencer";
import { Button } from "@/components/ui/button";
import { MusicIcon, ShoppingBagIcon, WavesIcon } from "lucide-react";

// Navigation component
function Navigation() {
  return (
    <div className="fixed top-0 left-0 right-0 bg-background z-50 border-b border-border">
      <div className="container mx-auto px-4 py-2 flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold flex items-center">
          <MusicIcon className="h-6 w-6 mr-2" />
          Piano App
        </Link>
        <div className="flex gap-2">
          <Link href="/">
            <Button variant="ghost">
              <MusicIcon className="h-4 w-4 mr-2" />
              Piano
            </Button>
          </Link>
          <Link href="/sequencer">
            <Button variant="ghost">
              <WavesIcon className="h-4 w-4 mr-2" />
              Sequencer
            </Button>
          </Link>
          <Link href="/marketplace">
            <Button variant="ghost">
              <ShoppingBagIcon className="h-4 w-4 mr-2" />
              Marketplace
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <div className="pt-14"> {/* Add padding to account for the fixed navigation */}
      <Navigation />
      <Switch>
        <Route path="/" component={PianoSoundboard} />
        <Route path="/sequencer" component={Sequencer} />
        <Route path="/marketplace" component={Marketplace} />
        <Route path="/create-soundpack" component={CreateSoundPack} />
        <Route path="/soundpack/:id/edit" component={SoundPackEditor} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
