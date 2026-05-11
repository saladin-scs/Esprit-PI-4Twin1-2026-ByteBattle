# AI-Assisted Development Log (Battle Upgrade)

## Tools Used

- Cursor Agent + GPT model for scaffolding and iterative refactors.
- IDE terminal automation for build/test validation.

## Where AI Was Used

- Initial scaffold for `BattleModule` components (`service`, `controller`, `gateway`, schema).
- Timer UX component and socket event wiring.
- Swagger response examples for newly added battle endpoints.
- Result page restructuring into tabular score/timing presentation.

## Why AI Suggestions Were Chosen

- Accelerated repetitive boilerplate (DTOs, endpoint response shapes, typed payloads).
- Reduced time for synchronized backend/frontend event contracts.
- Helped generate exhaustive edge-case checks for score normalization and tie-breakers.

## Manual Improvements Applied

- Reworked battle score persistence to avoid fragile object spreading on subdocuments.
- Added explicit post-finalization persistence for `players[].scoreBreakdown`.
- Added exact timestamps (`startedAt`, `endsAt`, `finishedAt`) in API payloads.
- Tightened accessibility semantics (`role="timer"`, `aria-live`, focus-visible styling).
- Added controlled startup order (`wait-on`) to avoid dev proxy race (`ECONNREFUSED`).

## Known Limits of AI Output

- AI-generated persistence logic initially ignored Mongoose subdocument nuances.
- UI drafts lacked complete accessibility semantics and had sparse keyboard/focus handling.
- Swagger docs required manual examples aligned with actual response payloads.

## Validation Performed

- Backend: `npm run build`, `npm test -- --testPathPattern=battle`, `npm run test:e2e -- --testPathPattern=battle`
- Frontend: `npm run build`
- Lint diagnostics on changed battle files in backend/frontend.

