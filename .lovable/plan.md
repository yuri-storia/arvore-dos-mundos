# Mensagem amigável quando IA está pausada

## Problema

Quando os endpoints de IA estão pausados/indisponíveis, o usuário vê:

> "Edge Function returned a non-2xx status code"

Essa string vem do cliente Supabase Functions quando o status HTTP não é 2xx — o corpo real (que já contém uma mensagem clara em pt-BR vinda das edge functions) não é lido nem repassado. Resultado: `friendlyAIError` recebe só "non-2xx" e cai no fallback genérico.

## Solução

Duas mudanças pequenas em `src/lib/helpers.ts`:

### 1. Extrair o erro real do `FunctionsHttpError`

Nos wrappers `callAIText`, `callAIImage`, `callAIImageConsistent` e `importTextWithIdriel`, quando `error` existir, tentar ler `error.context.response` (Response object) para obter o JSON com a mensagem real e o status. Lançar `Error(jsonBody.error)` para que o chamador veja a mensagem em pt-BR. Se falhar o parse, lançar a mensagem original.

### 2. Reconhecer "non-2xx" como indisponibilidade

Em `friendlyAIError`, adicionar à categoria `balance` (que já mostra "Idriel está indisponível no momento, aguarde até que a conexão seja reestabelecida") os padrões:
- `non-2xx`
- `failed to fetch`
- `network error`
- `functionshttperror`
- `edge function returned`

Assim, mesmo que o parse do corpo falhe ou a função esteja totalmente offline, o usuário vê a mensagem correta.

### 3. Padronizar uso de `friendlyAIError` nos toasts de erro

Hoje só `TabGerarImagens.tsx` usa `friendlyAIError`. Aplicar o mesmo helper nos toasts de erro de:
- `MapGenerator.tsx` (geração de mapa)
- `CodexCard.tsx` (gerar imagem de ficha)
- `CodexAnalysis.tsx` (análise de mundo)
- `TabConstruir.tsx` (Idriel)
- `TabGaleria.tsx` (Visões de Idriel + texto)

Cada toast passa a mostrar `title` + `description: hint` em vez do `err.message` cru.

## Detalhes técnicos

```ts
// helpers.ts — exemplo do wrapper
async function unwrapFnError(error: any): Promise<never> {
  try {
    const ctxResp: Response | undefined = error?.context?.response ?? error?.context;
    if (ctxResp && typeof ctxResp.json === 'function') {
      const body = await ctxResp.clone().json();
      if (body?.error) throw new Error(body.error);
    }
  } catch (parsed) {
    if (parsed instanceof Error && parsed.message) throw parsed;
  }
  throw new Error(error?.message || 'Erro ao chamar IA');
}
```

```ts
// friendlyAIError — adicionar ao bloco "balance"
msg.includes('non-2xx') ||
msg.includes('edge function returned') ||
msg.includes('failed to fetch') ||
msg.includes('functionshttperror') ||
msg.includes('network error')
```

## Fora do escopo

- Não alterar as edge functions (já retornam JSON correto).
- Não mudar a lógica de cobrança de gotas ou planos.
- Não tocar no `BugReportDialog` — ele continua disponível como ação de recuperação.
