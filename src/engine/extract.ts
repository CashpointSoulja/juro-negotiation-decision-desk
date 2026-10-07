import type { ClauseType, EngineVersion, Extraction, Span } from './types';

const WORD_NUMBERS: Record<string, number> = {
  once: 1, one: 1, twice: 2, two: 2, thrice: 3, three: 3, four: 4, five: 5, ten: 10,
  twelve: 12, fourteen: 14, thirty: 30, sixty: 60, ninety: 90, 'twenty-four': 24,
};

function num(token: string): number | undefined {
  const t = token.toLowerCase();
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  return WORD_NUMBERS[t];
}

function find(text: string, re: RegExp, label: string, spans: Span[]): RegExpExecArray | null {
  const m = re.exec(text);
  if (m) spans.push({ start: m.index, end: m.index + m[0].length, label });
  return m;
}

const JURISDICTIONS = ['England and Wales', 'England', 'Ireland', 'Scotland', 'New York', 'Delaware', 'California', 'Singapore', 'Germany'];

const BENIGN_CARVE_OUT = /(?:\b(?:save|except|provided) that\s+)?neither party (?:excludes|limits) (?:its )?liability for (?:fraud(?:ulent misrepresentation)?|death or personal injury caused by (?:its )?negligence)(?:[^.;]*)/gi;
const CARVE_OUT = /\b(?:except(?:ing)?|save (?:for|that)|excluding|other than|carve[- ]?outs?|super[- ]?cap|in addition|plus|notwithstanding|provided that|shall not apply|does not apply|not (?:be )?subject to)\b/i;
const MUTUAL_INDEMNITY = /\beach party (?:shall|will|agrees to|must)(?: \w+){0,2} indemnif\w*|\b(?:the )?parties (?:shall|will|agree to) (?:mutually )?indemnif\w*|\bmutual(?:ly)? indemnif\w*/i;
const ONE_WAY_INDEMNITY = /\b(?:only )?(?:the )?(?:customer|supplier|provider|vendor|licensee|licensor|seller|buyer|client|company) (?:alone )?(?:shall|will|agrees to|must)(?: \w+){0,2} indemnif\w*|\bonly the \w+ (?:shall|will) indemnif\w*/i;
const NOT_MUTUAL = /\b(?:not mutual|non-mutual|one-way|unilateral)\b/i;

function ambiguous(values: Extraction['values'], spans: Span[], note: string): Extraction {
  return { ok: false, ambiguous: true, values, spans, notes: [note] };
}

function capAmounts(text: string): string[] {
  const out = new Set<string>();
  for (const m of text.matchAll(/(\d{1,4})\s*%\s+of\s+the\s+(?:total\s+)?(?:annual\s+)?fees/gi)) out.add(`${Number(m[1]) / 100}x fees`);
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:x|×|times)\s+(?:the\s+)?(?:total\s+)?(?:annual\s+)?fees/gi)) out.add(`${Number(m[1])}x fees`);
  for (const m of text.matchAll(/\b(once|twice|thrice|one|two|three|four|five|ten)\s+(?:times\s+)?(?:the\s+)?(?:total\s+)?(?:annual\s+)?fees/gi)) out.add(`${num(m[1])}x fees`);
  for (const m of text.matchAll(/[£$€]\s?\d[\d,.]*(?:\s*(?:k|m|million|thousand)\b)?/gi)) out.add(m[0].trim());
  return [...out];
}

const LISTED = new RegExp(`\\b(${[...JURISDICTIONS].sort((a, b) => b.length - a.length).join('|')})\\b`, 'gi');
function lawsMentioned(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(LISTED)) {
    const raw = JURISDICTIONS.find((j) => j.toLowerCase() === m[1].toLowerCase())!;
    found.add(raw === 'England' ? 'England and Wales' : raw);
  }
  for (const m of text.matchAll(/\b(?:laws?|courts?)\s+of\s+(?:the\s+)?(?:State\s+of\s+)?([A-Z][a-z]+(?:\s+(?:and\s+)?[A-Z][a-z]+)*)/g)) {
    if (!JURISDICTIONS.some((j) => m[1].toLowerCase().startsWith(j.toLowerCase()))) found.add(m[1]);
  }
  return [...found];
}

export function extract(clause: ClauseType, text: string, engine: EngineVersion = 'v2-current'): Extraction {
  const spans: Span[] = [];
  const values: Extraction['values'] = {};
  const notes: string[] = [];
  const v2 = engine === 'v2-current';

  if (clause === 'liability_cap') {
    if (find(text, /\b(unlimited|uncapped|without limit|no limit)\b/i, 'uncapped', spans)) {
      values.uncapped = true;
      return { ok: true, values, spans, notes: ['Found uncapped wording.'] };
    }
    const pct = find(text, /(\d{1,4})\s*%\s+of\s+the\s+(?:total\s+)?(?:annual\s+)?fees/i, 'cap', spans);
    if (pct) { values.multiple = Number(pct[1]) / 100; notes.push(`Read "${pct[0]}" as ${values.multiple}x fees.`); }
    else {
      const mult = find(text, /(\d+(?:\.\d+)?)\s*(?:x|×|times)\s+(?:the\s+)?(?:total\s+)?(?:annual\s+)?fees/i, 'cap', spans);
      if (mult) { values.multiple = Number(mult[1]); notes.push(`Read "${mult[0]}" as ${values.multiple}x fees.`); }
      else if (v2) {
        const w = find(text, /\b(once|twice|thrice|one|two|three|four|five)\s+(?:times\s+)?(?:the\s+)?(?:total\s+)?(?:annual\s+)?fees/i, 'cap', spans);
        if (w) { values.multiple = num(w[1])!; notes.push(`Read "${w[0]}" as ${values.multiple}x fees.`); }
      }
    }
    if (values.multiple === undefined) notes.push('No cap amount found in a supported form (e.g. "100% of the fees", "2x the fees").');
    if (v2) {
      const amounts = capAmounts(text);
      if (amounts.length > 1) return ambiguous(values, spans, `Found more than one cap amount (${amounts.join(', ')}). A carve-out or super-cap needs a human read.`);
      const rest = text.replace(BENIGN_CARVE_OUT, ' ');
      const carve = CARVE_OUT.exec(rest);
      if (carve) return ambiguous(values, spans, `Found carve-out wording ("${carve[0]}") that may take some liability outside the stated cap.`);
    }
    return { ok: values.multiple !== undefined, values, spans, notes };
  }

  if (clause === 'indemnity') {
    if (!/indemnif/i.test(text)) return { ok: false, values, spans, notes: ['No indemnity wording found.'] };
    if (v2) {
      const mutualPhrase = find(text, MUTUAL_INDEMNITY, 'mutual', spans);
      const oneWay = ONE_WAY_INDEMNITY.exec(text);
      const negated = NOT_MUTUAL.exec(text);
      if (mutualPhrase && (oneWay || negated)) return ambiguous(values, spans, `Indemnity reads as both mutual ("${mutualPhrase[0]}") and one-way ("${(oneWay ?? negated)![0]}").`);
      values.mutual = !!mutualPhrase;
    } else values.mutual = !!find(text, /\beach party\b|\bmutual(?:ly)?\b/i, 'mutual', spans);
    const uncappedRe = v2
      ? /\b(unlimited|uncapped)\b|not\s+(?:be\s+)?subject\s+to\s+(?:the\s+|any\s+)?limitation|(?:outside|excluded\s+from)\s+the\s+(?:liability\s+)?cap/i
      : /\b(unlimited|uncapped)\b/i;
    values.uncapped = !!find(text, uncappedRe, 'uncapped', spans);
    values.dataScope = !!find(text, /\b(data protection|personal data|data breach)\b/i, 'data scope', spans);
    values.ipScope = !!find(text, /\b(intellectual property|infring\w*)\b/i, 'IP scope', spans);
    notes.push(`Mutual: ${values.mutual ? 'yes' : 'no'}. Outside the cap: ${values.uncapped ? 'yes' : 'no'}. Scope: ${[values.ipScope && 'IP', values.dataScope && 'data'].filter(Boolean).join(' + ') || 'general'}.`);
    return { ok: true, values, spans, notes };
  }

  if (clause === 'renewal_notice') {
    values.autoRenew = !!find(text, /renew\w*\s+automatically|automatically\s+renew\w*/i, 'auto-renewal', spans);
    const term = find(text, /successive\s+(?:periods\s+of\s+)?(\d+|twelve|twenty-four|one|two)[\s-]*(month|year)s?/i, 'renewal term', spans);
    if (term) {
      const n = num(term[1]);
      if (n !== undefined) values.renewalMonths = /year/i.test(term[2]) ? n * 12 : n;
    }
    if (v2) {
      const open = /\b(perpetual|indefinite(?:ly)?|evergreen|unlimited|successive\s+terms?\s+of\s+(?:the\s+)?(?:same|equal)\s+(?:length|duration))\b/i.exec(text);
      if (open) return ambiguous(values, spans, `Renewal term "${open[0]}" has no fixed length, so the maximum renewal term cannot be checked.`);
      if (values.autoRenew && values.renewalMonths === undefined) return ambiguous(values, spans, 'Clause renews automatically but no renewal term length was read, so the maximum renewal term cannot be checked.');
    }
    const noticeRe = v2
      ? /(\d+|fourteen|thirty|sixty|ninety)\s*(?:\(\d+\)\s*)?days['’]?\s+(?:prior\s+)?(?:written\s+)?notice/i
      : /(\d+)\s*days['’]?\s+(?:prior\s+)?(?:written\s+)?notice/i;
    const notice = find(text, noticeRe, 'notice period', spans);
    if (notice) values.noticeDays = num(notice[1])!;
    notes.push(values.noticeDays !== undefined ? `Notice period: ${values.noticeDays} days.` : 'No notice period found.');
    return { ok: values.noticeDays !== undefined, values, spans, notes };
  }

  if (v2) {
    const laws = lawsMentioned(text);
    if (laws.length > 1) return ambiguous(values, spans, `Found more than one governing law or forum (${laws.join(', ')}).`);
  }
  const re = new RegExp(`laws?\\s+of\\s+(?:the\\s+)?(?:State\\s+of\\s+)?(${JURISDICTIONS.join('|')})`, 'i');
  const m = find(text, re, 'governing law', spans);
  if (m) {
    const raw = JURISDICTIONS.find((j) => j.toLowerCase() === m[1].toLowerCase())!;
    values.law = raw === 'England' ? 'England and Wales' : raw;
    notes.push(`Governing law: ${values.law}.`);
  } else notes.push('No recognised governing law found.');
  return { ok: !!m, values, spans, notes };
}
