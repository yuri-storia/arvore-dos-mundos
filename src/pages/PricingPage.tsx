import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, X, Sparkles, ArrowLeft, Crown, Zap, Leaf, Sprout } from 'lucide-react';
import { openCheckout, STRIPE_PLANS, PLANS } from '@/hooks/useSubscription';
import { useSubscription } from '@/hooks/useSubscription';
import idrielAvatar from '@/assets/idriel-avatar.png';

const PricingPage: React.FC = () => {
  const navigate = useNavigate();
  const sub = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [billingCycle, setBillingCycle] = useState<'mensal' | 'anual'>('anual');

  const handleCheckout = async (plan: string) => {
    setLoading(plan);
    try {
      await openCheckout(plan);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(null);
    }
  };

  const tiers = [
    {
      id: 'semente',
      name: '🌱 Semente',
      tagline: 'Plante sua primeira semente',
      price: 'Grátis',
      priceDetail: 'Para sempre',
      icon: Sprout,
      accent: 'border-emerald-500/30',
      accentBg: 'bg-emerald-500/[0.06]',
      accentText: 'text-emerald-400',
      accentGlow: '',
      cta: 'Começar Grátis',
      ctaClass: 'bg-emerald-600 hover:bg-emerald-500 text-white',
      ctaAction: () => navigate('/'),
      popular: false,
    },
    {
      id: 'raiz',
      name: '🌿 Raiz',
      tagline: 'Crie mundos sem limites',
      price: 'R$ 87',
      priceDetail: '/ano (~R$ 7,25/mês)',
      icon: Leaf,
      accent: 'border-blue-bright/30',
      accentBg: 'bg-blue-bright/[0.06]',
      accentText: 'text-blue-light',
      accentGlow: '',
      cta: 'Assinar Raiz',
      ctaClass: 'bg-[hsl(var(--blue-main))] hover:bg-[hsl(var(--blue-bright))] text-foreground',
      ctaAction: () => handleCheckout(STRIPE_PLANS.template_anual.price_id),
      popular: false,
    },
    {
      id: 'idriel',
      name: '✨ Idriel',
      tagline: 'A Árvore responde ao seu chamado',
      price: billingCycle === 'mensal' ? 'R$ 39,90' : 'R$ 399',
      priceDetail: billingCycle === 'mensal' ? '/mês' : '/ano (~17% off)',
      icon: Crown,
      accent: 'border-gold/40',
      accentBg: '',
      accentText: 'text-gold-light',
      accentGlow: 'shadow-[0_0_40px_rgba(218,165,32,0.15)]',
      cta: billingCycle === 'mensal' ? 'Assinar Idriel Mensal' : 'Assinar Idriel Anual',
      ctaClass: 'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] hover:from-[hsl(var(--idriel-light))] hover:to-[hsl(var(--gold))] text-[#1a0f00] font-bold',
      ctaAction: () => handleCheckout(billingCycle === 'mensal' ? STRIPE_PLANS.idriel_mensal.price_id : PLANS.idriel_anual.id),
      popular: true,
    },
  ];

  const features = [
    { label: 'Mundos', semente: '1', raiz: 'Ilimitados', idriel: 'Ilimitados' },
    { label: 'Fichas no Codex', semente: '5', raiz: 'Ilimitadas', idriel: 'Ilimitadas' },
    { label: 'Artigos no Codex', semente: '1', raiz: 'Ilimitados', idriel: 'Ilimitados' },
    { label: 'Manuscrito & Cenas', semente: true, raiz: true, idriel: true },
    { label: 'Escrita Livre', semente: true, raiz: true, idriel: true },
    { label: 'Kanban de Cenas', semente: true, raiz: true, idriel: true },
    { label: '11 Frutos de Worldbuilding', semente: true, raiz: true, idriel: true },
    { label: 'Galeria de Referências', semente: true, raiz: true, idriel: true },
    { label: 'Timer Pomodoro', semente: true, raiz: true, idriel: true },
    { label: 'Exportação PDF', semente: false, raiz: true, idriel: true },
    { label: 'Exportação Word (.docx)', semente: false, raiz: true, idriel: true },
    { label: 'Exportação Kindle/E-book', semente: false, raiz: true, idriel: true },
    { label: 'Importar entre mundos', semente: false, raiz: true, idriel: true },
    { label: 'Assistente IA (Idriel)', semente: false, raiz: false, idriel: true },
    { label: 'Geração de Imagens IA', semente: false, raiz: false, idriel: true },
    { label: 'Geração de Mapas IA', semente: false, raiz: false, idriel: true },
    { label: 'Análise de Mundo IA', semente: false, raiz: false, idriel: true },
    { label: '100 gotas de Seiva/mês', semente: false, raiz: false, idriel: true },
    { label: 'Imagens em qualidade máxima (Gemini 3 Pro)', semente: false, raiz: false, idriel: true },
    { label: 'Recargas avulsas (a partir de R$ 4,90)', semente: false, raiz: false, idriel: true },
  ];

  const competitors = [
    { name: 'ChatGPT Plus', price: 'R$ 104/mês', icon: '🤖', features: ['Texto IA', 'Sem worldbuilding', 'Sem geração de imagens', 'Sem organização'] },
    { name: 'Midjourney', price: 'R$ 55/mês', icon: '🎨', features: ['Imagens IA', 'Sem texto IA', 'Sem worldbuilding', 'Sem manuscritos'] },
    { name: 'World Anvil', price: 'R$ 115/mês', icon: '🗺️', features: ['Worldbuilding', 'Sem IA', 'Interface complexa', 'Em inglês'] },
    { name: 'Notion AI', price: 'R$ 55/mês', icon: '📝', features: ['Notas + IA', 'Sem worldbuilding', 'Sem imagens', 'Genérico'] },
  ];

  const renderCellValue = (val: boolean | string) => {
    if (typeof val === 'string') return <span className="font-montserrat font-bold text-xs">{val}</span>;
    return val
      ? <Check className="w-4 h-4 text-emerald-400 mx-auto" />
      : <X className="w-4 h-4 text-muted-foreground/30 mx-auto" />;
  };

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background effects */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ background: '#02070d' }} />
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-[200px] left-1/2 -translate-x-1/2 w-[140%] h-[600px]" style={{ background: 'radial-gradient(ellipse 80% 100% at 50% 0%, rgba(200,146,42,0.06) 0%, transparent 60%)', filter: 'blur(80px)' }} />
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Back button */}
        <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-text-dim hover:text-foreground transition-colors mb-8 font-montserrat text-sm">
          <ArrowLeft className="w-4 h-4" />
          Voltar à Árvore
        </button>

        {/* Hero */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-3 mb-4">
            <img src={idrielAvatar} alt="Idriel" className="w-12 h-12 rounded-full border-2 border-gold/40 shadow-[0_0_20px_rgba(218,165,32,0.3)]" />
          </div>
          <h1 className="font-cinzel font-bold text-3xl sm:text-4xl md:text-5xl text-foreground mb-3">
            Escolha seu <span className="text-gold-light">Caminho</span>
          </h1>
          <p className="font-merriweather italic text-text-secondary text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Da semente à Árvore plena — cada jornada começa com um passo. 
            Quanto mais Seiva flui, mais poderosa se torna a criação.
          </p>
        </div>

        {/* Billing toggle for Idriel */}
        <div className="flex items-center justify-center gap-3 mb-10">
          <button
            onClick={() => setBillingCycle('mensal')}
            className={`px-4 py-2 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider transition-all ${
              billingCycle === 'mensal'
                ? 'bg-gold/20 text-gold-light border border-gold/40'
                : 'text-text-dim border border-border hover:border-gold/20'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setBillingCycle('anual')}
            className={`px-4 py-2 rounded-full text-xs font-montserrat font-bold uppercase tracking-wider transition-all relative ${
              billingCycle === 'anual'
                ? 'bg-gold/20 text-gold-light border border-gold/40'
                : 'text-text-dim border border-border hover:border-gold/20'
            }`}
          >
            Anual
            <span className="absolute -top-2 -right-2 px-1.5 py-0.5 bg-emerald-500 text-[8px] text-white rounded-full font-bold">
              -22%
            </span>
          </button>
        </div>

        {/* Pricing cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-16">
          {tiers.map(tier => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-6 transition-all ${tier.accent} ${tier.accentBg} ${tier.accentGlow} ${
                tier.popular
                  ? 'md:-mt-4 md:mb-0 md:pb-8'
                  : ''
              }`}
              style={tier.popular ? { background: 'linear-gradient(180deg, rgba(200,146,42,0.08) 0%, rgba(200,146,42,0.02) 100%)' } : {}}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[10px] font-montserrat font-bold uppercase tracking-widest text-[#1a0f00]">
                  ✨ Mais Popular
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className={`font-cinzel font-bold text-xl mb-1 ${tier.accentText}`}>{tier.name}</h3>
                <p className="font-merriweather italic text-text-dim text-xs mb-4">{tier.tagline}</p>
                <div className="flex items-baseline justify-center gap-1">
                  <span className={`font-montserrat font-bold text-3xl ${tier.accentText}`}>{tier.price}</span>
                  <span className="text-text-dim text-xs font-montserrat">{tier.priceDetail}</span>
                </div>
              </div>

              <button
                onClick={tier.ctaAction}
                disabled={!!loading}
                className={`w-full py-3 rounded-xl text-sm font-montserrat font-bold uppercase tracking-wider transition-all mb-6 ${tier.ctaClass}`}
              >
                {tier.cta}
              </button>

              {/* Key highlights */}
              <ul className="space-y-2.5">
                {features.slice(0, tier.id === 'idriel' ? 19 : tier.id === 'raiz' ? 13 : 9).map(f => {
                  const val = f[tier.id as 'semente' | 'raiz' | 'idriel'];
                  if (val === false) return null;
                  return (
                    <li key={f.label} className="flex items-center gap-2 text-xs">
                      <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      <span className="text-foreground/80 font-montserrat">
                        {typeof val === 'string' ? `${f.label}: ${val}` : f.label}
                      </span>
                    </li>
                  );
                })}
                {/* Show what's missing */}
                {features.filter(f => f[tier.id as 'semente' | 'raiz' | 'idriel'] === false).slice(0, 3).map(f => (
                  <li key={f.label} className="flex items-center gap-2 text-xs opacity-40">
                    <X className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-montserrat line-through">{f.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Recharge packages */}
        <div className="rounded-2xl border border-gold/20 p-6 mb-16" style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.06) 0%, rgba(200,146,42,0.02) 100%)' }}>
          <div className="text-center mb-5">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Zap className="w-5 h-5 text-gold-light" />
              <span className="font-cinzel font-bold text-lg text-gold-light">Pacotes de Seiva Dourada</span>
            </div>
            <p className="font-merriweather italic text-text-dim text-sm max-w-xl mx-auto">
              Acabou a Seiva mensal? Recarregue avulso — sem assinar nada. Quanto mais gotas, mais barato fica cada uma.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[
              { drops: 15, price: 'R$ 4,90', perDrop: '0,33', id: 'recarga_15', badge: null },
              { drops: 25, price: 'R$ 7,90', perDrop: '0,32', id: 'recarga_25', badge: null },
              { drops: 50, price: 'R$ 14,90', perDrop: '0,30', id: 'recarga_50', badge: null },
              { drops: 100, price: 'R$ 27,90', perDrop: '0,28', id: 'recarga_100', badge: 'Popular' },
              { drops: 200, price: 'R$ 54,90', perDrop: '0,27', id: 'recarga_200', badge: 'Melhor valor' },
            ].map((pkg) => {
              const highlighted = !!pkg.badge;
              return (
                <button
                  key={pkg.id}
                  onClick={() => handleCheckout(pkg.id)}
                  disabled={!!loading}
                  className={`relative flex flex-col items-center text-center rounded-xl border p-4 transition-all hover:-translate-y-1 ${
                    highlighted
                      ? 'border-gold/50 bg-gold/[0.08] hover:bg-gold/[0.14]'
                      : 'border-border/60 bg-card/40 hover:border-gold/30'
                  }`}
                >
                  {pkg.badge && (
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-0.5 rounded-full text-[8px] font-montserrat font-bold uppercase tracking-wider ${
                      pkg.badge === 'Popular'
                        ? 'bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00]'
                        : 'bg-emerald-500 text-white'
                    }`}>{pkg.badge}</span>
                  )}
                  <span className="text-2xl mb-1">🧪</span>
                  <span className="font-cinzel font-bold text-xl text-gold-light">{pkg.drops}</span>
                  <span className="font-montserrat text-[10px] text-text-dim uppercase tracking-wider mb-2">gotas</span>
                  <span className="font-montserrat font-bold text-sm text-foreground">{pkg.price}</span>
                  <span className="font-montserrat text-[10px] text-text-dim mt-1">R$ {pkg.perDrop}/gota</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feature comparison table */}
        <div className="mb-16">
          <h2 className="font-cinzel font-bold text-2xl text-center text-foreground mb-2">Comparação Completa</h2>
          <p className="font-merriweather italic text-text-dim text-sm text-center mb-8">Todas as funcionalidades, lado a lado</p>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-3 px-4 font-montserrat font-bold text-[10px] uppercase tracking-wider text-text-dim w-1/4">Funcionalidade</th>
                  <th className="text-center py-3 px-3 font-montserrat font-bold text-[10px] uppercase tracking-wider text-emerald-400 w-1/4">🌱 Semente</th>
                  <th className="text-center py-3 px-3 font-montserrat font-bold text-[10px] uppercase tracking-wider text-blue-light w-1/4">🌿 Raiz</th>
                  <th className="text-center py-3 px-3 font-montserrat font-bold text-[10px] uppercase tracking-wider text-gold-light w-1/4">✨ Idriel</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => (
                  <tr key={f.label} className={`border-b border-border/50 ${i % 2 === 0 ? 'bg-white/[0.01]' : ''}`}>
                    <td className="py-2.5 px-4 font-montserrat text-xs text-foreground/80">{f.label}</td>
                    <td className="py-2.5 px-3 text-center">{renderCellValue(f.semente)}</td>
                    <td className="py-2.5 px-3 text-center">{renderCellValue(f.raiz)}</td>
                    <td className="py-2.5 px-3 text-center">{renderCellValue(f.idriel)}</td>
                  </tr>
                ))}
                <tr className="border-b border-border/50">
                  <td className="py-2.5 px-4 font-montserrat text-xs font-bold text-foreground">Preço</td>
                  <td className="py-2.5 px-3 text-center font-montserrat font-bold text-xs text-emerald-400">Grátis</td>
                  <td className="py-2.5 px-3 text-center font-montserrat font-bold text-xs text-blue-light">R$ 87/ano</td>
                  <td className="py-2.5 px-3 text-center font-montserrat font-bold text-xs text-gold-light">
                    R$ 39,90/mês<br /><span className="text-[10px] text-text-dim">ou R$ 399/ano</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Market comparison */}
        <div className="mb-16">
          <h2 className="font-cinzel font-bold text-2xl text-center text-foreground mb-2">
            Por que Idriel é <span className="text-gold-light">imbatível</span>?
          </h2>
          <p className="font-merriweather italic text-text-dim text-sm text-center mb-4 max-w-2xl mx-auto">
            Para ter o mesmo que Idriel oferece, você precisaria de 4 ferramentas separadas — gastando até <strong className="text-destructive">R$ 329+/mês</strong>
          </p>

          {/* Competitor vs Idriel visual */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {competitors.map(c => (
              <div key={c.name} className="rounded-xl border border-destructive/20 bg-destructive/[0.03] p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl">{c.icon}</span>
                  <span className="font-montserrat font-bold text-xs text-foreground">{c.name}</span>
                </div>
                <span className="font-montserrat font-bold text-lg text-destructive block mb-3">{c.price}</span>
                <ul className="space-y-1.5">
                  {c.features.map(f => (
                    <li key={f} className="flex items-center gap-1.5 text-[11px]">
                      {f.startsWith('Sem') ? (
                        <X className="w-3 h-3 text-destructive/60 shrink-0" />
                      ) : (
                        <Check className="w-3 h-3 text-emerald-400/60 shrink-0" />
                      )}
                      <span className={`font-montserrat ${f.startsWith('Sem') ? 'text-text-dim' : 'text-foreground/70'}`}>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          {/* Idriel comparison card */}
          <div className="rounded-2xl border-2 border-gold/40 p-6 text-center relative overflow-hidden" style={{ background: 'linear-gradient(135deg, rgba(200,146,42,0.10) 0%, rgba(200,146,42,0.03) 100%)' }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[200px] rounded-full" style={{ background: 'radial-gradient(ellipse at center, rgba(218,165,32,0.15) 0%, transparent 70%)', filter: 'blur(40px)' }} />
            <div className="relative">
              <div className="flex items-center justify-center gap-3 mb-3">
                <img src={idrielAvatar} alt="Idriel" className="w-10 h-10 rounded-full border-2 border-gold/50" />
                <h3 className="font-cinzel font-bold text-2xl text-gold-light">✨ Idriel</h3>
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-1">
                <span className="font-montserrat font-bold text-4xl text-gold-light">R$ 39,90</span>
                <span className="text-text-dim font-montserrat text-sm">/mês</span>
              </div>
              <p className="font-merriweather italic text-text-secondary text-sm mb-6">
                Tudo-em-um: worldbuilding + IA de texto + IA de imagens + manuscrito + exportação
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 max-w-xl mx-auto">
                {[
                  { icon: '📝', label: 'Texto IA Premium', sub: 'Gemini 2.5 Pro' },
                  { icon: '🎨', label: 'Imagens IA HD', sub: 'Gemini 3 Pro Image' },
                  { icon: '🗺️', label: 'Mapas IA', sub: 'Cartografia única' },
                  { icon: '📖', label: 'Worldbuilding', sub: '11 pilares + Codex' },
                ].map(item => (
                  <div key={item.label} className="p-3 rounded-lg bg-gold/[0.06] border border-gold/15">
                    <span className="text-xl block mb-1">{item.icon}</span>
                    <span className="font-montserrat font-bold text-[10px] text-gold-light block">{item.label}</span>
                    <span className="font-montserrat text-[9px] text-text-dim">{item.sub}</span>
                  </div>
                ))}
              </div>

              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 mb-6">
                <span className="font-montserrat font-bold text-sm text-emerald-400">
                  Economia de até R$ 300/mês
                </span>
                <span className="text-emerald-400/60 text-xs font-montserrat">vs ferramentas separadas</span>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={() => handleCheckout(STRIPE_PLANS.idriel_mensal.price_id)}
                  disabled={!!loading}
                  className="px-8 py-3 rounded-xl bg-gradient-to-r from-[hsl(var(--gold))] to-[hsl(var(--idriel-light))] text-[#1a0f00] font-montserrat font-bold text-sm uppercase tracking-wider transition-all hover:shadow-[0_0_30px_rgba(218,165,32,0.4)]"
                >
                  ✨ Assinar Idriel — R$ 29,90/mês
                </button>
                <button
                  onClick={() => handleCheckout(PLANS.idriel_anual.id)}
                  disabled={!!loading}
                  className="px-6 py-3 rounded-xl border border-gold/40 text-gold-light font-montserrat font-bold text-xs uppercase tracking-wider transition-all hover:bg-gold/[0.08]"
                >
                  ou R$ 279/ano (2 meses grátis)
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* FAQ-like closing */}
        <div className="text-center pb-12">
          <p className="font-merriweather italic text-text-dim text-sm mb-2">
            "A Árvore dos Mundos é a única ferramenta brasileira que une worldbuilding, escrita e IA em um só lugar."
          </p>
          <p className="font-montserrat text-[10px] uppercase tracking-[0.2em] text-text-dim/50">
            Universo STORIA · Todos os direitos reservados
          </p>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;
