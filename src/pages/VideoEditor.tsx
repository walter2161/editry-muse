import { useEffect } from "react";
import { EditorHeader } from "@/components/editor/EditorHeader";
import { ResourcePanel } from "@/components/editor/ResourcePanel";
import { VideoPreview } from "@/components/editor/VideoPreview";
import { PropertiesPanel } from "@/components/editor/PropertiesPanel";
import { Timeline } from "@/components/editor/Timeline";
import { usePropertyStore } from "@/store/propertyStore";
import { useAutoSave } from "@/hooks/useAutoSave";
import { syncThumbnailFromProperty } from "@/lib/syncThumbnailFromProperty";

const VideoEditor = () => {
  useAutoSave();
  const { propertyData } = usePropertyStore();

  // Sincronizar thumb sempre que QUALQUER campo relevante do imóvel mudar.
  // Usamos campos primitivos como dependências para forçar re-execução
  // mesmo quando a referência do objeto mudar mas o React puder re-renderizar.
  useEffect(() => {
    syncThumbnailFromProperty(propertyData);
  }, [
    propertyData?.tipo,
    propertyData?.transacao,
    propertyData?.valor,
    propertyData?.quartos,
    propertyData?.banheiros,
    propertyData?.area,
    propertyData?.bairro,
    propertyData?.cidade,
    propertyData?.estado,
    propertyData?.referencia,
    propertyData?.creci,
    propertyData?.url,
  ]);
  
  return (
    <div className="h-screen flex flex-col bg-[hsl(var(--editor-bg))]">
      <EditorHeader />
      
      <div className="flex-1 flex overflow-hidden">
        <ResourcePanel />
        <VideoPreview />
        <PropertiesPanel />
      </div>
      
      <Timeline />
    </div>
  );
};

export default VideoEditor;
