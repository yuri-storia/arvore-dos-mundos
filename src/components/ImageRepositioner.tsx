import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Move } from 'lucide-react';
import { createPortal } from 'react-dom';

interface Props {
  src: string;
  alt: string;
  initialPosition: { x: number; y: number };
  onSave: (pos: { x: number; y: number }) => void;
  onCancel: () => void;
  /**
   * Qual prévia está sendo ajustada:
   * - `collapsed`: miniatura do card fechado (paisagem, ~2:1)
   * - `expanded`: imagem lateral do card aberto (retrato, ~1:2 no desktop)
   */
  mode?: 'collapsed' | 'expanded';
}

/**
 * Reposicionador de imagem estilo Facebook cover.
 * Permite arraste horizontal E vertical, com moldura no mesmo formato
 * da prévia que será exibida (fechada ou aberta).
 */
export const ImageRepositioner: React.FC<Props> = ({ src, alt, initialPosition, onSave, onCancel, mode = 'collapsed' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  // Offset em pixels a partir do centro do container (ambos os eixos).
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ pointerId: number; clientX: number; clientY: number; startX: number; startY: number } | null>(null);

  // A imagem é escalonada para COBRIR o container (object-fit: cover),
  // então precisamos calcular a menor escala que ainda cobre ambos os eixos
  // e a partir daí descobrir o máximo de deslocamento em cada eixo.
  const getGeometry = useCallback(() => {
    if (!imgRef.current || !containerRef.current || !imgNatural.w || !imgNatural.h) {
      return { scale: 1, scaledW: 0, scaledH: 0, containerW: 0, containerH: 0, maxX: 0, maxY: 0 };
    }
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;
    const scale = Math.max(containerW / imgNatural.w, containerH / imgNatural.h);
    const scaledW = imgNatural.w * scale;
    const scaledH = imgNatural.h * scale;
    const maxX = Math.max(0, (scaledW - containerW) / 2);
    const maxY = Math.max(0, (scaledH - containerH) / 2);
    return { scale, scaledW, scaledH, containerW, containerH, maxX, maxY };
  }, [imgNatural]);

  const handleImgLoad = useCallback(() => {
    if (!imgRef.current) return;
    const nat = { w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight };
    setImgNatural(nat);
  }, []);

  // Converte a % inicial para offset em px assim que temos as dimensões.
  useEffect(() => {
    if (!imgNatural.w) return;
    const { maxX, maxY } = getGeometry();
    const offX = ((50 - initialPosition.x) / 50) * maxX;
    const offY = ((50 - initialPosition.y) / 50) * maxY;
    setOffset({ x: offX, y: offY });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imgNatural, mode]);

  const clamp = useCallback((next: { x: number; y: number }) => {
    const { maxX, maxY } = getGeometry();
    return {
      x: Math.max(-maxX, Math.min(maxX, next.x)),
      y: Math.max(-maxY, Math.min(maxY, next.y)),
    };
  }, [getGeometry]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = { pointerId: e.pointerId, clientX: e.clientX, clientY: e.clientY, startX: offset.x, startY: offset.y };
  }, [offset]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const dx = e.clientX - dragStartRef.current.clientX;
    const dy = e.clientY - dragStartRef.current.clientY;
    setOffset(clamp({ x: dragStartRef.current.startX + dx, y: dragStartRef.current.startY + dy }));
  }, [clamp]);

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.pointerId === e.pointerId) {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
      dragStartRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!dragging) return;
    const previousUserSelect = document.body.style.userSelect;
    const previousCursor = document.body.style.cursor;
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
    const onSelectStart = (e: Event) => e.preventDefault();
    document.addEventListener('selectstart', onSelectStart);
    return () => {
      document.removeEventListener('selectstart', onSelectStart);
      document.body.style.userSelect = previousUserSelect;
      document.body.style.cursor = previousCursor;
    };
  }, [dragging]);

  const handleSave = useCallback(() => {
    const { maxX, maxY } = getGeometry();
    const pctX = maxX === 0 ? 50 : Math.round(50 - (offset.x / maxX) * 50);
    const pctY = maxY === 0 ? 50 : Math.round(50 - (offset.y / maxY) * 50);
    onSave({
      x: Math.max(0, Math.min(100, pctX)),
      y: Math.max(0, Math.min(100, pctY)),
    });
  }, [offset, getGeometry, onSave]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, []);

  // Moldura no mesmo formato da prévia real, limitada pelo viewport para não
  // cortar botões nem imagens em telas pequenas.
  const frameClass = mode === 'expanded'
    ? 'w-[min(78vw,300px)] h-[min(55vh,520px)] sm:h-[min(60vh,520px)]'
    : 'w-full max-w-[520px] h-[min(38vh,280px)]';

  const title = mode === 'expanded' ? 'Ajustar prévia interna (card aberto)' : 'Ajustar prévia externa (card fechado)';
  const subtitle = mode === 'expanded'
    ? 'Isso altera como a imagem aparece dentro da ficha expandida.'
    : 'Isso altera apenas a miniatura da ficha na listagem.';

  const content = (
    <div
      className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto"
      onClick={onCancel}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className="w-full max-w-[760px] my-auto rounded-2xl border border-border bg-card/95 shadow-2xl max-h-[96vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4 border-b border-border px-4 py-3 sm:px-5 sm:py-4">
          <div className="min-w-0">
            <h3 className="font-cinzel font-bold text-sm sm:text-base text-foreground">{title}</h3>
            <p className="mt-1 text-[11px] sm:text-xs text-muted-foreground font-montserrat">{subtitle}</p>
          </div>
          <span className="self-start rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] font-montserrat font-bold uppercase tracking-wider text-muted-foreground whitespace-nowrap">
            Arraste ↕ ↔
          </span>
        </div>

        <div className="px-4 sm:px-5 pt-3 -mb-1">
          <p className="text-[11px] sm:text-xs text-muted-foreground font-montserrat leading-snug">
            <Move className="w-3.5 h-3.5 inline-block mr-1 align-[-0.2em] text-primary" strokeWidth={1.75} />
            Dica: arraste a imagem <strong className="text-foreground">na horizontal e na vertical</strong> para escolher qual parte fica visível na prévia.
          </p>
        </div>

        <div className="flex justify-center p-3 sm:p-5 overflow-auto">
          <div
            ref={containerRef}
            className={`relative ${frameClass} rounded-xl overflow-hidden border-2 bg-secondary/30 ${dragging ? 'border-primary cursor-grabbing' : 'border-border cursor-grab'} transition-colors select-none touch-none`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerEnd}
            onPointerCancel={handlePointerEnd}
          >
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-border/70" />
              <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-border/70" />
              <div className="absolute left-1/3 top-0 bottom-0 w-px border-l border-dashed border-border/70" />
              <div className="absolute left-2/3 top-0 bottom-0 w-px border-l border-dashed border-border/70" />
            </div>

            <img
              ref={imgRef}
              src={src}
              alt={alt}
              onLoad={handleImgLoad}
              className="absolute pointer-events-none max-w-none"
              style={{
                left: '50%',
                top: '50%',
                width: imgNatural.w ? `${imgNatural.w * getGeometry().scale}px` : 'auto',
                height: imgNatural.h ? `${imgNatural.h * getGeometry().scale}px` : 'auto',
                transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
              }}
              draggable={false}
            />

            {!dragging && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <span className="px-4 py-2 rounded-full border border-border bg-card/85 text-foreground text-sm font-montserrat font-bold backdrop-blur-sm flex items-center gap-2 shadow-lg">
                  <Move className="w-4 h-4 inline-block mr-1.5 align-[-0.2em]" strokeWidth={1.75} /> Arraste para reposicionar
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 sm:gap-3 border-t border-border px-3 py-3 sm:px-5 sm:py-4">
          <button
            onClick={onCancel}
            className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-[11px] sm:text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-montserrat font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-1.5 sm:gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
