import { useEditorStore } from "@/store/editorStore";
import type { PropertyData } from "@/store/propertyStore";

/**
 * Sincroniza os dados da thumbnail do editor com o imóvel atualmente escaneado.
 * Deve ser chamada SEMPRE que `propertyData` mudar (ex: novo scan).
 * Garante que a thumb nunca fique com informações antigas/fixas.
 */
export function syncThumbnailFromProperty(propertyData: PropertyData | null) {
  if (!propertyData) return;

  const { updateThumbnailData } = useEditorStore.getState();

  const bedrooms = propertyData.quartos ? `${propertyData.quartos}` : "";
  const bathrooms = propertyData.banheiros ? `${propertyData.banheiros}` : "";
  const area = propertyData.area ? `${propertyData.area}` : "";

  let price = "";
  if (propertyData.valor && propertyData.valor > 0) {
    if (propertyData.transacao === "Venda") {
      price = `R$ ${propertyData.valor.toLocaleString("pt-BR")}`;
    } else {
      price = `R$ ${propertyData.valor.toLocaleString("pt-BR")}/mês`;
    }
  }

  const location = [propertyData.bairro, propertyData.cidade, propertyData.estado]
    .filter(Boolean)
    .join(", ");

  const title = `${propertyData.tipo || "Imóvel"} ${
    propertyData.transacao === "Venda" ? "à Venda" : "para Alugar"
  }`;

  updateThumbnailData({
    enabled: true,
    title,
    price,
    bedrooms,
    bathrooms,
    area,
    location,
    referencia: propertyData.referencia || "",
    creci: propertyData.creci || "CRECI: 25571-J",
  });
}
