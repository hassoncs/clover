Devmux Integration Plan Bridging Gap

. Problem Statement
 current agent environment capability mismatch
 "Start Storybook-level
 `interactive_bash (low tmux
 `devmux` (service orchestration

 agent use `interactive_bash `pnpm commands, missing `devmux abstraction layer session management, port checking, persistence.

. Solution Strategy
 **Knowledge Injection Strategy** specialized Skill`devmux System Prompt context.

./devmux` Skill
 new skill file reference service management.

. opencode/skills/devmux.


. "start storybook, api, services, "devmux, "fix port lock.
. `devmux` *exclusive way run long-running services.
.
 Start/Ensure `devmux
 Status `devmux
 Logs `devmux attach [service
 Stop `devmux stop [service
. steps "locked by another process" error PID.

.. Updates
 project-specific. mandate use `devmux` skill service-related request.



 Service Management (Devmux
 use `devmux skill starting, stopping, debugging services,,.
 run `pnpm start `node server. js long-running processes.
 construct `tmux commands manually. Use `devmux abstraction.


. Prompt Engineering Prompt
 don't need change global system prompt if `AGENTS. md Skill strong. existing intent classification pick up "start X" route to skill.

. Implementation Steps

 Create. opencode/skills/devmux. skill
 "brain handling services.




 background services (Storybook, Metro, API using devmux. starting, stopping, fixing lock files.








. Run `pnpm svc:status` see what running.
. Use `pnpm [service.., storybook maps to `devmux.
. **Locked Port
 "locked by another process
 Find PID
 Kill PID
 Retry start command.
.Don't attach tmux. Check ensure command log files.




Step Update `AGENTS.
 link service requests workflow.

 Verify. json scripts
 Ensure `pnpm svc:status helpers exist suggest adding missing.

. Verification Plan
. Ask agent Storybook. invoke `devmux ensure storybook.
. Ask's running?". use `pnpm svc:status`.
. Simulate port lock node 6006 ask agent fix. find kill PID.
