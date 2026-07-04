// Renderizador único da thumbnail (usado pelo preview e pelo export)
// Design "capa de anúncio imobiliário":
//  - Fachada do imóvel (primeira imagem da timeline) como fundo — feita fora deste módulo
//  - Vinheta escura em cima e embaixo p/ legibilidade
//  - Título grande + localização no topo
//  - Faixa AZUL com cantos arredondados e detalhe dourado (banner do preço)
//  - Tag REF branca alinhada à direita
//  - Chip escuro translúcido com quartos/banheiros/área
//  - CRECI + marca no rodapé, centralizados

import type { ThumbnailData } from '@/store/editorStore';

interface DrawOpts {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  data: ThumbnailData;
  brandName?: string;
}

const BLUE = '#0A47A6';
const BLUE_DARK = '#062E6B';
const GOLD = '#F4C430';

export function drawThumbnailOverlay({ ctx, canvas, data, brandName = 'VENDEBENS IMÓVEIS' }: DrawOpts) {
  const W = canvas.width;
  const H = canvas.height;
  const fs = (pct: number) => W * pct;
  const sidePad = W * 0.05;
  const contentW = W - sidePad * 2;

  // ===== Vinheta top+bottom (mais escura para legibilidade máxima) =====
  const opa = data.overlayOpacity ?? 1;
  const topGrad = ctx.createLinearGradient(0, 0, 0, H * 0.55);
  topGrad.addColorStop(0, `rgba(0,0,0,${0.75 * opa})`);
  topGrad.addColorStop(1, `rgba(0,0,0,0)`);
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, W, H * 0.55);

  const botGrad = ctx.createLinearGradient(0, H * 0.45, 0, H);
  botGrad.addColorStop(0, `rgba(0,0,0,0)`);
  botGrad.addColorStop(1, `rgba(0,0,0,${0.85 * opa})`);
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, H * 0.45, W, H * 0.55);

  ctx.textBaseline = 'alphabetic';

  // ===== HEADER: título e localização =====
  const setShadow = (blur = 8, alpha = 0.9) => {
    ctx.shadowColor = `rgba(0,0,0,${alpha})`;
    ctx.shadowBlur = blur;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
  };
  const clearShadow = () => {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  };

  let cursorY = H * 0.10;
  const titleFs = fs(0.062) * (data.titleFontSize ?? 1);
  const titleLineH = titleFs * 1.1;

  if (data.title) {
    setShadow(10, 0.9);
    ctx.fillStyle = data.titleColor || '#ffffff';
    ctx.font = `900 ${titleFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    const lines = wrapLines(ctx, data.title.toUpperCase(), contentW);
    lines.forEach((ln, i) => ctx.fillText(ln, W / 2, cursorY + titleFs + i * titleLineH));
    cursorY += titleFs + (lines.length - 1) * titleLineH;
  }

  if (data.location) {
    const locFs = fs(0.036);
    setShadow(6, 0.85);
    ctx.fillStyle = data.locationColor || '#ffffff';
    ctx.font = `500 ${locFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`📍 ${data.location.toUpperCase()}`, W / 2, cursorY + locFs * 1.6);
    cursorY += locFs * 1.8;
  }

  // ===== BANNER AZUL DO PREÇO (sempre visível) =====
  const priceText = (data.price || 'CONSULTE O VALOR').toUpperCase();
  const boxW = contentW;
  const boxX = (W - boxW) / 2;
  const priceFs = fs(0.075) * ((data.priceFontSize ?? 1.8) / 1.8);
  const subFs = fs(0.032);
  const boxPadY = fs(0.028);
  const boxH = boxPadY * 2 + priceFs + subFs * 1.6;
  const boxY = cursorY + fs(0.030);
  const radius = fs(0.020);

  clearShadow();

  // Sombra do box
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  roundRect(ctx, boxX + 4, boxY + 10, boxW, boxH, radius);
  ctx.fill();

  // Gradiente azul
  const bgrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxH);
  const priceBase = data.priceColor || BLUE;
  bgrad.addColorStop(0, priceBase);
  bgrad.addColorStop(1, BLUE_DARK);
  ctx.fillStyle = bgrad;
  roundRect(ctx, boxX, boxY, boxW, boxH, radius);
  ctx.fill();

  // Barra dourada superior (detalhe)
  ctx.fillStyle = GOLD;
  roundRect(ctx, boxX, boxY, boxW, fs(0.008), { tl: radius, tr: radius, br: 0, bl: 0 });
  ctx.fill();

  // Texto do preço
  ctx.fillStyle = '#ffffff';
  ctx.font = `900 ${priceFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(priceText, W / 2, boxY + boxPadY + priceFs * 0.85 + fs(0.005));

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.font = `500 ${subFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.fillText('✓ Aceita Financiamento Bancário', W / 2, boxY + boxPadY + priceFs + subFs * 1.4);

  cursorY = boxY + boxH;

  // ===== TAG REF (branca, arredondada, à direita) =====
  if (data.referencia) {
    const refFs = fs(0.030);
    ctx.font = `800 ${refFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
    const refText = `REF ${data.referencia}`;
    const refTextW = ctx.measureText(refText).width;
    const refPadX = fs(0.020);
    const refPadY = fs(0.010);
    const refW = refTextW + refPadX * 2;
    const refH = refFs + refPadY * 2;
    const refX = boxX + boxW - refW - fs(0.010);
    const refY = cursorY + fs(0.010);
    ctx.fillStyle = GOLD;
    roundRect(ctx, refX, refY, refW, refH, refH / 2);
    ctx.fill();
    ctx.fillStyle = BLUE_DARK;
    ctx.textAlign = 'left';
    ctx.fillText(refText, refX + refPadX, refY + refPadY + refFs * 0.85);
    cursorY = refY + refH;
  }

  // ===== CHIP ESCURO COM DETALHES (quartos / banheiros / área) =====
  const items: string[] = [];
  if (data.bedrooms) items.push(`🛏  ${data.bedrooms} ${data.bedrooms === '1' ? 'QUARTO' : 'QUARTOS'}`);
  if (data.bathrooms) items.push(`🚿  ${data.bathrooms} ${data.bathrooms === '1' ? 'BANHEIRO' : 'BANHEIROS'}`);
  if (data.area) items.push(`📐  ${data.area}m²`);

  if (items.length > 0) {
    const chipFs = fs(0.036) * (data.textFontSize ?? 1);
    ctx.font = `700 ${chipFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
    const gap = fs(0.030);
    const widths = items.map((t) => ctx.measureText(t).width);
    const totalTextW = widths.reduce((a, b) => a + b, 0) + gap * (items.length - 1);
    const chipPadX = fs(0.030);
    const chipPadY = fs(0.018);
    const chipW = Math.min(contentW, totalTextW + chipPadX * 2);
    const chipH = chipFs + chipPadY * 2;
    const chipX = (W - chipW) / 2;
    const chipY = cursorY + fs(0.035);

    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.fill();

    // Borda dourada
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = Math.max(1, fs(0.003));
    roundRect(ctx, chipX, chipY, chipW, chipH, chipH / 2);
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    let tx = chipX + chipPadX;
    items.forEach((t, i) => {
      ctx.fillText(t, tx, chipY + chipPadY + chipFs * 0.85);
      tx += widths[i] + gap;
    });
    cursorY = chipY + chipH;
  }

  // ===== CRECI + MARCA no rodapé =====
  setShadow(6, 0.85);
  const brandFs = fs(0.038);
  const creciFs = fs(0.028);
  ctx.textAlign = 'center';
  const bottomMargin = fs(0.035);

  if (data.creci) {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = `500 ${creciFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.fillText(data.creci, W / 2, H - bottomMargin);
  }

  ctx.fillStyle = GOLD;
  ctx.font = `900 ${brandFs}px "Inter", "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.fillText(brandName, W / 2, H - bottomMargin - (data.creci ? creciFs * 1.5 : 0));

  clearShadow();
}

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

type Corners = number | { tl: number; tr: number; br: number; bl: number };
function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: Corners) {
  const c = typeof r === 'number' ? { tl: r, tr: r, br: r, bl: r } : r;
  ctx.beginPath();
  ctx.moveTo(x + c.tl, y);
  ctx.lineTo(x + w - c.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + c.tr);
  ctx.lineTo(x + w, y + h - c.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - c.br, y + h);
  ctx.lineTo(x + c.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - c.bl);
  ctx.lineTo(x, y + c.tl);
  ctx.quadraticCurveTo(x, y, x + c.tl, y);
  ctx.closePath();
}
