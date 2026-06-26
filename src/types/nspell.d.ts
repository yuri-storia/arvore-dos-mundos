declare module "nspell" {
  interface NSpellInstance {
    correct(word: string): boolean;
    suggest(word: string): string[];
    spell(word: string): { correct: boolean; forbidden: boolean; warn: boolean };
    add(word: string, model?: string): NSpellInstance;
    remove(word: string): NSpellInstance;
    wordCharacters(): string | undefined;
    dictionary(dic: string | Uint8Array): NSpellInstance;
    personal(dic: string | Uint8Array): NSpellInstance;
  }
  interface Dictionary {
    aff: string | Uint8Array;
    dic: string | Uint8Array;
  }
  function NSpell(dictionary: Dictionary): NSpellInstance;
  function NSpell(aff: string | Uint8Array, dic?: string | Uint8Array): NSpellInstance;
  export default NSpell;
}

declare module "dictionary-pt/index.aff?url" {
  const url: string;
  export default url;
}
declare module "dictionary-pt/index.dic?url" {
  const url: string;
  export default url;
}
