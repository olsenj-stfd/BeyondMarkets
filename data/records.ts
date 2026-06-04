import type { RegRecord } from "@/lib/types";

/**
 * v1 curated dataset: California air-quality & climate-tech wedge.
 * Hand-curated to prove the matching flow. Each record is summarized for
 * orientation only — always confirm specifics against the linked official source
 * before making a funding or compliance decision.
 */
export const records: RegRecord[] = [
  {
    id: "epa-caa-title-v",
    type: "regulation",
    title: "Clean Air Act Title V Operating Permits",
    agency: "U.S. Environmental Protection Agency",
    agencyAcronym: "EPA",
    level: "federal",
    jurisdiction: "United States",
    summary:
      "Federal program requiring major stationary sources of air pollution to obtain a comprehensive operating permit consolidating all applicable Clean Air Act requirements.",
    applicability:
      "Major sources — facilities emitting or with potential to emit above threshold levels of criteria pollutants or hazardous air pollutants. Many hardware, manufacturing, and energy startups that operate combustion or process equipment can trigger this as they scale.",
    context:
      "Title V does not impose new emission limits; it gathers existing requirements into one enforceable permit. In California, permits are issued by the local air district rather than EPA directly, so the federal rule is administered regionally.",
    howToEngage:
      "Determine your facility's potential-to-emit early. Contact your local air district's permitting division (not EPA) for the application. Pre-application meetings are common and recommended for novel processes.",
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
    summary:
      "Technology-based emission standards for newly constructed, modified, or reconstructed stationary sources in specific industrial categories.",
    applicability:
      "Companies building new industrial equipment or facilities in a regulated source category (e.g., stationary engines, turbines, certain chemical processes). Relevant to climate-tech firms deploying first-of-a-kind hardware.",
    context:
      "NSPS reflects the 'best demonstrated technology' at the time of promulgation. Because standards are category-specific, the threshold question is whether your process falls within an existing category.",
    howToEngage:
      "Identify your applicable subpart under 40 CFR Part 60. Engage EPA regional office or your air district for an applicability determination if your technology is novel and category fit is unclear.",
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
    summary:
      "Mandatory annual reporting of greenhouse gas data from large emitters and certain suppliers of fuels and industrial gases.",
    applicability:
      "Facilities emitting 25,000+ metric tons CO2e per year, and suppliers above category thresholds. Carbon-intensive scale-ups and certain fuel/industrial-gas suppliers should track whether they cross the threshold.",
    context:
      "GHGRP is a data-collection program, not an emissions cap, but the reported data frequently feeds into state cap-and-trade and rulemaking. Crossing the threshold also signals you are large enough to attract other regulatory attention.",
    howToEngage:
      "Register in EPA's e-GGRT system. Reporting is annual (typically due March 31). Consult the applicability tool on EPA's site to confirm whether you must report.",
    tags: ["greenhouse gas", "reporting", "carbon", "emissions", "compliance"],
    link: "https://www.epa.gov/ghgreporting",
  },
  {
    id: "carb-cap-and-trade",
    type: "regulation",
    title: "California Cap-and-Trade Program",
    agency: "California Air Resources Board",
    agencyAcronym: "CARB",
    level: "state",
    jurisdiction: "California",
    summary:
      "Statewide market-based cap on greenhouse gas emissions requiring covered entities to hold allowances equal to their emissions, with allowances traded at auction.",
    applicability:
      "Large industrial facilities, electricity generators/importers, and fuel suppliers emitting 25,000+ metric tons CO2e annually. Climate-tech firms can be on either side: a covered entity, or a provider of offsets/abatement that reduces a customer's compliance cost.",
    context:
      "A cornerstone of California's economy-wide climate strategy under AB 32 and successors. The allowance price creates a quantifiable value for emissions reductions — directly relevant to the business case for abatement technologies.",
    howToEngage:
      "Register in CARB's CITSS tracking system if covered. If you sell abatement, frame your value proposition in terms of avoided allowance cost. CARB holds public workshops on program amendments.",
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
    summary:
      "Performance standard requiring reductions in the carbon intensity of transportation fuels, with tradable credits generated by low-carbon fuel providers.",
    applicability:
      "Producers and importers of transportation fuels, and providers of low-carbon alternatives — renewable diesel, biomethane, hydrogen, EV charging, and certain carbon-capture pathways can generate credits.",
    context:
      "LCFS is one of the most important revenue mechanisms for clean-fuel and EV-infrastructure startups in California. Credit prices can materially change project economics, and the credit pathway approval process is itself a key business milestone.",
    howToEngage:
      "Apply for a fuel pathway certification through CARB's LRT-CBTS / pathway application process. Engage early — pathway certification can take months. CARB staff hold pathway workshops.",
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
    summary:
      "Requires medium- and heavy-duty truck manufacturers to sell an increasing percentage of zero-emission vehicles in California over time.",
    applicability:
      "Truck OEMs selling into California, and indirectly the supply chain — battery, fuel-cell, powertrain, and charging/fueling startups serving commercial vehicles.",
    context:
      "ACT creates guaranteed demand for zero-emission trucks, de-risking the market for component and infrastructure suppliers. It pairs with fleet-side rules pushing adoption, creating a regulatory pull-through for the whole ZEV truck ecosystem.",
    howToEngage:
      "Manufacturers report sales and credits to CARB. Suppliers should monitor OEM compliance timelines to time product launches. CARB hosts rulemaking and implementation workshops.",
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
    summary:
      "Source-specific rules controlling emissions of toxic air contaminants from activities and equipment across California.",
    applicability:
      "Operators of equipment or processes that emit toxic air contaminants — e.g., diesel engines, certain coatings/solvents, composting. Hardware and industrial-process startups should check for an applicable ATCM.",
    context:
      "ATCMs target health risk from toxics rather than greenhouse gases or criteria pollutants. They are often the binding constraint for processes that are small on carbon but use hazardous inputs.",
    howToEngage:
      "Identify whether an ATCM covers your equipment category, then coordinate with your local air district, which enforces most ATCMs. CARB publishes the measures and guidance.",
    tags: ["toxic air contaminants", "diesel", "health risk", "solvents", "industrial", "compliance"],
    link: "https://ww2.arb.ca.gov/our-work/programs/airborne-toxic-control-measures",
  },
  {
    id: "baaqmd-permit",
    type: "regulation",
    title: "BAAQMD Permit to Operate / Authority to Construct",
    agency: "Bay Area Air Quality Management District",
    agencyAcronym: "BAAQMD",
    level: "regional",
    jurisdiction: "San Francisco Bay Area (9 counties)",
    summary:
      "Regional air district permits required before constructing or operating equipment that emits air pollutants in the Bay Area.",
    applicability:
      "Any business in the nine-county Bay Area installing or operating emitting equipment — boilers, generators, process equipment, certain labs and pilot lines. Hardware and deep-tech startups frequently trigger this at the pilot/scale-up stage.",
    context:
      "The Authority to Construct comes first, then the Permit to Operate. This is often a founder's earliest direct regulatory touchpoint and can gate facility build-out timelines, so it should be scoped before signing a lease.",
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
    summary:
      "Air district permits and rules governing stationary-source emissions in the San Joaquin Valley, one of the nation's most ozone- and PM-challenged regions.",
    applicability:
      "Businesses operating emitting equipment in the San Joaquin Valley — agriculture-adjacent tech, logistics, manufacturing, and energy projects siting in the Central Valley.",
    context:
      "Because the Valley is in 'extreme' nonattainment for ozone, permitting and offset requirements here are among the most stringent in the country. Siting a facility here carries heavier air-compliance burden than coastal California.",
    howToEngage:
      "Engage the District's permit services early; offset requirements may apply to new emissions. The District runs incentive programs that can offset both cost and emissions — ask about both in the same conversation.",
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
    summary:
      "Permitting and toxic-risk rules (including Rule 1401 new-source toxics limits) for equipment operated in the Los Angeles air basin.",
    applicability:
      "Businesses installing or operating emitting or toxics-emitting equipment in the LA region. Relevant to hardware, advanced manufacturing, and clean-energy startups siting in Southern California.",
    context:
      "South Coast is a severe ozone nonattainment area with dense population, so new-source toxics review (Rule 1401) can be a binding constraint even for small equipment. Engagement norms differ from the Bay Area and Central Valley.",
    howToEngage:
      "File for a Permit to Construct/Operate with SCAQMD. For processes using toxics, model health risk early to confirm Rule 1401 compliance. SCAQMD offers small-business assistance.",
    tags: ["air permit", "los angeles", "south coast", "toxics", "rule 1401", "health risk", "facility"],
    link: "https://www.aqmd.gov/home/permits",
  },
  {
    id: "ceqa",
    type: "regulation",
    title: "California Environmental Quality Act (CEQA)",
    agency: "California Natural Resources Agency",
    agencyAcronym: "CNRA",
    level: "state",
    jurisdiction: "California",
    summary:
      "Requires state and local agencies to evaluate and disclose the environmental impacts of discretionary projects they approve, including air-quality and GHG impacts.",
    applicability:
      "Any startup whose project needs a discretionary government approval (permits, leases on public land, grants tied to construction). Project-developer climate startups (energy, infrastructure, facilities) are most exposed.",
    context:
      "CEQA review can add significant time and litigation risk to project timelines. It is frequently the gating item for first-of-a-kind facilities — sometimes more impactful to schedule than the air permit itself.",
    howToEngage:
      "Work with the lead agency to determine the right level of review (exemption, Negative Declaration, or EIR). Engage environmental counsel early for novel or large projects.",
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
    summary:
      "Requires large companies doing business in California to publicly disclose Scope 1, 2, and eventually Scope 3 greenhouse gas emissions.",
    applicability:
      "Companies with total annual revenue above the statutory threshold doing business in California. Most early-stage startups are below the threshold, but it shapes demand for emissions-measurement and reporting software.",
    context:
      "Even pre-threshold startups are affected indirectly: large customers subject to SB 253 push disclosure requirements down their supply chain, creating demand for carbon-accounting tools and verified low-carbon inputs.",
    howToEngage:
      "Track CARB's implementing regulations and reporting timeline. If you sell carbon-accounting or verification services, position against the disclosure deadlines. Submit comments during CARB rulemaking.",
    tags: ["climate disclosure", "scope 3", "carbon accounting", "reporting", "supply chain", "software"],
    link: "https://ww2.arb.ca.gov/our-work/programs/climate-disclosure",
  },
  {
    id: "calstart-hvip",
    type: "grant",
    title: "HVIP — Hybrid and Zero-Emission Truck and Bus Voucher Incentive Project",
    agency: "CALSTART (administered for CARB)",
    agencyAcronym: "CALSTART",
    level: "state",
    jurisdiction: "California",
    summary:
      "Point-of-sale vouchers that reduce the purchase price of eligible zero-emission and hybrid trucks and buses for California fleets.",
    applicability:
      "Fleets purchasing eligible ZEV trucks/buses, and the manufacturers whose vehicles are on the eligible list. ZEV vehicle and powertrain startups benefit by getting products approved as voucher-eligible.",
    context:
      "HVIP is one of the largest demand-side incentives for commercial ZEVs and is a major reason California is the leading market. Getting a vehicle onto the eligibility list is a significant commercial milestone for a startup OEM.",
    howToEngage:
      "Manufacturers apply to add vehicles to the eligible list via CALSTART. Fleets request vouchers through participating dealers while funds are available — funding rounds open and close, so timing matters.",
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
    summary:
      "Vouchers funding clean transportation projects — carsharing, on-demand shuttles, bikeshare — in under-resourced California communities.",
    applicability:
      "Community organizations and mobility-service startups deploying shared zero-emission transportation in disadvantaged communities.",
    context:
      "Part of California Climate Investments funded by cap-and-trade proceeds. It pairs equity goals with emissions reduction, so applications are scored heavily on community benefit, not just technology.",
    howToEngage:
      "Watch for open funding windows and partner with a community-based organization, which strengthens applications. Attend CARB/administrator webinars before applying.",
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
    summary:
      "Grant funding for the incremental cost of cleaner-than-required engines, equipment, and emission-reduction projects in the Bay Area.",
    applicability:
      "Owners of heavy-duty engines and equipment (on-road, off-road, marine, agricultural) upgrading to cleaner technology. Startups selling clean engines/equipment can route customers to this funding.",
    context:
      "Carl Moyer is a statewide program administered locally by each air district. It funds the cost gap between a clean option and a conventional one, which can make an early-stage clean product cost-competitive at point of sale.",
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
    summary:
      "A broad portfolio of grants and vouchers (Carl Moyer, Truck Replacement, charging infrastructure, agricultural equipment) to cut emissions in the Valley.",
    applicability:
      "Businesses, fleets, and growers in the San Joaquin Valley replacing or upgrading equipment, plus clean-tech vendors serving them.",
    context:
      "Because the Valley faces the toughest air-quality challenges, the District runs unusually large and varied incentive budgets. For a startup, this region can be both the hardest place to permit and the easiest place to find customer subsidies.",
    howToEngage:
      "Review the District's current funding solicitations and eligibility. Many programs are first-come, first-served until funds run out, so monitor openings and prepare applications in advance.",
    tags: ["grant", "incentive", "san joaquin valley", "central valley", "fleet", "agriculture", "charging", "truck replacement"],
    link: "https://www.valleyair.org/grants/",
  },
  {
    id: "cec-clean-transportation",
    type: "grant",
    title: "CEC Clean Transportation Program (formerly ARFVTP)",
    agency: "California Energy Commission",
    agencyAcronym: "CEC",
    level: "state",
    jurisdiction: "California",
    summary:
      "Competitive grants and funding for ZEV infrastructure, fuel production, manufacturing, and emerging transportation technologies.",
    applicability:
      "Startups developing charging/hydrogen infrastructure, clean-fuel production, ZEV manufacturing, or related R&D and pilots in California.",
    context:
      "One of the most relevant state grant sources for hardware-heavy clean-transportation startups, funding everything from infrastructure deployment to manufacturing scale-up. Solicitations (GFOs) are released on a rolling basis by topic.",
    howToEngage:
      "Monitor the CEC's Grant Funding Opportunities (GFO) page and subscribe to the listserv. Proposals are competitive and scored — start drafting well before the deadline and attend the pre-application workshop.",
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
    summary:
      "Funds clean-energy research, development, and demonstration projects that benefit ratepayers of California's investor-owned utilities.",
    applicability:
      "Startups developing clean generation, storage, grid, and efficiency technologies seeking RD&D and demonstration funding.",
    context:
      "EPIC is a key non-dilutive funding source for energy-tech demonstrations in California, helping bridge the 'valley of death' between lab and commercial deployment. Awards often require a California demonstration site.",
    howToEngage:
      "Track EPIC solicitations on the CEC site. Demonstrations typically need a host site and utility coordination — line these up before applying. Pre-application workshops are held for most solicitations.",
    tags: ["grant", "RD&D", "energy storage", "grid", "clean energy", "demonstration", "non-dilutive"],
    link: "https://www.energy.ca.gov/programs-and-topics/programs/electric-program-investment-charge-epic-program",
  },
  {
    id: "doe-loan-programs",
    type: "grant",
    title: "U.S. DOE Loan Programs Office (LPO)",
    agency: "U.S. Department of Energy",
    agencyAcronym: "DOE",
    level: "federal",
    jurisdiction: "United States",
    summary:
      "Federal loans and loan guarantees for deploying large-scale clean-energy, advanced-transportation, and manufacturing projects.",
    applicability:
      "Later-stage climate startups financing first commercial-scale facilities — energy generation/storage, advanced manufacturing, clean fuels — that are too capital-intensive for conventional debt.",
    context:
      "LPO addresses the capital gap for first-of-a-kind commercial projects. It is a venture-relevant signal: an LPO term sheet can de-risk a project for equity investors, but the process is long and documentation-heavy.",
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
    summary:
      "Phased, non-dilutive R&D funding for small businesses developing environmental and clean-tech innovations, including air-quality solutions.",
    applicability:
      "Small businesses (per SBA size standards) with early-stage environmental technology — air monitoring, pollution control, sustainable materials, water, and related areas.",
    context:
      "SBIR is classic non-dilutive seed-stage capital. Phase I funds feasibility; Phase II funds development. Topics are set annually and align with EPA priorities, so fit depends on the current solicitation's topic list.",
    howToEngage:
      "Register in SAM.gov and SBA systems early (this takes weeks). Match your technology to a published solicitation topic and submit by the deadline. EPA holds informational webinars each cycle.",
    tags: ["grant", "SBIR", "non-dilutive", "R&D", "small business", "air monitoring", "pollution control", "seed"],
    link: "https://www.epa.gov/sbir",
  },
  {
    id: "doe-arpa-e",
    type: "grant",
    title: "ARPA-E (Advanced Research Projects Agency – Energy)",
    agency: "U.S. Department of Energy",
    agencyAcronym: "DOE",
    level: "federal",
    jurisdiction: "United States",
    summary:
      "Funds high-risk, high-reward energy R&D with the potential for transformational impact, via topic-specific funding opportunities.",
    applicability:
      "Startups and research teams with breakthrough, early-stage energy or carbon technologies that are too risky for private capital alone.",
    context:
      "ARPA-E targets transformational rather than incremental innovation, and an award is a strong technical-credibility signal to investors. Funding is organized into focused programs plus periodic OPEN solicitations.",
    howToEngage:
      "Watch for funding opportunity announcements (FOAs) matching your technology, or OPEN calls. Concept papers come first, then full applications. Engage program directors' published priorities to gauge fit.",
    tags: ["grant", "R&D", "non-dilutive", "energy", "breakthrough", "carbon", "deep tech", "federal"],
    link: "https://arpa-e.energy.gov/",
  },
];
