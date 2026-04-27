import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PropertyForm } from '@/components/property/PropertyForm';
import { PropertyScanner } from '@/components/property/PropertyScanner';
import { CopyGenerator } from '@/components/property/CopyGenerator';
import { Video, ArrowRight, Home } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useEditorStore } from '@/store/editorStore';

const PropertyPostGenerator = () => {
  const navigate = useNavigate();
  const { updateGlobalSettings } = useEditorStore();

  const goToEditor = () => {
    // Garantir formato 9:16
    updateGlobalSettings({ videoFormat: '9:16' });
    navigate('/editor');
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center shrink-0">
                <Home className="w-4 h-4 text-primary-foreground" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold leading-tight truncate">Posts de Imóveis</h1>
                <p className="text-[11px] text-muted-foreground leading-tight truncate">Reels 9:16 para redes sociais</p>
              </div>
            </div>
            <Button onClick={goToEditor} size="sm">
              <Video className="w-3.5 h-3.5 mr-1.5" />
              Editor
              <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-3 py-3 space-y-3">
        <PropertyScanner />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <PropertyForm />
          <CopyGenerator />
        </div>
      </main>
    </div>
  );
};

export default PropertyPostGenerator;
