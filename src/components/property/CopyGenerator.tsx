import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Copy, RefreshCw } from 'lucide-react';
import { usePropertyStore } from '@/store/propertyStore';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

export const CopyGenerator = () => {
  const { propertyData, generatedCopy, setGeneratedCopy } = usePropertyStore();
  const [isGenerating, setIsGenerating] = useState(false);

  const generateCopy = async () => {
    if (!propertyData) {
      toast.error('Preencha os dados do imóvel primeiro');
      return;
    }

    setIsGenerating(true);

    try {
      const { data, error } = await supabase.functions.invoke('mistral-generate', {
        body: { mode: 'copy', property: propertyData },
      });

      if (error) throw error;
      const copy = (data?.text || '').trim();
      if (!copy) throw new Error('Resposta vazia da IA');

      setGeneratedCopy(copy);
      toast.success('Copy gerada com sucesso!');
    } catch (error: any) {
      console.error('Erro ao gerar copy:', error);
      toast.error(`Erro ao gerar copy: ${error?.message || 'desconhecido'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyCopy = () => {
    navigator.clipboard.writeText(generatedCopy);
    toast.success('Copy copiada!');
  };

  return (
    <div className="space-y-2 p-3 bg-card rounded-md border">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Copy com IA
        </h2>
        {generatedCopy && (
          <Button size="sm" variant="ghost" onClick={copyCopy} className="h-7 px-2 text-xs">
            <Copy className="w-3 h-3 mr-1" />
            Copiar
          </Button>
        )}
      </div>

      <Button onClick={generateCopy} disabled={isGenerating} className="w-full h-8 text-xs" size="sm">
        {isGenerating ? (
          <>
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
            Gerando...
          </>
        ) : (
          <>
            <Sparkles className="w-3.5 h-3.5 mr-1.5" />
            Gerar Copy
          </>
        )}
      </Button>

      {generatedCopy && (
        <Textarea
          value={generatedCopy}
          onChange={(e) => setGeneratedCopy(e.target.value)}
          rows={10}
          className="font-sans text-xs"
        />
      )}
    </div>
  );
};
