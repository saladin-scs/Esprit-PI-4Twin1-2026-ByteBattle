import { memo } from 'react';

const RULES = [
  'Do not share solutions or discuss approach during the contest period.',
  'Submitted solutions must pass automated execution before they are recorded. Code runs in a secure sandbox (Piston engine).',
  'Do not submit duplicate solutions for similar languages (e.g. c/c++, js/ts).',
  'Solutions that depend on randomness to pass are not allowed.',
];

interface CompetitionRulesProps {
  additionalRules?: string | null;
  className?: string;
}

function CompetitionRulesComponent({ additionalRules, className = '' }: CompetitionRulesProps) {
  return (
    <section className={className} aria-labelledby="rules-heading">
      <h2 id="rules-heading" className="text-lg font-semibold text-emerald-400 mb-3">
        Rules
      </h2>
      <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-400">
        {RULES.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ul>
      {additionalRules?.trim() && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <p className="text-sm text-gray-400 whitespace-pre-wrap">{additionalRules}</p>
        </div>
      )}
    </section>
  );
}

export const CompetitionRules = memo(CompetitionRulesComponent);
