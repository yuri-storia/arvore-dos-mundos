import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  src: string;
  alt: string;
  initialPosition: { x: number; y: number };
  onSave: (pos: { x: number; y: number }) => void;
  onCancel: () => void;
}

/**
 * Facebook-style cover image repositioner.
 * Opens a full-screen overlay where the user drags the image to reposition it.
 */
export const ImageRepositioner: React.FC<Props> = ({ src, alt, initialPosition, onSave, onCancel }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [dragging, setDragging] = useState(false);
  const [imgNatural, setImgNatural] = useState({ w: 0, h: 0 });
  const [offsetY, setOffsetY] = useState(0); // px offset from center
  const dragStartRef = useRef<{ pointerId: number; clientY: number; startOffset: number } | null>(null);

  // Convert initial % position to pixel offset once image loads
  const handleImgLoad = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const nat = { w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight };
    setImgNatural(nat);

    const containerH = containerRef.current.clientHeight;
    const containerW = containerRef.current.clientWidth;
    const scale = containerW / nat.w;
    const scaledH = nat.h * scale;
    const maxOffset = Math.max(0, (scaledH - containerH) / 2);

    // Convert % (0-100) to offset. 50% = 0 offset, 0% = +maxOffset, 100% = -maxOffset
    const pct = initialPosition.y;
    const off = ((50 - pct) / 50) * maxOffset;
    setOffsetY(off);
  }, [initialPosition.y]);

  const getMaxOffset = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return 0;
    const containerH = containerRef.current.clientHeight;
    const containerW = containerRef.current.clientWidth;
    const scale = containerW / imgNatural.w;
    const scaledH = imgNatural.h * scale;
    return Math.max(0, (scaledH - containerH) / 2);
  }, [imgNatural]);

  const clampOffset = useCallback((off: number) => {
    const max = getMaxOffset();
    return Math.max(-max, Math.min(max, off));
  }, [getMaxOffset]);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
    dragStartRef.current = { pointerId: e.pointerId, clientY: e.clientY, startOffset: offsetY };
  }, [offsetY]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStartRef.current || dragStartRef.current.pointerId !== e.pointerId) return;
    e.preventDefault();
    e.stopPropagation();
    const delta = e.clientY - dragStartRef.current.clientY;
    setOffsetY(clampOffset(dragStartRef.current.startOffset + delta));
  }, [clampOffset]);

  const handlePointerEnd = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.pointerId === e.pointerId) {
      e.preventDefault();
      e.stopPropagation();
      if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
      setDragging(false);
      dragStartRef.current = null;
    }
  }, []);

  // Global selection lock while dragging
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

  // Convert offset back to % on save
  const handleSave = useCallback(() => {
    const max = getMaxOffset();
    const pct = max === 0 ? 50 : Math.round(50 - (offsetY / max) * 50);
    onSave({ x: 50, y: Math.max(0, Math.min(100, pct)) });
  }, [offsetY, getMaxOffset, onSave]);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const content = (
    <div
      className="fixed inset-0 z-[300] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onCancel}
      onPointerDown={e => e.stopPropagation()}
      onMouseDown={e => e.stopPropagation()}
    >
      <div
        className="w-full max-w-[760px] rounded-2xl border border-border bg-card/95 shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-4 py-4 sm:px-5">
          <div>
            <h3 className="font-cinzel font-bold text-base text-foreground">Ajustar prévia da imagem</h3>
            <p className="mt-1 text-xs text-muted-foreground font-montserrat">Isso altera apenas a miniatura da ficha antes da expansão.</p>
          </div>
          <span className="rounded-full border border-border bg-secondary/60 px-2.5 py-1 text-[10px] font-montserrat font-bold uppercase tracking-wider text-muted-foreground">
            Arraste verticalmente
          </span>
        </div>

        <div
          ref={containerRef}
          className={`relative m-4 h-[300px] sm:m-5 sm:h-[380px] rounded-xl overflow-hidden border-2 bg-secondary/30 ${dragging ? 'border-primary cursor-grabbing' : 'border-border cursor-grab'} transition-colors select-none touch-none`}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          onPointerDown={e => e.stopPropagation()}
        >
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-0 left-0 right-0 h-px bg-border" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-border" />
            <div className="absolute top-1/3 left-0 right-0 h-px border-t border-dashed border-border/70" />
            <div className="absolute top-2/3 left-0 right-0 h-px border-t border-dashed border-border/70" />
          </div>

          <img
            ref={imgRef}
            src={src}
            alt={alt}
            onLoad={handleImgLoad}
            className="absolute left-0 w-full pointer-events-none"
            style={{
              top: '50%',
              transform: `translateY(calc(-50% + ${offsetY}px))`,
            }}
            draggable={false}
          />

          {!dragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="px-4 py-2 rounded-full border border-border bg-card/85 text-foreground text-sm font-montserrat font-bold backdrop-blur-sm flex items-center gap-2 shadow-lg">
                <span className="text-lg">↕</span> Arraste para reposicionar
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-4 py-4 sm:px-5">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg bg-secondary hover:bg-secondary/80 text-secondary-foreground text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-6 py-2.5 rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-montserrat font-bold uppercase tracking-wider transition-all shadow-lg flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
            Confirmar prévia
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(content, document.body) : content;
};
