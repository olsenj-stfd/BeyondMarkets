import Link from "next/link";
import Header from "@/app/components/Header";

export const metadata = {
  title: "About — RegScout",
  description:
    "Why RegScout exists, how it works, and who builds it.",
};

export default function AboutPage() {
  return (
    <main className="page">
      <Header />

      <section className="glass-card intro-card">
        <span className="project-date">About</span>
        <h2 className="section-title">What RegScout does</h2>
        <p className="intro-text">
          RegScout is regulatory and funding intelligence for mission-driven
          investors and founders. Point it at a portfolio — paste a list of
          company names, upload a CSV, or enter them by hand — and it researches
          each company, maps its regulatory exposure, and scores the book on
          non-dilutive capital within reach, regulatory climate, and policy
          dependency.
        </p>
        <p className="intro-text">
          Everything dated is real: grant deadlines, comment periods, final
          rules, and moving bills come from official sources — Grants.gov, the
          California Grants Portal, the Federal Register, Regulations.gov,
          Congress.gov, and agency newsrooms — each linked back to the record it
          came from. The qualitative reads (regulatory climate, policy
          dependency, the program analysis) are AI research, clearly labeled and
          grounded in that evidence, never invented.
        </p>
        <p className="intro-text">
          The premise is simple: public capital and regulation move venture
          outcomes as much as markets do — an early non-dilutive award can
          double a company&apos;s odds of raising follow-on capital, and policy
          shifts reprice whole sectors overnight. Most investors track that
          landscape by hand, late, or not at all.
        </p>
      </section>

      <section className="glass-card intro-card">
        <h2 className="section-title">Who builds it</h2>
        <p className="intro-text">
          RegScout is built by <strong>Jessica L. Olsen</strong> — a
          public-sector operator and impact investor who spent eleven years
          turning policy and public capital into cleaner air and stronger
          communities. At the San Joaquin Valley Air District she rose from
          supervisor to director, overseeing a $140M+ community investment
          portfolio across 200+ projects, facilitating 500+ community meetings
          under AB 617, and creating California&apos;s first participatory
          budgeting mechanism for climate investment.
        </p>
        <p className="intro-text">
          She holds a B.S. in Bioengineering from UCLA and an M.S. from UC
          Irvine, and is completing an M.S. in Management at Stanford GSB with a
          certificate in Public Management and Social Innovation, where she also
          evaluates early-stage ventures with the GSB Impact Fund. RegScout is
          that career distilled into software: the regulatory navigation,
          community knowledge, and capital-allocation judgment she built in
          public service, made available to every impact venture.
        </p>
        <a
          href="https://olsenj-stfd.github.io/"
          target="_blank"
          rel="noopener noreferrer"
          className="pill-btn"
        >
          More about Jessica ↗
        </a>
      </section>

      <section className="glass-card intro-card">
        <h2 className="section-title">Beta</h2>
        <p className="intro-text">
          RegScout is in active beta — the dataset, scoring, and interface are
          evolving weekly. If something is broken, confusing, or missing,{" "}
          <Link href="/feedback">tell us</Link>; every note shapes what gets
          built next. Always confirm dates and program details against the
          linked official source before making a compliance or funding decision.
        </p>
      </section>
    </main>
  );
}
