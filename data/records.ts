import type { RegRecord } from "@/lib/types";

/**
 * Curated dataset: U.S. federal + California regulatory, grant, and partner
 * landscape for mission-driven ventures. Hand-curated across sectors — climate
 * & environment (air, water, energy, transportation, materials), plus
 * healthcare, workforce development, and economic development. Each record is
 * summarized for orientation only — always confirm specifics against the linked
 * official source before making a compliance or funding decision.
 */
export const records: RegRecord[] = [
  // ───────────────────────── REGULATIONS ─────────────────────────
  {
    id: "epa-caa-title-v",
    type: "regulation",
    title: "Clean Air Act Title V Operating Permits",
    agency: "U.S. Environmental Protection Agency",
    agencyAcronym: "EPA",
    level: "federal",
    jurisdiction: "United States",
    domain: "air",
    summary:
      "Federal program requiring major stationary sources of air pollution to obtain a comprehensive operating permit consolidating all applicable Clean Air Act requirements.",
    applicability:
      "Major sources — facilities emitting or with potential to emit above threshold levels of criteria or hazardous air pollutants. Many hardware, manufacturing, and energy startups trigger this as they scale.",
    context:
      "Title V does not impose new emission limits; it gathers existing requirements into one enforceable permit. In California, permits are issued by the local air district rather than EPA directly.",
    howToEngage:
      "Determine your facility's potential-to-emit early. Contact your local air district's permitting division (not EPA) for the application. Pre-application meetings are common for novel processes.",
    tags: ["air permit", "stationary source", "emissions", "manufacturing", "compliance"],
    link: "https://www.epa.gov/title-v-operating-permits",
  },
  {
    id: "epa-nsps",
    type: "regulation",
    title: "New Source Performance Standards (NSPS)",
    agency: "U.S. Environmental Protection Agency",
    agencyAcronym: "EPA",
    level: "federal",
    jurisdiction: "United States",
    domain: "air",
    summary:
      "Technology-based emission standards for newly constructed, modified, or reconstructed stationary sources in specific industrial categories.",
    applicability:
      "Companies building new industrial equipment or facilities in a regulated source category (e.g., stationary engines, turbines, certain chemical processes). Relevant to climate-tech firms deploying first-of-a-kind hardware.",
    context:
      "NSPS reflects the 'best demonstrated technology' at the time of promulgation. The threshold question is whether your process falls within an existing 40 CFR Part 60 category.",
    howToEngage:
      "Identify your applicable subpart under 40 CFR Part 60. Request an applicability determination from EPA's regional office or your air district if your technology is novel.",
    tags: ["emission standards", "new source", "industrial", "hardware", "compliance"],
    link: "https://www.epa.gov/stationary-sources-air-pollution/new-source-performance-standards",
  },
  {
    id: "epa-ghgrp",
    type: "regulation",
    title: "Greenhouse Gas Reporting Program (GHGRP)",
    agency: "U.S. Environmental Protection Agency",
    agencyAcronym: "EPA",
    level: "federal",
    jurisdiction: "United States",
    domain: "climate",
    summary:
      "Mandatory annual reporting of greenhouse gas data from large emitters and certain suppliers of fuels and industrial gases.",
    applicability:
      "Facilities emitting 25,000+ metric tons CO2e per year, and suppliers above category thresholds. Carbon-intensive scale-ups and certain fuel/industrial-gas suppliers should track the threshold.",
    context:
      "GHGRP is a data-collection program, not a cap, but the reported data frequently feeds state cap-and-trade and rulemaking. Crossing the threshold also signals you are large enough to attract other regulatory attention.",
    howToEngage:
      "Register in EPA's e-GGRT system. Reporting is annual (typically due March 31). Use the applicability tool on EPA's site to confirm whether you must report.",
    tags: ["greenhouse gas", "reporting", "carbon", "emissions", "compliance"],
    link: "https://www.epa.gov/ghgreporting",
  },
  {
    id: "cwa-npdes",
    type: "regulation",
    title: "Clean Water Act NPDES Permits",
    agency: "U.S. EPA / CA State Water Resources Control Board",
    agencyAcronym: "EPA/SWRCB",
    level: "federal",
    jurisdiction: "United States (CA: delegated to State Water Board)",
    domain: "water",
    summary:
      "Permits regulating the discharge of pollutants from point sources into waters of the United States, including process wastewater and stormwater.",
    applicability:
      "Any venture discharging process water, treated effluent, or industrial stormwater — e.g., materials, chemicals, food/ag-tech, certain manufacturing and energy processes.",
    context:
      "In California the program is administered by the State and Regional Water Boards, not EPA directly. Stormwater alone (an Industrial General Permit) catches many facilities that assume they're exempt.",
    howToEngage:
      "Determine whether you need an individual permit or coverage under a general permit (e.g., the CA Industrial General Permit). File a Notice of Intent through the State Water Board's SMARTS system.",
    tags: ["water", "wastewater", "stormwater", "discharge", "NPDES", "compliance", "manufacturing"],
    link: "https://www.epa.gov/npdes",
  },
  {
    id: "ca-water-board",
    type: "regulation",
    title: "Porter-Cologne / State Water Board Permitting",
    agency: "California State Water Resources Control Board",
    agencyAcronym: "SWRCB",
    level: "state",
    jurisdiction: "California",
    domain: "water",
    summary:
      "California's foundational water-quality law, governing waste discharge requirements, groundwater protection, and water-rights considerations statewide.",
    applicability:
      "Ventures whose operations affect water quality or use — desalination, water reuse, mineral extraction, agriculture tech, land-based discharge, and many industrial processes.",
    context:
      "Porter-Cologne is often broader than the federal Clean Water Act and can regulate discharges to land and groundwater that NPDES does not. Nine Regional Water Boards implement it locally.",
    howToEngage:
      "Identify your Regional Water Board by geography and request a pre-application consultation. Waste Discharge Requirements (WDRs) are the common permit vehicle.",
    tags: ["water", "groundwater", "discharge", "porter-cologne", "california", "compliance"],
    link: "https://www.waterboards.ca.gov/",
  },
  {
    id: "carb-cap-and-trade",
    type: "regulation",
    title: "California Cap-and-Trade Program",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "climate",
    summary:
      "Statewide market-based cap on greenhouse gas emissions requiring covered entities to hold allowances equal to their emissions, traded at auction.",
    applicability:
      "Large industrial facilities, electricity generators/importers, and fuel suppliers emitting 25,000+ metric tons CO2e annually. Climate-tech firms can be a covered entity or a provider of abatement that reduces a customer's compliance cost.",
    context:
      "A cornerstone of California's economy-wide climate strategy. The allowance price puts a quantifiable value on emissions reductions — directly relevant to the business case for abatement technologies.",
    howToEngage:
      "Register in CARB's CITSS tracking system if covered. If you sell abatement, frame your value proposition in terms of avoided allowance cost. CARB holds public workshops on amendments.",
    tags: ["cap and trade", "carbon market", "greenhouse gas", "allowances", "offsets", "climate"],
    link: "https://ww2.arb.ca.gov/our-work/programs/cap-and-trade-program",
  },
  {
    id: "carb-lcfs",
    type: "regulation",
    title: "Low Carbon Fuel Standard (LCFS)",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "transport",
    summary:
      "Performance standard requiring reductions in the carbon intensity of transportation fuels, with tradable credits generated by low-carbon fuel providers.",
    applicability:
      "Producers and importers of transportation fuels, and providers of low-carbon alternatives — renewable diesel, biomethane, hydrogen, EV charging, and certain carbon-capture pathways can generate credits.",
    context:
      "LCFS is one of the most important revenue mechanisms for clean-fuel and EV-infrastructure startups in California. Credit prices can materially change project economics, and pathway approval is itself a key milestone.",
    howToEngage:
      "Apply for a fuel pathway certification through CARB's pathway application process. Engage early — certification can take months. CARB staff hold pathway workshops.",
    tags: ["low carbon fuel", "transportation", "credits", "hydrogen", "EV charging", "biofuel", "carbon intensity"],
    link: "https://ww2.arb.ca.gov/our-work/programs/low-carbon-fuel-standard",
  },
  {
    id: "carb-advanced-clean-trucks",
    type: "regulation",
    title: "Advanced Clean Trucks (ACT) Regulation",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "transport",
    summary:
      "Requires medium- and heavy-duty truck manufacturers to sell an increasing percentage of zero-emission vehicles in California over time.",
    applicability:
      "Truck OEMs selling into California, and indirectly the supply chain — battery, fuel-cell, powertrain, and charging/fueling startups serving commercial vehicles.",
    context:
      "ACT creates guaranteed demand for zero-emission trucks, de-risking the market for component and infrastructure suppliers. It pairs with fleet-side rules to create regulatory pull-through for the ZEV truck ecosystem.",
    howToEngage:
      "Manufacturers report sales and credits to CARB. Suppliers should monitor OEM compliance timelines to time product launches. CARB hosts implementation workshops.",
    tags: ["zero emission vehicle", "trucks", "heavy duty", "fleet", "battery", "fuel cell", "transportation"],
    link: "https://ww2.arb.ca.gov/our-work/programs/advanced-clean-trucks",
  },
  {
    id: "carb-airborne-toxic",
    type: "regulation",
    title: "Airborne Toxic Control Measures (ATCMs)",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "air",
    summary:
      "Source-specific rules controlling emissions of toxic air contaminants from activities and equipment across California.",
    applicability:
      "Operators of equipment or processes that emit toxic air contaminants — diesel engines, certain coatings/solvents, composting. Hardware and industrial-process startups should check for an applicable ATCM.",
    context:
      "ATCMs target health risk from toxics rather than GHGs or criteria pollutants. They are often the binding constraint for processes that are small on carbon but use hazardous inputs.",
    howToEngage:
      "Identify whether an ATCM covers your equipment category, then coordinate with your local air district, which enforces most ATCMs.",
    tags: ["toxic air contaminants", "diesel", "health risk", "solvents", "industrial", "compliance"],
    link: "https://ww2.arb.ca.gov/our-work/programs/airborne-toxic-control-measures",
  },
  {
    id: "carb-ab617",
    type: "regulation",
    title: "AB 617 Community Air Protection Program",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "air",
    summary:
      "Statewide program targeting air pollution in the most impacted communities through neighborhood-scale monitoring, Community Emissions Reduction Plans (CERPs), and tighter requirements on local sources.",
    applicability:
      "Facilities sited in or near designated AB 617 communities, especially those emitting criteria pollutants or air toxics. Hardware, industrial, and logistics ventures choosing a location should expect heightened scrutiny and monitoring expectations there.",
    context:
      "AB 617 shifts air regulation toward cumulative, neighborhood-scale impacts. Selected communities get monitoring networks and CERPs that can impose source-specific measures beyond statewide rules — and also unlock targeted incentive funding.",
    howToEngage:
      "Check whether your planned facility falls in a designated AB 617 community on CARB's program map, engage the local air district's community steering committee early, and align siting and controls with the local CERP.",
    tags: ["air quality", "environmental justice", "disadvantaged communities", "monitoring", "criteria pollutants", "air toxics", "siting"],
    link: "https://ww2.arb.ca.gov/our-work/programs/community-air-protection-program-ab617",
  },
  {
    id: "baaqmd-permit",
    type: "regulation",
    title: "BAAQMD Permit to Operate / Authority to Construct",
    agency: "Bay Area Air Quality Management District",
    agencyAcronym: "BAAQMD",
    level: "regional",
    jurisdiction: "San Francisco Bay Area (9 counties)",
    domain: "air",
    summary:
      "Regional air district permits required before constructing or operating equipment that emits air pollutants in the Bay Area.",
    applicability:
      "Any business in the nine-county Bay Area installing or operating emitting equipment — boilers, generators, process equipment, certain labs and pilot lines. Deep-tech startups frequently trigger this at scale-up.",
    context:
      "The Authority to Construct comes first, then the Permit to Operate. This is often a founder's earliest direct regulatory touchpoint and can gate facility build-out timelines, so scope it before signing a lease.",
    howToEngage:
      "Submit a permit application to BAAQMD's Engineering Division. Request a pre-application consultation for novel equipment. Budget for permit-processing time in your facility plan.",
    tags: ["air permit", "bay area", "authority to construct", "permit to operate", "facility", "pilot line"],
    link: "https://www.baaqmd.gov/permits",
  },
  {
    id: "sjvapcd-permit",
    type: "regulation",
    title: "San Joaquin Valley APCD Permitting",
    agency: "San Joaquin Valley Air Pollution Control District",
    agencyAcronym: "SJVAPCD",
    level: "regional",
    jurisdiction: "San Joaquin Valley, California",
    domain: "air",
    summary:
      "Air district permits and rules governing stationary-source emissions in the San Joaquin Valley, one of the nation's most ozone- and PM-challenged regions.",
    applicability:
      "Businesses operating emitting equipment in the San Joaquin Valley — ag-adjacent tech, logistics, manufacturing, and energy projects siting in the Central Valley.",
    context:
      "Because the Valley is in 'extreme' nonattainment for ozone, permitting and offset requirements here are among the most stringent in the country.",
    howToEngage:
      "Engage the District's permit services early; offset requirements may apply to new emissions. The District also runs incentive programs that can offset cost and emissions — ask about both at once.",
    tags: ["air permit", "san joaquin valley", "central valley", "nonattainment", "ozone", "offsets", "facility"],
    link: "https://www.valleyair.org/busind/pto/pto-permitting-idx.htm",
  },
  {
    id: "scaqmd-permit",
    type: "regulation",
    title: "South Coast AQMD Permitting & Rule 1401",
    agency: "South Coast Air Quality Management District",
    agencyAcronym: "SCAQMD",
    level: "regional",
    jurisdiction: "Greater Los Angeles region",
    domain: "air",
    summary:
      "Permitting and toxic-risk rules (including Rule 1401 new-source toxics limits) for equipment operated in the Los Angeles air basin.",
    applicability:
      "Businesses installing or operating emitting or toxics-emitting equipment in the LA region — hardware, advanced manufacturing, and clean-energy startups siting in Southern California.",
    context:
      "South Coast is a severe ozone nonattainment area with dense population, so new-source toxics review (Rule 1401) can be a binding constraint even for small equipment.",
    howToEngage:
      "File for a Permit to Construct/Operate with SCAQMD. For processes using toxics, model health risk early to confirm Rule 1401 compliance. SCAQMD offers small-business assistance.",
    tags: ["air permit", "los angeles", "south coast", "toxics", "rule 1401", "health risk", "facility"],
    link: "https://www.aqmd.gov/home/permits",
  },
  {
    id: "ceqa",
    type: "regulation",
    title: "California Environmental Quality Act (CEQA)",
    agency: "California Natural Resources Agency / Office of Planning & Research",
    agencyAcronym: "OPR",
    level: "state",
    jurisdiction: "California",
    domain: "cross-cutting",
    summary:
      "Requires state and local agencies to evaluate and disclose the environmental impacts of discretionary projects they approve, including air-quality and GHG impacts.",
    applicability:
      "Any startup whose project needs a discretionary government approval (permits, public-land leases, grants tied to construction). Project-developer climate startups are most exposed.",
    context:
      "CEQA review can add significant time and litigation risk to project timelines. It is frequently the gating item for first-of-a-kind facilities — sometimes more impactful to schedule than the air permit itself.",
    howToEngage:
      "Work with the lead agency to determine the level of review (exemption, Negative Declaration, or EIR). Engage environmental counsel early for novel or large projects.",
    tags: ["environmental review", "permitting", "project development", "infrastructure", "facility", "litigation"],
    link: "https://opr.ca.gov/ceqa/",
  },
  {
    id: "sb253-climate-disclosure",
    type: "regulation",
    title: "SB 253 Climate Corporate Data Accountability Act",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "climate",
    summary:
      "Requires large companies doing business in California to publicly disclose Scope 1, 2, and eventually Scope 3 greenhouse gas emissions.",
    applicability:
      "Companies above the statutory revenue threshold doing business in California. Most early startups are below it, but it shapes demand for emissions-measurement and reporting software.",
    context:
      "Even pre-threshold startups are affected indirectly: large customers subject to SB 253 push disclosure requirements down their supply chain, creating demand for carbon-accounting tools and verified low-carbon inputs.",
    howToEngage:
      "Track CARB's implementing regulations and reporting timeline. If you sell carbon-accounting or verification services, position against the deadlines. Submit comments during rulemaking.",
    tags: ["climate disclosure", "scope 3", "carbon accounting", "reporting", "supply chain", "software"],
    link: "https://ww2.arb.ca.gov/our-work/programs/climate-disclosure",
  },
  {
    id: "sb261-climate-risk",
    type: "regulation",
    title: "SB 261 Climate-Related Financial Risk Disclosure",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "climate",
    summary:
      "Requires large companies doing business in California to publish biennial reports on their climate-related financial risks and mitigation measures.",
    applicability:
      "Companies above the statutory revenue threshold. Relevant to climate-risk analytics, resilience, and reporting-software ventures whose customers must comply.",
    context:
      "SB 261 complements SB 253: where 253 covers emissions, 261 covers financial risk (aligned with TCFD-style frameworks). Together they create a California disclosure regime distinct from federal SEC rules.",
    howToEngage:
      "Monitor CARB's implementation. If you provide climate-risk data or reporting tools, map your product to the required disclosure elements and reporting cadence.",
    tags: ["climate disclosure", "financial risk", "TCFD", "reporting", "resilience", "software"],
    link: "https://ww2.arb.ca.gov/our-work/programs/climate-disclosure",
  },
  {
    id: "sb100-rps",
    type: "regulation",
    title: "SB 100 & Renewables Portfolio Standard (RPS)",
    agency: "CA Energy Commission / CA Public Utilities Commission",
    agencyAcronym: "CEC/CPUC",
    level: "state",
    jurisdiction: "California",
    domain: "energy",
    summary:
      "California's mandate for 100% clean electricity by 2045, with interim renewables targets that load-serving entities must meet.",
    applicability:
      "Clean generation, storage, and grid-software ventures — SB 100 is the demand driver that makes utilities and community-choice aggregators buyers of clean power and flexibility.",
    context:
      "Less a compliance burden for startups than a market-shaping mandate: it guarantees long-term procurement of clean resources, shaping who your utility and CCA customers must buy from.",
    howToEngage:
      "Understand which load-serving entities (IOUs, CCAs, POUs) must procure your resource type, and track CPUC procurement proceedings and CEC SB 100 reports.",
    tags: ["renewables", "clean electricity", "RPS", "SB 100", "grid", "procurement", "storage", "energy"],
    link: "https://www.energy.ca.gov/sb100",
  },
  {
    id: "cpuc-rule21",
    type: "regulation",
    title: "CPUC Rule 21 Interconnection",
    agency: "California Public Utilities Commission",
    agencyAcronym: "CPUC",
    level: "state",
    jurisdiction: "California (IOU territories)",
    domain: "energy",
    summary:
      "Governs how distributed energy resources — solar, storage, EV chargers, microgrids — connect to the distribution grid of California's investor-owned utilities.",
    applicability:
      "Any venture deploying behind-the-meter or distribution-connected generation, storage, or controllable load in PG&E, SCE, or SDG&E territory.",
    context:
      "Interconnection timelines and costs are a frequent hidden blocker for distributed-energy projects. Rule 21 sets the process; the technical bar (e.g., smart-inverter requirements) shapes product design.",
    howToEngage:
      "Review the utility's Rule 21 interconnection process and product eligibility lists early in hardware design. Engage the utility's interconnection team before site deployment.",
    tags: ["interconnection", "distributed energy", "solar", "storage", "microgrid", "EV charging", "grid", "energy"],
    link: "https://www.cpuc.ca.gov/rule21/",
  },
  {
    id: "title24-energy-code",
    type: "regulation",
    title: "Title 24 Building Energy Efficiency Standards",
    agency: "California Energy Commission",
    agencyAcronym: "CEC",
    level: "state",
    jurisdiction: "California",
    domain: "energy",
    summary:
      "California's building code requirements for energy efficiency, electrification, solar, and storage in new and renovated buildings.",
    applicability:
      "Building-tech, HVAC, heat-pump, solar, storage, and construction-software ventures — Title 24 sets the standards their products must meet or help buildings achieve.",
    context:
      "Title 24 is updated on a multi-year cycle and increasingly mandates electrification and on-site solar/storage, creating regulatory pull-through for building-decarbonization products.",
    howToEngage:
      "Track the current code cycle and any compliance-software certification you need (e.g., approved performance-compliance tools). Comment during CEC code-update proceedings.",
    tags: ["buildings", "energy efficiency", "electrification", "heat pump", "solar", "code", "energy"],
    link: "https://www.energy.ca.gov/programs-and-topics/programs/building-energy-efficiency-standards",
  },
  {
    id: "prop65",
    type: "regulation",
    title: "Proposition 65 (Safe Drinking Water & Toxic Enforcement Act)",
    agency: "CA Office of Environmental Health Hazard Assessment",
    agencyAcronym: "OEHHA",
    level: "state",
    jurisdiction: "California",
    domain: "cross-cutting",
    summary:
      "Requires warnings before exposing Californians to listed chemicals known to cause cancer or reproductive harm, and restricts certain discharges.",
    applicability:
      "Any venture selling physical products or operating facilities in California that may involve listed chemicals — materials, batteries, coatings, consumer hardware, food/ag.",
    context:
      "Prop 65 is enforced heavily through private litigation, not just the state. It is a frequent and costly surprise for hardware and consumer-product startups that overlook it.",
    howToEngage:
      "Audit your bill of materials against the Prop 65 list. Add compliant warnings where needed and document your exposure assessment to defend against enforcement actions.",
    tags: ["toxics", "chemicals", "product safety", "labeling", "consumer products", "materials", "litigation"],
    link: "https://oehha.ca.gov/proposition-65",
  },
  {
    id: "sb54-epr",
    type: "regulation",
    title: "SB 54 Plastic Pollution / Packaging EPR",
    agency: "California Department of Resources Recycling and Recovery",
    agencyAcronym: "CalRecycle",
    level: "state",
    jurisdiction: "California",
    domain: "cross-cutting",
    summary:
      "Extended Producer Responsibility law requiring producers of single-use packaging and plastic foodware to fund and meet recyclability and source-reduction targets.",
    applicability:
      "Consumer-goods, food, and materials ventures that put packaging on the California market, plus recycling, reuse, and compostable-materials startups that benefit from the mandate.",
    context:
      "SB 54 shifts the cost and accountability of packaging waste onto producers via a Producer Responsibility Organization, creating demand for recyclable and reusable alternatives.",
    howToEngage:
      "Determine whether you are a 'producer' under the law and whether you must join the PRO. Alternative-materials startups should position to the recyclability/source-reduction targets.",
    tags: ["EPR", "packaging", "plastics", "recycling", "circular economy", "materials", "consumer products"],
    link: "https://calrecycle.ca.gov/packaging/",
  },

  // ───────────────────────── GRANTS / INCENTIVES ─────────────────────────
  {
    id: "ca-climate-investments",
    type: "grant",
    title: "California Climate Investments (CCI)",
    agency: "California Air Resources Board (statewide portfolio)",
    agencyAcronym: "CCI",
    level: "state",
    jurisdiction: "California",
    domain: "climate",
    summary:
      "An umbrella of dozens of grant, voucher, and rebate programs funded by cap-and-trade auction proceeds — spanning clean transportation, energy, building decarbonization, waste, natural lands, and community resilience.",
    applicability:
      "Ventures whose projects cut greenhouse gas emissions in California, especially those delivering benefits to priority/disadvantaged communities, which receive a large statutory share of the funds.",
    context:
      "CCI is the spending side of the Greenhouse Gas Reduction Fund. Rather than one application, it is a portfolio of programs (HVIP, Clean Mobility Options, equitable building decarbonization, urban greening, and more), each with its own administrator and funding windows.",
    howToEngage:
      "Identify the specific CCI program that fits your project in the CCI program catalog, track that program's funding rounds, and emphasize quantified GHG reductions and community benefits in applications.",
    tags: ["grant", "cap and trade", "climate", "disadvantaged communities", "clean transportation", "funding", "incentive"],
    link: "https://www.caclimateinvestments.ca.gov/",
  },
  {
    id: "ca-ggrf",
    type: "grant",
    title: "Greenhouse Gas Reduction Fund (GGRF)",
    agency: "State of California (cap-and-trade proceeds)",
    agencyAcronym: "GGRF",
    level: "state",
    jurisdiction: "California",
    domain: "climate",
    summary:
      "The state fund that receives California cap-and-trade auction proceeds and appropriates them — through the annual budget — to the California Climate Investments programs.",
    applicability:
      "Indirectly relevant to any California climate venture: GGRF appropriations determine how much funding flows to each CCI program each year, so the state budget cycle drives program availability.",
    context:
      "GGRF is the funding source behind CCI. Watching the Governor's budget and legislative appropriations signals which programs will be well-funded in the coming cycle — useful for timing applications.",
    howToEngage:
      "Track the annual state budget and GGRF appropriations to anticipate which CCI programs will open, then apply through the relevant program administrator.",
    tags: ["funding", "cap and trade", "state budget", "climate", "appropriations", "grant"],
    link: "https://ww2.arb.ca.gov/our-work/programs/california-climate-investments",
  },
  {
    id: "calstart-hvip",
    type: "grant",
    title: "HVIP — Hybrid & Zero-Emission Truck and Bus Voucher Incentive Project",
    agency: "CALSTART (administered for CARB)",
    agencyAcronym: "CALSTART",
    level: "state",
    jurisdiction: "California",
    domain: "transport",
    summary:
      "Point-of-sale vouchers that reduce the purchase price of eligible zero-emission and hybrid trucks and buses for California fleets.",
    applicability:
      "Fleets purchasing eligible ZEV trucks/buses, and the manufacturers whose vehicles are on the eligible list. ZEV vehicle and powertrain startups benefit by getting products voucher-eligible.",
    context:
      "HVIP is one of the largest demand-side incentives for commercial ZEVs. Getting a vehicle onto the eligibility list is a significant commercial milestone for a startup OEM.",
    howToEngage:
      "Manufacturers apply to add vehicles to the eligible list via CALSTART. Fleets request vouchers through participating dealers while funds are available — funding rounds open and close.",
    tags: ["voucher", "zero emission vehicle", "trucks", "buses", "fleet", "incentive", "OEM", "transportation"],
    link: "https://californiahvip.org/",
  },
  {
    id: "carb-clean-mobility",
    type: "grant",
    title: "Clean Mobility Options Voucher Pilot Program",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    domain: "transport",
    summary:
      "Vouchers funding clean transportation projects — carsharing, on-demand shuttles, bikeshare — in under-resourced California communities.",
    applicability:
      "Community organizations and mobility-service startups deploying shared zero-emission transportation in disadvantaged communities.",
    context:
      "Part of California Climate Investments funded by cap-and-trade proceeds. Applications are scored heavily on community benefit, not just technology.",
    howToEngage:
      "Watch for open funding windows and partner with a community-based organization, which strengthens applications. Attend administrator webinars before applying.",
    tags: ["mobility", "shared mobility", "equity", "disadvantaged communities", "voucher", "transportation", "EV"],
    link: "https://www.cleanmobilityoptions.org/",
  },
  {
    id: "baaqmd-carl-moyer",
    type: "grant",
    title: "Carl Moyer Program (BAAQMD)",
    agency: "Bay Area Air Quality Management District",
    agencyAcronym: "BAAQMD",
    level: "regional",
    jurisdiction: "San Francisco Bay Area",
    domain: "air",
    summary:
      "Grant funding for the incremental cost of cleaner-than-required engines, equipment, and emission-reduction projects in the Bay Area.",
    applicability:
      "Owners of heavy-duty engines and equipment (on-road, off-road, marine, agricultural) upgrading to cleaner technology. Startups selling clean engines/equipment can route customers here.",
    context:
      "Carl Moyer is a statewide program administered locally by each air district. It funds the cost gap between a clean and conventional option, making early-stage clean products cost-competitive at point of sale.",
    howToEngage:
      "Apply through BAAQMD's funding programs during open solicitations. Projects must deliver surplus, quantifiable emission reductions. Other air districts run their own Carl Moyer solicitations.",
    tags: ["grant", "carl moyer", "engines", "equipment", "heavy duty", "bay area", "incentive", "diesel"],
    link: "https://www.baaqmd.gov/funding-and-incentives",
  },
  {
    id: "sjvapcd-incentives",
    type: "grant",
    title: "San Joaquin Valley APCD Incentive Programs",
    agency: "San Joaquin Valley Air Pollution Control District",
    agencyAcronym: "SJVAPCD",
    level: "regional",
    jurisdiction: "San Joaquin Valley, California",
    domain: "air",
    summary:
      "A broad portfolio of grants and vouchers (Carl Moyer, Truck Replacement, charging infrastructure, agricultural equipment) to cut emissions in the Valley.",
    applicability:
      "Businesses, fleets, and growers in the San Joaquin Valley replacing or upgrading equipment, plus clean-tech vendors serving them.",
    context:
      "Because the Valley faces the toughest air-quality challenges, the District runs unusually large and varied incentive budgets — often the hardest place to permit but the easiest place to find customer subsidies.",
    howToEngage:
      "Review the District's current funding solicitations and eligibility. Many programs are first-come, first-served until funds run out, so monitor openings and prepare in advance.",
    tags: ["grant", "incentive", "san joaquin valley", "central valley", "fleet", "agriculture", "charging", "truck replacement"],
    link: "https://www.valleyair.org/grants/",
  },
  {
    id: "cec-clean-transportation",
    type: "grant",
    title: "CEC Clean Transportation Program",
    agency: "California Energy Commission",
    agencyAcronym: "CEC",
    level: "state",
    jurisdiction: "California",
    domain: "transport",
    summary:
      "Competitive grants and funding for ZEV infrastructure, fuel production, manufacturing, and emerging transportation technologies.",
    applicability:
      "Startups developing charging/hydrogen infrastructure, clean-fuel production, ZEV manufacturing, or related R&D and pilots in California.",
    context:
      "One of the most relevant state grant sources for hardware-heavy clean-transportation startups. Solicitations (GFOs) are released on a rolling basis by topic.",
    howToEngage:
      "Monitor the CEC's Grant Funding Opportunities (GFO) page and subscribe to the listserv. Proposals are competitive and scored — start early and attend the pre-application workshop.",
    tags: ["grant", "infrastructure", "charging", "hydrogen", "manufacturing", "ZEV", "R&D", "transportation"],
    link: "https://www.energy.ca.gov/programs-and-topics/programs/clean-transportation-program",
  },
  {
    id: "cec-epic",
    type: "grant",
    title: "Electric Program Investment Charge (EPIC)",
    agency: "California Energy Commission",
    agencyAcronym: "CEC",
    level: "state",
    jurisdiction: "California",
    domain: "energy",
    summary:
      "Funds clean-energy research, development, and demonstration projects that benefit ratepayers of California's investor-owned utilities.",
    applicability:
      "Startups developing clean generation, storage, grid, and efficiency technologies seeking RD&D and demonstration funding.",
    context:
      "A key non-dilutive funding source for energy-tech demonstrations in California, bridging the 'valley of death' between lab and commercial deployment. Awards often require a California demonstration site.",
    howToEngage:
      "Track EPIC solicitations on the CEC site. Demonstrations typically need a host site and utility coordination — line these up before applying. Pre-application workshops are held for most solicitations.",
    tags: ["grant", "RD&D", "energy storage", "grid", "clean energy", "demonstration", "non-dilutive"],
    link: "https://www.energy.ca.gov/programs-and-topics/programs/electric-program-investment-charge-epic-program",
  },
  {
    id: "cec-calseed",
    type: "grant",
    title: "CalSEED — Clean Energy Entrepreneur Development",
    agency: "California Energy Commission (administered by program partners)",
    agencyAcronym: "CEC",
    level: "state",
    jurisdiction: "California",
    domain: "energy",
    summary:
      "Early-stage grants (concept and prototype awards) plus mentorship for clean-energy innovators in California.",
    applicability:
      "Pre-seed and seed-stage clean-energy hardware and software startups in California needing non-dilutive capital and structured support.",
    context:
      "CalSEED is one of the few programs explicitly aimed at the earliest stage of clean-energy ventures, combining small grants with an accelerator-style cohort — useful as both capital and credibility.",
    howToEngage:
      "Apply during the annual CalSEED solicitation. Awards are staged (concept then prototype). Engage the program's network even before formal funding rounds open.",
    tags: ["grant", "non-dilutive", "early stage", "clean energy", "prototype", "accelerator", "seed"],
    link: "https://calseed.fund/",
  },
  {
    id: "cpuc-sgip",
    type: "grant",
    title: "Self-Generation Incentive Program (SGIP)",
    agency: "California Public Utilities Commission",
    agencyAcronym: "CPUC",
    level: "state",
    jurisdiction: "California (IOU territories)",
    domain: "energy",
    summary:
      "Rebates for installing behind-the-meter energy storage and certain distributed generation, with higher incentives for resiliency and equity use cases.",
    applicability:
      "Energy-storage developers, installers, and microgrid ventures, plus their customers in PG&E, SCE, SDG&E, and SoCalGas territory.",
    context:
      "SGIP is a major demand-side lever for the storage market in California. Equity and resiliency budget categories can substantially improve project economics for targeted customers.",
    howToEngage:
      "Work through a participating developer/installer to reserve incentives. Track budget availability by category, which depletes over time. Administered via the utilities.",
    tags: ["rebate", "energy storage", "battery", "microgrid", "resiliency", "distributed energy", "incentive", "energy"],
    link: "https://www.cpuc.ca.gov/sgip",
  },
  {
    id: "doe-loan-programs",
    type: "grant",
    title: "U.S. DOE Loan Programs Office (LPO)",
    agency: "U.S. Department of Energy",
    agencyAcronym: "DOE",
    level: "federal",
    jurisdiction: "United States",
    domain: "energy",
    summary:
      "Federal loans and loan guarantees for deploying large-scale clean-energy, advanced-transportation, and manufacturing projects.",
    applicability:
      "Later-stage climate startups financing first commercial-scale facilities — energy, advanced manufacturing, clean fuels — too capital-intensive for conventional debt.",
    context:
      "LPO addresses the capital gap for first-of-a-kind commercial projects. An LPO term sheet can de-risk a project for equity investors, but the process is long and documentation-heavy.",
    howToEngage:
      "Begin with a pre-application consultation with LPO staff to gauge fit. Expect extensive technical and financial diligence. Best pursued once you have a defined project, site, and offtake.",
    tags: ["loan", "project finance", "first of a kind", "manufacturing", "energy", "scale-up", "federal", "non-dilutive"],
    link: "https://www.energy.gov/lpo/loan-programs-office",
  },
  {
    id: "epa-sbir",
    type: "grant",
    title: "EPA Small Business Innovation Research (SBIR)",
    agency: "U.S. Environmental Protection Agency",
    agencyAcronym: "EPA",
    level: "federal",
    jurisdiction: "United States",
    domain: "cross-cutting",
    summary:
      "Phased, non-dilutive R&D funding for small businesses developing environmental and clean-tech innovations, including air- and water-quality solutions.",
    applicability:
      "Small businesses (per SBA size standards) with early-stage environmental technology — air monitoring, pollution control, sustainable materials, water, and related areas.",
    context:
      "Classic non-dilutive seed-stage capital. Phase I funds feasibility; Phase II funds development. Topics are set annually and align with EPA priorities.",
    howToEngage:
      "Register in SAM.gov and SBA systems early (weeks of lead time). Match your technology to a published solicitation topic and submit by the deadline. EPA holds informational webinars each cycle.",
    tags: ["grant", "SBIR", "non-dilutive", "R&D", "small business", "air monitoring", "pollution control", "seed"],
    link: "https://www.epa.gov/sbir",
  },
  {
    id: "fed-sbir-sttr",
    type: "grant",
    title: "DOE / NSF SBIR & STTR Programs",
    agency: "U.S. Department of Energy / National Science Foundation",
    agencyAcronym: "DOE/NSF",
    level: "federal",
    jurisdiction: "United States",
    domain: "cross-cutting",
    summary:
      "Phased non-dilutive R&D funding (Phase I feasibility, Phase II development) for small businesses across energy, climate, and deep-tech topics.",
    applicability:
      "Small businesses with science- or engineering-driven innovations. DOE topics skew energy/climate hardware; NSF funds a broad range of deep tech with commercialization potential.",
    context:
      "Beyond EPA's program, DOE and NSF run the largest SBIR/STTR pipelines relevant to climate ventures. NSF's program is notably technology-agnostic and founder-friendly for first-time applicants.",
    howToEngage:
      "Register in SAM.gov early. For NSF, submit a Project Pitch first to confirm fit before a full proposal. For DOE, match to a topic in the annual Funding Opportunity Announcement.",
    tags: ["grant", "SBIR", "STTR", "non-dilutive", "R&D", "deep tech", "energy", "federal", "seed"],
    link: "https://seedfund.nsf.gov/",
  },
  {
    id: "usda-reap",
    type: "grant",
    title: "USDA Rural Energy for America Program (REAP)",
    agency: "U.S. Department of Agriculture",
    agencyAcronym: "USDA",
    level: "federal",
    jurisdiction: "United States (rural areas)",
    domain: "energy",
    summary:
      "Grants and loan guarantees for renewable energy systems and energy-efficiency improvements for agricultural producers and rural small businesses.",
    applicability:
      "Ag-tech, on-farm renewables, and rural energy-efficiency ventures — and clean-energy vendors whose rural customers can use REAP to fund purchases.",
    context:
      "REAP is an underused channel for routing federal capital to rural clean-energy deployment, including much of California's Central Valley agricultural economy.",
    howToEngage:
      "Work with a USDA Rural Development state office. Vendors can help customers assemble applications. Watch annual application windows and funding pools.",
    tags: ["grant", "loan", "rural", "agriculture", "renewable energy", "efficiency", "federal", "central valley"],
    link: "https://www.rd.usda.gov/programs-services/energy-programs/rural-energy-america-program-renewable-energy-systems-energy-efficiency-improvement-guaranteed-loans",
  },
  {
    id: "irs-clean-energy-credits",
    type: "grant",
    title: "Federal Clean Energy Tax Credits (ITC / PTC / IRA)",
    agency: "U.S. Internal Revenue Service / Treasury",
    agencyAcronym: "IRS",
    level: "federal",
    jurisdiction: "United States",
    domain: "energy",
    summary:
      "Investment and production tax credits for clean generation, storage, manufacturing (45X), hydrogen (45V), and more — many transferable or eligible for direct pay.",
    applicability:
      "Clean-energy project developers and clean-tech manufacturers. Transferability and direct-pay provisions make these credits monetizable even by startups without large tax liability.",
    context:
      "The single largest federal lever for clean-energy economics. Credit transferability has created a market where startups can sell credits for near-term cash — a material part of many project capital stacks.",
    howToEngage:
      "Work with tax counsel to confirm which credit(s) apply and whether to use direct pay or transfer. Register projects through the IRS pre-filing process where required.",
    tags: ["tax credit", "ITC", "PTC", "45X", "45V", "IRA", "project finance", "manufacturing", "energy", "non-dilutive"],
    link: "https://www.irs.gov/credits-deductions/businesses",
  },

  // ───────────────────────── POTENTIAL PARTNERS ─────────────────────────
  {
    id: "activate-fellowship",
    type: "partner",
    title: "Activate Fellowship",
    agency: "Activate (non-profit)",
    agencyAcronym: "Activate",
    level: "private",
    jurisdiction: "Berkeley, CA + national cohorts",
    domain: "cross-cutting",
    summary:
      "A two-year fellowship giving science entrepreneurs a living stipend, R&D funding, lab access, and mentorship to turn research into a company.",
    applicability:
      "Deep-tech / hard-tech founders at the earliest stage (often pre-company) commercializing science, including climate and energy hardware.",
    context:
      "Activate (originally Cyclotron Road at Lawrence Berkeley National Lab) is one of the premier landing spots for hard-tech founders, providing non-dilutive support and embedding fellows in a national-lab ecosystem.",
    howToEngage:
      "Apply during the annual fellowship cycle. Strong candidates have a technical breakthrough and a credible path from lab to product. Engage alumni and program staff before applying.",
    tags: ["fellowship", "deep tech", "hard tech", "non-dilutive", "lab access", "ecosystem", "early stage", "founders"],
    link: "https://www.activate.org/",
  },
  {
    id: "laci",
    type: "partner",
    title: "Los Angeles Cleantech Incubator (LACI)",
    agency: "LACI (non-profit)",
    agencyAcronym: "LACI",
    level: "private",
    jurisdiction: "Los Angeles, CA",
    domain: "cross-cutting",
    summary:
      "A cleantech incubator providing startups with mentorship, prototyping space, pilot opportunities, and connections to LA-region partners and capital.",
    applicability:
      "Early- to growth-stage cleantech startups, especially in transportation, energy, and circular economy, that can pilot in the Los Angeles region.",
    context:
      "LACI is a hub connecting startups to municipal pilots, utilities, and investors in Southern California, and runs equity-focused programs that align well with impact ventures.",
    howToEngage:
      "Apply to LACI's incubation or accelerator tracks. Pilot partnerships with the City of LA and regional utilities are a key draw — scope which pilots fit your product.",
    tags: ["incubator", "accelerator", "cleantech", "los angeles", "pilots", "ecosystem", "transportation", "energy"],
    link: "https://laincubator.org/",
  },
  {
    id: "berkeley-skydeck",
    type: "partner",
    title: "UC Berkeley SkyDeck",
    agency: "University of California, Berkeley",
    agencyAcronym: "SkyDeck",
    level: "private",
    jurisdiction: "Berkeley, CA",
    domain: "cross-cutting",
    summary:
      "UC Berkeley's startup accelerator and venture fund, offering cohort programs, mentorship, and investment to startups (with strong university research ties).",
    applicability:
      "Startups — including climate and energy — that can leverage Berkeley's research ecosystem, talent, and accelerator cohorts.",
    context:
      "A leading university-affiliated accelerator with an associated fund; valuable for founders with research roots or who want access to Berkeley talent and the Bay Area investor network.",
    howToEngage:
      "Apply to the relevant SkyDeck track (cohort programs differ by stage and affiliation). University affiliation strengthens some pathways but is not always required.",
    tags: ["accelerator", "university", "berkeley", "venture fund", "ecosystem", "research", "founders"],
    link: "https://skydeck.berkeley.edu/",
  },
  {
    id: "national-labs",
    type: "partner",
    title: "National Lab Partnerships (LBNL, NREL, SLAC, LLNL)",
    agency: "U.S. Department of Energy national laboratories",
    agencyAcronym: "DOE Labs",
    level: "federal",
    jurisdiction: "United States (several in California)",
    domain: "cross-cutting",
    summary:
      "Mechanisms (CRADAs, user facilities, voucher programs) that give startups access to national-lab expertise, instruments, and validation.",
    applicability:
      "Hardware and deep-tech climate ventures needing world-class characterization, modeling, testing, or validation they can't build in-house.",
    context:
      "DOE labs — several in California (LBNL, SLAC, LLNL) — offer voucher programs and collaboration agreements that provide credibility and capability. Lab validation can de-risk a technology for investors and customers.",
    howToEngage:
      "Explore DOE voucher programs and lab partnership offices. Identify the user facility or research group matching your need, and engage their business-development contact.",
    tags: ["national lab", "validation", "testing", "CRADA", "deep tech", "research", "federal", "hardware"],
    link: "https://www.energy.gov/technologytransitions/working-national-labs",
  },
  {
    id: "elemental-impact",
    type: "partner",
    title: "Elemental Impact (Elemental Excelerator)",
    agency: "Elemental Impact (non-profit)",
    agencyAcronym: "Elemental",
    level: "private",
    jurisdiction: "California / national",
    domain: "cross-cutting",
    summary:
      "A non-profit that funds and supports climate-tech startups with project-deployment capital and equity-centered community-scale projects.",
    applicability:
      "Growth-stage climate startups ready to deploy real-world projects, especially those with community and equity impact.",
    context:
      "Elemental bridges the gap between pilot and scale by funding actual deployments (not just R&D), and emphasizes community benefit — a strong fit for impact ventures.",
    howToEngage:
      "Apply to Elemental's funding tracks/cohorts. Be ready to describe a concrete deployment project and its community impact, not just the technology.",
    tags: ["project funding", "deployment", "climate", "equity", "community", "growth stage", "ecosystem", "capital"],
    link: "https://elementalimpact.org/",
  },
  {
    id: "breakthrough-energy",
    type: "partner",
    title: "Breakthrough Energy (Catalyst / Fellows)",
    agency: "Breakthrough Energy",
    agencyAcronym: "BE",
    level: "private",
    jurisdiction: "United States / global",
    domain: "cross-cutting",
    summary:
      "A climate-focused investor and program operator funding breakthrough technologies and first-of-a-kind projects across hard-to-abate sectors.",
    applicability:
      "Ventures with potential for large-scale emissions reduction in hard-to-abate sectors — hydrogen, long-duration storage, sustainable fuels, industrial heat, carbon management.",
    context:
      "Breakthrough Energy combines patient capital, project financing (Catalyst), and a fellows program, and is a strong signal partner for deep-decarbonization startups.",
    howToEngage:
      "Engage the program matching your stage (Fellows for early innovators, Catalyst for first-of-a-kind project finance). A clear gigaton-scale emissions thesis is central to fit.",
    tags: ["capital", "climate investor", "first of a kind", "hard to abate", "hydrogen", "storage", "fuels", "fellows"],
    link: "https://www.breakthroughenergy.org/",
  },
  {
    id: "ca-ibank",
    type: "partner",
    title: "California Infrastructure & Economic Development Bank (IBank)",
    agency: "State of California (GO-Biz)",
    agencyAcronym: "IBank",
    level: "state",
    jurisdiction: "California",
    domain: "cross-cutting",
    summary:
      "California's state financing authority, offering low-cost loans, loan guarantees, and bond financing for infrastructure and economic-development projects, including climate.",
    applicability:
      "Ventures financing California-based infrastructure, manufacturing, or clean-energy projects that fit IBank's loan, guarantee, or bond programs.",
    context:
      "IBank is an under-recognized source of patient, low-cost public capital for California projects, including a Climate Catalyst program targeting climate infrastructure financing gaps.",
    howToEngage:
      "Review IBank's loan, guarantee, and Climate Catalyst programs to find a fit, then contact the relevant program team. Best suited to projects with a California footprint.",
    tags: ["capital", "loan", "green bank", "infrastructure", "project finance", "climate catalyst", "california", "non-dilutive"],
    link: "https://www.ibank.ca.gov/",
  },
  {
    id: "ca-climate-vc",
    type: "partner",
    title: "California Climate VC Ecosystem",
    agency: "Private venture capital (Congruent, Prelude, Powerhouse, et al.)",
    agencyAcronym: "Climate VC",
    level: "private",
    jurisdiction: "California (Bay Area / statewide)",
    domain: "cross-cutting",
    summary:
      "A cluster of California-based, climate-specialist venture firms that provide equity capital plus deep sector networks (regulatory, commercial, talent).",
    applicability:
      "Venture-scale climate startups raising equity that want investors fluent in the regulatory and incentive landscape, not just generalist capital.",
    context:
      "California hosts a dense concentration of climate-specialist VCs. Beyond capital, these firms add value through regulatory navigation, customer intros, and follow-on syndication — relevant to how this tool's regulatory map informs fundraising.",
    howToEngage:
      "Target firms whose stage and sector thesis match yours; warm intros through the ecosystem (accelerators, labs, other founders) materially raise response rates.",
    tags: ["capital", "venture capital", "equity", "climate investor", "fundraising", "ecosystem", "california"],
    link: "https://www.powerhouse.fund/",
  },

  // ── Named accelerators & incubators ──
  {
    id: "greentown-labs",
    type: "partner",
    title: "Greentown Labs",
    agency: "Greentown Labs (non-profit)",
    agencyAcronym: "Greentown",
    level: "private",
    jurisdiction: "Somerville, MA + Houston, TX (national network)",
    domain: "cross-cutting",
    summary:
      "North America's largest climatetech startup incubator, offering prototyping labs, office and wet-lab space, shared equipment, and a corporate-partner network.",
    applicability:
      "Early- to growth-stage climate hardware ventures that need physical lab/prototyping space and access to corporate pilot partners.",
    context:
      "Greentown is a flagship hardware-friendly incubator; membership signals credibility and plugs founders into utilities, corporates, and investors. While its campuses are in MA and TX, its programs and corporate network reach California ventures.",
    howToEngage:
      "Apply for membership or a sponsored accelerator program (e.g., partner-run cohorts). Be ready to describe your hardware roadmap and space/equipment needs.",
    tags: ["incubator", "accelerator", "cleantech", "hardware", "prototyping", "lab space", "ecosystem"],
    link: "https://greentownlabs.com/",
  },
  {
    id: "third-derivative",
    type: "partner",
    title: "Third Derivative (D3)",
    agency: "RMI + New Energy Nexus",
    agencyAcronym: "D3",
    level: "private",
    jurisdiction: "Global (U.S.-based)",
    domain: "cross-cutting",
    summary:
      "A global climatetech accelerator co-founded by RMI and New Energy Nexus, connecting startups to a syndicate of investors, corporate partners, and subject-matter experts.",
    applicability:
      "Seed to Series A climate startups across energy, mobility, buildings, industry, food, and carbon that want investor and corporate access plus deep technical mentorship.",
    context:
      "D3 pairs a large investor syndicate with corporate offtake partners and RMI's technical bench — useful for ventures seeking both capital and commercial validation.",
    howToEngage:
      "Apply during open cohort cycles. Strong applicants articulate a clear decarbonization thesis and a near-term pilot or commercial milestone.",
    tags: ["accelerator", "climate", "investor syndicate", "corporate partners", "RMI", "ecosystem", "early stage"],
    link: "https://third-derivative.org/",
  },
  {
    id: "new-energy-nexus-calseed",
    type: "partner",
    title: "New Energy Nexus / CalSEED",
    agency: "New Energy Nexus (admin) + California Energy Commission",
    agencyAcronym: "CalSEED",
    level: "state",
    jurisdiction: "California",
    domain: "energy",
    summary:
      "CalSEED provides non-dilutive grants (concept and prototype awards) plus incubation to early-stage California clean-energy innovators, administered by New Energy Nexus and funded by the CEC.",
    applicability:
      "Very early-stage (often pre-seed) California-based clean-energy hardware and software innovators seeking non-dilutive funding and structured incubation.",
    context:
      "CalSEED is one of the few sources of true pre-seed non-dilutive capital for California clean-energy founders, with a supportive cohort and follow-on prototype funding.",
    howToEngage:
      "Apply during the annual CalSEED solicitation. Awards start with a concept grant; strong performers can earn follow-on prototype funding. California residency/footprint required.",
    tags: ["non-dilutive", "grant", "clean energy", "incubator", "california", "pre-seed", "CEC", "early stage"],
    link: "https://calseed.fund/",
  },

  // ── Named climate venture funds ──
  {
    id: "lowercarbon-capital",
    type: "partner",
    title: "Lowercarbon Capital",
    agency: "Lowercarbon Capital (VC)",
    agencyAcronym: "Lowercarbon",
    level: "private",
    jurisdiction: "United States (global investing)",
    domain: "cross-cutting",
    summary:
      "A prominent climate-focused venture firm backing technologies that reduce, remove, or avoid greenhouse-gas emissions across many sectors.",
    applicability:
      "Venture-scale climate startups — from carbon removal and fusion to industrial decarbonization — with credible large-scale emissions-impact theses.",
    context:
      "Lowercarbon is a high-signal climate investor whose participation can catalyze a round; it invests across stages with a strong bias toward hard-tech and gigaton-scale impact.",
    howToEngage:
      "Best reached through warm intros from portfolio founders or co-investors. Lead with a quantified emissions-impact thesis and technical defensibility.",
    tags: ["capital", "venture capital", "climate investor", "carbon removal", "hard tech", "fundraising", "equity"],
    link: "https://lowercarboncapital.com/",
  },
  {
    id: "congruent-ventures",
    type: "partner",
    title: "Congruent Ventures",
    agency: "Congruent Ventures (VC)",
    agencyAcronym: "Congruent",
    level: "private",
    jurisdiction: "San Francisco, CA",
    domain: "cross-cutting",
    summary:
      "An early-stage (seed/Series A) venture firm focused on sustainability and climate across mobility, energy, food/agriculture, and the built environment.",
    applicability:
      "California and U.S. early-stage climate startups raising seed or Series A that want a hands-on lead with deep sector networks.",
    context:
      "Congruent is a respected early-stage climate specialist based in San Francisco, often leading first institutional rounds and supporting follow-on syndication.",
    howToEngage:
      "Target when raising seed/Series A; warm intros via the Bay Area climate ecosystem (accelerators, labs, co-investors) materially improve response rates.",
    tags: ["capital", "venture capital", "seed", "series a", "climate investor", "california", "equity"],
    link: "https://www.congruentvc.com/",
  },
  {
    id: "prelude-ventures",
    type: "partner",
    title: "Prelude Ventures",
    agency: "Prelude Ventures (VC)",
    agencyAcronym: "Prelude",
    level: "private",
    jurisdiction: "San Francisco, CA",
    domain: "cross-cutting",
    summary:
      "A climate-focused venture firm investing across stages in companies addressing decarbonization in energy, transportation, food/agriculture, and advanced materials.",
    applicability:
      "Climate ventures from early to growth stage seeking a long-horizon climate-dedicated investor with broad sector coverage.",
    context:
      "Prelude is one of the longer-standing dedicated climate funds, able to support companies across multiple rounds — useful for capital-intensive scale-ups.",
    howToEngage:
      "Approach with a clear decarbonization thesis and stage fit; warm intros through co-investors and the climate-VC ecosystem are most effective.",
    tags: ["capital", "venture capital", "climate investor", "decarbonization", "growth", "fundraising", "equity"],
    link: "https://www.preludeventures.com/",
  },
  {
    id: "energy-impact-partners",
    type: "partner",
    title: "Energy Impact Partners",
    agency: "Energy Impact Partners (VC)",
    agencyAcronym: "EIP",
    level: "private",
    jurisdiction: "United States / global",
    domain: "energy",
    summary:
      "A global investment firm backing companies optimizing energy consumption and decarbonizing industry, with a coalition of utility and corporate limited partners.",
    applicability:
      "Energy, grid, and industrial-decarbonization startups that benefit from direct access to utility and corporate customers among EIP's LP coalition.",
    context:
      "EIP's distinctive value is its strategic LP base of utilities and large energy users, which can become pilot customers and offtakers — strong for ventures needing utility channels.",
    howToEngage:
      "Engage when your product targets utilities or large energy consumers; EIP's coalition can open customer doors as well as provide capital.",
    tags: ["capital", "venture capital", "energy", "utilities", "grid", "decarbonization", "corporate partners"],
    link: "https://www.energyimpactpartners.com/",
  },

  // ── California air districts (regulatory partners & pilot funders) ──
  {
    id: "baaqmd",
    type: "partner",
    title: "Bay Area Air Quality Management District",
    agency: "Bay Area Air Quality Management District",
    agencyAcronym: "BAAQMD",
    level: "regional",
    jurisdiction: "San Francisco Bay Area, CA (9 counties)",
    domain: "air",
    summary:
      "The regional air regulator for the nine-county Bay Area; issues stationary-source permits and runs grant/incentive programs (e.g., clean vehicles, equipment replacement) to cut emissions.",
    applicability:
      "Ventures with Bay Area facilities needing air permits, and clean-air/mobility startups that can tap district grant and incentive programs or pilot partnerships.",
    context:
      "Air districts are both regulators and funders. BAAQMD offers incentive funding (e.g., Carl Moyer, clean-vehicle programs) and can be a pilot partner for emissions-reducing technologies in the Bay Area.",
    howToEngage:
      "For permitting, contact the engineering/permitting division early. For funding, monitor BAAQMD grant solicitations and incentive programs and align your project to an open program.",
    tags: ["air district", "air quality", "permitting", "incentives", "grants", "pilots", "bay area", "emissions"],
    link: "https://www.baaqmd.gov/",
  },
  {
    id: "scaqmd",
    type: "partner",
    title: "South Coast Air Quality Management District",
    agency: "South Coast Air Quality Management District",
    agencyAcronym: "SCAQMD",
    level: "regional",
    jurisdiction: "Greater Los Angeles region, CA",
    domain: "air",
    summary:
      "The air regulator for the Los Angeles basin (Orange County and parts of LA, Riverside, San Bernardino); permits stationary sources and funds clean-technology demonstrations.",
    applicability:
      "Ventures operating in the LA basin needing air permits, and clean-air/transportation startups seeking demonstration funding or pilot sites in Southern California.",
    context:
      "SCAQMD regulates one of the most air-impacted regions in the U.S. and runs technology-advancement and incentive programs, making it both a compliance authority and a potential demonstration partner.",
    howToEngage:
      "Engage the permitting division for compliance; for funding, track SCAQMD's Technology Advancement Office solicitations and clean-vehicle/equipment incentives.",
    tags: ["air district", "air quality", "permitting", "incentives", "demonstration", "pilots", "los angeles", "transportation"],
    link: "https://www.aqmd.gov/",
  },
  {
    id: "sjvapcd",
    type: "partner",
    title: "San Joaquin Valley Air Pollution Control District",
    agency: "San Joaquin Valley Air Pollution Control District",
    agencyAcronym: "SJVAPCD",
    level: "regional",
    jurisdiction: "San Joaquin Valley, CA (8 counties)",
    domain: "air",
    summary:
      "The air regulator for the San Joaquin Valley; permits sources and administers extensive incentive grants for clean trucks, equipment, and agricultural emission reductions.",
    applicability:
      "Agriculture, freight, and equipment ventures in the Central Valley needing permits or able to deploy through the district's large incentive-grant programs.",
    context:
      "The Valley is a severe-nonattainment air basin, so SJVAPCD runs some of California's largest incentive programs (clean trucks, ag equipment, electrification) — a meaningful deployment channel for emissions-reducing tech.",
    howToEngage:
      "For permitting, contact district staff early. For deployment, align your technology to an open incentive program (e.g., clean-truck or ag-equipment grants) and partner with eligible operators.",
    tags: ["air district", "air quality", "agriculture", "freight", "incentives", "grants", "central valley", "emissions"],
    link: "https://www.valleyair.org/",
  },

  // ── Municipal / public deployment partners ──
  {
    id: "port-of-la-lb",
    type: "partner",
    title: "Port of Los Angeles & Port of Long Beach",
    agency: "City of Los Angeles / City of Long Beach (San Pedro Bay ports)",
    agencyAcronym: "POLA/POLB",
    level: "local",
    jurisdiction: "Los Angeles & Long Beach, CA",
    domain: "transportation",
    summary:
      "The two largest U.S. container ports, jointly pursuing zero-emission cargo handling and drayage under their Clean Air Action Plan — a major real-world testbed for clean freight and port-electrification tech.",
    applicability:
      "Zero-emission trucking, cargo-handling equipment, charging/hydrogen infrastructure, and air-monitoring ventures that can pilot at port scale.",
    context:
      "The San Pedro Bay ports' Clean Air Action Plan creates demand and demonstration opportunities for zero-emission freight technologies, often paired with state and air-district incentive funding.",
    howToEngage:
      "Engage the ports' environmental/technology-advancement programs and their tenant terminal operators; pair pilots with SCAQMD/CARB incentive funding where possible.",
    tags: ["municipal", "port", "transportation", "freight", "zero emission", "pilots", "infrastructure", "los angeles"],
    link: "https://kentico.portoflosangeles.org/environment/air-quality",
  },

  // ───────────────────────── HEALTHCARE ─────────────────────────
  {
    id: "hrsa-health-center-program",
    type: "grant",
    title: "HRSA Health Center Program (Section 330)",
    agency: "Health Resources & Services Administration",
    agencyAcronym: "HRSA",
    level: "federal",
    jurisdiction: "United States",
    domain: "healthcare",
    summary:
      "Federal grant funding for community health centers delivering primary care to underserved and low-income populations, plus periodic New Access Point and expansion opportunities.",
    applicability:
      "Federally Qualified Health Centers, look-alikes, and community/nonprofit primary-care providers — and health-tech ventures partnering with or selling into safety-net clinics.",
    context:
      "HRSA is the backbone of the U.S. safety-net care system. Ventures rarely receive 330 grants directly but often partner with grantee clinics, which shapes procurement and reimbursement dynamics.",
    howToEngage:
      "Track funding opportunities on the HRSA site and Grants.gov; if you're a provider, confirm eligibility and service-area need. Ventures should identify FQHC partners as design/launch customers.",
    tags: ["healthcare", "primary care", "safety net", "clinics", "federal grant", "underserved"],
    link: "https://bphc.hrsa.gov/funding",
  },
  {
    id: "nih-sbir-sttr",
    type: "grant",
    title: "NIH SBIR/STTR (Seed Fund)",
    agency: "National Institutes of Health",
    agencyAcronym: "NIH",
    level: "federal",
    jurisdiction: "United States",
    domain: "healthcare",
    summary:
      "Non-dilutive R&D grants and contracts for small businesses developing biomedical, diagnostic, digital-health, and medical-device technologies with commercial potential.",
    applicability:
      "For-profit U.S. small businesses (<500 employees) working on health/life-science innovations. Phase I proves feasibility; Phase II funds development; Phase IIB supports commercialization.",
    context:
      "The NIH is the largest SBIR/STTR funder after DoD — a primary non-dilutive path for health-tech and therapeutics startups. Awards also carry a strong certification effect for follow-on VC.",
    howToEngage:
      "Identify the relevant NIH institute and program officer, match to an open funding opportunity (omnibus or targeted), and submit through Grants.gov/eRA Commons. Talk to a program officer before applying.",
    tags: ["healthcare", "biomedical", "sbir", "sttr", "non-dilutive", "r&d", "medical device", "diagnostics"],
    link: "https://seed.nih.gov/small-business-funding",
  },
  {
    id: "arpa-h",
    type: "grant",
    title: "ARPA-H (Advanced Research Projects Agency for Health)",
    agency: "Advanced Research Projects Agency for Health",
    agencyAcronym: "ARPA-H",
    level: "federal",
    jurisdiction: "United States",
    domain: "healthcare",
    summary:
      "High-risk, high-reward funding for breakthrough biomedical and health technologies, awarded through open solicitations and focused program calls.",
    applicability:
      "Ventures, universities, and teams pursuing transformative health solutions (therapeutics, platforms, health systems). Suited to ambitious, milestone-driven programs rather than incremental work.",
    context:
      "Modeled on DARPA, ARPA-H funds ambitious 'moonshot' health R&D. Solicitations are program-specific and evolve; the open BAA is the standing entry point.",
    howToEngage:
      "Monitor ARPA-H open solicitations and the open Broad Agency Announcement; align proposals to a stated program's metrics and pitch a clear breakthrough milestone.",
    tags: ["healthcare", "biomedical", "moonshot", "r&d", "federal", "breakthrough"],
    link: "https://arpa-h.gov/",
  },
  {
    id: "samhsa-grants",
    type: "grant",
    title: "SAMHSA Grants (Behavioral & Mental Health)",
    agency: "Substance Abuse & Mental Health Services Administration",
    agencyAcronym: "SAMHSA",
    level: "federal",
    jurisdiction: "United States",
    domain: "healthcare",
    summary:
      "Discretionary grants for mental-health and substance-use prevention, treatment, and recovery services and infrastructure.",
    applicability:
      "Providers, community organizations, and behavioral-health ventures delivering or enabling prevention, treatment, crisis, and recovery services.",
    context:
      "SAMHSA is the primary federal funder for behavioral health. Its grants shape service models and reimbursement expectations that behavioral-health tech must fit.",
    howToEngage:
      "Review SAMHSA's Notice of Funding Opportunities, confirm eligibility (often nonprofits/governments), and consider partnering with an eligible entity if you're a for-profit vendor.",
    tags: ["healthcare", "behavioral health", "mental health", "substance use", "federal grant"],
    link: "https://www.samhsa.gov/grants",
  },
  {
    id: "cirm",
    type: "grant",
    title: "California Institute for Regenerative Medicine (CIRM)",
    agency: "California Institute for Regenerative Medicine",
    agencyAcronym: "CIRM",
    level: "state",
    jurisdiction: "California",
    domain: "healthcare",
    summary:
      "California's voter-created stem-cell and regenerative-medicine agency funding discovery, translational, and clinical-stage research and manufacturing.",
    applicability:
      "California-based researchers and companies advancing regenerative medicine, cell/gene therapy, and related manufacturing and delivery infrastructure.",
    context:
      "Funded by Proposition 14, CIRM is a large, California-specific non-dilutive source for regenerative medicine — a rare state-level analogue to NIH for this field.",
    howToEngage:
      "Track CIRM funding opportunities by stage (discovery/translational/clinical), confirm California-based operations, and align to the program's translational milestones.",
    tags: ["healthcare", "regenerative medicine", "cell therapy", "gene therapy", "california", "non-dilutive"],
    link: "https://www.cirm.ca.gov/",
  },
  {
    id: "hcai-health-workforce",
    type: "grant",
    title: "HCAI Health Workforce Programs",
    agency: "California Department of Health Care Access and Information",
    agencyAcronym: "HCAI",
    level: "state",
    jurisdiction: "California",
    domain: "healthcare",
    summary:
      "California scholarships, loan repayment, and grant programs that expand and diversify the health workforce, plus health-facility data and financing oversight.",
    applicability:
      "Health-workforce training programs, provider organizations, and ventures building health-workforce pipelines or education in California.",
    context:
      "HCAI (formerly OSHPD) is California's hub for health-workforce funding and facilities data — relevant to workforce-facing health ventures and provider partners.",
    howToEngage:
      "Review HCAI loan/scholarship/grant programs for current cycles; partner with eligible training institutions where a program requires an accredited provider.",
    tags: ["healthcare", "workforce", "california", "loan repayment", "scholarship", "training"],
    link: "https://hcai.ca.gov/loans-scholarships-grants/",
  },
  {
    id: "hipaa",
    type: "regulation",
    title: "HIPAA Privacy & Security Rules",
    agency: "U.S. Department of Health & Human Services, Office for Civil Rights",
    agencyAcronym: "HHS OCR",
    level: "federal",
    jurisdiction: "United States",
    domain: "healthcare",
    summary:
      "Federal rules governing the privacy and security of protected health information (PHI) held by covered entities and their business associates.",
    applicability:
      "Any venture that creates, receives, stores, or transmits PHI — most digital-health, health-data, and care-delivery companies act as covered entities or business associates.",
    context:
      "HIPAA compliance (and Business Associate Agreements) is table stakes for selling into providers and payers. It shapes data architecture, vendor contracts, and breach-response obligations.",
    howToEngage:
      "Map whether you're a covered entity or business associate, implement the required safeguards, execute BAAs with partners, and stand up breach-notification procedures early.",
    tags: ["healthcare", "privacy", "data security", "phi", "compliance", "digital health"],
    link: "https://www.hhs.gov/hipaa/index.html",
  },

  // ───────────────────────── WORKFORCE DEVELOPMENT ─────────────────────────
  {
    id: "dol-wioa-eta",
    type: "grant",
    title: "DOL Employment & Training (WIOA) Grants",
    agency: "U.S. Department of Labor, Employment & Training Administration",
    agencyAcronym: "DOL ETA",
    level: "federal",
    jurisdiction: "United States",
    domain: "workforce",
    summary:
      "Formula and competitive grants under the Workforce Innovation and Opportunity Act funding job training, sector partnerships, and reemployment services.",
    applicability:
      "Workforce boards, training providers, community colleges, and workforce-tech ventures partnering with the public workforce system.",
    context:
      "WIOA is the backbone of the U.S. public workforce system. Funds flow through state and local workforce boards, so ventures typically engage as providers or partners rather than direct grantees.",
    howToEngage:
      "Identify your state/local Workforce Development Board, get on Eligible Training Provider Lists where relevant, and watch ETA's competitive grant announcements (e.g., sector and apprenticeship grants).",
    tags: ["workforce", "job training", "wioa", "federal grant", "reskilling", "sector partnership"],
    link: "https://www.dol.gov/agencies/eta/grants",
  },
  {
    id: "apprenticeship-gov",
    type: "grant",
    title: "Registered Apprenticeship & Apprenticeship Building America",
    agency: "U.S. Department of Labor",
    agencyAcronym: "DOL",
    level: "federal",
    jurisdiction: "United States",
    domain: "workforce",
    summary:
      "Grants and technical assistance to expand Registered Apprenticeship programs across industries, including new and non-traditional sectors.",
    applicability:
      "Employers, intermediaries, and ed-tech/workforce ventures building or scaling earn-and-learn apprenticeship models.",
    context:
      "Registered Apprenticeship is a growing federal priority beyond the building trades — into healthcare, tech, and clean energy — making it a channel for workforce ventures.",
    howToEngage:
      "Explore becoming a program sponsor or intermediary via apprenticeship.gov, and track Apprenticeship Building America and State Apprenticeship Expansion grant cycles.",
    tags: ["workforce", "apprenticeship", "earn and learn", "employer", "federal grant"],
    link: "https://www.apprenticeship.gov/",
  },
  {
    id: "ca-etp",
    type: "grant",
    title: "California Employment Training Panel (ETP)",
    agency: "California Employment Training Panel",
    agencyAcronym: "ETP",
    level: "state",
    jurisdiction: "California",
    domain: "workforce",
    summary:
      "State program that reimburses California employers for the cost of training incumbent workers in skills that support competitiveness and retention.",
    applicability:
      "California employers (and multiple-employer/training-agency intermediaries) upskilling incumbent staff — including scaling ventures adding technical roles.",
    context:
      "ETP is funded by an employer payroll assessment and pays on performance (trainees must be retained). It's a direct, employer-facing non-dilutive lever specific to California.",
    howToEngage:
      "Apply directly or through a training agency; scope eligible occupations and training, and plan for the performance-based (retention) reimbursement structure.",
    tags: ["workforce", "employer training", "california", "incumbent worker", "reimbursement"],
    link: "https://etp.ca.gov/",
  },
  {
    id: "ca-strong-workforce",
    type: "grant",
    title: "California Community Colleges Strong Workforce Program",
    agency: "California Community Colleges Chancellor's Office",
    agencyAcronym: "CCCCO",
    level: "state",
    jurisdiction: "California",
    domain: "workforce",
    summary:
      "State investment in career-technical education and regional workforce training delivered through California's community colleges.",
    applicability:
      "Employers and workforce ventures partnering with community colleges on curriculum, work-based learning, and regional skills pipelines.",
    context:
      "The Strong Workforce Program aligns community-college CTE with regional labor-market needs — a partnership channel for ventures building talent pipelines in California.",
    howToEngage:
      "Engage regional consortia and college workforce/CTE deans; propose employer partnerships, work-based learning, or curriculum aligned to in-demand occupations.",
    tags: ["workforce", "community college", "cte", "california", "regional", "work-based learning"],
    link: "https://www.cccco.edu/College-Professionals/Key-Initiatives/Strong-Workforce-Program",
  },

  // ───────────────────── ECONOMIC DEVELOPMENT ─────────────────────
  {
    id: "eda-programs",
    type: "grant",
    title: "EDA Economic Development Programs",
    agency: "U.S. Economic Development Administration",
    agencyAcronym: "EDA",
    level: "federal",
    jurisdiction: "United States",
    domain: "economic-development",
    summary:
      "Federal grants for regional economic development — public works, planning, Build to Scale, Tech Hubs, and Good Jobs Challenge — that strengthen local innovation ecosystems.",
    applicability:
      "Regional coalitions, economic-development organizations, universities, and ventures anchoring cluster/ecosystem or scale-up strategies.",
    context:
      "EDA funds the connective tissue of regional economies. Ventures usually benefit as coalition members or beneficiaries of ecosystem grants rather than as sole applicants.",
    howToEngage:
      "Connect with your regional EDA office and Economic Development District; watch Build to Scale and other NOFOs, and position within a regional coalition application.",
    tags: ["economic development", "regional", "ecosystem", "tech hubs", "federal grant", "cluster"],
    link: "https://www.eda.gov/funding",
  },
  {
    id: "sba-programs",
    type: "grant",
    title: "SBA Loan & Investment Programs",
    agency: "U.S. Small Business Administration",
    agencyAcronym: "SBA",
    level: "federal",
    jurisdiction: "United States",
    domain: "economic-development",
    summary:
      "Federally-backed small-business financing — 7(a) and 504 loans, microloans, and SBIC equity — plus growth programs that expand access to capital.",
    applicability:
      "For-profit small businesses seeking debt or growth capital, and ventures that can access SBA-guaranteed lending or SBIC-backed investment.",
    context:
      "SBA doesn't usually lend directly; it guarantees loans made by partner lenders and licenses SBIC funds. It's a core non-VC capital channel for revenue-stage companies.",
    howToEngage:
      "Find an SBA-preferred lender for 7(a)/504, or an SBIC for equity; a local SBDC (see below) can help you prepare and match to the right program.",
    tags: ["economic development", "small business", "loans", "capital access", "sbic", "federal"],
    link: "https://www.sba.gov/funding-programs",
  },
  {
    id: "usda-rural-business",
    type: "grant",
    title: "USDA Rural Development Business Programs",
    agency: "U.S. Department of Agriculture, Rural Development",
    agencyAcronym: "USDA RD",
    level: "federal",
    jurisdiction: "United States",
    domain: "economic-development",
    summary:
      "Loans and grants supporting business development, job creation, and infrastructure in rural areas — including Business & Industry loan guarantees and Rural Business Development Grants.",
    applicability:
      "Businesses and intermediaries operating in USDA-defined rural areas, including ag-tech, clean-energy, and manufacturing ventures with rural footprints.",
    context:
      "USDA RD is a major rural-focused capital source. Eligibility hinges on rural geography, so location determines whether these programs apply.",
    howToEngage:
      "Confirm your project's rural eligibility, then contact your USDA Rural Development state office to match to B&I, RBDG, or REAP (energy) programs.",
    tags: ["economic development", "rural", "business", "loans", "job creation", "federal"],
    link: "https://www.rd.usda.gov/programs-services/business-programs",
  },
  {
    id: "cdfi-fund",
    type: "grant",
    title: "CDFI Fund",
    agency: "U.S. Department of the Treasury, CDFI Fund",
    agencyAcronym: "CDFI Fund",
    level: "federal",
    jurisdiction: "United States",
    domain: "economic-development",
    summary:
      "Treasury program that certifies and capitalizes Community Development Financial Institutions and awards New Markets Tax Credits to spur investment in underserved communities.",
    applicability:
      "CDFIs, mission lenders, and ventures seeking community-development capital or partners financing projects in low-income communities.",
    context:
      "The CDFI Fund channels capital into communities that mainstream finance underserves. Ventures typically access it via CDFI lending partners rather than directly.",
    howToEngage:
      "If you're a lender, pursue CDFI certification and CDFI Program/NMTC rounds; if you're a venture, identify certified CDFIs as financing partners for community-based projects.",
    tags: ["economic development", "community development", "cdfi", "capital access", "new markets tax credit", "federal"],
    link: "https://www.cdfifund.gov/",
  },
  {
    id: "ca-competes",
    type: "grant",
    title: "California Competes Tax Credit & Grant",
    agency: "Governor's Office of Business and Economic Development",
    agencyAcronym: "GO-Biz",
    level: "state",
    jurisdiction: "California",
    domain: "economic-development",
    summary:
      "Income-tax credit (and a companion grant) awarded to businesses that commit to creating jobs and making investments in California.",
    applicability:
      "Businesses of any size planning to grow employment and capital investment in California, evaluated on jobs, wages, and investment commitments.",
    context:
      "California Competes is GO-Biz's flagship business-attraction and retention incentive, awarded in competitive application periods against negotiated milestones.",
    howToEngage:
      "Apply during an open California Competes period through GO-Biz; model your job-creation and investment commitments, which become contractual milestones.",
    tags: ["economic development", "tax credit", "california", "job creation", "investment", "go-biz"],
    link: "https://business.ca.gov/california-competes-tax-credit/",
  },
  {
    id: "ca-ibank",
    type: "grant",
    title: "California Infrastructure & Economic Development Bank (IBank)",
    agency: "California Infrastructure and Economic Development Bank",
    agencyAcronym: "IBank",
    level: "state",
    jurisdiction: "California",
    domain: "economic-development",
    summary:
      "State financing authority offering loans, loan guarantees, and bond financing for infrastructure, small business, and economic-development projects in California.",
    applicability:
      "California small businesses (via the Small Business Finance Center loan guarantees), and public/private sponsors of infrastructure and economic-development projects.",
    context:
      "IBank provides low-cost public financing where private capital is thin — especially small-business loan guarantees and infrastructure lending in California.",
    howToEngage:
      "For small business, work through an IBank Financial Development Corporation partner for a loan guarantee; for infrastructure, engage IBank's lending programs directly.",
    tags: ["economic development", "california", "loans", "loan guarantee", "infrastructure", "small business"],
    link: "https://www.ibank.ca.gov/",
  },

  // ───────── ECOSYSTEM PARTNERS (healthcare / business / workforce) ─────────
  {
    id: "sbdc",
    type: "partner",
    title: "Small Business Development Centers (SBDC)",
    agency: "U.S. Small Business Administration (SBDC network)",
    agencyAcronym: "SBDC",
    level: "federal",
    jurisdiction: "United States",
    domain: "economic-development",
    summary:
      "A nationwide network of centers providing free advising and low-cost training to small businesses — including capital readiness, financials, and grant/loan navigation.",
    applicability:
      "Early- and growth-stage small businesses in any sector wanting hands-on help with financing, planning, and applying to SBA and other programs.",
    context:
      "SBDCs (often hosted at universities) are a free, local first stop for founders navigating capital and compliance — a practical complement to the funding programs above.",
    howToEngage:
      "Find your local SBDC and book free advising; use them to prepare loan/grant applications and financial projections before you approach lenders or agencies.",
    tags: ["partner", "small business", "advising", "capital readiness", "ecosystem", "economic development"],
    link: "https://www.sba.gov/local-assistance/resource-partners/small-business-development-centers-sbdc",
  },
  {
    id: "mbda",
    type: "partner",
    title: "Minority Business Development Agency (MBDA) Business Centers",
    agency: "U.S. Department of Commerce, Minority Business Development Agency",
    agencyAcronym: "MBDA",
    level: "federal",
    jurisdiction: "United States",
    domain: "economic-development",
    summary:
      "Federal agency and business-center network helping minority-owned businesses access capital, contracts, and markets, plus periodic competitive grants.",
    applicability:
      "Minority-owned businesses seeking growth capital, contracting opportunities, and scaling support across sectors.",
    context:
      "MBDA is the only federal agency dedicated to minority business enterprise growth; its centers provide concierge-style access to capital and contracts.",
    howToEngage:
      "Connect with your nearest MBDA Business Center for advising and matchmaking, and watch MBDA competitive grant announcements.",
    tags: ["partner", "minority business", "capital access", "contracts", "ecosystem", "economic development"],
    link: "https://www.mbda.gov/",
  },
  {
    id: "jlabs",
    type: "partner",
    title: "Johnson & Johnson Innovation — JLABS",
    agency: "Johnson & Johnson Innovation",
    agencyAcronym: "JLABS",
    level: "private",
    jurisdiction: "United States",
    domain: "healthcare",
    summary:
      "A no-equity life-science incubator network providing lab space, mentorship, and access to capital and pharma partnerships for early-stage health ventures.",
    applicability:
      "Early-stage healthcare, biotech, medtech, and digital-health startups that can use wet-lab/incubation space and corporate-network access without giving up equity.",
    context:
      "JLABS is a leading corporate life-science incubator (including a Bay Area site), offering ecosystem access that complements NIH/CIRM non-dilutive funding.",
    howToEngage:
      "Apply to a JLABS location or open call; align your milestones to what the incubator and its partnership network can accelerate.",
    tags: ["partner", "healthcare", "biotech", "medtech", "incubator", "no-equity", "life science"],
    link: "https://jlabs.jnjinnovation.com/",
  },
];
