import React, { useRef, useState } from 'react';
import { Bug, Paperclip, X, Image as ImageIcon, Video } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';

interface Props {
  initialContext?: string;
  trigger?: React.ReactNode;
}

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB

export const BugReportDialog: React.FC<Props> = ({ initialContext = '', trigger }) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleOpenChange = (next: boolean) => {
    if (next) {
      setMessage('');
      clearFile();
    }
    setOpen(next);
  };

  const clearFile = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      toast.error('Arquivo muito grande. Máximo 20 MB.');
      return;
    }
    if (!f.type.startsWith('image/') && !f.type.startsWith('video/')) {
      toast.error('Apenas imagens ou vídeos são permitidos.');
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
  };

  const handleSubmit = async () => {
    const text = message.trim();
    if (text.length < 5) {
      toast.error('Conte um pouco mais sobre o problema (mín. 5 caracteres).');
      return;
    }
    if (text.length > 4000) {
      toast.error('Mensagem longa demais. Resuma em até 4000 caracteres.');
      return;
    }
    if (file && !user) {
      toast.error('Faça login para anexar arquivos.');
      return;
    }
    setSaving(true);
    try {
      let attachment_path: string | null = null;
      let attachment_type: string | null = null;

      if (file && user) {
        const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('bug-attachments')
          .upload(path, file, { contentType: file.type, upsert: false });
        if (upErr) throw upErr;
        attachment_path = path;
        attachment_type = file.type;
      }

      const { error } = await supabase.from('bug_reports').insert({
        user_id: user?.id ?? null,
        user_email: user?.email ?? null,
        message: text,
        context: initialContext || null,
        route: typeof window !== 'undefined' ? window.location.pathname : null,
        attachment_path,
        attachment_type,
      });
      if (error) throw error;
      toast.success('Relato enviado! Obrigado por ajudar a melhorar A Árvore dos Mundos.');
      setOpen(false);
      clearFile();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      toast.error(`Não foi possível enviar agora: ${msg}`);
    } finally {
      setSaving(false);
    }
  };

  const defaultTrigger = (
    <button
      type="button"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-montserrat font-bold uppercase tracking-wider border border-red-alert/40 text-red-alert hover:bg-red-alert/10 transition-colors"
    >
      <Bug className="w-3 h-3" />
      Reportar problema
    </button>
  );

  const isVideo = file?.type.startsWith('video/');

  return (
    <>
      <span onClick={() => setOpen(true)} className="inline-flex">
        {trigger ?? defaultTrigger}
      </span>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          className="sm:max-w-md border-gold-bronze/40"
          style={{
            background: 'linear-gradient(135deg, hsl(214 60% 5%) 0%, hsl(214 65% 7%) 100%)',
          }}
        >
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-cinzel text-foreground">
              <Bug className="w-5 h-5 text-gold-champagne" strokeWidth={1.75} />
              Reportar problema
            </DialogTitle>
            <DialogDescription className="font-amiri text-text-secondary">
              Conte o que aconteceu — quanto mais detalhes (o que tentou fazer, em qual aba, o que apareceu na tela), mais rápido conseguimos resolver.
            </DialogDescription>
          </DialogHeader>

          {initialContext && (
            <div className="rounded-md bg-red-alert/5 border border-red-alert/20 p-2.5">
              <span className="block text-[10px] font-montserrat uppercase tracking-wider text-red-alert/80 mb-1">
                Contexto técnico anexado
              </span>
              <code className="block text-[11px] text-text-secondary font-mono whitespace-pre-wrap break-words max-h-24 overflow-auto">
                {initialContext}
              </code>
            </div>
          )}

          <div className="space-y-1">
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Ex: Tentei gerar uma imagem na aba Galeria e apareceu uma mensagem de erro. Estava usando o Chrome no notebook."
              rows={5}
              maxLength={4000}
              className="bg-[hsl(214_70%_3%)] border-gold-bronze/30 text-foreground font-amiri placeholder:italic placeholder:text-text-dim/70 focus-visible:ring-gold-champagne/40 resize-y"
            />
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-text-dim font-montserrat">{message.length}/4000</span>
              {!user && (
                <span className="text-[10px] text-gold-champagne/80 font-montserrat italic">
                  Faça login para que possamos responder você.
                </span>
              )}
            </div>
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              className="hidden"
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            {!file ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={!user}
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md border border-dashed border-gold-bronze/40 text-text-secondary hover:text-foreground hover:border-gold-champagne/60 transition-colors text-[11px] font-montserrat uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed"
                title={user ? 'Anexar imagem ou vídeo (máx. 20 MB)' : 'Faça login para anexar arquivos'}
              >
                <Paperclip className="w-3.5 h-3.5" />
                Anexar imagem ou vídeo
              </button>
            ) : (
              <div className="rounded-md border border-gold-bronze/30 bg-[rgba(4,12,24,0.6)] p-2 flex items-center gap-3">
                {isVideo ? (
                  <video src={previewUrl ?? undefined} className="w-20 h-20 rounded object-cover bg-black" muted />
                ) : (
                  <img src={previewUrl ?? ''} alt="prévia" className="w-20 h-20 rounded object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[11px] text-foreground font-montserrat truncate">
                    {isVideo ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />}
                    <span className="truncate">{file.name}</span>
                  </div>
                  <div className="text-[10px] text-text-dim font-montserrat">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </div>
                </div>
                <button
                  type="button"
                  onClick={clearFile}
                  className="w-7 h-7 rounded-full text-text-dim hover:text-red-alert hover:bg-red-alert/10 flex items-center justify-center"
                  aria-label="Remover anexo"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="border-border text-text-secondary hover:text-foreground"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={saving}
              className="text-[#1a0f00] font-montserrat font-bold uppercase tracking-wider text-xs hover:-translate-y-0.5 transition-transform disabled:translate-y-0"
              style={{
                background:
                  'linear-gradient(135deg, hsl(42 55% 90%) 0%, hsl(40 50% 78%) 35%, hsl(34 42% 58%) 100%)',
                boxShadow:
                  '0 6px 22px hsl(34 42% 35% / 0.45), inset 0 1px 0 hsl(42 60% 96% / 0.6)',
              }}
            >
              {saving ? 'Enviando…' : 'Enviar relato'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
