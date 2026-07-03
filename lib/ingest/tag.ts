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
    "carbon removal",
    "direct air capture",
    "resilience",
    "adaptation",
    "environmental justice",
    "disadvantaged communit",
    "climate smart",
    "climate-smart",
  ],
  energy: [
    "energy",
    "renewable",
    "solar",
    "wind",
    "offshore wind",
    "hydrogen",
    "fuel cell",
    "battery",
    "storage",
    "grid",
    "microgrid",
    "transmission",
    "demand response",
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
    "recycled water",
    "water reuse",
    "flood",
    "levee",
  ],
  agriculture: [
    "agricultur",
    "farm",
    "soil",
    "crop",
    "rangeland",
    "conservation easement",
    "food system",
    "regenerative",
    "healthy soils",
    "cover crop",
    "manure",
    "dairy digester",
    "working lands",
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
    "active transportation",
    "bike",
    "pedestrian",
    "rail",
    "port",
    "maritime",
    "aviation",
  ],
  waste: [
    "waste",
    "recycl",
    "compost",
    "circular economy",
    "landfill",
    "organics",
    "plastics",
    "e-waste",
    "remanufactur",
    "extended producer",
  ],
  land: [
    "forest",
    "wildfire",
    "fuels reduction",
    "reforestation",
    "vegetation",
    "habitat",
    "restoration",
    "biodiversity",
    "wetland",
    "coastal",
    "ocean",
    "marine",
    "landscape",
    "nature-based",
    "urban greening",
    "open space",
    "land conservation",
  ],
  buildings: [
    "energy efficiency",
    "weatherization",
    "heat pump",
    "retrofit",
    "green building",
    "building decarboniz",
    "zero net energy",
    "appliance",
    "insulation",
    "hvac",
  ],
  healthcare: [
    "health",
    "healthcare",
    "health care",
    "public health",
    "behavioral health",
    "mental health",
    "substance use",
    "clinic",
    "hospital",
    "patient",
    "medicaid",
    "medicare",
    "medi-cal",
    "biomedical",
    "clinical",
    "telehealth",
    "digital health",
    "medical device",
    "diagnostic",
    "therapeutic",
    "disease",
  ],
  workforce: [
    "workforce",
    "worker training",
    "job training",
    "apprenticeship",
    "reskilling",
    "upskilling",
    "career pathway",
    "vocational",
    "skills training",
    "labor",
    "employment training",
    "work-based learning",
  ],
  economic_development: [
    "economic development",
    "small business",
    "entrepreneur",
    "startup ecosystem",
    "business development",
    "job creation",
    "regional economic",
    "revitalization",
    "main street",
    "commercialization",
    "manufacturing extension",
    "rural business",
    "minority business",
    "community development",
    "capital access",
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
