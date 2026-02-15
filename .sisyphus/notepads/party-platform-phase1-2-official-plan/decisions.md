# Decisions

## 2026-02-15 Initial Analysis

### Task Parallelization Strategy
- **Wave A (Tasks 1-5)**: Tasks 1 and 2 are independent (server-side utility extraction). Tasks 3-4 are sequential (server then client). Task 5 is independent (UI component).
- **Wave B (Tasks 6-11)**: Task 6 depends on Task 3 pattern. Tasks 7-8 are independent. Tasks 9-10 are sequential. Task 11 depends on Task 1.

### Parallel Groups
- Group 1: Task 1 (utils extraction) + Task 2 (content loader) — independent server changes
- Group 2: Task 3 (sendToPlayer) — depends on understanding protocol from exploration
- Group 3: Task 4 (client privateState) — depends on Task 3
- Group 4: Task 5 (BuzzerInput) — independent UI, needs client exploration results
- Group 5: Task 6 (requestInputFromSubset) — builds on Task 3 pattern
- Group 6: Task 7 (DrawingInput) + Task 8 (phase-router) — independent UI tasks
- Group 7: Task 9 (generation configs) + Task 10 (bulk generation) — sequential
- Group 8: Task 11 (template helper framework) — depends on Task 1

### Content Pipeline Findings
- Fibbage, Caption, WordGame have schemas but NO generation configs
- 5 types already production-ready: quip, trivia, drawing, wyr, estimation
- API only uses quiplash-prompts.json currently via prompt-loader.ts
- Caption type needs image source integration — may need special handling
