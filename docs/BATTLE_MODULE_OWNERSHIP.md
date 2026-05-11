# Battle Module Ownership & Technical Contribution

## Scope Owned

- End-to-end 1v1 head-to-head implementation:
  - `backend/src/battle/*`
  - `frontend/src/pages/Battle/*`
  - `frontend/src/hooks/useBattleSocket.ts`
  - `frontend/src/stores/battleStore.ts`
  - `frontend/src/components/Battle/*`

## Key Technical Decisions

1. **Server as source of truth**
   - Timer emits every second from backend (`timer_tick`) with authoritative remaining time and player submission state.
2. **Atomic battle mutation flow**
   - Submit path uses conditional updates and array filters to avoid duplicate submission races.
   - Finalization path computes winner from stored submissions, then persists score breakdown.
3. **Weighted winner model**
   - Weights: pass(50), speed(25), execution efficiency(15), bonus(10).
   - Deterministic tie-breakers: total score -> pass ratio -> execution -> submit timestamp.
4. **Future-proofing**
   - `mode` supports future team battles.
   - Socket payloads and store shape are extensible for multi-player state.

## Performance & Data Considerations

- Paginated listing endpoint for player battles (`GET /battle?page=&limit=`).
- Mongo indexes on battle status and player participation in schema.
- Lightweight timer payload design (`players` submission booleans only).

## Security Controls

- JWT validation on WebSocket connections.
- Route guards on all battle REST endpoints.
- Submission attempt cap via `BATTLE_MAX_SUBMITS_PER_PLAYER`.
- Membership checks on all player-specific reads/writes.

## Deliverables Mapping

- Robust Battle API + WebSocket events ✅
- Multi-criteria winner + stored score breakdown ✅
- Real-time timer/opponent state on frontend ✅
- Accessible timer/status UX improvements ✅
- AI assistance + ownership docs ✅

