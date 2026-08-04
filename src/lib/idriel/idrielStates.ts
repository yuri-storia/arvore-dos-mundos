// Máquina de estados visuais da Idriel.
//
// 18 estados oficiais. Cada estado aponta para um WebP transparente em
// `src/assets/idriel/states/`. Os estados ainda não fornecidos caem em
// `neutral_attentive` (fallback declarado, nunca aleatório).

import neutralAttentive from '@/assets/idriel/states/neutral-attentive.webp.asset.json';
import warmWelcome from '@/assets/idriel/states/warm-welcome.webp.asset.json';
import explaining from '@/assets/idriel/states/explaining.webp.asset.json';
import curious from '@/assets/idriel/states/curious.webp.asset.json';
import thoughtful from '@/assets/idriel/states/thoughtful.webp.asset.json';
import inspired from '@/assets/idriel/states/inspired.webp.asset.json';
import enthusiastic from '@/assets/idriel/states/enthusiastic.webp.asset.json';
import determined from '@/assets/idriel/states/determined.webp.asset.json';
import concerned from '@/assets/idriel/states/concerned.webp.asset.json';
import compassionate from '@/assets/idriel/states/compassionate.webp.asset.json';
import mysterious from '@/assets/idriel/states/mysterious.webp.asset.json';
import satisfied from '@/assets/idriel/states/satisfied.webp.asset.json';
import consultingCodex from '@/assets/idriel/states/consulting-codex.webp.asset.json';
import presentingPaths from '@/assets/idriel/states/presenting-paths.webp.asset.json';
import invitingContinue from '@/assets/idriel/states/inviting-continue.webp.asset.json';
import warning from '@/assets/idriel/states/warning.webp.asset.json';
import gentleError from '@/assets/idriel/states/gentle-error.webp.asset.json';
import forging from '@/assets/idriel/states/forging.webp.asset.json';

export type IdrielState =
  | 'neutral_attentive'
  | 'warm_welcome'
  | 'explaining'
  | 'curious'
  | 'thoughtful'
  | 'inspired'
  | 'enthusiastic'
  | 'determined'
  | 'concerned'
  | 'compassionate'
  | 'mysterious'
  | 'satisfied'
  | 'consulting_codex'
  | 'presenting_paths'
  | 'inviting_continue'
  | 'warning'
  | 'gentle_error'
  | 'forging';

export const IDRIEL_FALLBACK: IdrielState = 'neutral_attentive';

/** Todos os 18 estados possuem asset próprio. */
const SOURCES: Record<IdrielState, string> = {
  neutral_attentive: neutralAttentive.url,
  warm_welcome: warmWelcome.url,
  explaining: explaining.url,
  curious: curious.url,
  thoughtful: thoughtful.url,
  inspired: inspired.url,
  enthusiastic: enthusiastic.url,
  determined: determined.url,
  concerned: concerned.url,
  compassionate: compassionate.url,
  mysterious: mysterious.url,
  satisfied: satisfied.url,
  consulting_codex: consultingCodex.url,
  presenting_paths: presentingPaths.url,
  inviting_continue: invitingContinue.url,
  warning: warning.url,
  gentle_error: gentleError.url,
  forging: forging.url,
};

export function idrielStateSrc(state: IdrielState): string {
  return SOURCES[state] ?? SOURCES[IDRIEL_FALLBACK];
}

/** Estados pré-carregados no primeiro render do Estúdio. */
export const PRELOAD_STATES: IdrielState[] = [
  'neutral_attentive',
  'warm_welcome',
  'explaining',
  'thoughtful',
  'consulting_codex',
];

/** Eventos do Estúdio → estado visual. Nunca escolha imagem fora daqui. */
export type IdrielEvent =
  | 'idle'
  | 'enter_fruit'
  | 'tutorial'
  | 'user_idea'
  | 'local_processing'
  | 'creative_discovery'
  | 'celebrate'
  | 'important_guidance'
  | 'gap_detected'
  | 'user_struggling'
  | 'lore_reveal'
  | 'saved'
  | 'ai_codex_query'
  | 'show_paths'
  | 'awaiting_answer'
  | 'canon_conflict'
  | 'tech_error'
  | 'special_generation';

export const EVENT_STATE: Record<IdrielEvent, IdrielState> = {
  idle: 'neutral_attentive',
  enter_fruit: 'warm_welcome',
  tutorial: 'explaining',
  user_idea: 'curious',
  local_processing: 'thoughtful',
  creative_discovery: 'inspired',
  celebrate: 'enthusiastic',
  important_guidance: 'determined',
  gap_detected: 'concerned',
  user_struggling: 'compassionate',
  lore_reveal: 'mysterious',
  saved: 'satisfied',
  ai_codex_query: 'consulting_codex',
  show_paths: 'presenting_paths',
  awaiting_answer: 'inviting_continue',
  canon_conflict: 'warning',
  tech_error: 'gentle_error',
  special_generation: 'forging',
};

export const stateForEvent = (event: IdrielEvent): IdrielState =>
  EVENT_STATE[event] ?? IDRIEL_FALLBACK;
