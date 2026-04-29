import { create } from 'zustand';

export interface PropertyData {
  // Básico
  tipo: string; // Casa, Apartamento, Terreno, Comercial
  transacao: string; // Venda, Aluguel
  referencia?: string; // Código de referência do imóvel
  
  // Localização
  bairro: string;
  cidade: string;
  estado: string;
  
  // Características
  quartos: number;
  banheiros: number;
  vagas: number;
  area: number;
  areaTerreno?: number;
  
  // Valores
  valor: number;
  valorEntrada?: number; // Valor de entrada (se houver)
  condominio?: number;
  iptu?: number;
  
  // Diferenciais
  diferenciais: string[];
  descricaoAdicional: string;
  
  // Corretor
  nomeCorretor: string;
  telefoneCorretor: string;
  creci?: string;

  // Contexto bruto extraído da página (markdown/texto), usado para enriquecer roteiros e copy
  pageContext?: string;
  url?: string;
}

interface PropertyState {
  propertyData: PropertyData | null;
  generatedCopy: string;
  
  setPropertyData: (data: PropertyData) => void;
  setGeneratedCopy: (copy: string) => void;
  clearData: () => void;
}

const defaultProperty: PropertyData = {
  tipo: 'Apartamento',
  transacao: 'Venda',
  bairro: '',
  cidade: '',
  estado: '',
  quartos: 0,
  banheiros: 0,
  vagas: 0,
  area: 0,
  valor: 0,
  valorEntrada: undefined,
  diferenciais: [],
  descricaoAdicional: '',
  nomeCorretor: 'Vendebens Imóveis',
  telefoneCorretor: '',
  creci: 'CRECI: 25571-J',
};

const buildPropertyFingerprint = (data: PropertyData | null | undefined) => JSON.stringify({
  url: data?.url || '',
  referencia: data?.referencia || '',
  valor: data?.valor || 0,
  quartos: data?.quartos || 0,
  banheiros: data?.banheiros || 0,
  vagas: data?.vagas || 0,
  area: data?.area || 0,
  bairro: data?.bairro || '',
  cidade: data?.cidade || '',
  estado: data?.estado || '',
});

export const usePropertyStore = create<PropertyState>((set) => {
  // Carregar do localStorage na inicialização
  const loadFromStorage = (): Pick<PropertyState, 'propertyData' | 'generatedCopy'> => {
    try {
      const saved = localStorage.getItem('property-data-storage');
      if (saved) {
        const parsed = JSON.parse(saved);
        return {
          propertyData: parsed.propertyData || defaultProperty,
          generatedCopy: parsed.generatedCopy || ''
        };
      }
    } catch (e) {
      console.error('Erro ao carregar dados do imóvel:', e);
    }
    return { propertyData: defaultProperty, generatedCopy: '' };
  };

  const initialState = loadFromStorage();

  // Helper para salvar no localStorage
  const saveToStorage = (propertyData: PropertyData | null, generatedCopy: string) => {
    try {
      localStorage.setItem('property-data-storage', JSON.stringify({ propertyData, generatedCopy }));
    } catch (e) {
      console.error('Erro ao salvar dados do imóvel:', e);
    }
  };

  return {
    propertyData: initialState.propertyData,
    generatedCopy: initialState.generatedCopy,
    
    setPropertyData: (data) => {
      set((state) => {
        const shouldResetCopy = buildPropertyFingerprint(state.propertyData) !== buildPropertyFingerprint(data);
        const nextCopy = shouldResetCopy ? '' : state.generatedCopy;
        saveToStorage(data, nextCopy);
        return { propertyData: data, generatedCopy: nextCopy };
      });
    },
    
    setGeneratedCopy: (copy) => {
      set((state) => {
        saveToStorage(state.propertyData, copy);
        return { generatedCopy: copy };
      });
    },
    
    clearData: () => {
      saveToStorage(defaultProperty, '');
      set({ propertyData: defaultProperty, generatedCopy: '' });
    },
  };
});
