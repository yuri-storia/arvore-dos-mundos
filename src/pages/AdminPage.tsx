import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Plus, Shield, ShieldOff, Trash2, RefreshCw, Search, Bug, Users, Mail, Crown, Sparkles, Infinity as InfinityIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

interface AllowedEmail { id: string; email: string; created_at: string; }
interface AdminUser {
  id: string; email: string; created_at: string; last_sign_in_at: string | null;
  is_admin: boolean;
  plan_code: string | null; has_idriel: boolean; sub_status: string | null;
  billing_cycle: string | null; expires_at: string | null;
  bonus_drops: number;
  recharges_count: number; recharge_total: number; lifetime_total: number;
  last_payment_at: string | null;
  ai_text_month: number; ai_image_month: number;
  ai_text_total: number; ai_image_total: number;
}
interface BugReport {
  id: string; user_id: string | null; user_email: string | null; message: string;
  context: string | null; route: string | null; status: string; created_at: string;
}

const PLAN_CODES = [
  { value: 'raiz_mensal', label: 'Raiz Mensal' },
  { value: 'raiz_anual', label: 'Raiz Anual' },
  { value: 'idriel_mensal', label: 'Idriel Mensal' },
  { value: 'idriel_anual', label: 'Idriel Anual' },
  { value: 'raiz_vitalicio', label: 'Raiz Vitalício (gratuito)' },
  { value: 'none', label: 'Cancelar / Sem plano' },
];

const planLabel = (code: string | null) => {
  if (!code) return 'Sem plano';
  return PLAN_CODES.find(p => p.value === code)?.label ?? code;
};

const planTone = (code: string | null) => {
  if (!code) return 'bg-muted/30 text-text-dim border-border';
  if (code === 'raiz_vitalicio') return 'bg-gold/15 text-gold border-gold/40';
  if (code.startsWith('idriel')) return 'bg-gold-warm/15 text-gold-warm border-gold-warm/40';
  return 'bg-blue-bright/15 text-blue-bright border-blue-bright/40';
};

const fmtDate = (s: string | null) => s ? new Date(s).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' }) : '—';
const fmtMoney = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const AdminPage: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('users');

  useEffect(() => {
    if (!isAdmin) navigate('/');
  }, [isAdmin, navigate]);

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[1280px] px-4 py-8">
        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <h1 className="font-cinzel font-bold text-2xl text-foreground flex items-center gap-2">
              <Crown className="w-5 h-5 text-gold" strokeWidth={2} />
              Painel do Administrador
            </h1>
            <p className="font-merriweather italic text-text-dim text-sm mt-1">
              Gestão de usuários, assinaturas e relatórios.
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/')} className="px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-blue-bright/30 text-text-secondary hover:text-foreground transition-colors">
              Voltar
            </button>
            <ConfirmDialog
              trigger={<button className="px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">Sair</button>}
              title="Sair da conta"
              description="Tem certeza que deseja sair do painel administrativo?"
              confirmLabel="Sim, sair"
              onConfirm={async () => { await signOut(); navigate('/login', { replace: true }); }}
            />
          </div>
        </div>

        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-[rgba(4,12,24,0.6)] border border-blue-bright/20">
            <TabsTrigger value="users" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold">
              <Users className="w-3.5 h-3.5 mr-1.5" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="access" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold">
              <Mail className="w-3.5 h-3.5 mr-1.5" /> Acessos
            </TabsTrigger>
            <TabsTrigger value="bugs" className="data-[state=active]:bg-gold/15 data-[state=active]:text-gold">
              <Bug className="w-3.5 h-3.5 mr-1.5" /> Bugs
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users" className="mt-4"><UsersTab callerId={user?.id ?? ''} /></TabsContent>
          <TabsContent value="access" className="mt-4"><AccessTab userId={user?.id ?? ''} /></TabsContent>
          <TabsContent value="bugs" className="mt-4"><BugsTab /></TabsContent>
        </Tabs>

        <p className="text-text-dim text-[11px] font-montserrat text-center mt-6">Logado como: {user?.email}</p>
      </div>
    </div>
  );
};

/* ---------------- Users Tab ---------------- */
const UsersTab: React.FC<{ callerId: string }> = ({ callerId }) => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-dashboard', { body: { action: 'list_users' } });
    if (error || data?.error) toast.error('Erro ao carregar usuários: ' + (error?.message || data?.error));
    else setUsers(data.users ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    let arr = users;
    if (filter !== 'all') {
      if (filter === 'admin') arr = arr.filter(u => u.is_admin);
      else if (filter === 'none') arr = arr.filter(u => !u.plan_code || u.sub_status !== 'active');
      else arr = arr.filter(u => u.plan_code === filter && u.sub_status === 'active');
    }
    if (q.trim()) {
      const s = q.toLowerCase();
      arr = arr.filter(u => u.email?.toLowerCase().includes(s));
    }
    return arr;
  }, [users, q, filter]);

  const stats = useMemo(() => {
    const active = users.filter(u => u.sub_status === 'active');
    return {
      total: users.length,
      raiz_mensal: active.filter(u => u.plan_code === 'raiz_mensal').length,
      raiz_anual: active.filter(u => u.plan_code === 'raiz_anual').length,
      idriel_mensal: active.filter(u => u.plan_code === 'idriel_mensal').length,
      idriel_anual: active.filter(u => u.plan_code === 'idriel_anual').length,
      vitalicio: active.filter(u => u.plan_code === 'raiz_vitalicio').length,
      mrr: active.reduce((acc, u) => {
        if (u.plan_code === 'raiz_mensal') return acc + 19.90;
        if (u.plan_code === 'idriel_mensal') return acc + 39.90;
        if (u.plan_code === 'raiz_anual') return acc + 197 / 12;
        if (u.plan_code === 'idriel_anual') return acc + 397 / 12;
        return acc;
      }, 0),
    };
  }, [users]);

  return (
    <div className="space-y-4">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
        <StatCard label="Total usuários" value={stats.total} tone="blue" />
        <StatCard label="Raiz Mensal" value={stats.raiz_mensal} tone="blue" />
        <StatCard label="Raiz Anual" value={stats.raiz_anual} tone="blue" />
        <StatCard label="Idriel Mensal" value={stats.idriel_mensal} tone="gold" />
        <StatCard label="Idriel Anual" value={stats.idriel_anual} tone="gold" />
        <StatCard label="MRR estimado" value={fmtMoney(stats.mrr)} tone="gold" />
      </div>

      {/* Filters */}
      <div className="card-glass rounded-lg p-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
          <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Buscar por e-mail..." className="pl-8 bg-[rgba(4,12,24,0.6)] border-blue-bright/20" />
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[200px] bg-[rgba(4,12,24,0.6)] border-blue-bright/20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os planos</SelectItem>
            <SelectItem value="raiz_mensal">Raiz Mensal</SelectItem>
            <SelectItem value="raiz_anual">Raiz Anual</SelectItem>
            <SelectItem value="idriel_mensal">Idriel Mensal</SelectItem>
            <SelectItem value="idriel_anual">Idriel Anual</SelectItem>
            <SelectItem value="raiz_vitalicio">Vitalício</SelectItem>
            <SelectItem value="none">Sem plano ativo</SelectItem>
            <SelectItem value="admin">Apenas admins</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-blue-bright/30">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
      </div>

      {/* Table */}
      <div className="card-glass rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-dim text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-dim text-sm font-merriweather italic">Nenhum usuário encontrado.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-blue-bright/20 text-[10px] font-montserrat uppercase tracking-wider text-text-dim">
                  <th className="px-3 py-2 text-left">E-mail</th>
                  <th className="px-3 py-2 text-left">Plano</th>
                  <th className="px-3 py-2 text-right">Gotas</th>
                  <th className="px-3 py-2 text-right">IA mês (T/I)</th>
                  <th className="px-3 py-2 text-right">Recargas</th>
                  <th className="px-3 py-2 text-right">LTV</th>
                  <th className="px-3 py-2 text-left">Último login</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-blue-bright/10 hover:bg-blue-bright/5 transition-colors">
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        {u.is_admin && <Crown className="w-3 h-3 text-gold" />}
                        <span className="font-merriweather text-foreground truncate max-w-[220px]" title={u.email}>{u.email}</span>
                      </div>
                      <span className="text-[10px] text-text-dim">Criado {fmtDate(u.created_at).split(',')[0]}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge variant="outline" className={`text-[10px] ${planTone(u.plan_code)}`}>{planLabel(u.plan_code)}</Badge>
                      {u.expires_at === null && u.plan_code === 'raiz_vitalicio' && <span className="block text-[9px] text-gold mt-0.5">Vitalício</span>}
                      {u.expires_at && <span className="block text-[9px] text-text-dim mt-0.5">até {fmtDate(u.expires_at).split(',')[0]}</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right font-montserrat text-foreground">{u.has_idriel || u.plan_code === 'raiz_vitalicio' ? <InfinityIcon className="w-3.5 h-3.5 inline text-gold" /> : u.bonus_drops}</td>
                    <td className="px-3 py-2.5 text-right text-xs text-text-secondary">{u.ai_text_month}/{u.ai_image_month}<span className="block text-[9px] text-text-dim">total {u.ai_text_total}/{u.ai_image_total}</span></td>
                    <td className="px-3 py-2.5 text-right text-xs text-text-secondary">{u.recharges_count}<span className="block text-[9px] text-text-dim">{fmtMoney(u.recharge_total)}</span></td>
                    <td className="px-3 py-2.5 text-right text-xs text-text-secondary">{fmtMoney(u.lifetime_total)}</td>
                    <td className="px-3 py-2.5 text-xs text-text-dim">{fmtDate(u.last_sign_in_at)}</td>
                    <td className="px-3 py-2.5 text-right"><UserActionsMenu user={u} callerId={callerId} onChanged={load} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: string | number; tone: 'gold' | 'blue' }> = ({ label, value, tone }) => (
  <div className={`rounded-lg p-3 border ${tone === 'gold' ? 'border-gold/30 bg-gold/5' : 'border-blue-bright/20 bg-blue-main/5'}`}>
    <div className="text-[9px] font-montserrat uppercase tracking-wider text-text-dim">{label}</div>
    <div className={`font-cinzel font-bold text-lg ${tone === 'gold' ? 'text-gold' : 'text-blue-bright'}`}>{value}</div>
  </div>
);

const UserActionsMenu: React.FC<{ user: AdminUser; callerId: string; onChanged: () => void }> = ({ user, callerId, onChanged }) => {
  const [open, setOpen] = useState(false);
  const [planCode, setPlanCode] = useState(user.plan_code ?? 'none');
  const [extraDrops, setExtraDrops] = useState('');
  const [busy, setBusy] = useState(false);

  const call = async (body: any) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke('admin-dashboard', { body });
    setBusy(false);
    if (error || data?.error) { toast.error(error?.message || data?.error); return false; }
    return true;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button className="px-2 py-1 rounded text-[10px] font-montserrat font-bold text-gold border border-gold/40 hover:bg-gold/10 transition-colors">
          Gerenciar
        </button>
      </DialogTrigger>
      <DialogContent className="bg-gradient-to-b from-[#0a1426] to-[#02070d] border-gold/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="font-cinzel text-gold flex items-center gap-2"><Sparkles className="w-4 h-4" /> {user.email}</DialogTitle>
          <DialogDescription className="font-merriweather italic text-text-dim">Gerencie acesso e plano deste usuário.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Admin */}
          <div className="flex items-center justify-between p-3 rounded-md border border-blue-bright/20 bg-[rgba(4,12,24,0.6)]">
            <div>
              <div className="text-sm font-montserrat font-bold text-foreground">Acesso administrador</div>
              <div className="text-[10px] text-text-dim">{user.is_admin ? 'Atualmente é admin' : 'Sem privilégios admin'}</div>
            </div>
            {user.is_admin ? (
              <Button size="sm" variant="outline" disabled={busy || user.id === callerId} className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={async () => { if (await call({ action: 'revoke_admin', user_id: user.id })) { toast.success('Admin revogado'); onChanged(); } }}>
                <ShieldOff className="w-3 h-3 mr-1" /> Revogar
              </Button>
            ) : (
              <Button size="sm" className="bg-gradient-to-r from-gold via-gold-warm to-gold-deep text-background hover:opacity-90" disabled={busy} onClick={async () => { if (await call({ action: 'grant_admin', user_id: user.id })) { toast.success('Admin concedido'); onChanged(); } }}>
                <Shield className="w-3 h-3 mr-1" /> Conceder admin
              </Button>
            )}
          </div>

          {/* Plan */}
          <div className="p-3 rounded-md border border-blue-bright/20 bg-[rgba(4,12,24,0.6)]">
            <div className="text-sm font-montserrat font-bold text-foreground mb-2">Alterar plano</div>
            <Select value={planCode} onValueChange={setPlanCode}>
              <SelectTrigger className="bg-background border-blue-bright/30"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PLAN_CODES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <p className="text-[10px] text-text-dim mt-1.5">Vitalício gratuito = acesso Raiz sem expiração, sem cobrança.</p>
            <Button size="sm" className="mt-2 w-full bg-gold/20 hover:bg-gold/30 text-gold border border-gold/40" disabled={busy} onClick={async () => { if (await call({ action: 'set_plan', user_id: user.id, plan_code: planCode })) { toast.success('Plano atualizado'); onChanged(); setOpen(false); } }}>
              Aplicar plano
            </Button>
          </div>

          {/* Drops */}
          <div className="p-3 rounded-md border border-blue-bright/20 bg-[rgba(4,12,24,0.6)]">
            <div className="text-sm font-montserrat font-bold text-foreground mb-2">Adicionar gotas (bônus)</div>
            <div className="flex gap-2">
              <Input type="number" value={extraDrops} onChange={e => setExtraDrops(e.target.value)} placeholder="ex: 50" className="bg-background border-blue-bright/30" />
              <Button size="sm" className="bg-gold/20 text-gold border border-gold/40 hover:bg-gold/30" disabled={busy || !extraDrops} onClick={async () => { const n = parseInt(extraDrops, 10); if (!n) return; if (await call({ action: 'add_drops', user_id: user.id, drops: n })) { toast.success(`+${n} gotas`); setExtraDrops(''); onChanged(); } }}>
                Adicionar
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/* ---------------- Access Tab (original allowed_emails) ---------------- */
const AccessTab: React.FC<{ userId: string }> = ({ userId }) => {
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  const fetchEmails = async () => {
    setLoading(true);
    const { data, error } = await supabase.from('allowed_emails').select('*').order('created_at', { ascending: false });
    if (!error && data) setEmails(data);
    setLoading(false);
  };
  useEffect(() => { fetchEmails(); }, []);

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) { toast.error('Digite um e-mail válido.'); return; }
    if (emails.some(e => e.email.toLowerCase() === email)) { toast.error('Já está na lista.'); return; }
    setAdding(true);
    const { error } = await supabase.from('allowed_emails').insert({ email, added_by: userId });
    if (error) toast.error('Erro ao adicionar.');
    else { toast.success(`${email} adicionado!`); setNewEmail(''); fetchEmails(); }
    setAdding(false);
  };

  const handleDelete = async (id: string, email: string) => {
    const { error } = await supabase.from('allowed_emails').delete().eq('id', id);
    if (error) toast.error('Erro ao remover.');
    else { toast.success(`${email} removido.`); fetchEmails(); }
  };

  return (
    <div className="space-y-4">
      <div className="card-glass rounded-lg p-5">
        <h2 className="font-montserrat font-bold text-sm text-foreground mb-3">Adicionar acesso</h2>
        <div className="flex gap-2">
          <Input type="email" value={newEmail} onChange={e => setNewEmail(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()} placeholder="email@exemplo.com" className="bg-[rgba(4,12,24,0.6)] border-blue-bright/20" />
          <Button onClick={handleAdd} disabled={adding} className="bg-blue-main hover:bg-blue-bright whitespace-nowrap">
            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Plus className="w-3.5 h-3.5 mr-1" />Adicionar</>}
          </Button>
        </div>
      </div>
      <div className="card-glass rounded-lg p-5">
        <h2 className="font-montserrat font-bold text-sm text-foreground mb-3">E-mails autorizados ({emails.length})</h2>
        {loading ? <p className="text-text-dim text-sm italic">Carregando…</p>
          : emails.length === 0 ? <p className="text-text-dim text-sm italic">Nenhum cadastrado.</p>
          : <div className="space-y-2">{emails.map(e => (
              <div key={e.id} className="flex items-center justify-between gap-3 p-3 rounded-md border border-blue-bright/15">
                <div className="min-w-0 flex-1">
                  <span className="font-merriweather text-sm text-foreground block truncate">{e.email}</span>
                  <span className="text-[10px] text-text-dim font-montserrat">Adicionado em {new Date(e.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
                <ConfirmDialog
                  trigger={<button className="px-2 py-1 rounded text-[10px] font-bold text-destructive border border-destructive/30 hover:bg-destructive/10">Remover</button>}
                  title="Remover e-mail" description={`Remover "${e.email}"?`} confirmLabel="Remover"
                  onConfirm={() => handleDelete(e.id, e.email)}
                />
              </div>
            ))}</div>}
      </div>
    </div>
  );
};

/* ---------------- Bugs Tab ---------------- */
const BugsTab: React.FC = () => {
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('open');
  const [selected, setSelected] = useState<BugReport | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('admin-dashboard', { body: { action: 'list_bugs' } });
    if (error || data?.error) toast.error('Erro: ' + (error?.message || data?.error));
    else setBugs(data.bugs ?? []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => filter === 'all' ? bugs : bugs.filter(b => b.status === filter), [bugs, filter]);

  const updateStatus = async (id: string, status: string) => {
    const { data, error } = await supabase.functions.invoke('admin-dashboard', { body: { action: 'update_bug', id, status } });
    if (error || data?.error) toast.error('Erro');
    else { toast.success('Status atualizado'); load(); }
  };

  const remove = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('admin-dashboard', { body: { action: 'delete_bug', id } });
    if (error || data?.error) toast.error('Erro');
    else { toast.success('Removido'); setSelected(null); load(); }
  };

  return (
    <div className="space-y-4">
      <div className="card-glass rounded-lg p-3 flex flex-wrap items-center gap-2">
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px] bg-[rgba(4,12,24,0.6)] border-blue-bright/20"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="open">Abertos</SelectItem>
            <SelectItem value="in_progress">Em análise</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="wont_fix">Não corrigir</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={load} disabled={loading} className="border-blue-bright/30">
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </Button>
        <span className="text-xs text-text-dim ml-auto">{filtered.length} relato(s)</span>
      </div>

      <div className="card-glass rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-text-dim text-sm"><Loader2 className="w-4 h-4 animate-spin inline mr-2" /> Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-text-dim text-sm italic">Nenhum relato.</div>
        ) : (
          <div className="divide-y divide-blue-bright/10">
            {filtered.map(b => (
              <button key={b.id} onClick={() => setSelected(b)} className="w-full text-left p-4 hover:bg-blue-bright/5 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className={`text-[10px] ${
                        b.status === 'open' ? 'border-gold/40 text-gold bg-gold/10' :
                        b.status === 'resolved' ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/10' :
                        b.status === 'wont_fix' ? 'border-destructive/40 text-destructive bg-destructive/10' :
                        'border-blue-bright/40 text-blue-bright bg-blue-bright/10'
                      }`}>{b.status}</Badge>
                      <span className="text-[10px] text-text-dim font-montserrat">{b.user_email ?? 'anônimo'}</span>
                      {b.route && <span className="text-[10px] text-text-dim font-mono">{b.route}</span>}
                    </div>
                    <p className="font-merriweather text-sm text-foreground line-clamp-2">{b.message}</p>
                  </div>
                  <span className="text-[10px] text-text-dim whitespace-nowrap">{fmtDate(b.created_at)}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="bg-gradient-to-b from-[#0a1426] to-[#02070d] border-gold/30 max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="font-cinzel text-gold flex items-center gap-2"><Bug className="w-4 h-4" /> Relato de bug</DialogTitle>
                <DialogDescription className="font-merriweather italic text-text-dim">
                  {selected.user_email ?? 'anônimo'} · {fmtDate(selected.created_at)} {selected.route && `· ${selected.route}`}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] font-montserrat uppercase text-text-dim mb-1">Mensagem</div>
                  <div className="p-3 rounded border border-blue-bright/20 bg-[rgba(4,12,24,0.6)] text-sm text-foreground font-merriweather whitespace-pre-wrap">{selected.message}</div>
                </div>
                {selected.context && (
                  <div>
                    <div className="text-[10px] font-montserrat uppercase text-text-dim mb-1">Contexto técnico</div>
                    <div className="p-3 rounded border border-blue-bright/20 bg-[rgba(4,12,24,0.6)] text-[11px] text-text-secondary font-mono whitespace-pre-wrap max-h-[200px] overflow-auto">{selected.context}</div>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <Select value={selected.status} onValueChange={(v) => updateStatus(selected.id, v)}>
                    <SelectTrigger className="w-[180px] bg-background border-blue-bright/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="open">Aberto</SelectItem>
                      <SelectItem value="in_progress">Em análise</SelectItem>
                      <SelectItem value="resolved">Resolvido</SelectItem>
                      <SelectItem value="wont_fix">Não corrigir</SelectItem>
                    </SelectContent>
                  </Select>
                  <ConfirmDialog
                    trigger={<Button variant="outline" size="sm" className="border-destructive/40 text-destructive hover:bg-destructive/10"><Trash2 className="w-3 h-3 mr-1" /> Excluir</Button>}
                    title="Excluir relato" description="Esta ação é permanente." confirmLabel="Excluir"
                    onConfirm={() => remove(selected.id)}
                  />
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminPage;
