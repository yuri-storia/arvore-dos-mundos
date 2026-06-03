import React, { useEffect, useRef, useState } from 'react';
import { Textarea } from '@/components/ui/textarea';

/**
 * Textarea que usa estado local e salva após inatividade (default 800ms),
 * evitando uma escrita no banco a cada tecla.
 */
interface Props {
  value: string;
  onSave: (next: string) => void;
  placeholder?: string;
  className?: string;
  delay?: number;
}

export const DebouncedTextarea: React.FC<Props> = ({
  value,
  onSave,
  placeholder,
  className,
  delay = 800,
}) => {
  const [local, setLocal] = useState(value);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastExternal = useRef(value);

  // Sync external updates (e.g., switching chapter) without overwriting active edits
  useEffect(() => {
    if (value !== lastExternal.current) {
      lastExternal.current = value;
      setLocal(value);
    }
  }, [value]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  return (
    <Textarea
      value={local}
      onChange={(e) => {
        const next = e.target.value;
        setLocal(next);
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
          lastExternal.current = next;
          onSave(next);
        }, delay);
      }}
      onBlur={() => {
        if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
        if (local !== lastExternal.current) {
          lastExternal.current = local;
          onSave(local);
        }
      }}
      placeholder={placeholder}
      className={className}
    />
  );
};
