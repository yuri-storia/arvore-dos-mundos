import React, { useState, useRef, useCallback, useEffect } from 'react';

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
  const dragStartRef = useRef<{ mouseY: number; startOffset: number } | null>(null);

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

  // Mouse handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStartRef.current = { mouseY: e.clientY, startOffset: offsetY };
  }, [offsetY]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStartRef.current) return;
    const delta = e.clientY - dragStartRef.current.mouseY;
    setOffsetY(clampOffset(dragStartRef.current.startOffset + delta));
  }, [dragging, clampOffset]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStartRef.current = null;
  }, []);

  // Touch handlers
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    setDragging(true);
    dragStartRef.current = { mouseY: e.touches[0].clientY, startOffset: offsetY };
  }, [offsetY]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!dragging || !dragStartRef.current) return;
    const delta = e.touches[0].clientY - dragStartRef.current.mouseY;
    setOffsetY(clampOffset(dragStartRef.current.startOffset + delta));
  }, [dragging, clampOffset]);

  const handleTouchEnd = useCallback(() => {
    setDragging(false);
    dragStartRef.current = null;
  }, []);

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

  return (
    <div className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4" onClick={onCancel}>
      <div className="w-full max-w-[700px] flex flex-col gap-3" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-cinzel font-bold text-base text-white">Reposicionar imagem</h3>
          <span className="text-xs text-white/60 font-montserrat">Arraste a imagem para ajustar</span>
        </div>

        {/* Image viewport */}
        <div
          ref={containerRef}
          className={`relative w-full h-[300px] sm:h-[360px] rounded-lg overflow-hidden border-2 ${dragging ? 'border-primary cursor-grabbing' : 'border-white/20 cursor-grab'} transition-colors select-none`}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Guide lines */}
          <div className="absolute inset-0 pointer-events-none z-10">
            <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
            <div className="absolute bottom-0 left-0 right-0 h-px bg-white/10" />
            <div className="absolute top-1/3 left-0 right-0 h-px bg-white/5 border-dashed" />
            <div className="absolute top-2/3 left-0 right-0 h-px bg-white/5 border-dashed" />
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

          {/* Drag hint overlay */}
          {!dragging && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <span className="px-4 py-2 rounded-full bg-black/50 text-white text-sm font-montserrat font-bold backdrop-blur-sm flex items-center gap-2">
                <span className="text-lg">↕</span> Arraste para reposicionar
              </span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="px-5 py-2 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 rounded-md bg-primary hover:bg-ring text-white text-xs font-montserrat font-bold uppercase tracking-wider transition-colors"
          >
            ✓ Salvar posição
          </button>
        </div>
      </div>
    </div>
  );
};
