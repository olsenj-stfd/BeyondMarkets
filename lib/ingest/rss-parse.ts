/**
 * Dependency-free RSS 2.0 / Atom parsing helpers, kept separate from the
 * fetch/classify layer so they can be unit-tested standalone.
 */

const MAX_ITEMS_PER_FEED = 40;

export interface FeedItem {
  title: string;
  link: string;
  published: string | null; // ISO date
  summary: string | null;
}

function decodeEntities(s: string): string {
  return s
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripTags(s: string): string {
  return decodeEntities(s).replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

/** First match of a tag's inner text within a block, or null. */
function tagText(block: string, ...tags: string[]): string | null {
  for (const tag of tags) {
    const m = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
    if (m) {
      const text = stripTags(m[1]);
      if (text) return text;
    }
  }
  return null;
}

function toIsoDate(s: string | null): string | null {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

/** Parse RSS 2.0 <item> or Atom <entry> blocks with a tolerant regex pass. */
export function parseFeed(xml: string): FeedItem[] {
  const blocks =
    xml.match(/<item[\s>][\s\S]*?<\/item>/gi) ??
    xml.match(/<entry[\s>][\s\S]*?<\/entry>/gi) ??
    [];

  const items: FeedItem[] = [];
  for (const block of blocks.slice(0, MAX_ITEMS_PER_FEED)) {
    const title = tagText(block, "title");
    // RSS: <link>url</link>. Atom: <link href="url" />.
    let link = tagText(block, "link");
    if (!link) {
      const href = block.match(/<link[^>]*href="([^"]+)"/i);
      link = href ? decodeEntities(href[1]) : null;
    }
    if (!title || !link || !/^https?:\/\//.test(link)) continue;
    items.push({
      title,
      link,
      published: toIsoDate(
        tagText(block, "pubDate", "published", "updated", "dc:date"),
      ),
      summary:
        tagText(block, "description", "summary", "content")?.slice(0, 500) ?? null,
    });
  }
  return items;
}
