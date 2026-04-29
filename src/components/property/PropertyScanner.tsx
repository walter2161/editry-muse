import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Search } from 'lucide-react';
import { usePropertyStore, PropertyData } from '@/store/propertyStore';
import { useEditorStore, MediaItem } from '@/store/editorStore';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';


const parseCurrencyValue = (text: string): number | undefined => {
  const match = text.match(/R\$\s*([\d.]+(?:,\d{2})?)/i);
  if (!match) return undefined;

  const raw = match[1].trim();
  let normalized = raw;

  if (raw.includes(',') && raw.includes('.')) {
    normalized = raw.replace(/\./g, '').replace(',', '.');
  } else if (raw.includes(',')) {
    normalized = raw.replace(',', '.');
  } else {
    const dotCount = (raw.match(/\./g) || []).length;
    if (dotCount > 1) {
      normalized = raw.replace(/\./g, '');
    } else if (dotCount === 1) {
      const [, decimals = ''] = raw.split('.');
      normalized = decimals.length === 2 ? raw : raw.replace(/\./g, '');
    }
  }

  const value = Number(normalized);
  return Number.isFinite(value) && value > 0 ? value : undefined;
};

const isEntryContext = (label: string) => /\bentrada\b|\bsinal\b/.test(label);
const isCondoContext = (label: string) => /condom[ií]nio|cond\.|taxa mensal/.test(label);
const isIptuContext = (label: string) => /\biptu\b/.test(label);
const isSaleContext = (label: string) => {
  if (isEntryContext(label) || isCondoContext(label) || isIptuContext(label)) return false;
  return /\bvenda\b|\bvalor\b|valor total|valor do im[oó]vel|\bpre[cç]o\b/.test(label);
};

export const PropertyScanner = () => {
  const [url, setUrl] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const { setPropertyData, setGeneratedCopy } = usePropertyStore();
  const { addMediaItem, addClip, updateTotalDuration, clearTimelineAndMedia } = useEditorStore();
  const { toast } = useToast();
  const navigate = useNavigate();

  const extractPropertyDataFromHTML = (html: string): Partial<PropertyData> => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    
    const data: Partial<PropertyData> = {
      diferenciais: [],
      descricaoAdicional: ''
    };

    // Procurar por .sub-details .detail e extrair valores
    const detailElements = doc.querySelectorAll('.sub-details .detail, .detail');
    
    detailElements.forEach((detail) => {
      const labelDiv = detail.querySelector('div:nth-child(2)');
      const valueDiv = detail.querySelector('div.value, .value');
      
      if (!labelDiv || !valueDiv) return;
      
      const label = labelDiv.textContent?.trim().toLowerCase() || '';
      const valueText = valueDiv.textContent?.trim() || '';
      
      // Extrair número do texto
      const numberMatch = valueText.match(/(\d+(?:[.,]\d+)?)/);
      const number = numberMatch ? parseFloat(numberMatch[1].replace(',', '.')) : 0;
      
      // Mapear labels para campos
      if (label.includes('quarto') || label.includes('dormitório')) {
        data.quartos = number;
      } else if (label.includes('banheiro') || label.includes('wc')) {
        data.banheiros = number;
      } else if (label.includes('vaga') || label.includes('garagem')) {
        data.vagas = number;
      } else if (label.includes('área') || label.includes('area')) {
        data.area = number;
      } else if (label.includes('suíte') || label.includes('suite')) {
        if (!data.diferenciais) data.diferenciais = [];
        data.diferenciais.push(`${number} suíte${number > 1 ? 's' : ''}`);
      } else if (label.includes('sacada') || label.includes('varanda')) {
        if (!data.diferenciais) data.diferenciais = [];
        data.diferenciais.push('Sacada');
      }
    });

    // Extrair preços - identificar valor total, entrada e condomínio
    const allPriceElements = doc.querySelectorAll('.price, .valor, .preco, [class*="price"], [class*="valor"], td, tr, span, p, div');
    
    let salePrice: number | undefined;
    let entryPrice: number | undefined;
    let condoPrice: number | undefined;

    // 1) Priorizar fontes estruturadas e linhas rotuladas, evitando pegar preço de outros cards/imóveis.
    const structuredPriceSelectors = [
      'meta[property="product:price:amount"]',
      'meta[itemprop="price"]',
      '[itemprop="price"]',
      '[data-price]',
    ];

    for (const selector of structuredPriceSelectors) {
      const el = doc.querySelector(selector);
      const raw = el?.getAttribute('content') || el?.getAttribute('value') || el?.getAttribute('data-price') || el?.textContent || '';
      const parsed = parseCurrencyValue(raw.includes('R$') ? raw : `R$ ${raw}`);
      if (parsed && !salePrice) {
        salePrice = parsed;
        break;
      }
    }

    if (!salePrice) {
      const jsonLdScripts = Array.from(doc.querySelectorAll('script[type="application/ld+json"]'));
      for (const script of jsonLdScripts) {
        try {
          const parsed = JSON.parse(script.textContent || 'null');
          const nodes = Array.isArray(parsed)
            ? parsed
            : Array.isArray(parsed?.['@graph'])
              ? parsed['@graph']
              : [parsed];

          for (const node of nodes) {
            const offerPrice = node?.offers?.price ?? node?.price;
            const candidate = typeof offerPrice === 'number'
              ? offerPrice
              : typeof offerPrice === 'string'
                ? parseCurrencyValue(offerPrice.includes('R$') ? offerPrice : `R$ ${offerPrice}`)
                : undefined;

            if (candidate) {
              salePrice = candidate;
              break;
            }
          }
        } catch {
          // ignora blocos inválidos
        }

        if (salePrice) break;
      }
    }

    const labeledRows = Array.from(doc.querySelectorAll('tr, .detail, .row, li, .item'));
    for (const row of labeledRows) {
      const labelEl = row.querySelector('.type, .label, th, td.type, dt, strong');
      const valueEl = row.querySelector('.value, .price, .valor, td.value, dd') || labelEl?.nextElementSibling;
      const label = (labelEl?.textContent || '').trim().toLowerCase();
      const valueText = (valueEl?.textContent || row.textContent || '').trim();
      const parsed = parseCurrencyValue(valueText);

      if (!label || !parsed) continue;

      if (isCondoContext(label) && !condoPrice && parsed < 10000) {
        condoPrice = parsed;
        continue;
      }

      if (isEntryContext(label) && !entryPrice) {
        entryPrice = parsed;
        continue;
      }

      if (isSaleContext(label) && !salePrice) {
        salePrice = parsed;
      }
    }
    
    // Coletar todos os preços com seus contextos
    const pricesFound: { price: number; context: string; isEntradaExplicita: boolean; isTotalExplicito: boolean }[] = [];
    
    for (const priceEl of allPriceElements) {
      const priceText = priceEl.textContent || '';
      const priceMatch = priceText.match(/R\$\s*([\d.,]+)/g);
      
      if (priceMatch) {
        for (const match of priceMatch) {
          const numMatch = match.match(/R\$\s*([\d.,]+)/);
          if (numMatch) {
            const price = parseFloat(numMatch[1].replace(/\./g, '').replace(',', '.'));
            if (price > 0) {
              // Pegar contexto RESTRITO (apenas o elemento e pai imediato)
              const elementText = priceEl.textContent?.toLowerCase() || '';
              const parentText = priceEl.parentElement?.textContent?.toLowerCase() || '';
              const context = parentText + ' ' + elementText;
              
              // Verificar palavras-chave EXPLÍCITAS para entrada
              const isEntradaExplicita = 
                context.includes('entrada:') || 
                context.includes('entrada de') ||
                context.includes('entrada r$') ||
                context.includes('sinal:') ||
                context.includes('sinal de') ||
                (context.includes('partir de') && context.includes('entrada'));
              
              // Verificar palavras-chave EXPLÍCITAS para valor total
              const isTotalExplicito = 
                context.includes('total:') || 
                context.includes('valor total') ||
                context.includes('valor do imóvel') ||
                context.includes('valor do imovel') ||
                context.includes('preço:') ||
                context.includes('preco:') ||
                context.includes('venda:') ||
                context.includes('valor:');
              
              pricesFound.push({ price, context, isEntradaExplicita, isTotalExplicito });
            }
          }
        }
      }
    }
    
    // Primeiro: identificar condomínio (valores pequenos com contexto específico)
    for (const { price, context } of pricesFound) {
      const isCondo = context.includes('condomínio') || 
                      context.includes('condominio') || 
                      context.includes('cond.') ||
                      context.includes('taxa mensal');
      
      if (isCondo && price < 10000 && !condoPrice) {
        condoPrice = price;
        break;
      }
    }
    
    // Segundo: identificar entrada APENAS se explicitamente mencionado
    for (const { price, isEntradaExplicita } of pricesFound) {
      if (isEntradaExplicita && price > 1000 && price !== condoPrice && !entryPrice) {
        entryPrice = price;
        break;
      }
    }
    
    // Terceiro: identificar valor total
    // Se encontramos entrada explícita, procurar por valor total explícito também
    if (!salePrice && entryPrice) {
      for (const { price, isTotalExplicito } of pricesFound) {
        if (isTotalExplicito && price > entryPrice && price !== condoPrice && !salePrice) {
          salePrice = price;
          break;
        }
      }
      
      // Se não encontrou total explícito, pegar o maior valor (que não seja entrada ou condomínio)
      if (!salePrice) {
        const candidates = pricesFound
          .filter(p => p.price > 10000 && p.price !== condoPrice && p.price !== entryPrice)
          .map(p => p.price);
        if (candidates.length > 0) {
          salePrice = Math.max(...candidates);
        }
      }
    } else if (!salePrice) {
      // Sem entrada identificada, pegar o maior valor significativo como preço de venda
      const candidates = pricesFound
        .filter(p => p.price > 10000 && p.price !== condoPrice)
        .map(p => p.price);
      if (candidates.length > 0) {
        salePrice = Math.max(...candidates);
      }
    }
    
    // Verificação final: entrada deve ser MENOR que o valor total
    if (entryPrice && salePrice && entryPrice >= salePrice) {
      // Entrada maior ou igual ao total não faz sentido - ignorar entrada
      entryPrice = undefined;
    }
    
    data.valor = salePrice || 0;
    data.valorEntrada = entryPrice;
    data.condominio = condoPrice;

    // Extrair endereço/localização
    const locationElements = doc.querySelectorAll('.location, .endereco, .address, [class*="location"], [class*="endereco"]');
    for (const locEl of locationElements) {
      const locText = locEl.textContent?.trim() || '';
      
      // Tentar extrair bairro, cidade, estado
      const parts = locText.split(/[,-]/);
      if (parts.length >= 2) {
        data.bairro = parts[0]?.trim() || '';
        data.cidade = parts[1]?.trim() || '';
        if (parts.length >= 3) {
          data.estado = parts[2]?.trim().toUpperCase().slice(0, 2) || '';
        }
      }
      break;
    }

    // Extrair tipo de imóvel do título ou classe
    const titleElements = doc.querySelectorAll('h1, h2, .title, .titulo, [class*="title"]');
    for (const titleEl of titleElements) {
      const titleText = titleEl.textContent?.toLowerCase() || '';
      if (titleText.includes('apartamento')) data.tipo = 'Apartamento';
      else if (titleText.includes('casa')) data.tipo = 'Casa';
      else if (titleText.includes('cobertura')) data.tipo = 'Cobertura';
      else if (titleText.includes('terreno')) data.tipo = 'Terreno';
      else if (titleText.includes('comercial') || titleText.includes('sala')) data.tipo = 'Comercial';
      else if (titleText.includes('chácara') || titleText.includes('chacara')) data.tipo = 'Chácara';
      
      if (data.tipo) break;
    }

    // Extrair descrição
    const descElements = doc.querySelectorAll('.description, .descricao, [class*="description"], [class*="descricao"]');
    if (descElements.length > 0) {
      data.descricaoAdicional = descElements[0].textContent?.trim().slice(0, 200) || '';
    }

    return data;
  };

  const extractImages = (html: string, baseUrl: string): string[] => {
    const images: string[] = [];
    
    // Detectar se é Markdown (r.jina.ai retorna Markdown ao invés de HTML)
    const isMarkdown = html.includes('![Image') || html.match(/!\[.*?\]\(http/);
    
    if (isMarkdown) {
      // Extrair URLs de imagens do formato Markdown: ![alt](url)
      const markdownImageRegex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
      let match;
      while ((match = markdownImageRegex.exec(html)) !== null) {
        const imgUrl = match[1];
        // Filtrar logos e ícones
        if (!imgUrl.toLowerCase().includes('logo') && !imgUrl.toLowerCase().includes('icon') && !imgUrl.toLowerCase().includes('maps')) {
          images.push(imgUrl);
        }
      }
    } else {
      // Parse como HTML (allorigins retorna HTML)
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Procurar imagens na classe específica property-view--slides-inner
      const slidesContainer = doc.querySelector('.property-view--slides-inner');
      if (slidesContainer) {
        const imgElements = slidesContainer.querySelectorAll('img');
        imgElements.forEach(img => {
          const imgEl = img as HTMLImageElement;
          let src = imgEl.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
          if (src) {
            // Converter URLs relativas para absolutas
            if (src.startsWith('//')) {
              src = 'https:' + src;
            } else if (src.startsWith('/')) {
              const urlObj = new URL(baseUrl);
              src = urlObj.origin + src;
            }
            if (src.startsWith('http')) {
              images.push(src);
            }
          }
        });
      }
      
      // Fallback: procurar em outras classes comuns de galeria se não encontrou nada
      if (images.length === 0) {
        const gallerySelectors = [
          '.gallery img',
          '.carousel img',
          '.slides img',
          '.photos img',
          '.images img',
          '[class*="slide"] img',
          '[class*="gallery"] img'
        ];
        
        for (const selector of gallerySelectors) {
          const imgElements = doc.querySelectorAll(selector);
          imgElements.forEach(img => {
            const imgEl = img as HTMLImageElement;
            let src = imgEl.src || img.getAttribute('data-src') || img.getAttribute('data-lazy-src');
            if (src && !src.includes('logo') && !src.includes('icon')) {
              if (src.startsWith('//')) {
                src = 'https:' + src;
              } else if (src.startsWith('/')) {
                const urlObj = new URL(baseUrl);
                src = urlObj.origin + src;
              }
              if (src.startsWith('http')) {
                images.push(src);
              }
            }
          });
          
          if (images.length > 0) break;
        }
      }
    }
    
    return images.slice(0, 20); // Limitar a 20 imagens
  };

  const generateCopyWithAI = async (propertyData: Partial<PropertyData>) => {
    try {
      const { data, error } = await supabase.functions.invoke('mistral-generate', {
        body: { mode: 'copy', property: propertyData },
      });
      if (error) throw error;
      return (data?.text || '').trim();
    } catch (error) {
      console.error('Erro ao gerar copy:', error);
      return '';
    }
  };

  const handleScan = async () => {
    if (!url.trim()) {
      toast({
        title: 'URL vazia',
        description: 'Digite a URL do imóvel',
        variant: 'destructive',
      });
      return;
    }

    setIsScanning(true);
    try {
      // Extrair código de referência da URL (após o último -)
      const urlParts = url.split('-');
      const referencia = urlParts[urlParts.length - 1].split('?')[0].split('#')[0] || '';
      
      toast({
        title: 'Escaneando...',
        description: 'Buscando informações do imóvel',
      });

      // Fetch da página usando múltiplos proxies CORS (fallback automático)
      const cleanUrl = url.trim();
      const candidates = [
        `https://api.allorigins.win/raw?url=${encodeURIComponent(cleanUrl)}`,
        `https://r.jina.ai/http://${cleanUrl.replace(/^https?:\/\//, '')}`,
        `https://r.jina.ai/https://${cleanUrl.replace(/^https?:\/\//, '')}`,
      ];

      let response: Response | null = null;
      for (const endpoint of candidates) {
        try {
          const r = await fetch(endpoint);
          if (r.ok) { response = r; break; }
        } catch {}
      }
      if (!response) {
        throw new Error('Erro ao buscar página');
      }
      
      const html = await response.text();

      // Texto/markdown via Jina pra alimentar a IA com a descrição completa do imóvel
      let pageContext = '';
      try {
        const jinaUrl = `https://r.jina.ai/${cleanUrl}`;
        const jr = await fetch(jinaUrl);
        if (jr.ok) pageContext = (await jr.text()).slice(0, 12000);
      } catch {}
      if (!pageContext) {
        try {
          const tmp = new DOMParser().parseFromString(html, 'text/html');
          tmp.querySelectorAll('script,style,nav,footer,header').forEach(el => el.remove());
          pageContext = (tmp.body?.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 12000);
        } catch {}
      }

      toast({
        title: 'Extraindo dados...',
        description: 'Lendo informações do imóvel',
      });


      // Extrair dados diretamente do HTML (rápido)
      const extractedData = extractPropertyDataFromHTML(html);
      
      // Extrair imagens
      const images = extractImages(html, url);

      // Mesclar com valores padrão
      const finalData: PropertyData = {
        tipo: extractedData.tipo || 'Apartamento',
        transacao: extractedData.transacao || 'Venda',
        referencia,
        bairro: extractedData.bairro || '',
        cidade: extractedData.cidade || '',
        estado: extractedData.estado || '',
        quartos: extractedData.quartos ?? 0,
        banheiros: extractedData.banheiros ?? 0,
        vagas: extractedData.vagas ?? 0,
        area: extractedData.area ?? 0,
        valor: extractedData.valor ?? 0,
        valorEntrada: extractedData.valorEntrada,
        diferenciais: extractedData.diferenciais || [],
        descricaoAdicional: extractedData.descricaoAdicional || '',
        nomeCorretor: extractedData.nomeCorretor || 'Vendebens Imóveis',
        telefoneCorretor: extractedData.telefoneCorretor || '',
        creci: extractedData.creci || 'CRECI: 25571-J',
        condominio: extractedData.condominio,
        iptu: extractedData.iptu,
        areaTerreno: extractedData.areaTerreno,
        pageContext,
        url: cleanUrl,
      };

      // Limpar conteúdo gerado do imóvel anterior antes de salvar o novo
      setGeneratedCopy('');
      setPropertyData(finalData);

      // Limpar timeline, mídia, legendas e locuções antes de adicionar novas imagens
      clearTimelineAndMedia();
      
      // Atualizar nome do projeto no editor
      const { setProjectName } = useEditorStore.getState();
      const projectTitle = `${finalData.tipo} ${finalData.bairro} - REF: ${referencia}`.toUpperCase();
      setProjectName(projectTitle);

      // Gerar copy com IA
      toast({
        title: 'Gerando copy...',
        description: 'Criando texto para redes sociais',
      });
      
      const copy = await generateCopyWithAI(finalData);
      if (copy) {
        setGeneratedCopy(copy);
      }

      // Adicionar imagens aos recursos e à timeline
      if (images.length > 0) {
        toast({
          title: 'Carregando imagens...',
          description: `${images.length} imagens encontradas`,
        });

        const createdMedia: MediaItem[] = [];

        // Carregar todas as imagens como HTMLImageElement
        const loadPromises = images.map((imageUrl, index) => {
          return new Promise<MediaItem>((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            img.onload = () => {
              const mediaItem: MediaItem = {
                id: `img-${Date.now()}-${Math.random()}-${index}`,
                type: 'image',
                name: `Imagem ${index + 1}`,
                data: img, // HTMLImageElement carregado!
                thumbnail: imageUrl,
              };
              resolve(mediaItem);
            };
            
            img.onerror = () => {
              // Fallback: usar URL diretamente se CORS falhar
              console.warn('Erro ao carregar imagem com CORS, usando URL direta:', imageUrl);
              const mediaItem: MediaItem = {
                id: `img-${Date.now()}-${Math.random()}-${index}`,
                type: 'image',
                name: `Imagem ${index + 1}`,
                data: imageUrl,
                thumbnail: imageUrl,
              };
              resolve(mediaItem);
            };
            
            img.src = imageUrl;
          });
        });

        try {
          const loadedMedia = await Promise.all(loadPromises);
          
          loadedMedia.forEach(mediaItem => {
            createdMedia.push(mediaItem);
            addMediaItem(mediaItem);
          });

          // Inserir automaticamente na timeline (track V1)
          const editorState = useEditorStore.getState();
          const defaultDur = editorState.globalSettings?.defaultImageDuration ?? 3000;
          // Começar após o final atual da timeline
          const baseStart =
            editorState.clips.length > 0
              ? Math.max(...editorState.clips.map(c => c.start + c.duration))
              : 0;

          let start = baseStart;
          createdMedia.forEach((mi) => {
            const clipId = `clip-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            addClip({
              id: clipId,
              type: 'image',
              mediaId: mi.id,
              track: 'V1',
              start,
              duration: defaultDur,
              scale: 1.0,
              brightness: 0,
              contrast: 0,
              volume: 1.0,
              speed: 1.0,
              opacity: 1.0,
              transition: 'cross-fade',
              transitionDuration: 500,
            });
            start += defaultDur;
          });

          updateTotalDuration();

          toast({
            title: 'Sucesso!',
            description: `${createdMedia.length} imagens adicionadas à timeline`,
          });
        } catch (error) {
          console.error('Erro ao carregar imagens:', error);
          toast({
            title: 'Erro',
            description: 'Algumas imagens não puderam ser carregadas',
            variant: 'destructive',
          });
        }
      }

      toast({
        title: 'Sucesso!',
        description: 'Imóvel escaneado e formulário preenchido',
      });

      // Aguardar um pouco e navegar para o editor
      setTimeout(() => {
        navigate('/editor');
      }, 1500);

    } catch (error) {
      console.error('Erro ao escanear:', error);
      toast({
        title: 'Erro ao escanear',
        description: 'Não foi possível extrair informações da URL',
        variant: 'destructive',
      });
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="space-y-2 p-3 bg-card rounded-md border">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold">Escanear Imóvel</h2>
        <span className="text-[11px] text-muted-foreground hidden sm:inline">Cole a URL para extrair dados e fotos</span>
      </div>
      <div className="flex gap-2">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.vendebens.com.br/imoveis/..."
          disabled={isScanning}
          className="h-8 text-xs"
        />
        <Button onClick={handleScan} disabled={isScanning} size="sm">
          {isScanning ? (
            <>
              <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
              Escaneando
            </>
          ) : (
            <>
              <Search className="w-3.5 h-3.5 mr-1.5" />
              Escanear
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
