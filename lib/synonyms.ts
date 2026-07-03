/**
 * Static synonym/statute expansion for query generation. Maps a term the
 * company graph might use to the terms a REGULATOR would use in official
 * documents, so full-text matching reaches items that never mention the
 * company's own vocabulary (e.g. "ISA" → TILA/Reg Z coverage).
 * Matching is substring-based on the lowercased source term.
 */
const SYNONYMS: Record<string, string[]> = {
  // Education / workforce
  "income share": ["income share agreement", "private education loan", "truth in lending", "regulation z"],
  isa: ["income share agreement", "private education loan"],
  pell: ["title iv", "higher education act", "federal student aid", "workforce pell", "short-term pell"],
  "title iv": ["higher education act", "federal student aid", "pell"],
  wioa: ["workforce innovation and opportunity act", "eligible training provider", "individual training account", "workforce development board"],
  "student loan": ["student loan servicing", "borrower defense", "private education loan"],
  apprenticeship: ["registered apprenticeship", "work-based learning"],
  bootcamp: ["career training", "training provider", "postsecondary"],
  accredit: ["accreditation", "gainful employment", "program integrity"],
  // Consumer finance
  tila: ["truth in lending", "regulation z", "consumer credit"],
  lending: ["consumer loan", "truth in lending", "usury", "licensing"],
  "loan servicing": ["student loan servicing", "servicing license"],
  udaap: ["unfair deceptive", "consumer financial protection"],
  fintech: ["money transmission", "consumer financial"],
  // Healthcare
  medicaid: ["medi-cal", "state plan amendment", "1115 waiver", "managed care"],
  telehealth: ["telemedicine", "remote prescribing", "controlled substances"],
  opioid: ["substance use disorder", "opioid settlement", "samhsa"],
  "behavioral health": ["mental health", "substance use", "samhsa", "parity"],
  "340b": ["drug pricing", "covered entity"],
  // Climate / energy
  "45x": ["advanced manufacturing production credit", "inflation reduction act"],
  "45v": ["clean hydrogen production credit", "inflation reduction act"],
  itc: ["investment tax credit", "section 48"],
  ptc: ["production tax credit", "section 45"],
  lcfs: ["low carbon fuel standard", "clean fuel standard"],
  "cap-and-trade": ["cap and trade", "allowance auction", "ggrf"],
  ev: ["electric vehicle", "charging infrastructure", "zero-emission vehicle"],
};

/** Expand a set of terms with regulator-vocabulary synonyms, deduped. */
export function expandTerms(terms: string[]): string[] {
  const out = new Set<string>();
  for (const term of terms) {
    const t = term.toLowerCase().trim();
    if (!t) continue;
    out.add(t);
    for (const [key, expansions] of Object.entries(SYNONYMS)) {
      if (t.includes(key)) {
        for (const e of expansions) out.add(e);
      }
    }
  }
  return [...out];
}
