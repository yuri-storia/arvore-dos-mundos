// Web Worker that runs the real Hunspell engine for Portuguese (Brazil)
// fully offline using a bundled PT-BR dictionary. No AI, no network calls
// beyond fetching the static dictionary assets shipped with the app.
//
// Messages:
//   { id, type: "check",  word }                       → { id, correct }
//   { id, type: "suggest", word }                      → { id, suggestions }
//   { id, type: "lookup", word }                       → { id, correct, suggestions }
//   { id, type: "add",    word }                       → { id, ok }
//   { id, type: "ready" }                              → { id, ready }

// Dictionary files are shipped as static assets under /public/dict/.
// Use the Brazil-specific VERO dictionary instead of generic Portuguese.
const affUrl = "/dict/pt-br.aff";
const dicUrl = "/dict/pt-br.dic";
const runtimeUrl = "/dict/hunspell.js";

type RuntimeModuleFactory = (module: Record<string, unknown>) => HunspellAsmModule;

type HunspellAsmModule = Record<string, unknown> & {
  FS: {
    mkdir: (path: string) => void;
    writeFile: (path: string, data: Uint8Array, opts?: { encoding?: string }) => void;
  };
  cwrap: (name: string, returnType: string | null, argTypes: string[]) => (...args: number[]) => number;
  _free: (ptr: number) => void;
  _malloc: (size: number) => number;
  allocateUTF8: (value: string) => number;
  getValue: (ptr: number, type: string) => number;
  UTF8ToString: (ptr: number) => string;
  initializeRuntime: (timeout?: number) => Promise<boolean>;
  onRuntimeInitialized: (() => void) | null;
  onAbort?: (reason: unknown) => void;
  __asm_module_isInitialized__?: boolean;
};

type HunspellInstance = {
  spell: (word: string) => boolean;
  suggest: (word: string) => string[];
  addWord: (word: string) => void;
};

type SpellInstance = {
  correct: (w: string) => boolean;
  suggest: (w: string) => string[];
  add: (w: string) => void;
};

let spell: SpellInstance | null = null;
let bootPromise: Promise<SpellInstance> | null = null;

function createRuntimeModule(): HunspellAsmModule {
  const module = {
    __asm_module_isInitialized__: false,
    onRuntimeInitialized: null,
    initializeRuntime(timeout = 20000) {
      if (this.__asm_module_isInitialized__) return Promise.resolve(true);
      return new Promise<boolean>((resolve, reject) => {
        const timeoutId = setTimeout(() => resolve(false), timeout);
        this.onAbort = (reason: unknown) => {
          clearTimeout(timeoutId);
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        };
        this.onRuntimeInitialized = () => {
          clearTimeout(timeoutId);
          this.__asm_module_isInitialized__ = true;
          resolve(true);
        };
      });
    },
  } as HunspellAsmModule;
  return module;
}

async function loadHunspellWasm(): Promise<HunspellAsmModule> {
  // The published `hunspell-asm` ESM entry currently breaks under Vite workers:
  // its UMD runtime is converted into a module namespace object, so the loader
  // calls it as a function and fails with `runtimeModule is not a function`.
  // Fetch the same Emscripten runtime from /public and import it through a Blob
  // URL with an explicit ESM default export. Direct `import('/dict/...')` is
  // intentionally blocked by Vite during development.
  const runtimeRes = await fetch(runtimeUrl);
  if (!runtimeRes.ok) throw new Error(`Hunspell runtime failed to load (${runtimeRes.status})`);
  const runtimeSource = `${await runtimeRes.text()}\nexport default Module;\n`;
  const runtimeBlobUrl = URL.createObjectURL(
    new Blob([runtimeSource], { type: "text/javascript" }),
  );
  const runtimeMod = (await import(/* @vite-ignore */ runtimeBlobUrl)) as {
    default?: RuntimeModuleFactory;
  };
  URL.revokeObjectURL(runtimeBlobUrl);
  const runtimeFactory = runtimeMod.default;
  if (typeof runtimeFactory !== "function") {
    throw new Error("Hunspell runtime failed to load");
  }

  const asmModule = runtimeFactory(createRuntimeModule());
  const initialized = await asmModule.initializeRuntime(20000);
  if (!initialized) throw new Error("Timeout initializing Hunspell runtime");
  return asmModule;
}

function withUtf8<T>(asm: HunspellAsmModule, values: string[], fn: (...ptrs: number[]) => T): T {
  const ptrs = values.map((value) => asm.allocateUTF8(value.normalize()));
  try {
    return fn(...ptrs);
  } finally {
    ptrs.forEach((ptr) => asm._free(ptr));
  }
}

function createHunspellInstance(
  asm: HunspellAsmModule,
  aff: ArrayBuffer,
  dic: ArrayBuffer,
): HunspellInstance {
  const hunspell = {
    create: asm.cwrap("Hunspell_create", "number", ["number", "number"]),
    spell: asm.cwrap("Hunspell_spell", "number", ["number", "number"]),
    suggest: asm.cwrap("Hunspell_suggest", "number", ["number", "number", "number"]),
    freeList: asm.cwrap("Hunspell_free_list", null, ["number", "number", "number"]),
    add: asm.cwrap("Hunspell_add", "number", ["number", "number"]),
  };

  const mountDir = `/spellcheck_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  asm.FS.mkdir(mountDir);
  const affPath = `${mountDir}/pt-br.aff`;
  const dicPath = `${mountDir}/pt-br.dic`;
  asm.FS.writeFile(affPath, new Uint8Array(aff), { encoding: "binary" });
  asm.FS.writeFile(dicPath, new Uint8Array(dic), { encoding: "binary" });

  const affPtr = asm.allocateUTF8(affPath);
  const dicPtr = asm.allocateUTF8(dicPath);
  const hunspellPtr = hunspell.create(affPtr, dicPtr);
  if (!hunspellPtr) throw new Error("Failed to create PT-BR Hunspell instance");

  return {
    spell: (word: string) => withUtf8(asm, [word], (wordPtr) => !!hunspell.spell(hunspellPtr, wordPtr)),
    suggest: (word: string) => {
      const suggestionListPtr = asm._malloc(4);
      try {
        const count = withUtf8(asm, [word], (wordPtr) =>
          hunspell.suggest(hunspellPtr, suggestionListPtr, wordPtr),
        );
        const listPtr = asm.getValue(suggestionListPtr, "*");
        const suggestions: string[] = [];
        for (let i = 0; i < count; i += 1) {
          const itemPtr = asm.getValue(listPtr + i * 4, "*");
          suggestions.push(asm.UTF8ToString(itemPtr));
        }
        hunspell.freeList(hunspellPtr, suggestionListPtr, count);
        return suggestions;
      } finally {
        asm._free(suggestionListPtr);
      }
    },
    addWord: (word: string) => {
      withUtf8(asm, [word], (wordPtr) => hunspell.add(hunspellPtr, wordPtr));
    },
  };
}

async function boot(): Promise<SpellInstance> {
  if (spell) return spell;
  if (bootPromise) return bootPromise;
  bootPromise = (async () => {
    console.debug("[spellWorker] boot start");
    const [affRes, dicRes] = await Promise.all([fetch(affUrl), fetch(dicUrl)]);
    console.debug("[spellWorker] dict responses", affRes.status, dicRes.status);
    if (!affRes.ok || !dicRes.ok) {
      throw new Error(`PT-BR dictionary failed to load (${affRes.status}/${dicRes.status})`);
    }
    const [aff, dic] = await Promise.all([affRes.arrayBuffer(), dicRes.arrayBuffer()]);
    console.debug("[spellWorker] dict buffers", aff.byteLength, dic.byteLength);
    const asm = await loadHunspellWasm();
    console.debug("[spellWorker] wasm loaded");
    const hunspell = createHunspellInstance(asm, aff, dic);
    console.debug("[spellWorker] hunspell created");

    spell = {
      correct: (w: string) => hunspell.spell(w),
      suggest: (w: string) => hunspell.suggest(w),
      add: (w: string) => hunspell.addWord(w),
    };
    return spell;
  })();
  return bootPromise;
}

// Warm up immediately so the first user request is fast.
void boot().catch((err) => {
  // eslint-disable-next-line no-console
  console.error("[spellWorker] failed to boot", err);
});

interface InMsg {
  id: number;
  type: "check" | "checkMany" | "suggest" | "lookup" | "add" | "ready";
  word?: string;
  words?: string[];
}

self.addEventListener("message", async (ev: MessageEvent<InMsg>) => {
  const { id, type, word, words } = ev.data || ({} as InMsg);
  try {
    const s = await boot();
    if (type === "ready") {
      (self as unknown as Worker).postMessage({ id, ready: true });
      return;
    }
    if (type === "checkMany") {
      const list = Array.isArray(words) ? words : [];
      const results: Record<string, boolean> = {};
      for (const w of list) {
        if (!w) continue;
        if (results[w] !== undefined) continue;
        try { results[w] = s.correct(w); } catch { results[w] = false; }
      }
      (self as unknown as Worker).postMessage({ id, results });
      return;
    }
    if (!word) {
      (self as unknown as Worker).postMessage({ id, error: "missing word" });
      return;
    }
    if (type === "check") {
      (self as unknown as Worker).postMessage({ id, correct: s.correct(word) });
    } else if (type === "suggest") {
      (self as unknown as Worker).postMessage({
        id,
        suggestions: s.suggest(word).slice(0, 6),
      });
    } else if (type === "lookup") {
      const correct = s.correct(word);
      (self as unknown as Worker).postMessage({
        id,
        correct,
        suggestions: correct ? [] : s.suggest(word).slice(0, 6),
      });
    } else if (type === "add") {
      s.add(word);
      (self as unknown as Worker).postMessage({ id, ok: true });
    }
  } catch (err) {
    (self as unknown as Worker).postMessage({
      id,
      error: (err as Error)?.message ?? "spell error",
    });
  }
});

export {};
