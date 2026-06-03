import React from 'react';
import { X } from 'lucide-react';

interface Props {
  src: string;
  alt: string;
  onClose: () => void;
}

export const ImageLightbox: React.FC<Props> = ({ src, alt, onClose }) => (
  <div
    className="fixed inset-0 z-[200] bg-black/85 flex items-center justify-center p-4 cursor-zoom-out"
    onClick={onClose}
  >
    <img
      src={src}
      alt={alt}
      className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-fadeUp"
      onClick={e => e.stopPropagation()}
    />
    <button
      onClick={onClose}
      className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white text-lg flex items-center justify-center transition-colors"
    >
      <X className="w-4 h-4" strokeWidth={2} />
    </button>
  </div>
);
