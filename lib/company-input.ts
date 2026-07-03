/**
 * Client-side parsing of the portfolio input modes (paste-names, CSV), shared
 * by the create form and the add-to-portfolio panel.
 */

export interface CompanyInput {
  name: string;
  description?: string | null;
  sector?: string | null;
  stage?: string | null;
  geography?: string | null;
  website?: string | null;
}

/** Minimal CSV parser: handles quoted fields, embedded commas, and CRLF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      field = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    if (row.some((c) => c.trim() !== "")) rows.push(row);
  }
  return rows;
}

const CSV_COLS = ["name", "description", "sector", "stage", "geography", "website"];

export function csvToCompanies(text: string): CompanyInput[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];
  const first = rows[0].map((c) => c.toLowerCase().trim());
  const hasHeader = first.includes("name");
  const idx: Record<string, number> = {};
  CSV_COLS.forEach((c, i) => {
    idx[c] = hasHeader ? first.indexOf(c) : i;
  });
  const at = (r: string[], i: number) =>
    i >= 0 && i < r.length ? r[i].trim() : "";

  return rows
    .slice(hasHeader ? 1 : 0)
    .map((r) => ({
      name: at(r, idx.name),
      description: at(r, idx.description) || null,
      sector: at(r, idx.sector) || null,
      stage: at(r, idx.stage) || null,
      geography: at(r, idx.geography) || null,
      website: at(r, idx.website) || null,
    }))
    .filter((c) => c.name);
}

/** One company per line, optionally "Name, website". */
export function namesToCompanies(text: string): CompanyInput[] {
  return text
    .split(/\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => {
      const [name, website] = l.split(",").map((s) => s.trim());
      return { name, website: website || null };
    })
    .filter((c) => c.name);
}
