// Pick UI strings by <html lang>. Missing keys fall back to French.

export const LANGS = ["fr", "en", "it"];

export function pageLang(doc = globalThis.document) {
  const lang = doc?.documentElement?.lang?.slice(0, 2);
  return LANGS.includes(lang) ? lang : "fr";
}

export function stringsFor(all, lang) {
  return { ...(all?.fr ?? {}), ...(all?.[lang] ?? {}) };
}
