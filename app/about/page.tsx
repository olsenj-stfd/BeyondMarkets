import Link from "next/link";
import Header from "@/app/components/Header";

export const metadata = {
  title: "About | RegScout",
  description: "Why RegScout exists, how it works, and who builds it.",
};

export default function AboutPage() {
  return (
    <main className="page">
      <Header />

      <section className="glass-card intro-card">
        <span className="project-date">About</span>
        <h2 className="section-title">What RegScout does</h2>
        <p className="intro-text">
          RegScout is for the people who fund impact work. Foundation program
          officers, grants managers, nonprofits, family offices, and impact
          funds whose portfolio companies do mission-driven work. Most of them
          fund without an in-house policy team.
        </p>
        <p className="intro-text">
          RegScout matches the organizations you fund to open grant programs.
          And it surfaces regulatory activity and bills that are still on the
          horizon, while there is time to comment or plan. Paste a list of
          names, a CSV, or enter organizations by hand. RegScout researches
          each one and scores the portfolio on grant fit, regulatory climate,
          and policy dependency.
        </p>
        <p className="intro-text">
          Every date is a real record. Grant deadlines, comment periods, final
          rules, and bills come from Grants.gov, the California Grants Portal,
          the Federal Register, Regulations.gov, Congress.gov, and agency
          newsrooms. Each item links back to its source.
        </p>
      </section>

      <section className="glass-card intro-card">
        <h2 className="section-title">Who builds it</h2>
        <p className="intro-text">
          RegScout is built by <strong>Jessica L. Olsen</strong>, a
          public-sector operator and grantmaker. She spent eleven years turning
          policy and public capital into cleaner air and stronger communities.
          At the San Joaquin Valley Air District she rose from supervisor to
          director, oversaw a $140M+ community investment portfolio across 200+
          projects, facilitated 500+ community meetings under AB 617, and
          created California&apos;s first participatory budgeting mechanism for
          climate investment.
        </p>
        <p className="intro-text">
          She holds a B.S. in Bioengineering from UCLA, an M.S. from UC Irvine,
          and an M.S. in Management from Stanford GSB (2026) with a certificate
          in Public Management and Social Innovation. RegScout is that career
          turned into software. It carries the program knowledge and
          grant-making judgment she built in public service, for the people
          giving money away.
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
          RegScout is a beta. Jessica built it herself. If something is broken,
          confusing, or missing, <Link href="/feedback">tell her</Link>. Every
          note shapes what gets built next. Confirm dates and program details
          against the linked source before you rely on them.
        </p>
      </section>
    </main>
  );
}
