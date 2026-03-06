# Agentic Patterns Research: From Primitives to Production

**Source**: [agent-experience.dev](https://agent-experience.dev) (Cloudflare's open-source reference, March 2026)  
**Adjacent**: ULW (Ultra Large Work) from oh-my-opencode, production-grade patterns  
**Purpose**: Operational guidance for building an "agentic company" — multi-agent org-level workflows

---

## 1. Foundational Execution Primitives

### 1.1 ReAct Pattern — The Core Loop

Every agentic system runs on the ReAct (Reasoning + Acting) loop: the model **reasons** about what to do, **takes an action** through a tool call, **observes** the result, then **reasons again**. This is the fundamental execution model that everything else builds upon.

**Key insight**: Understanding this loop is essential for debugging agent behavior. Most agent failures manifest as the agent looping endlessly, stopping prematurely, or choosing wrong tools.

**Reference**: [ReAct Pattern — Agent Experience](https://agent-experience.dev/react-loop)

- LangGraph: Graph-based agent framework with explicit state machines, cyclic graphs, checkpointing, and error handling
- Agno (formerly Phidata): Stateless, horizontally scalable runtime with durable memory and multi-modal support
- Gemini CLI: ReAct loop with built-in tools and MCP support

### 1.2 Tool Use & Function Calling

The building block of every agent. Agents need well-designed tool interfaces — unclear tool contracts cause more agent failures than model limitations.

**Anti-pattern**: Verbose, ambiguous tool descriptions that leave the model guessing about parameters.  
**Pattern**: Tool interfaces should be self-documenting with explicit parameter schemas, clear success/failure conditions, and idempotency guarantees.

---

## 2. Planning & Task Decomposition

**Source**: [Planning & Decomposition — Agent Experience](https://agent-experience.dev/planning)

### 2.1 Core Principle

Before acting, good agents plan. Planning patterns help models break complex goals into ordered subtasks, identify dependencies, and create execution strategies. Without planning, agents jump straight into action and usually fail on anything complex.

**Planning is what makes production agents work on hard problems.**

### 2.2 Key Mechanisms

- **Task decomposition strategies**: Break big problems into small, ordered steps
- **Dependency graphs and ordering**: Identify what can run in parallel vs. sequentially
- **Dynamic replanning when things go wrong**: Agents must recognize failure and replan, not double down
- **Tree-of-thought and graph-of-thought**: Explore multiple reasoning branches before committing

### 2.3 ULW (Ultra Large Work) — Complex Task Handling

From oh-my-opencode's orchestration system:

| Complexity | Approach | When to Use |
|------------|----------|-------------|
| **Simple** | Just prompt | Simple tasks, quick fixes, single-file changes |
| **Complex + Lazy** | Type `ulw` or `ultrawork` | Complex tasks where explaining context is tedious. Agent figures it out. |
| **Complex + Precise** | `@plan` → `/start-work` | Precise, multi-step work requiring true orchestration. Prometheus plans, Atlas executes. |

**Reference**: [Orchestration System Guide — oh-my-opencode](https://github.com/code-yeongyu/oh-my-opencode/blob/dev/docs/guide/orchestration.md)

**Key insight**: The distinction between "lazy" and "precise" complex work is critical. ULW is designed for when you want the agent to figure out the decomposition itself rather than being told step-by-step.

---

## 3. Multi-Agent Orchestration

**Source**: [Multi-Agent Orchestration — Agent Experience](https://agent-experience.dev/orchestration)

### 3.1 Hierarchy Patterns

- **Coordinator-Worker**: A parent agent delegates subtasks to specialized child agents, each with their own tools and instructions (OpenAI Agents SDK: Agent-as-Tool)
- **Role-Based Teams**: Define agents with roles, goals, and backstories, then let them plan and execute together (CrewAI)
- **Explicit Plans with Steps**: Break down work into step-by-task breakdowns with visibility into thinking process (Devin 2.0)

### 3.2 Isolation Boundaries

From OpenClaw multi-agent orchestration patterns:

> The difference between chaos and orchestration comes down to understanding isolation boundaries.

**Key principles**:
- Each agent should have a single, well-defined responsibility
- Inter-agent communication should use structured data, not implicit context
- Shared state between agents creates coupling; prefer message passing with clear contracts

### 3.3 Parallel Execution

Multi-agent systems multiply output without multiplying headcount. Key patterns:

- **Parallel agent dispatch**: Multiple agents working on independent subtasks simultaneously
- **Merge strategies**: How to combine results from multiple agents without conflicts
- **Guardrails for token consumption**: Prevent runaway parallel execution from exploding costs

**Reference**: [Orchestrating Multiple Parallel Agents — Developer Toolkit](https://developertoolkit.ai/en/codex/productivity-patterns/multi-agent-workflows/)

---

## 4. Memory & Context Management

**Source**: [Memory Patterns — Agent Experience](https://agent-experience.dev/memory) and [Context Management — Agent Experience](https://agent-experience.dev/context)

### 4.1 The Core Problem

Every time an AI agent completes a task, it forgets everything. Conversation context vanishes. User preferences inferred are gone. Multi-step reasoning chains dissolve.

**This is not the same challenge as caching database queries.** Agent memory requires storing heterogeneous data: facts, episodes, preferences, tool outputs.

### 4.2 Layered Memory Architecture

Production-grade agentic AI mimics human cognition with two memory types:

- **Short-Term Memory (STM)**: Fast, volatile — immediate context using Redis or in-memory stores. Used for active task state.
- **Long-Term Memory (LTM)**: Persistent — evolving knowledge across sessions. Used for learned patterns, user preferences, historical context.

### 4.3 Context Engineering Principles

**Core definition**: Choosing the input (x) so that a model's next-step distribution (p(y|x)) is maximally useful for the next action — while staying within a token budget.

**Key techniques**:
- **Memory Blocks**: Structured context with prioritized, token-bucketed segments
- **Retrieval-augmented context**: Only inject relevant memories, not everything
- **Context burst management**: Prevent noisy, irrelevant state from overwhelming the model
- **Selective forgetting**: Actively prune stale context to prevent hallucination from noise

**Reference**: [Context Engineering for Agents — Galileo AI](https://galileo.ai/blog/context-engineering-for-agents)

### 4.4 Context vs. Memory Distinction

| Aspect | Context | Memory |
|--------|---------|--------|
| **Scope** | Active working window | Persistent across sessions |
| **Management** | Sliding window, truncation | Structured storage, retrieval |
| **Use case** | Current task reasoning | Learning from past interactions |

---

## 5. Verification & Self-Correction

**Source**: [Reflection & Self-Correction — Agent Experience](https://agent-experience.dev/reflection)

### 5.1 The Reflection Pattern

Self-reflection makes agents pause and evaluate their own output before committing to it. The reliable architecture is **Draft → Critique → Revise → Freeze**:

- **Draft**: Agent produces initial output
- **Critique**: Separate agent or layer produces structured verdicts with specific issues, severities, and concrete fixes
- **Revise**: Original agent addresses critiques
- **Freeze**: Output is committed once quality thresholds are met

**Key insight**: Separate drafting from critique. Force evidence. Turn failures into actionable feedback.

### 5.2 Deterministic + LLM Verification

Combine LLM-based critique with deterministic validators for strongest reliability:

- **Schema checks**: Validate structured output format
- **Unit tests**: Verify functional correctness
- **Citation matching**: For RAG/grounded outputs, verify sources exist
- **Diff validation**: Compare before/after states

### 5.3 Loop Budgeting

**Critical**: Always budget reflection passes to prevent expensive loops.

- One critique pass is usually enough
- If issues do not decrease between attempts, stop and escalate
- Diminishing returns after 2-3 iterations

**Reference**: [Self-Reflection and Critique — Arun Baby](https://arunbaby.com/ai-agents/0039-self-reflection-and-critique/)

---

## 6. Human-in-the-Loop (HITL)

**Source**: [Human-in-the-Loop — Agent Experience](https://agent-experience.dev/human-in-the-loop)

### 6.1 The Core Tension

An agent that can send emails, delete records, make purchases, or post publicly is powerful precisely because it takes real action. That same power makes it dangerous when it takes the wrong action.

**HITL patterns keep humans in control of consequential decisions without sacrificing the automation benefits.**

### 6.2 Where Human Review Belongs

The goal is NOT to slow work down, but to keep speed while preventing the costly, dangerous "oops" that shows up only after an agent can act.

**Pattern**: Approve-on-uncertainty, not approve-on-everything.

- **Consequential actions** (destructive, financial, reputational): Require human sign-off
- **Routine operations** (queries, transformations, generation): Fully autonomous
- **Ambiguous cases**: Agent flags uncertainty, requests human judgment

### 6.3 UX for Human Oversight

- **Visible plans**: Show users what the agent plans to do before execution
- **Editable plans**: Let humans modify the plan before approval
- **Checkpoint-based**: Human approval at key milestones, not every step
- **Escalation paths**: Clear paths for agents to request help

---

## 7. Safety, Guardrails & Boundaries

**Source**: [Guardrails & Safety — Agent Experience](https://agent-experience.dev/guardrails)

### 7.1 Categories of Guardrails

- **Input validation**: Sanitize and validate all inputs before they reach the agent
- **Output filtering**: Check outputs for policy violations, PII, sensitive data
- **Tool access control**: Limit which tools agents can call and under what conditions
- **Rate limiting**: Prevent runaway agent loops from consuming resources
- **Budget caps**: Hard limits on token spend per task or per day

### 7.2 Sandboxing

**Reference**: [Sandboxes — Agent Experience](https://agent-experience.dev/sandboxes)

Let agents act without breaking things:

- **Execution sandboxing**: Run untrusted code in isolated containers
- **Network isolation**: Prevent agents from accessing unauthorized services
- **Ephemeral environments**: Create temporary contexts that can't persist harmful state

### 7.3 Agent Harnesses — The Outer Loop

The "harness" is the outer loop that makes agents reliable:

- **Retry logic**: Automatic retry with backoff for transient failures
- **Timeout handling**: Kill long-running agents that exceed time budgets
- **Circuit breakers**: Stop calling failing agents/services after threshold
- **State machines**: Explicit state transitions prevent invalid agent states

---

## 8. Observability & Debugging

**Source**: [Observability & Tracing — Agent Experience](https://agent-experience.dev/observability)

### 8.1 Agent Observability ≠ Software Observability

Traditional observability tracks "what happened." Agent observability must track "why the agent decided to do what it did."

### 8.2 Key Primitives

- **Trace every decision**: Log the ReAct loop — reasoning, action, observation
- **Token accounting**: Track context window usage, cost per task
- **Tool call graphs**: Visualize agent→tool→result relationships
- **Decision logging**: Record why the agent chose one tool over another

### 8.3 Evaluation != Testing

**Testing**: Verifies known inputs produce known outputs (deterministic).  
**Evaluation**: Assesses whether agent behavior is "good" across a distribution of cases (probabilistic).

**Evaluation frameworks**:
- Golden datasets with known correct answers
- LLM-as-judge for subjective quality assessment
- A/B testing with real user feedback
- Continuous monitoring with drift detection

**Reference**: [Agent Observability and Evaluation — 2026 Developer's Guide](https://yadavdivy296.medium.com/agentic-observability-and-evaluation-a-2026-developers-guide-to-building-reliable-ai-agents-f4547e4beb14)

---

## 9. Structured Output & Tool Contracts

**Source**: [Structured Output — Agent Experience](https://agent-experience.dev/structured-output)

### 9.1 The Problem

LLMs are non-deterministic — they produce different outputs for the same input. Production systems need reliable, parseable data.

### 9.2 Solutions

- **JSON schema validation**: Force models to output valid JSON with enforced schemas
- **Tool calling as structured output**: Use native tool calling APIs instead of parsing
- **Two-stage generation**: Generate structure first, then fill content
- **Output validators**: Post-process LLM output to ensure it matches expected format

---

## 10. Practical Operating Guidelines for Agentic Companies

### 10.1 Task Decomposition Best Practices

1. **Start with outcome, not steps**: Tell the agent what success looks like, not how to get there
2. **Make dependencies explicit**: If step B depends on step A, state this clearly
3. **Define exit criteria**: When is a subtask "done"? What validates completion?
4. **Parallelize where possible**: Identify independent subtasks and run them concurrently

### 10.2 Handoff Protocols

1. **Structured artifacts**: Pass well-defined data structures between agents, not prose
2. **Contract versioning**: If tool/agent interfaces change, version them explicitly
3. **Failure propagation**: When an agent fails, propagate context to the next agent that might recover

### 10.3 Reliability Patterns

1. **Idempotency**: Agents should be able to re-run tasks without side effects
2. **Checkpointing**: Save state at key milestones; resume from last checkpoint on failure
3. **Timeouts everywhere**: No agent action should run indefinitely
4. **Graceful degradation**: If an agent fails, the system should still produce useful output

### 10.4 Cost Management

1. **Token budgeting**: Set maximum context sizes per task
2. **Caching**: Cache common tool outputs to avoid redundant calls
3. **Model tiering**: Use smaller/faster models for simple tasks, reserve larger models for complex reasoning

---

## 11. Anti-Patterns to Avoid

### 11.1 Architecture Anti-Patterns

- **Monolithic agents**: A single agent trying to do everything is a maintenance nightmare
- **Implicit state**: Relying on context window to hold state instead of explicit memory
- **Synchronous everything**: Blocking on agent responses when parallel execution is possible

### 11.2 Operational Anti-Patterns

- **No escape valves**: Agents with no way to request human help or admit failure
- **Magic prompting**: Relying on prompt hacks instead of proper architecture
- **Ignore drift**: Not monitoring for agent behavior changes over time

### 11.3 UX Anti-Patterns

- **Black boxes**: Agents that don't explain their reasoning to users
- **Unstoppable agents**: No way to cancel or interrupt agent actions
- **All-or-nothing**: Either fully autonomous or fully manual, with nothing in between

---

## 12. Synthesis: The Agentic Company Model

Bringing together the patterns above, an "agentic company" operates on these principles:

1. **Specialized agents with clear boundaries**: Each agent has a single domain of expertise
2. **Explicit handoff protocols**: Structured data passes between agents, not implicit context
3. **Layered memory architecture**: Short-term for task state, long-term for learning
4. **Verification at every layer**: Self-correction through reflection + deterministic validators
5. **Human oversight at consequence points**: Not on every action, but on high-stakes decisions
6. **Observable end-to-end**: Full traceability from input to output through every agent
7. **Graceful failure modes**: Agents can fail safely and recover

---

## Appendix: Key Resources

- **Agent Experience (primary source)**: [https://agent-experience.dev](https://agent-experience.dev)
- **GitHub repo**: [ygwyg/agent-experience](https://github.com/ygwyg/agent-experience) (26 patterns, 5 categories)
- **ULW/oh-my-opencode**: [Orchestration Guide](https://github.com/code-yeongyu/oh-my-opencode/blob/dev/docs/guide/orchestration.md)
- **Multi-agent orchestration**: [Building Agentic Control Planes — ShShell](https://www.shshell.com/blog/multi-agent-orchestration-patterns)
- **Context engineering**: [Memory Blocks — amiable.dev](https://amiable.dev/blog/luminescent-cluster/06-memory-blocks-structuring-context/)
- **Reflection pattern**: [Self-Reflection and Critique — Arun Baby](https://arunbaby.com/ai-agents/0039-self-reflection-and-critique/)
- **Human-in-the-loop**: [Inference.sh](https://inference.sh/blog/agent-runtime/human-in-the-loop)
- **Agent observability**: [LangChain Guide](https://www.langchain.com/conceptual-guides/agent-observability-powers-agent-evaluation)

---

*Document compiled March 2026. Patterns from agent-experience.dev (Cloudflare open-source), with ULW/oh-my-opencode orchestration patterns integrated.*
