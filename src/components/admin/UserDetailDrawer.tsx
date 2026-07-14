import React, { useEffect, useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Loader2, Crown, User, Calendar, Coins, Sparkles, CreditCard, Bug, Activity, Download, Globe2, BookOpen, ScrollText, Layers, Feather, Wand2, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { downloadCSV, toCSV } from '@/lib/csv';

interface Props {
  userId: string | null;
  onClose: () => void;
  onDeleted?: (userId: string) => void;
}

const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtMoney = (n: number) =>
  Number(n || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const UserDetailDrawer: React.FC<Props> = ({ userId, onClose, onDeleted }) => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0); // 0 idle, 1 first confirm, 2 typed-email confirm
  const [typedEmail, setTypedEmail] = useState('');
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!userId) { setData(null); return; }
    let cancel = false;
    (async () => {
      setLoading(true);
      const { data: res, error } = await supabase.functions.invoke('admin-dashboard', {
        body: { action: 'get_user_detail', user_id: userId },
      });
      if (cancel) return;
      if (error || res?.error) toast.error('Erro ao carregar detalhe: ' + (error?.message || res?.error));
      else setData(res);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [userId]);

  const exportUser = () => {
    if (!data) return;
    const u = data.user;
    const sections: { name: string; rows: any[] }[] = [
      { name: 'subscriptions', rows: data.subscriptions },
      { name: 'payments', rows: data.payments },
      { name: 'ai_usage', rows: data.ai_usage },
      { name: 'bug_reports', rows: data.bug_reports },
    ];
    for (const s of sections) {
      if (!s.rows?.length) continue;
      downloadCSV(`${u.email ?? u.id}__${s.name}.csv`, toCSV(s.rows));
    }
    toast.success('CSVs exportados');
  };

  const resetDelete = () => { setDeleteStep(0); setTypedEmail(''); setDeleting(false); };

  const confirmDelete = async () => {
    if (!data?.user) return;
    const targetEmail = data.user.email ?? '';
    if (typedEmail.trim().toLowerCase() !== targetEmail.toLowerCase()) {
      toast.error('O e-mail digitado não confere.');
      return;
    }
    setDeleting(true);
    const { data: res, error } = await supabase.functions.invoke('admin-dashboard', {
      body: { action: 'delete_user', user_id: data.user.id, confirm_email: typedEmail.trim() },
    });
    if (error || res?.error) {
      toast.error('Erro ao excluir: ' + (error?.message || res?.error));
      setDeleting(false);
      return;
    }
    toast.success(`Conta ${targetEmail} excluída.`);
    const deletedId = data.user.id;
    resetDelete();
    onDeleted?.(deletedId);
    onClose();
  };

  return (
    <Sheet open={!!userId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-gradient-to-b from-[#0a1426] to-[#02070d] border-l-gold/30">
        <SheetHeader>
          <SheetTitle className="font-cinzel text-gold flex items-center gap-2">
            <User className="w-4 h-4" /> Detalhes do usuário
          </SheetTitle>
          <SheetDescription className="font-merriweather italic text-text-dim">
            Histórico completo de assinatura, IA, gotas e bugs.
          </SheetDescription>
        </SheetHeader>

        {loading || !data ? (
          <div className="py-20 text-center text-text-dim text-sm">
            <Loader2 className="w-5 h-5 animate-spin inline mr-2" /> Carregando…
          </div>
        ) : (
          <div className="space-y-5 mt-5">
            {/* Header */}
            <div className="card-glass rounded-lg p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    {data.user.is_admin && <Crown className="w-3.5 h-3.5 text-gold" />}
                    <span className="font-cinzel text-foreground text-base truncate">{data.user.email}</span>
                  </div>
                  {data.user.display_name && <p className="text-xs text-text-secondary mt-0.5">{data.user.display_name}</p>}
                  {data.user.cpf_cnpj && <p className="text-[10px] text-text-dim font-mono">{data.user.cpf_cnpj}</p>}
                  <div className="flex gap-3 mt-2 text-[10px] text-text-dim font-montserrat">
                    <span><Calendar className="w-3 h-3 inline mr-1" /> Criado {fmtDate(data.user.created_at)}</span>
                    <span><Activity className="w-3 h-3 inline mr-1" /> Último login {fmtDate(data.user.last_sign_in_at)}</span>
                  </div>
                </div>
                <Button size="sm" variant="outline" onClick={exportUser} className="border-gold/40 text-gold hover:bg-gold/10 shrink-0">
                  <Download className="w-3 h-3 mr-1" /> CSV
                </Button>
              </div>
              <div className="mt-3 flex items-center gap-2 p-2 rounded border border-gold/30 bg-gold/5">
                <Coins className="w-4 h-4 text-gold" />
                <span className="font-cinzel text-gold text-lg">{data.balance.bonus_drops ?? 0}</span>
                <span className="text-[10px] text-text-dim font-montserrat uppercase">gotas bônus</span>
              </div>
            </div>

            {/* Content stats */}
            {data.content_stats && (
              <Section icon={<Layers className="w-3.5 h-3.5" />} title="Resumo de uso e conteúdo">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <Stat icon={<Globe2 className="w-3.5 h-3.5" />} label="Mundos" value={data.content_stats.worlds} />
                  <Stat icon={<BookOpen className="w-3.5 h-3.5" />} label="Códex (fichas/artigos)" value={data.content_stats.codex_entries} />
                  <Stat icon={<ScrollText className="w-3.5 h-3.5" />} label="Manuscritos" value={data.content_stats.manuscripts} />
                  <Stat icon={<FileText className="w-3.5 h-3.5" />} label="Capítulos" value={data.content_stats.chapters} />
                  <Stat icon={<Feather className="w-3.5 h-3.5" />} label="Palavras escritas" value={(data.content_stats.total_words ?? 0).toLocaleString('pt-BR')} />
                  <Stat icon={<Layers className="w-3.5 h-3.5" />} label="Arcos (storylines)" value={data.content_stats.storylines} />
                  <Stat icon={<Layers className="w-3.5 h-3.5" />} label="Cards do Mural" value={data.content_stats.storyline_cards} />
                  <Stat icon={<Feather className="w-3.5 h-3.5" />} label="Escrita Livre" value={data.content_stats.free_writings} />
                  <Stat icon={<Wand2 className="w-3.5 h-3.5" />} label="Visões de Idriel" value={data.content_stats.idriel_visions} />
                  <Stat icon={<Sparkles className="w-3.5 h-3.5" />} label="Análises de Mundo" value={data.content_stats.world_analyses} />
                  <Stat icon={<FileText className="w-3.5 h-3.5" />} label="Importações Idriel" value={data.content_stats.idriel_imports} />
                  <Stat icon={<Activity className="w-3.5 h-3.5" />} label="Cenas" value={data.content_stats.scenes} />
                </div>
              </Section>
            )}

            {/* Worlds list */}
            {data.worlds && data.worlds.length > 0 && (
              <Section icon={<Globe2 className="w-3.5 h-3.5" />} title={`Mundos (${data.worlds.length}${data.content_stats?.worlds > data.worlds.length ? ` de ${data.content_stats.worlds}` : ''})`}>
                <div className="space-y-1.5 max-h-[220px] overflow-y-auto">
                  {data.worlds.map((w: any) => (
                    <div key={w.id} className="flex items-center justify-between gap-2 p-2 rounded border border-blue-bright/15 text-xs">
                      <span className="text-foreground font-cinzel truncate">{w.name || 'Sem nome'}</span>
                      <span className="text-[10px] text-text-dim shrink-0">Atualizado {fmtDate(w.updated_at)}</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {/* Subscriptions */}
            <Section icon={<Sparkles className="w-3.5 h-3.5" />} title={`Histórico de assinaturas (${data.subscriptions.length})`}>
              {data.subscriptions.length === 0 ? <Empty /> : (
                <div className="space-y-1.5">
                  {data.subscriptions.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 p-2 rounded border border-blue-bright/15 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-[10px] border-gold/30 text-gold">{s.plan_code ?? s.plan}</Badge>
                          <Badge variant="outline" className={`text-[10px] ${s.status === 'active' ? 'border-emerald-500/40 text-emerald-400' : 'border-text-dim/30 text-text-dim'}`}>{s.status}</Badge>
                          {s.billing_cycle && <span className="text-[10px] text-text-dim">{s.billing_cycle}</span>}
                        </div>
                        <div className="text-[10px] text-text-dim mt-0.5">
                          Início {fmtDate(s.started_at)} · Expira {s.expires_at ? fmtDate(s.expires_at) : '—'}
                          {s.cancelled_at && ` · Cancelado ${fmtDate(s.cancelled_at)}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* AI Usage */}
            <Section icon={<Activity className="w-3.5 h-3.5" />} title={`Uso de IA por mês (${data.ai_usage.length})`}>
              {data.ai_usage.length === 0 ? <Empty /> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="text-[10px] text-text-dim uppercase tracking-wider">
                      <th className="text-left py-1">Mês</th><th className="text-right">Texto</th><th className="text-right">Imagem</th><th className="text-right">Créditos</th>
                    </tr></thead>
                    <tbody>
                      {data.ai_usage.map((u: any) => (
                        <tr key={u.id} className="border-t border-blue-bright/10">
                          <td className="py-1.5 text-foreground font-mono">{u.month}</td>
                          <td className="text-right text-text-secondary">{u.text_count}</td>
                          <td className="text-right text-text-secondary">{u.image_count}</td>
                          <td className="text-right text-gold">{u.text_count + u.image_count * 5}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Section>

            {/* Payments / Recharges */}
            <Section icon={<CreditCard className="w-3.5 h-3.5" />} title={`Pagamentos e recargas (${data.payments.length})`}>
              {data.payments.length === 0 ? <Empty /> : (
                <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                  {data.payments.map((p: any) => (
                    <div key={p.id} className="flex items-center justify-between gap-2 p-2 rounded border border-blue-bright/15 text-xs">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={`text-[10px] ${p.kind === 'recharge' ? 'border-gold/30 text-gold' : 'border-blue-bright/30 text-blue-bright'}`}>{p.kind ?? '—'}</Badge>
                          <span className="text-foreground font-mono">{p.plan_code ?? ''}</span>
                          {p.drops ? <span className="text-[10px] text-gold">+{p.drops} gotas</span> : null}
                        </div>
                        <div className="text-[10px] text-text-dim mt-0.5">{p.status} · {fmtDate(p.paid_at ?? p.created_at)}</div>
                      </div>
                      <span className="text-sm text-foreground font-montserrat font-bold whitespace-nowrap">{fmtMoney(Number(p.amount))}</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>

            {/* Bug reports */}
            <Section icon={<Bug className="w-3.5 h-3.5" />} title={`Bugs recentes (${data.bug_reports.length})`}>
              {data.bug_reports.length === 0 ? <Empty /> : (
                <div className="space-y-1.5">
                  {data.bug_reports.map((b: any) => (
                    <div key={b.id} className="p-2 rounded border border-blue-bright/15 text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-[10px]">{b.status}</Badge>
                        <span className="text-[10px] text-text-dim">{fmtDate(b.created_at)}</span>
                        {b.route && <span className="text-[10px] text-text-dim font-mono truncate">{b.route}</span>}
                      </div>
                      <p className="text-foreground font-merriweather line-clamp-3">{b.message}</p>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const Section: React.FC<{ icon: React.ReactNode; title: string; children: React.ReactNode }> = ({ icon, title, children }) => (
  <div className="card-glass rounded-lg p-3">
    <h3 className="font-montserrat font-bold text-xs uppercase tracking-wider text-gold mb-2 flex items-center gap-1.5">
      {icon} {title}
    </h3>
    {children}
  </div>
);

const Empty = () => <p className="text-text-dim text-xs italic font-merriweather">Nenhum registro.</p>;

const Stat: React.FC<{ icon: React.ReactNode; label: string; value: React.ReactNode }> = ({ icon, label, value }) => (
  <div className="p-2 rounded border border-blue-bright/15 bg-blue-bright/5">
    <div className="flex items-center gap-1.5 text-[10px] text-text-dim font-montserrat uppercase tracking-wider">
      {icon} {label}
    </div>
    <div className="font-cinzel text-gold text-lg mt-0.5">{value ?? 0}</div>
  </div>
);
