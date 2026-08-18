import type { PortfolioCompany, RegClimate, ScoredOpportunity } from "@/lib/types";
import { dependencyBand, reachBand } from "@/lib/bands";

/**
 * Build the emailed portfolio report: the board's rollup (stats, act-this-
 * quarter, per-company reads) rendered as email-safe HTML — inline styles
 * only, no external assets, every dated item linking back to its official
 * source. Content mirrors what's on screen; nothing is generated fresh here.
 */

const INK = "#2a2522";
const INK_LIGHT = "#4a433e";
const PAPER = "#f2e7da";
const LINE = "rgba(42,37,34,0.25)";

const CLIMATE_LABEL: Record<RegClimate, string> = {
  tailwind: "Tailwind ↑",
  neutral: "Neutral ·",
  headwind: "Headwind ↓",
};

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const label = `font-size:10px;text-transform:uppercase;letter-spacing:2px;font-weight:600;color:${INK_LIGHT};`;
const serif = `font-family:Georgia,'Times New Roman',serif;font-weight:400;color:${INK};`;
const box = `border:1px solid ${INK};padding:16px 20px;margin:0 0 16px;`;

function opportunityLine(o: ScoredOpportunity): string {
  const kind = o.type === "grant_deadline" ? "Grant" : "Comment period";
  const due = o.deadline ? ` · due ${fmtDate(o.deadline)}` : "";
  const agency = o.agency ? ` · ${esc(o.agency)}` : "";
  const gate = o.entityGate
    ? `<div style="font-size:12px;font-style:italic;color:${INK_LIGHT};">Eligibility gate: ${esc(o.entityGate)}</div>`
    : "";
  const why = o.mechanism ?? o.whyRelevant;
  return `<div style="margin:0 0 12px;">
    <a href="${esc(o.url)}" style="color:${INK};font-weight:600;text-decoration:underline;">${esc(o.title)}</a>
    <div style="font-size:12px;color:${INK_LIGHT};">${kind}${due}${agency}</div>
    ${why ? `<div style="font-size:13px;color:${INK};">${esc(why)}</div>` : ""}
    ${gate}
  </div>`;
}

/**
 * The report body (inner markup) — shared by the email (wrapped in a full
 * document) and the public share page (rendered inline). `generatedAtIso`
 * pins the header date for snapshots; defaults to now.
 */
export function buildPortfolioReportBody(
  portfolioName: string,
  companies: PortfolioCompany[],
  appUrl: string,
  generatedAtIso?: string,
): string {
  const scored = companies.filter((c) => c.score);
  const today = new Date().toISOString().slice(0, 10);

  // Rollup stats (same reads as the board).
  const highReach = scored.filter(
    (c) => reachBand(c.score!.opportunities) === "High",
  ).length;
  const climate = { tailwind: 0, neutral: 0, headwind: 0 } as Record<RegClimate, number>;
  for (const c of scored) climate[c.score!.regClimate] += 1;
  const highDependency = scored.filter(
    (c) => dependencyBand(c.score!.dependencies) === "High",
  ).length;

  // Upcoming dated items across the book, one row per program.
  const byId = new Map<string, { opp: ScoredOpportunity; names: string[] }>();
  for (const c of scored) {
    for (const o of c.score!.opportunities) {
      if (!o.deadline || o.deadline < today) continue;
      const hit = byId.get(o.id);
      if (hit) {
        if (!hit.names.includes(c.name)) hit.names.push(c.name);
      } else {
        byId.set(o.id, { opp: o, names: [c.name] });
      }
    }
  }
  const deadlines = [...byId.values()]
    .sort((a, b) => a.opp.deadline!.localeCompare(b.opp.deadline!))
    .slice(0, 15);

  const dateLine = (generatedAtIso ? new Date(generatedAtIso) : new Date()).toLocaleDateString(
    "en-US",
    {
      month: "long",
      day: "numeric",
      year: "numeric",
    },
  );

  const companyBlocks = [...companies]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const s = c.score;
      const meta = [c.sector, c.stage, c.geography].filter(Boolean).join(" · ");
      if (!s) {
        return `<div style="${box}">
          <h3 style="${serif}font-size:18px;margin:0 0 4px;">${esc(c.name)}</h3>
          ${meta ? `<div style="${label}">${esc(meta)}</div>` : ""}
          <p style="font-size:13px;color:${INK_LIGHT};margin:8px 0 0;">Not scored yet.</p>
        </div>`;
      }
      const grants = s.opportunities.filter((o) => o.type === "grant_deadline");
      const rules = s.opportunities.filter((o) => o.type !== "grant_deadline");
      const watch = s.watchItem
        ? `<div style="border:1px solid ${INK};padding:10px 14px;margin:12px 0 0;">
             <span style="${label}">Watch</span>
             <div style="font-size:13px;color:${INK};">${esc(s.watchItem.what)}${
               s.watchItem.date ? ` (${fmtDate(s.watchItem.date)})` : ""
             }</div>
           </div>`
        : "";
      const defining = s.definingEvent
        ? `<div style="margin:12px 0 0;">
             <span style="${label}">Defining event</span>
             <div style="font-size:14px;font-weight:600;color:${INK};">${esc(s.definingEvent.title)}</div>
             <div style="font-size:13px;color:${INK};">${esc(s.definingEvent.analysis)}</div>
           </div>`
        : "";
      return `<div style="${box}">
        <h3 style="${serif}font-size:18px;margin:0 0 4px;">${esc(c.name)}</h3>
        ${meta ? `<div style="${label}">${esc(meta)}</div>` : ""}
        ${s.summary ? `<p style="font-size:13px;color:${INK};margin:10px 0 0;">${esc(s.summary)}</p>` : ""}
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:12px 0 0;width:100%;">
          <tr>
            <td style="padding-right:24px;"><span style="${label}">Climate</span><div style="${serif}font-size:15px;">${CLIMATE_LABEL[s.regClimate]}</div></td>
            <td style="padding-right:24px;"><span style="${label}">Grant reach</span><div style="${serif}font-size:15px;">${reachBand(s.opportunities)}</div></td>
            <td style="padding-right:24px;"><span style="${label}">Policy dependency</span><div style="${serif}font-size:15px;">${dependencyBand(s.dependencies)}</div></td>
            <td><span style="${label}">Programs</span><div style="${serif}font-size:15px;">${grants.length} grants · ${rules.length} rulemakings</div></td>
          </tr>
        </table>
        ${defining}
        ${watch}
        ${
          s.opportunities.length > 0
            ? `<div style="margin:14px 0 0;"><span style="${label}">Programs & rulemakings</span>
               <div style="margin-top:8px;">${s.opportunities.slice(0, 5).map(opportunityLine).join("")}</div></div>`
            : ""
        }
      </div>`;
    })
    .join("");

  const deadlineRows = deadlines
    .map(
      ({ opp, names }) => `<tr>
        <td style="padding:8px 14px 8px 0;font-size:13px;font-weight:600;color:${INK};white-space:nowrap;vertical-align:top;">${fmtDate(opp.deadline!)}</td>
        <td style="padding:8px 0;border-bottom:1px solid ${LINE};">
          <a href="${esc(opp.url)}" style="color:${INK};font-weight:600;text-decoration:underline;">${esc(opp.title)}</a>
          <div style="font-size:12px;color:${INK_LIGHT};">${opp.type === "grant_deadline" ? "Grant" : "Comment period"}${opp.agency ? ` · ${esc(opp.agency)}` : ""} · ${names.map(esc).join(", ")}</div>
        </td>
      </tr>`,
    )
    .join("");

  return `<div style="max-width:640px;margin:0 auto;padding:32px 20px;background-color:${PAPER};font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;color:${INK};">
  <div style="border-bottom:1px solid ${INK};padding-bottom:16px;margin-bottom:24px;">
    <div style="${label}">RegScout · Portfolio report · ${dateLine}</div>
    <h1 style="${serif}font-size:28px;margin:6px 0 0;">${esc(portfolioName)}</h1>
    <div style="font-size:13px;color:${INK_LIGHT};margin-top:4px;">${scored.length} of ${companies.length} organizations scored</div>
  </div>

  <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:0 0 24px;">
    <tr>
      <td style="border:1px solid ${INK};padding:12px 16px;vertical-align:top;">
        <span style="${label}">High non-dilutive reach</span>
        <div style="${serif}font-size:24px;">${highReach}</div>
        <div style="font-size:12px;color:${INK_LIGHT};">${highReach === 1 ? "organization" : "organizations"} with strong grant fit</div>
      </td>
      <td style="width:12px;"></td>
      <td style="border:1px solid ${INK};padding:12px 16px;vertical-align:top;">
        <span style="${label}">Regulatory climate</span>
        <div style="font-size:13px;color:${INK};margin-top:4px;line-height:1.7;">
          <span style="color:${INK};">●</span> <b>${climate.tailwind}</b> tailwind<br>
          <span style="color:${INK};opacity:0.35;">●</span> <b>${climate.neutral}</b> neutral<br>
          <span style="color:${INK};">○</span> <b>${climate.headwind}</b> headwind
        </div>
      </td>
      <td style="width:12px;"></td>
      <td style="border:1px solid ${INK};padding:12px 16px;vertical-align:top;">
        <span style="${label}">Policy dependency</span>
        <div style="${serif}font-size:24px;">${highDependency}</div>
        <div style="font-size:12px;color:${INK_LIGHT};">${highDependency === 1 ? "organization depends" : "organizations depend"} on a specific program</div>
      </td>
    </tr>
  </table>

  ${
    deadlines.length > 0
      ? `<div style="${box}">
          <span style="${label}">Upcoming deadlines</span>
          <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin-top:8px;">${deadlineRows}</table>
        </div>`
      : ""
  }

  <div style="${label}margin:24px 0 12px;">Organizations</div>
  ${companyBlocks}

  <div style="border-top:1px solid ${INK};padding-top:16px;margin-top:24px;font-size:12px;color:${INK_LIGHT};">
    Dates come straight from official sources. Confirm against the linked
    record before acting. Qualitative reads are AI research grounded in those
    records. <a href="${esc(appUrl)}" style="color:${INK};">Open in RegScout</a>
  </div>
</div>`;
}

/** The full email: report body wrapped in a standalone HTML document. */
export function buildPortfolioReport(
  portfolioName: string,
  companies: PortfolioCompany[],
  appUrl: string,
): { subject: string; html: string } {
  const dateLine = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const body = buildPortfolioReportBody(portfolioName, companies, appUrl);
  return {
    subject: `RegScout portfolio report | ${portfolioName} (${dateLine})`,
    html: `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background-color:${PAPER};">
${body}
</body></html>`,
  };
}
