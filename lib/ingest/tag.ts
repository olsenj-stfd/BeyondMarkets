/**
 * Deterministic keyword tagging for ingested opportunities. This only
 * categorizes real source text — it never invents data. The coarse `domain`
 * plus `tags` drive the cheap prefilter before the LLM ranking pass.
 */

const DOMAIN_KEYWORDS: Record<string, string[]> = {
  air: [
    "air quality",
    "emission",
    "emissions",
    "criteria pollutant",
    "ozone",
    "particulate",
    "pm2.5",
    "nox",
    "sox",
    "voc",
    "smog",
    "tailpipe",
    "stationary source",
    "clean air",
  ],
  climate: [
    "climate",
    "greenhouse gas",
    "ghg",
    "carbon",
    "decarboniz",
    "net zero",
    "net-zero",
    "cap-and-trade",
    "cap and trade",
    "methane",
    "sequestration",
    "emissions reduction",
  ],
  energy: [
    "energy",
    "renewable",
    "solar",
    "wind",
    "hydrogen",
    "fuel cell",
    "battery",
    "storage",
    "grid",
    "electrification",
    "ev ",
    "electric vehicle",
    "charging",
    "geothermal",
    "biofuel",
  ],
  water: [
    "water",
    "wastewater",
    "stormwater",
    "drinking water",
    "watershed",
    "groundwater",
    "drought",
    "desalination",
    "aquifer",
  ],
  agriculture: [
    "agricultur",
    "farm",
    "soil",
    "crop",
    "rangeland",
    "conservation easement",
    "food system",
  ],
  transportation: [
    "transportation",
    "freight",
    "truck",
    "vehicle",
    "mobility",
    "transit",
    "zero-emission vehicle",
    "zev",
  ],
  waste: [
    "waste",
    "recycl",
    "compost",
    "circular economy",
    "landfill",
    "organics",
  ],
};

export function classify(text: string): { domain: string | null; tags: string[] } {
  const haystack = text.toLowerCase();
  const tags: string[] = [];
  const scores: Record<string, number> = {};

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    let hits = 0;
    for (const kw of keywords) {
      if (haystack.includes(kw)) {
        hits += 1;
        if (!tags.includes(domain)) tags.push(domain);
      }
    }
    if (hits > 0) scores[domain] = hits;
  }

  // Primary domain = the category with the most keyword hits.
  let domain: string | null = null;
  let best = 0;
  for (const [d, score] of Object.entries(scores)) {
    if (score > best) {
      best = score;
      domain = d;
    }
  }

  return { domain, tags };
}
