import { redirect } from "next/navigation";

// Portfolio mode now lives at the home page; keep this path working for any
// existing links/bookmarks.
export default function PortfoliosRedirect() {
  redirect("/");
}
