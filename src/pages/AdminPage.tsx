import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { ConfirmDialog } from '@/components/ConfirmDialog';

interface AllowedEmail {
  id: string;
  email: string;
  created_at: string;
}

const AdminPage: React.FC = () => {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) {
      navigate('/');
      return;
    }
    fetchEmails();
  }, [isAdmin, navigate]);

  const fetchEmails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('allowed_emails')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error && data) setEmails(data);
    setLoading(false);
  };

  const handleAdd = async () => {
    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      toast.error('Digite um e-mail válido.');
      return;
    }
    if (emails.some(e => e.email.toLowerCase() === email)) {
      toast.error('Este e-mail já está na lista.');
      return;
    }
    setAdding(true);
    const { error } = await supabase
      .from('allowed_emails')
      .insert({ email, added_by: user?.id });
    if (error) {
      toast.error('Erro ao adicionar e-mail.');
    } else {
      toast.success(`${email} adicionado!`);
      setNewEmail('');
      fetchEmails();
    }
    setAdding(false);
  };

  const handleDelete = async (id: string, email: string) => {
    const { error } = await supabase
      .from('allowed_emails')
      .delete()
      .eq('id', id);
    if (error) {
      toast.error('Erro ao remover.');
    } else {
      toast.success(`${email} removido.`);
      setConfirmDelete(null);
      fetchEmails();
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-[800px] px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-cinzel font-bold text-2xl text-foreground">
              🛡 Painel do Administrador
            </h1>
            <p className="font-merriweather italic text-text-dim text-sm mt-1">
              Gerencie quem pode acessar o template
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('/')}
              className="px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-blue-bright/30 text-text-secondary hover:text-foreground transition-colors"
            >
              ← Voltar
            </button>
            <ConfirmDialog
              trigger={
                <button className="px-3 py-1.5 rounded-md text-xs font-montserrat font-bold uppercase tracking-wider border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors">
                  Sair
                </button>
              }
              title="Sair da conta"
              description="Tem certeza que deseja sair do painel administrativo?"
              confirmLabel="Sim, sair"
              onConfirm={async () => {
                await signOut();
                navigate('/login', { replace: true });
              }}
            />
          </div>
        </div>

        {/* Add email */}
        <div className="card-glass rounded-lg p-5 mb-6">
          <h2 className="font-montserrat font-bold text-sm text-foreground mb-3">
            Adicionar Acesso
          </h2>
          <div className="flex gap-2">
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="email@exemplo.com"
              className="flex-1 bg-[rgba(4,12,24,0.6)] border border-blue-bright/15 rounded-md px-3 py-2 text-sm text-foreground font-merriweather placeholder:italic placeholder:text-text-dim/70 focus:outline-none focus:border-blue-bright/50"
            />
            <button
              onClick={handleAdd}
              disabled={adding}
              className="px-4 py-2 bg-blue-main hover:bg-blue-bright text-foreground rounded-md text-xs font-montserrat font-bold uppercase tracking-wider disabled:opacity-40 transition-colors whitespace-nowrap"
            >
              {adding ? '⏳' : '+ Adicionar'}
            </button>
          </div>
        </div>

        {/* Email list */}
        <div className="card-glass rounded-lg p-5">
          <h2 className="font-montserrat font-bold text-sm text-foreground mb-3">
            E-mails Autorizados ({emails.length})
          </h2>

          {loading ? (
            <p className="text-text-dim text-sm font-merriweather italic py-4">Carregando…</p>
          ) : emails.length === 0 ? (
            <p className="text-text-dim text-sm font-merriweather italic py-4">Nenhum e-mail cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {emails.map(e => (
                <div
                  key={e.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-md border border-blue-bright/15 hover:border-blue-bright/30 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-merriweather text-sm text-foreground block truncate">
                      {e.email}
                    </span>
                    <span className="text-[10px] text-text-dim font-montserrat">
                      Adicionado em {new Date(e.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                  <ConfirmDialog
                    trigger={
                      <button className="px-2 py-1 rounded text-[10px] font-montserrat font-bold text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors">
                        Remover
                      </button>
                    }
                    title="Remover e-mail"
                    description={`Tem certeza que deseja remover "${e.email}" da lista de autorizados?`}
                    confirmLabel="Remover"
                    onConfirm={() => handleDelete(e.id, e.email)}
                  />
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(e.id)}
                        className="px-2 py-1 rounded text-[10px] font-montserrat text-text-dim border border-blue-bright/15 hover:border-destructive/30 hover:text-destructive transition-colors"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Current user info */}
        <div className="mt-6 text-center">
          <p className="text-text-dim text-[11px] font-montserrat">
            Logado como: {user?.email}
          </p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
