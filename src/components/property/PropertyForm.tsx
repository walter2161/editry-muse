import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';
import { usePropertyStore, PropertyData } from '@/store/propertyStore';

export const PropertyForm = () => {
  const { propertyData, setPropertyData } = usePropertyStore();
  const [novoDiferencial, setNovoDiferencial] = useState('');

  const updateField = (field: keyof PropertyData, value: any) => {
    setPropertyData({ ...propertyData!, [field]: value });
  };

  const addDiferencial = () => {
    if (novoDiferencial.trim()) {
      updateField('diferenciais', [...(propertyData?.diferenciais || []), novoDiferencial.trim()]);
      setNovoDiferencial('');
    }
  };

  const removeDiferencial = (index: number) => {
    const novos = propertyData?.diferenciais.filter((_, i) => i !== index) || [];
    updateField('diferenciais', novos);
  };

  return (
    <div className="p-3 bg-card rounded-md border [&_label]:text-[11px] [&_label]:text-muted-foreground [&_input]:h-8 [&_input]:text-xs [&_button[role=combobox]]:h-8 [&_button[role=combobox]]:text-xs [&_textarea]:text-xs">
      <h2 className="text-sm font-semibold mb-2">Informações do Imóvel</h2>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <Label>Tipo</Label>
          <Select value={propertyData?.tipo} onValueChange={(v) => updateField('tipo', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Casa">Casa</SelectItem>
              <SelectItem value="Apartamento">Apartamento</SelectItem>
              <SelectItem value="Terreno">Terreno</SelectItem>
              <SelectItem value="Comercial">Comercial</SelectItem>
              <SelectItem value="Cobertura">Cobertura</SelectItem>
              <SelectItem value="Chácara">Chácara</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Transação</Label>
          <Select value={propertyData?.transacao} onValueChange={(v) => updateField('transacao', v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Venda">Venda</SelectItem>
              <SelectItem value="Aluguel">Aluguel</SelectItem>
              <SelectItem value="Temporada">Temporada</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Ref.</Label>
          <Input
            value={propertyData?.referencia || ''}
            onChange={(e) => updateField('referencia', e.target.value)}
            placeholder="12345"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 mb-2">
        <div>
          <Label>Bairro</Label>
          <Input value={propertyData?.bairro} onChange={(e) => updateField('bairro', e.target.value)} />
        </div>
        <div>
          <Label>Cidade</Label>
          <Input value={propertyData?.cidade} onChange={(e) => updateField('cidade', e.target.value)} />
        </div>
        <div>
          <Label>UF</Label>
          <Input value={propertyData?.estado} onChange={(e) => updateField('estado', e.target.value)} maxLength={2} />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        <div>
          <Label>Quartos</Label>
          <Input type="number" value={propertyData?.quartos} onChange={(e) => updateField('quartos', parseInt(e.target.value) || 0)} min="0" />
        </div>
        <div>
          <Label>Banhos</Label>
          <Input type="number" value={propertyData?.banheiros} onChange={(e) => updateField('banheiros', parseInt(e.target.value) || 0)} min="0" />
        </div>
        <div>
          <Label>Vagas</Label>
          <Input type="number" value={propertyData?.vagas} onChange={(e) => updateField('vagas', parseInt(e.target.value) || 0)} min="0" />
        </div>
        <div>
          <Label>m²</Label>
          <Input type="number" value={propertyData?.area} onChange={(e) => updateField('area', parseFloat(e.target.value) || 0)} min="0" />
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 mb-2">
        <div>
          <Label>Valor</Label>
          <Input type="number" value={propertyData?.valor} onChange={(e) => updateField('valor', parseFloat(e.target.value) || 0)} min="0" />
        </div>
        <div>
          <Label>Entrada</Label>
          <Input type="number" value={propertyData?.valorEntrada || ''} onChange={(e) => updateField('valorEntrada', parseFloat(e.target.value) || undefined)} min="0" placeholder="opc." />
        </div>
        <div>
          <Label>Cond.</Label>
          <Input type="number" value={propertyData?.condominio || ''} onChange={(e) => updateField('condominio', parseFloat(e.target.value) || undefined)} min="0" />
        </div>
        <div>
          <Label>IPTU</Label>
          <Input type="number" value={propertyData?.iptu || ''} onChange={(e) => updateField('iptu', parseFloat(e.target.value) || undefined)} min="0" />
        </div>
      </div>

      {propertyData?.valorEntrada && propertyData.valorEntrada > 0 && (
        <div className="mb-2 px-2 py-1 bg-green-500/10 border border-green-500/30 rounded text-[11px] text-green-600 dark:text-green-400">
          💰 Entrada facilitada de R$ {propertyData.valorEntrada.toLocaleString('pt-BR')}
        </div>
      )}

      <div className="mb-2">
        <Label>Diferenciais</Label>
        <div className="flex gap-1.5 mb-1.5">
          <Input
            value={novoDiferencial}
            onChange={(e) => setNovoDiferencial(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && addDiferencial()}
            placeholder="Piscina, Academia..."
          />
          <Button onClick={addDiferencial} type="button" size="sm">+</Button>
        </div>
        <div className="flex flex-wrap gap-1">
          {propertyData?.diferenciais.map((d, i) => (
            <Badge key={i} variant="secondary" className="flex items-center gap-1 text-[10px] py-0 h-5">
              {d}
              <X className="w-2.5 h-2.5 cursor-pointer" onClick={() => removeDiferencial(i)} />
            </Badge>
          ))}
        </div>
      </div>

      <div className="mb-2">
        <Label>Descrição</Label>
        <Textarea
          value={propertyData?.descricaoAdicional}
          onChange={(e) => updateField('descricaoAdicional', e.target.value)}
          placeholder="Informações extras..."
          rows={2}
        />
      </div>

      <div className="grid grid-cols-3 gap-2 border-t pt-2">
        <div>
          <Label>Imobiliária</Label>
          <Input value={propertyData?.nomeCorretor || ''} onChange={(e) => updateField('nomeCorretor', e.target.value)} />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={propertyData?.telefoneCorretor || ''} onChange={(e) => updateField('telefoneCorretor', e.target.value)} placeholder="(11) 99999-9999" />
        </div>
        <div>
          <Label>CRECI</Label>
          <Input value={propertyData?.creci || ''} onChange={(e) => updateField('creci', e.target.value)} />
        </div>
      </div>
    </div>
  );
};
