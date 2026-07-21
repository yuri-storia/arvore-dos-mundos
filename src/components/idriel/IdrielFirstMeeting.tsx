import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import idrielAvatar from '@/assets/idriel-avatar.webp';
import idrielVideo from '@/assets/idriel-animated.mp4.asset.json';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

/**
 * Primeiro encontro com Idriel — abre uma única vez por usuário
 * (marca `profiles.idriel_intro_done = true`). Captura como o criador
 * quer ser chamado e a motivação que o trouxe à Árvore.
 */
export const IdrielFirstMeeting: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [name, setName] = useState('');
  const [intro, setIntro] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('display_name, idriel_intro_done')
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (data && !data.idriel_intro_done) {
        if (data.display_name) setName(data.display_name);
        setOpen(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  const finish = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: name.trim() || null,
        idriel_intro: intro.trim() || null,
        idriel_intro_done: true,
      })
      .eq('user_id', user.id);
    setSaving(false);
    if (error) {
      toast.error('Não consegui guardar sua fala. Tente de novo.');
      return;
    }
    setOpen(false);
    toast.success('A Árvore agora te reconhece pelo nome. 🌿');
  };

  return (
    <Dialog open={open} onOpenChange={() => { /* only closes via finish */ }}>
      <DialogContent
        className="max-w-[min(94vw,560px)] max-h-[92vh] overflow-y-auto border-gold-bronze/40 p-0 [&>button]:hidden"
        style={{
          background:
            'radial-gradient(120% 60% at 80% 0%, hsl(34 50% 14% / 0.55) 0%, transparent 55%), linear-gradient(180deg, hsl(220 60% 4%) 0%, hsl(220 70% 2.5%) 100%)',
        }}
      >
        {/* Hero — retrato completo de Idriel, sem cortar o rosto */}
        <div
          className="relative w-full overflow-hidden border-b border-gold-bronze/30"
          style={{
            aspectRatio: '4 / 3',
            maxHeight: 'min(52vh, 420px)',
            background: 'radial-gradient(ellipse at 50% 30%, hsl(220 60% 8%) 0%, hsl(220 80% 2%) 100%)',
          }}
        >
          <video
            src={idrielVideo.url}
            poster={idrielAvatar}
            autoPlay muted loop playsInline preload="metadata"
            className="absolute inset-0 w-full h-full object-contain sm:object-cover"
            style={{ objectPosition: 'center 20%' }}
          />
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'linear-gradient(to bottom, transparent 55%, hsl(220 80% 2% / 0.85) 92%, hsl(220 80% 2%) 100%)' }}
          />
          <div className="absolute bottom-3 left-4 right-4">
            <p className="font-montserrat uppercase tracking-[0.28em] text-[9px] text-gold-champagne/80 mb-1 flex items-center gap-1.5">
              <Sparkles className="w-3 h-3" /> Primeiro encontro
            </p>
            <DialogTitle className="font-cinzel font-bold text-2xl bg-gradient-to-r from-[hsl(46_95%_85%)] via-[hsl(42_90%_70%)] to-[hsl(34_80%_55%)] bg-clip-text text-transparent">
              Idriel
            </DialogTitle>
            <DialogDescription className="font-amiri italic text-xs text-text-secondary mt-0.5">
              Guardiã da Árvore dos Mundos
            </DialogDescription>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-5">
          {step === 0 && (
            <div className="space-y-4 animate-fade-in">
              <p className="font-amiri text-[15px] leading-relaxed text-foreground">
                Sente-se entre as raízes, viajante. Sou <span className="text-gold-champagne font-semibold">Idriel</span>,
                élfica imortal e guardiã desta Árvore. Cada galho aqui é um mundo que alguém como você teve coragem de sonhar.
              </p>
              <p className="font-amiri text-[15px] leading-relaxed text-text-secondary">
                Antes de começarmos, preciso te conhecer um pouco. A caneta continuará sendo sua — eu só ajudo a enxergar
                caminhos, faíscas e possibilidades.
              </p>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)} className="bg-gradient-to-r from-[hsl(46_95%_78%)] via-[hsl(42_90%_62%)] to-[hsl(34_80%_48%)] text-[#1a0f00] font-cinzel">
                  Vamos, Idriel
                </Button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <p className="font-amiri text-[15px] leading-relaxed text-foreground">
                Como você gostaria que eu te chamasse? Um nome, um apelido, um título — o que soar como você.
              </p>
              <Input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Yuri, criadora, viajante das marés…"
                maxLength={60}
                className="bg-black/30 border-gold-bronze/40"
              />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(0)}>Voltar</Button>
                <Button
                  disabled={!name.trim()}
                  onClick={() => setStep(2)}
                  className="bg-gradient-to-r from-[hsl(46_95%_78%)] via-[hsl(42_90%_62%)] to-[hsl(34_80%_48%)] text-[#1a0f00] font-cinzel disabled:opacity-40"
                >
                  Continuar
                </Button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <p className="font-amiri text-[15px] leading-relaxed text-foreground">
                {name.trim() ? `${name.trim()}, ` : ''}me diga em poucas palavras: <span className="text-gold-champagne">o que te trouxe até a Árvore?</span>{' '}
                Uma ideia que não te larga, uma saudade, um sonho antigo? Vou guardar essa fala para lembrar de você quando conversarmos.
              </p>
              <Textarea
                autoFocus
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                placeholder="Ex.: Quero escrever a saga de um reino que meu irmão inventou quando éramos crianças…"
                maxLength={400}
                rows={4}
                className="bg-black/30 border-gold-bronze/40 font-amiri"
              />
              <div className="flex justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} disabled={saving}>Voltar</Button>
                <Button
                  onClick={finish}
                  disabled={saving}
                  className="bg-gradient-to-r from-[hsl(46_95%_78%)] via-[hsl(42_90%_62%)] to-[hsl(34_80%_48%)] text-[#1a0f00] font-cinzel"
                >
                  {saving ? 'Guardando…' : 'A Árvore ouviu'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default IdrielFirstMeeting;
