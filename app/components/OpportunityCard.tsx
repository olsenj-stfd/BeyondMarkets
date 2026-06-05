"use client";

import type { Opportunity, RankedOpportunity } from "@/lib/types";

const TYPE_LABEL: Record<Opportunity["type"], string> = {
  grant_deadline: "Grant deadline",
  comment_period: "Comment period",
};

const SOURCE_LABEL: Record<Opportunity["source"], string> = {
  federal_register: "Federal Register",
  regulations_gov: "Regulations.gov",
  grants_gov: "Grants.gov",
  ca_grants: "CA Grants Portal",
};

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(`${iso}T00:00:00`);
  return Math.round((d.getTime() - today.getTime()) / 86_400_000);
}

function formatDate(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function OpportunityCard({
  o,
  starred,
  onToggleStar,
  canStar = true,
}: {
  o: Opportunity | RankedOpportunity;
  starred: boolean;
  onToggleStar: (id: string) => void;
  canStar?: boolean;
}) {
  const days = o.deadline ? daysUntil(o.deadline) : null;
  const urgent = days !== null && days <= 14;
  const why = "whyRelevant" in o ? o.whyRelevant : null;
  const relevance = "relevance" in o ? o.relevance : null;

  return (
    <li className="opp-row glass-card">
      <div className={`opp-deadline ${urgent ? "urgent" : ""}`}>
        {o.deadline && (
          <>
            <span className="opp-date">{formatDate(o.deadline)}</span>
            <span className="opp-countdown">
              {days === 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`}
            </span>
          </>
        )}
      </div>
      <div className="opp-body">
        <div className="opp-badges">
          <span className={`opp-badge ${o.jurisdiction}`}>
            {o.jurisdiction === "federal" ? "Federal" : "California"}
          </span>
          <span className="opp-badge type">{TYPE_LABEL[o.type]}</span>
          {o.domain && <span className="opp-badge domain">{o.domain}</span>}
          {relevance !== null && (
            <span className="opp-badge fit">{relevance}% fit</span>
          )}
        </div>
        <a href={o.url} target="_blank" rel="noopener noreferrer" className="opp-title">
          {o.title}
        </a>
        {o.agency && <p className="opp-agency">{o.agency}</p>}
        {why && <p className="opp-why">{why}</p>}
        <span className="opp-source">{SOURCE_LABEL[o.source]}</span>
      </div>
      {canStar && (
        <button
          type="button"
          className={`star-btn ${starred ? "starred" : ""}`}
          aria-pressed={starred}
          aria-label={starred ? "Untrack this opportunity" : "Track this opportunity"}
          title={starred ? "Tracking — click to remove" : "Track this deadline"}
          onClick={() => onToggleStar(o.id)}
        >
          {starred ? "★" : "☆"}
        </button>
      )}
    </li>
  );
}
