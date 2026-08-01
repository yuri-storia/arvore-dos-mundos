// Provedor único de geração visual do Árvore dos Mundos.
// Todas as imagens (Visões de Idriel e Mapas) passam por GPT Image 2.
//
// Também centraliza:
//  - tratamento de erros (rate limit, créditos, moderação)
//  - upload do PNG gerado para o bucket público `codex-images`
//    (o banco passa a guardar URL, nunca mais base64)

export const IMAGE_MODEL = "openai/gpt-image-2";
export const TEXT_MODEL = "openai/gpt-5.6-sol";

const GATEWAY = "https://ai.gateway.lovable.dev/v1";

export class ImageGenError extends Error {
  status: number;
  constructor(message: string, status = 500) {
    super(message);
    this.status = status;
  }
}

export type ImageSize = "1024x1024" | "1536x1024" | "1024x1536";

/**
 * Teto de espera por tentativa. Gerações em alta fidelidade (1536x1024) podem
 * passar de 3 minutos; damos folga em vez de cancelar cedo.
 */
const REQUEST_TIMEOUT_MS = 8 * 60 * 1000;

/** Gera uma imagem e devolve o PNG em base64 (sem prefixo data:). */
export async function generateImageB64(
  apiKey: string,
  prompt: string,
  size: ImageSize = "1024x1024",
  quality: "medium" | "high" = "high",
  attempt = 0,
): Promise<string> {
  const safePrompt = prompt.length > 8000 ? prompt.slice(0, 8000) : prompt;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(`${GATEWAY}/images/generations`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: safePrompt,
        size,
        quality,
        n: 1,
      }),
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    // Falha de rede / abort: uma nova tentativa antes de desistir.
    if (attempt < 1) {
      console.warn("image-provider network retry:", e);
      return generateImageB64(apiKey, prompt, size, quality, attempt + 1);
    }
    throw new ImageGenError("A geração demorou mais do que o esperado. Tente novamente em instantes.", 504);
  }
  clearTimeout(timer);

  // Instabilidade momentânea do provedor: tenta mais uma vez.
  if ((res.status >= 500 || res.status === 408) && attempt < 1) {
    console.warn("image-provider upstream retry:", res.status);
    return generateImageB64(apiKey, prompt, size, quality, attempt + 1);
  }


  if (!res.ok) {
    const raw = await res.text();
    console.error("image-provider error:", res.status, raw.slice(0, 800));
    if (res.status === 429) {
      throw new ImageGenError("Muitas requisições ao mesmo tempo. Aguarde alguns segundos e tente novamente.", 429);
    }
    if (res.status === 402) {
      throw new ImageGenError("Créditos de IA esgotados. Entre em contato com o administrador.", 402);
    }
    let code = "";
    let message = "";
    try {
      const parsed = JSON.parse(raw);
      code = parsed?.error?.code || "";
      message = parsed?.error?.message || "";
    } catch { /* corpo não-JSON */ }
    if (code === "content_policy_violation" || code === "moderation_blocked") {
      throw new ImageGenError(
        "O pedido foi recusado pela moderação de conteúdo. Reescreva a descrição evitando personagens de obras existentes, pessoas reais ou violência explícita.",
        400,
      );
    }
    throw new ImageGenError(message || `Falha na geração da imagem (${res.status}).`, res.status >= 500 ? 502 : 400);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new ImageGenError("A imagem não foi gerada. Tente novamente.", 502);
  return b64;
}

/** Chat de apoio (compilação de prompt / leitura de referências). */
export async function chatComplete(
  apiKey: string,
  systemPrompt: string,
  userContent: string | Array<Record<string, unknown>>,
): Promise<string> {
  const res = await fetch(`${GATEWAY}/chat/completions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: TEXT_MODEL,
      reasoning_effort: "none",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!res.ok) {
    const raw = await res.text();
    console.error("chatComplete error:", res.status, raw.slice(0, 500));
    if (res.status === 429) throw new ImageGenError("Muitas requisições. Tente novamente em alguns segundos.", 429);
    if (res.status === 402) throw new ImageGenError("Créditos de IA esgotados.", 402);
    throw new ImageGenError("Não foi possível compor o prompt da imagem.", 502);
  }

  const data = await res.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

/**
 * Sobe o PNG gerado para `codex-images` e devolve a URL pública.
 * Se o upload falhar, cai de volta para data URL — o usuário nunca fica sem imagem.
 */
// deno-lint-ignore no-explicit-any
export async function persistImage(adminClient: any, userId: string, b64: string, kind: "vision" | "map"): Promise<string> {
  const dataUrl = `data:image/png;base64,${b64}`;
  try {
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const path = `${userId}/generated/${kind}-${crypto.randomUUID()}.png`;
    const { error } = await adminClient.storage.from("codex-images").upload(path, bytes, {
      contentType: "image/png",
      cacheControl: "31536000",
      upsert: false,
    });
    if (error) throw error;
    const { data } = adminClient.storage.from("codex-images").getPublicUrl(path);
    return data?.publicUrl || dataUrl;
  } catch (e) {
    console.error("persistImage fallback to data URL:", e);
    return dataUrl;
  }
}
