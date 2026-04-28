// Renderizador único da thumbnail (usado pelo preview e pelo editor)
// Layout baseado no HTML fornecido pelo usuário:
//  - Header (título uppercase) no topo
//  - Subheader (localização)
//  - Caixa de preço azul full-width (com label)
//  - Tag REF branca alinhada à direita logo abaixo da caixa
//  - Lista de detalhes alinhada à esquerda (quartos/banheiros/vagas/área)
//  - Bloco CRECI no rodapé centralizado em duas linhas

import type { ThumbnailData } from '@/store/editorStore';

interface DrawOpts {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  data: ThumbnailData;
  /** "Vendebens Imóveis" ou similar — primeira linha do bloco CRECI */
  brandName?: string;
}

export function drawThumbnailOverlay({ ctx, canvas, data, brandName = 'VENDEBENS IMÓVEIS' }: DrawOpts) {
  const W = canvas.width;
  const H = canvas.height;

  // Overlay escuro top->bottom (mais escuro embaixo, mais escuro no topo, claro no meio)
  // Igual ao linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.7)) do HTML
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0, `rgba(0,0,0,${0.30 * data.overlayOpacity})`);
  grad.addColorStop(1, `rgba(0,0,0,${0.70 * data.overlayOpacity})`);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // Padding horizontal do conteúdo
  const sidePad = W * 0.05;
  const contentW = W - sidePad * 2;

  // Tipografia base proporcional à largura (no HTML 400px width: header=22px → ~5.5%)
  const fs = (pct: number) => W * pct;

  ctx.textBaseline = 'alphabetic';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;

  // ===== HEADER (título no topo, ~28% da altura) =====
  let cursorY = H * 0.30;

  if (data.title) {
    ctx.fillStyle = data.titleColor || '#ffffff';
    ctx.font = `800 ${fs(0.058) * data.titleFontSize}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    const title = data.title.toUpperCase();
    // Word-wrap simples se passar da largura
    wrapText(ctx, title, W / 2, cursorY, contentW, fs(0.062) * data.titleFontSize);
    cursorY += fs(0.065) * data.titleFontSize * Math.max(1, Math.ceil(measureLines(ctx, title, contentW)));
  }

  if (data.location) {
    ctx.fillStyle = data.locationColor || '#ffffff';
    ctx.font = `500 ${fs(0.040)}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(data.location.toUpperCase(), W / 2, cursorY + fs(0.012));
    cursorY += fs(0.060);
  }

  // ===== PRICE BOX (azul, quase full-width) =====
  if (data.price) {
    const boxW = contentW * 0.97;
    const boxX = (W - boxW) / 2;
    const boxPaddingY = fs(0.025);
    const priceFs = fs(0.080) * (data.priceFontSize / 1.8); // referencia: 32px no HTML
    const subFs = fs(0.035);
    const boxH = boxPaddingY * 2 + priceFs + subFs * 1.4;
    const boxY = cursorY + fs(0.020);

    // Box (sem shadow)
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    // Sombra externa do box
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(boxX, boxY + 6, boxW, boxH);

    ctx.fillStyle = data.priceColor || '#004691';
    ctx.fillRect(boxX, boxY, boxW, boxH);

    // Texto do preço
    ctx.fillStyle = '#ffffff';
    ctx.font = `900 ${priceFs}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillText(`VALOR: ${data.price}`.toUpperCase(), W / 2, boxY + boxPaddingY + priceFs * 0.85);

    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `400 ${subFs}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.fillText('Aceita Financiamento Bancário!', W / 2, boxY + boxPaddingY + priceFs + subFs * 1.1);

    cursorY = boxY + boxH;

    // ===== REF TAG (branca, alinhada à direita, logo abaixo do box) =====
    if (data.referencia) {
      const refFs = fs(0.034);
      ctx.font = `700 ${refFs}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
      const refText = `REF.: ${data.referencia}`;
      const refTextW = ctx.measureText(refText).width;
      const refPadX = fs(0.022);
      const refPadY = fs(0.008);
      const refW = refTextW + refPadX * 2;
      const refH = refFs + refPadY * 2;
      const refX = boxX + boxW - refW; // alinhado à direita do box
      const refY = cursorY + fs(0.006);

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(refX, refY, refW, refH);

      ctx.fillStyle = '#000000';
      ctx.textAlign = 'left';
      ctx.fillText(refText, refX + refPadX, refY + refPadY + refFs * 0.85);

      cursorY = refY + refH;
    }
  }

  // Restaurar sombra para o resto do conteúdo
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // ===== LISTA DE DETALHES (alinhada à esquerda) =====
  const items: Array<{ icon: string; text: string }> = [];
  if (data.bedrooms) items.push({ icon: '🏠', text: `${data.bedrooms} Quarto${data.bedrooms !== '1' ? 's' : ''}` });
  if (data.bathrooms) items.push({ icon: '🚿', text: `${data.bathrooms} Banheiro${data.bathrooms !== '1' ? 's' : ''}` });
  if (data.area) items.push({ icon: '📐', text: `${data.area}m² Área Útil` });

  const detailFs = fs(0.045) * data.textFontSize;
  const detailLineH = detailFs * 1.55;
  const detailX = sidePad + fs(0.06); // padding-left maior, como no HTML (50px)
  let detailY = cursorY + fs(0.060);

  ctx.font = `600 ${detailFs}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
  ctx.textAlign = 'left';
  ctx.fillStyle = data.textColor || '#ffffff';

  for (const it of items) {
    ctx.fillText(`${it.icon}  ${it.text}`, detailX, detailY);
    detailY += detailLineH;
  }

  // ===== CRECI no rodapé (centralizado, duas linhas) =====
  if (data.creci || brandName) {
    const creciFs = fs(0.030);
    ctx.font = `700 ${creciFs}px Inter, "Segoe UI", Roboto, Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffffff';
    const bottomMargin = fs(0.025);
    const lineH = creciFs * 1.35;

    if (data.creci) {
      // Última linha
      ctx.fillText(data.creci, W / 2, H - bottomMargin);
      // Penúltima linha
      ctx.fillText(brandName, W / 2, H - bottomMargin - lineH);
    } else {
      ctx.fillText(brandName, W / 2, H - bottomMargin);
    }
  }

  // Reset
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
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
  lines.forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
}

function measureLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): number {
  const words = text.split(/\s+/);
  let lines = 1;
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines++;
      line = w;
    } else {
      line = test;
    }
  }
  return lines;
}
