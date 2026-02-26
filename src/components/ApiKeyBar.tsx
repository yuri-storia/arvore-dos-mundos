import React from 'react';

interface Props {
  apiKey: string;
  setApiKey: (k: string) => void;
}

export const ApiKeyBar: React.FC<Props> = ({ apiKey, setApiKey }) => {
  const isValid = apiKey.startsWith('sk-');

  return (
    <div className="mx-auto max-w-[1060px] px-4 mb-4">
      <div className="card-glass-gold rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-2 h-2 rounded-full bg-gold animate-blink" />
          <span className="font-montserrat font-bold text-sm text-foreground">
            🔑 Chave OpenAI — Texto (GPT-4o mini) + Imagens (DALL-E 3)
          </span>
        </div>

        <div className="flex items-center gap-3 mb-3">
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            placeholder="Cole aqui sua chave OpenAI (sk-…)"
            className="flex-1 bg-background/60 border border-blue-bright/20 rounded-md px-3 py-2 text-sm text-foreground placeholder:text-text-dim focus:outline-none focus:border-blue-bright/50 font-montserrat"
          />
          {apiKey ? (
            isValid ? (
              <span className="text-xs px-2 py-1 rounded bg-emerald-900/40 text-emerald-400 border border-emerald-500/30 whitespace-nowrap">✓ Chave configurada</span>
            ) : (
              <span className="text-xs px-2 py-1 rounded bg-amber-900/40 text-gold-light border border-gold/30 whitespace-nowrap">Formato inválido</span>
            )
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-amber-900/40 text-gold-light border border-gold/30 whitespace-nowrap">Sem chave</span>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mb-2 text-[11px] text-text-dim">
          <span className="px-2 py-0.5 rounded-full border border-blue-bright/15 bg-blue-bright/5">GPT-4o mini: ~R$0,005/consulta</span>
          <span className="px-2 py-0.5 rounded-full border border-blue-bright/15 bg-blue-bright/5">DALL-E 3: ~R$0,22/imagem</span>
          <span className="px-2 py-0.5 rounded-full border border-blue-bright/15 bg-blue-bright/5">Limite diário: 15 textos / 3 imagens</span>
        </div>

        <p className="text-[11px] text-text-dim font-merriweather italic">
          Sua chave é usada localmente — nunca enviada a servidor algum.{' '}
          <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener" className="text-blue-light hover:underline">
            Obter chave →
          </a>
        </p>
      </div>
    </div>
  );
};
