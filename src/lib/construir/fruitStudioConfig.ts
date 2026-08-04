// Configuração central do Estúdio de Criação por Fruto.
//
// TODO o conteúdo aqui é estático: apresentação, tutorial, princípios,
// caminhos de criação, perguntas guiadas e sugestões. NADA aqui chama IA.
// A IA só entra por ação explícita do criador ("Pedir ideias" / "Consultar Idriel").
//
// A fonte de verdade continua sendo `src/lib/data.ts` (FRUITS, guides, chips,
// FRUIT_RECOMMENDED_TYPE). Este módulo apenas deriva e enriquece.

import { FRUITS, FRUIT_RECOMMENDED_TYPE, type Fruit } from '@/lib/data';
import type { IdrielState } from '@/lib/idriel/idrielStates';

export type OutputType = 'ficha' | 'artigo' | 'timeline';

export interface GuidedQuestion {
  /** id do campo em `state.db[fruitId]` — mantém o autosave existente intacto. */
  fieldId: string;
  label: string;
  question: string;
  placeholder?: string;
  /** Sugestões estáticas (não chamam IA). */
  suggestions: string[];
  type: 'textarea' | 'select';
  options?: string[];
}

export interface FruitStudioConfig {
  id: number;
  num: string;
  name: string;
  desc: string;
  /** Fala de abertura de Idriel (estática). */
  intro: string;
  /** Princípios do mini-tutorial — derivados do guia existente. */
  principles: { title: string; body: string }[];
  /** Estudo de caso do Fruto. */
  caseStudy: string;
  closing?: string;
  /** Caminhos de criação = campos do Fruto, apresentados um por vez. */
  questions: GuidedQuestion[];
  /** Perguntas sugeridas para "Consultar Idriel" (chips existentes). */
  consultChips: string[];
  /** Tipos de saída permitidos. */
  outputs: OutputType[];
  /** Tipo sugerido por padrão. */
  preferredOutput: OutputType;
  /** Funcionalidade especial do Fruto, se houver. */
  special?: 'map';
  /** Estado inicial de Idriel ao abrir o Fruto. */
  initialState: IdrielState;
}

/** Frutos que registram acontecimentos na Linha do Tempo. */
const TIMELINE_FRUITS = [2, 8];
/** Frutos cujos campos geram ficha (regra herdada de TabConstruir). */
const FICHA_FRUITS = [0, 5, 9];

const splitPrinciples = (text: string): { title: string; body: string }[] =>
  text
    .split('\n\n')
    .map(p => p.trim())
    .filter(Boolean)
    .slice(0, 4)
    .map((body, i) => ({ title: `Princípio ${i + 1}`, body }));

const questionFor = (fruit: Fruit, field: Fruit['fields'][number]): GuidedQuestion => ({
  fieldId: field.id,
  label: field.label,
  question: `${field.label}. ${field.ph ? '' : ''}`.trim(),
  placeholder: field.ph,
  type: field.type === 'select' ? 'select' : 'textarea',
  options: field.opts,
  suggestions: fruit.chips.slice(0, 3),
});

const outputsFor = (id: number): OutputType[] => {
  const rec = FRUIT_RECOMMENDED_TYPE[id];
  const base: OutputType[] = rec === 'ficha' ? ['ficha', 'artigo'] : rec === 'artigo' ? ['artigo', 'ficha'] : ['ficha', 'artigo'];
  return TIMELINE_FRUITS.includes(id) ? [...base, 'timeline'] : base;
};

export const FRUIT_STUDIO: Record<number, FruitStudioConfig> = Object.fromEntries(
  FRUITS.map(fruit => {
    const outputs = outputsFor(fruit.id);
    const config: FruitStudioConfig = {
      id: fruit.id,
      num: fruit.num,
      name: fruit.name,
      desc: fruit.desc,
      intro: `Chegamos ao ${fruit.num} — ${fruit.name}. ${fruit.desc}`,
      principles: splitPrinciples(fruit.guide.min),
      caseStudy: fruit.guide.ref,
      closing: fruit.guide.closing,
      questions: fruit.fields.map(f => questionFor(fruit, f)),
      consultChips: fruit.chips,
      outputs,
      preferredOutput: FICHA_FRUITS.includes(fruit.id) ? 'ficha' : outputs[0],
      special: fruit.id === 0 ? 'map' : undefined,
      initialState: 'warm_welcome',
    };
    return [fruit.id, config];
  }),
);

export const getFruitStudio = (id: number): FruitStudioConfig => FRUIT_STUDIO[id] ?? FRUIT_STUDIO[0];

export const OUTPUT_LABEL: Record<OutputType, string> = {
  ficha: 'Ficha no Codex',
  artigo: 'Artigo no Codex',
  timeline: 'Fato na Linha do Tempo',
};

export const OUTPUT_HINT: Record<OutputType, string> = {
  ficha: 'Estas informações já podem formar uma ficha no Codex.',
  artigo: 'Este conteúdo tem profundidade para se tornar um artigo.',
  timeline: 'Este acontecimento pode ser registrado como fato na Linha do Tempo.',
};
