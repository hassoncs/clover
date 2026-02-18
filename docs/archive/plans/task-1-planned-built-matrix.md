# Planned vs Built vs Infra Readiness Matrix

This document tracks the status of party games planned in `.sisyphus/plans/party-games/` against their implementation status in `r2/games/` and their infrastructure readiness.

**Last Updated**: 2026-02-15

## Summary

- **Total Planned**: 52 games
- **Built**: 24 games
- **Infra-Ready (not built)**: 23 games
- **Blocked**: 5 games

## Wave 1 (3 games) - COMPLETE

| plan_slug | built_status | built_match | infra_status |
|-----------|--------------|-------------|--------------|
| open-mic-frenzy | BUILT | r2/games/open-mic-frenzy | ready_now |
| punchline-duel | BUILT | r2/games/punchline-duel | ready_now |
| quickfire-qa | BUILT | r2/games/quickfire-qa | ready_now |

## Wave 2 (7 games) - COMPLETE

| plan_slug | built_status | built_match | infra_status |
|-----------|--------------|-------------|--------------|
| about-you-bluff | BUILT | r2/games/about-you-bluff | ready_now |
| chain-reaction | BUILT | r2/games/chain-reaction | ready_now |
| half-and-half | BUILT | r2/games/half-and-half | ready_now |
| lexicon-ladder | BUILT | r2/games/lexicon-ladder | ready_now |
| out-of-context | BUILT | r2/games/out-of-context | ready_now |
| role-replay | BUILT | r2/games/role-replay | ready_now |
| ruin-and-redeem | BUILT | r2/games/ruin-and-redeem | ready_now |

## Wave 3 (14 games) - 9 BUILT, 5 BLOCKED

| plan_slug | built_status | built_match | infra_status | blocker |
|-----------|--------------|-------------|--------------|---------|
| consensus-mine | BUILT | r2/games/consensus-mine | ready_now | None |
| drawful-animate | BUILT | r2/games/drawful-animate | ready_now | None |
| percent-panic | BUILT | r2/games/percent-panic | ready_now | None |
| rival-roster | BUILT | r2/games/rival-roster | ready_now | None |
| shirt-clash | BUILT | r2/games/shirt-clash | ready_now | None |
| sketch-bluff | BUILT | r2/games/sketch-bluff | ready_now | None |
| spectrum-guess | BUILT | r2/games/spectrum-guess | ready_now | None |
| truth-trap | BUILT | r2/games/truth-trap | ready_now | None |
| year-jinx | BUILT | r2/games/year-jinx | ready_now | None |
| clue-builder | NOT_BUILT | - | needs_p1 | Real-time guess stream |
| fortune-wheel | NOT_BUILT | - | needs_p1 | Wheel component (Godot) |
| matchmaker-grid | NOT_BUILT | - | ready_now | MatchingInput built, game not implemented |
| oddity-appraiser | NOT_BUILT | - | needs_p1 | AI image pipeline |
| sound-slam | NOT_BUILT | - | ready_now | MicInput built, game not implemented |

## Wave 4 (28 games) - 1 BUILT, 27 NOT BUILT

| plan_slug | built_status | built_match | infra_status | blocker |
|-----------|--------------|-------------|--------------|---------|
| punchline-ferry | BUILT | r2/games/punchline-ferry | ready_now | None |
| pitch-factory | NOT_BUILT | - | ready_now | InvestmentInput built, game not implemented |
| auction-arena | NOT_BUILT | - | ready_now | InvestmentInput built, game not implemented |
| bracket-bet | NOT_BUILT | - | ready_now | InvestmentInput built, game not implemented |
| persona-outlier | NOT_BUILT | - | ready_now | MatchingInput built, game not implemented |
| alien-audit | NOT_BUILT | - | needs_p1 | Hidden role system |
| bake-battle | NOT_BUILT | - | needs_p1 | Multi-phase cooking |
| borrowed-words | NOT_BUILT | - | ready_now | TokenComposer built, game not implemented |
| caption-clash-live | NOT_BUILT | - | needs_p1 | Live caption sync |
| chaos-edit | NOT_BUILT | - | ready_now | TokenComposer built, game not implemented |
| deadly-quizhouse | NOT_BUILT | - | needs_p1 | Quiz show mechanics |
| defuse-hotline | NOT_BUILT | - | needs_p1 | Asymmetric info, keypad input |
| faux-signal | NOT_BUILT | - | needs_p1 | Signal detection |
| flip-sketch-bluff | NOT_BUILT | - | needs_p1 | Flip animation |
| hidden-glyph-hunt | NOT_BUILT | - | needs_p1 | Hidden object mechanics |
| midnight-match | NOT_BUILT | - | needs_p1 | Matching with timer |
| relay-canvas | NOT_BUILT | - | needs_p1 | Relay drawing |
| robo-rumble-rhymes | NOT_BUILT | - | needs_p1 | Rhyme mechanics |
| slide-improv | NOT_BUILT | - | needs_p1 | Slide presentation |
| snark-quiz-show | NOT_BUILT | - | needs_p1 | Screw mechanic |
| sound-remix-show | NOT_BUILT | - | needs_p1 | Audio editing |
| survey-sleuth | NOT_BUILT | - | needs_p1 | Survey engine |
| truth-swarm | NOT_BUILT | - | needs_p1 | High-concurrency input |

## Wave 5 (5 games) - ALL BLOCKED

| plan_slug | built_status | built_match | infra_status | blocker |
|-----------|--------------|-------------|--------------|---------|
| beat-brigade | NOT_BUILT | - | needs_p1 | Rhythm game engine |
| drop-sort | NOT_BUILT | - | needs_p1 | Real-time physics board |
| family-frenzy | NOT_BUILT | - | needs_p1 | Concurrent task scheduler |
| slingshot-dome | NOT_BUILT | - | needs_p1 | Physics slingshot |
| trivia-quest | NOT_BUILT | - | needs_p1 | RPG framework |

## Infrastructure Built This Session

| Component | File | Unlocks |
|-----------|------|---------|
| MicInput | app/components/party/MicInput.tsx | sound-slam, punchline-ferry, pitch-factory |
| InvestmentInput | app/components/party/InvestmentInput.tsx | pitch-factory, auction-arena, bracket-bet |
| MatchingInput | app/components/party/MatchingInput.tsx | matchmaker-grid, persona-outlier |
| WheelInput | app/components/party/WheelInput.tsx | fortune-wheel |
| DraggableToken | app/components/party/DraggableToken.tsx | Word games |
| TokenComposer | app/components/party/TokenComposer.tsx | borrowed-words, chaos-edit |

## Party Input Types Available

```typescript
export type PartyInputType =
  | "text"
  | "choice"
  | "drawing"
  | "buzzer"
  | "mic"
  | "investment"
  | "matching"
  | "wheel";
```
