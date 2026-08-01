// Compiladores de prompt centralizados.
// Toda a inteligência de prompt das duas ferramentas visuais vive aqui —
// o cliente envia apenas parâmetros semânticos.

import { chatComplete } from "./image-provider.ts";

export type RefIntent = "estilo" | "composicao" | "ambientacao" | "personagem" | "paleta";

export const INTENT_INSTRUCTIONS: Record<RefIntent, string> = {
  estilo: "Use APENAS para o ESTILO visual: técnica, pincelada, renderização, tratamento de cor, nível de detalhe. Não copie personagens, objetos ou composição.",
  composicao: "Use APENAS para COMPOSIÇÃO e ENQUADRAMENTO: ângulo de câmera, layout, perspectiva, profundidade de campo. Não copie estilo, personagens ou paleta.",
  ambientacao: "Use APENAS para ATMOSFERA e AMBIENTE: direção e qualidade da luz, clima, texturas do cenário. Não copie personagens nem composição.",
  personagem: "Use como CÂNONE DO PERSONAGEM: preserve aparência, tipo físico, roupas, marcas identificadoras e proporções. Não copie o fundo nem a composição.",
  paleta: "Use APENAS para a PALETA DE CORES dominante. Não copie sujeitos, composição ou estilo.",
};

export interface StructuredRef { url: string; intent: RefIntent }

/**
 * GPT Image 2 não aceita imagens de entrada no endpoint de geração.
 * Então lemos as referências com um modelo multimodal e transformamos cada
 * uma em instruções textuais precisas, respeitando o papel escolhido.
 */
export async function describeReferences(apiKey: string, refs: StructuredRef[]): Promise<string> {
  if (refs.length === 0) return "";

  const content: Array<Record<string, unknown>> = [{
    type: "text",
    text:
      "Analise cada imagem de referência abaixo e escreva, EM INGLÊS, uma instrução visual objetiva para um gerador de imagens.\n" +
      "Respeite estritamente o papel de cada referência — não descreva aspectos fora do papel indicado.\n" +
      "Formato da resposta: uma linha por referência, começando por 'Reference N (ROLE):'. Sem preâmbulo.\n\n" +
      refs.map((r, i) => `Reference ${i + 1} — papel ${r.intent.toUpperCase()}: ${INTENT_INSTRUCTIONS[r.intent]}`).join("\n"),
  }];
  for (const r of refs) content.push({ type: "image_url", image_url: { url: r.url } });

  try {
    return await chatComplete(
      apiKey,
      "You are a visual director. You convert reference images into precise, role-scoped English instructions for an image generator. Never invent details that are not visible.",
      content,
    );
  } catch (e) {
    console.error("describeReferences failed, continuing without refs:", e);
    return "";
  }
}

export interface VisionParams {
  basePrompt: string;
  canonText?: string;
  references?: StructuredRef[];
}

/** Prompt final para cenas, personagens, criaturas e objetos. */
export async function compileVisionPrompt(apiKey: string, p: VisionParams): Promise<string> {
  const refBlock = await describeReferences(apiKey, (p.references || []).slice(0, 3));

  const system =
    "You are an expert prompt engineer for the GPT Image 2 model. " +
    "Produce ONE final image prompt in English, 90–180 words, as a single paragraph. " +
    "Be explicit about subject, composition, camera/framing, lighting, color palette, materials and art style. " +
    "Honor the canon: never contradict established characters, places or concepts. " +
    "Never include on-image text, watermarks, logos, captions or UI. " +
    "Do not name real people or characters from existing copyrighted franchises. " +
    "Respond ONLY with the prompt.";

  const user = [
    `Base description / draft prompt:\n${p.basePrompt}`,
    p.canonText ? `\nWorld canon (do not contradict):\n${p.canonText.slice(0, 4000)}` : "",
    refBlock ? `\nReference-image instructions (follow each strictly, respecting its role):\n${refBlock}` : "",
  ].filter(Boolean).join("\n");

  const compiled = await chatComplete(apiKey, system, user);
  return compiled || p.basePrompt;
}

export interface MapParams {
  styleId: string;
  styleLabel: string;
  styleDesc: string;
  styleKeywords: string;
  custom?: boolean;
  description?: string;
  worldContext?: string;
}

/** Prompt final para cartografia — regras próprias, distintas das cenas. */
export async function compileMapPrompt(apiKey: string, p: MapParams): Promise<string> {
  const system =
    "You are an expert cartographer and prompt engineer for the GPT Image 2 model. " +
    "Produce ONE final English prompt (110–200 words, single paragraph) for a fantasy WORLD MAP illustration. " +
    "Cartographic rules that must always be respected: strict top-down orthographic view, no perspective or horizon; " +
    "a compass rose and a scale bar; coherent geography (rivers run downhill from mountains to the sea, biomes transition plausibly, " +
    "coastlines and islands are consistent); settlements placed near water or trade routes; borders and regions readable at a glance. " +
    "Describe label placement as decorative cartographic lettering only — never dictate specific words, since generated text is unreliable. " +
    "No characters, no close-up scenes, no UI, no watermark. " +
    "Respond ONLY with the prompt.";

  const styleLine = p.custom
    ? `Custom map described by the author: ${p.description || "an original world map"}`
    : `${p.styleLabel}: ${p.styleDesc}. Style keywords: ${p.styleKeywords}.${p.description ? ` Additional details: ${p.description}` : ""}`;

  const user = [
    `Map style requested: ${styleLine}`,
    p.worldContext ? `\nWorld context (geography, factions and cultures — reflect these in terrain, territories and place density):\n${p.worldContext.slice(0, 4000)}` : "",
  ].join("\n");

  const compiled = await chatComplete(apiKey, system, user);
  return compiled || styleLine;
}
