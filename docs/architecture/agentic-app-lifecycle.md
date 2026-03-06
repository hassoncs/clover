# 🚀 Agentic App Lifecycle (End-to-End)

## Overview
A comprehensive roadmap and dependency diagram for building an application fully agentically—from a raw idea brain-dump all the way to a polished, vibe-tweaked, and fully implemented application.

This document serves as our working blueprint to figure out exactly what agents, tools, workflows, and sequential dependencies are needed to automate app creation. We treat this as an "Agentic Company," where specialized personas hand off artifacts to each other in a structured pipeline.

---

## 🤖 Proposed Core Agents (The "Company" Roster)

1. **Product Manager (PM) Agent**: Extracts features, defines scope, and creates the PRD from chaotic brain dumps.
2. **UX Researcher Agent**: Defines personas, screen workflows, user journeys, and states (empty, loading, success).
3. **Architect Agent**: Defines the tech stack, data schemas, server/client boundaries, and route URLs.
4. **Wireframe Designer Agent**: Translates workflows into structural wireframes (gray-box, no colors), leveraging Figma/Pencil MCP tools.
5. **Visual/UI Designer Agent**: Establishes the "vibe"—colors, typography, animations, and the core UI Element Library.
6. **Design Engineer Agent**: Implements UI components and screens in code, setting up 1:1 Storybook mappings and visual snapshot tests.
7. **Full-Stack/Backend Agent**: Wires schemas to databases, hooks up endpoints, and breathes life into the static screens.

---

## 🗺️ Dependency Graph & Lifecycle Stages

### Phase 1: Exploration & Definition (The Strategy)

In this phase, we map abstract ideas into rigid data structures and user journeys. No pixels are pushed; no code is written. 

#### 1. Idea Inception & Brain Dump
- **Agent Persona**: Product Manager
- **Inputs**: Raw unstructured brain dump from the user (audio transcript, text block, bullet points).
- **Tools**: `llm-reasoning`, `document-writer`
- **Process**:
  1. Parse the abstract ideas.
  2. Identify the core value proposition.
  3. Organize the chaos into structured feature buckets (P0, P1, P2).
- **Outputs**: Initial Product Requirements Document (PRD) / Feature List.
- **Dependencies**: None.

#### 2. Persona & Workflow Definition
- **Agent Persona**: UX Researcher
- **Inputs**: PRD / Feature List
- **Process**:
  1. Identify *who* is using the app (User Personas).
  2. Map out their journeys (e.g., "Onboarding", "Checkout", "Content Creation").
  3. Determine what workflows they care about.
  4. Define the physical representation of screens: How does the user advance between them? What are the interactive affordances (buttons, forms, gestures)?
  5. Account for all states: Loading, Error, Empty, and Success.
- **Outputs**: User Personas, Workflow Journey Maps (textual/flowchart representation).
- **Dependencies**: [1. Idea Inception]

#### 3. Data Modeling & Architecture Strategy
- **Agent Persona**: System Architect
- **Inputs**: PRD, Workflow Journey Maps
- **Tools**: Code Editor, AST tools
- **Process**:
  1. Map out the structural "buckets" of data needed to support the workflows.
  2. Define rigorous `Zod` schemas representing the core domain models.
  3. Determine the server/client boundary (e.g., what is SSR, what is CSR, what requires real-time WebSockets).
  4. Select the specific tech stack (e.g., React Native, Expo, tRPC, D1/Postgres).
- **Outputs**: `schema.ts` (Zod Schemas), Architecture Spec, Tech Stack definitions.
- **Dependencies**: [1. Idea Inception] and [2. Persona & Workflow]

#### 4. Route Mapping & Taxonomy
- **Agent Persona**: Architect / UX Researcher Pair
- **Inputs**: Workflow Journey Maps, Zod Schemas
- **Process**: 
  1. Formalize the workflows into actual route URLs (e.g., `/app/dashboard`, `/app/settings/[id]`).
  2. Define the navigation hierarchy (Tabs vs. Stacks vs. Modals).
- **Outputs**: URL Routing Matrix and Navigation Schema.
- **Dependencies**: [2. Persona & Workflow] and [3. Data Modeling]

---

### Phase 2: Structural Design (The "Bones")

Here, we move from text to spatial relationships. The goal is layout and affordances. 

#### 5. Wireframing the Structure (Gray-boxing)
- **Agent Persona**: Wireframe Designer
- **Tools**: `pencil_batch_design` (Pencil MCP), `figma-mcp`
- **Inputs**: Workflow Journey Maps, Route Matrix
- **Process**:
  1. Create a canvas for each core screen/route.
  2. Build structural layouts using standard UI primitives (boxes, text, placeholders).
  3. **Strict Constraint**: *No styling allowed.* No colors, no custom fonts. Use generic placeholders for images. 
  4. Focus purely on layout flexbox/grid mechanics, spacing, typography hierarchy (H1 vs p), and affordance placement (where does the CTA go?).
- **Outputs**: Low-Fi Wireframe Canvases (e.g., `.pen` files) for Desktop & Mobile.
- **Dependencies**: [4. Route Mapping]

---

### Phase 3: Visual Identity & Systems (The "Vibe")

Now we inject the brand's soul into the structural bones. 

#### 6. Visual Design System ("The Vibe")
- **Agent Persona**: Visual Designer
- **Tools**: `pencil_batch_design`, Image Generation (Scenario/Midjourney for moodboards)
- **Inputs**: Wireframes, PRD (for brand feel)
- **Process**:
  1. Determine the aesthetic based on the PRD's target audience.
  2. Select brand colors (Primary, Secondary, Backgrounds, Accents).
  3. Define typography (Font families, weights).
  4. Define spatial tokens (Border radii, shadows, elevation).
  5. Build the foundational Design System / UI Element Library in the design tool (e.g., a "Components" `.pen` file with reusable buttons, cards, inputs).
- **Outputs**: Design System Tokens (JSON/CSS Vars), Master UI Components Canvas.
- **Dependencies**: [5. Wireframing] (Can start parallel moodboarding, but needs wireframes to know *what* components to style).

#### 7. High-Fidelity Screen Design
- **Agent Persona**: Visual Designer
- **Tools**: `pencil_batch_design`
- **Inputs**: Wireframes, Visual Design System
- **Process**:
  1. Apply the Design System components and tokens to the structural wireframes.
  2. Swap placeholder boxes with styled components.
  3. Polish the final look for both desktop and mobile screens, ensuring responsiveness.
- **Outputs**: Hi-Fi Canvases for all routes.
- **Dependencies**: [5. Wireframing] and [6. Visual Design System]

---

### Phase 4: Engineering Implementation (The "Flesh")

We turn static high-fidelity designs into breathing code. This is where Visual TDD (Test-Driven Development) shines.

#### 8. Component Implementation & Validation (Visual TDD Loop)
- **Agent Persona**: Design Engineer
- **Tools**: Browser Automation, Code Editor, CLI/Test Runner, Vision LLM
- **Inputs**: Visual Design System, Hi-Fi UI Components Canvas
- **Process**:
  1. **Write**: Code the React/React Native structure for reusable UI components based on the design system.
  2. **Map**: Create a strict 1-to-1 mapping via Storybook stories for each component.
  3. **Visual TDD Loop**:
     - Take a screenshot of the Coded Component in Storybook.
     - Extract the screenshot of the Design Component from the `.pen` file.
     - Pass both to a Vision Agent to diff and critique (padding, color, font matching).
     - Iterate the code until the Vision Agent approves a 100% pixel match.
- **Outputs**: Coded Component Library, Storybook Component Stories, passing Visual Snapshot Tests.
- **Dependencies**: [6. Visual Design System]

#### 9. Screen & Page Assembly
- **Agent Persona**: Design Engineer
- **Tools**: Code Editor, Storybook, Browser
- **Inputs**: Hi-Fi Screen Designs, Coded Component Library, Route URLs
- **Process**:
  1. Assemble the atomic components into the full pages as defined by the routes.
  2. Create a discrete Storybook story representing every single screen/page/route permutation (e.g., Dashboard-Loading, Dashboard-Empty, Dashboard-Populated).
  3. Ensure layout logic (Flexbox, Safe Areas, ScrollViews) matches the Hi-Fi designs.
- **Outputs**: "Dumb" Coded UI Pages, Storybook Page Stories.
- **Dependencies**: [4. Route Mapping], [7. Hi-Fi Design], and [8. Component Implementation]

#### 10. Full-Stack Wiring & Logic
- **Agent Persona**: Full-Stack / Backend Engineer
- **Tools**: Code Editor, Database CLI (Supabase/D1), tRPC/API Tools
- **Inputs**: "Dumb" UI Pages, Zod Schemas, Architecture Spec
- **Process**:
  1. Set up the database tables/collections to match the Zod schemas.
  2. Write the tRPC routers or REST API endpoints to handle CRUD and business logic.
  3. Wire the "dumb" UI screens to the server (e.g., using React Query / tRPC hooks).
  4. Handle client-side state management (Zustand, Context, or Signals).
  5. Bind router navigation parameters to the data fetching logic.
- **Outputs**: A fully functioning, interactive, database-backed Application.
- **Dependencies**: [3. Data Modeling] and [9. Screen Assembly]

---

## 🔄 Iteration & Validation Checkpoints (The QA Gates)

Agents can hallucinate or drift. We prevent cascading failures by inserting strict validation gates between handoffs:

- **Gate A (Post-Phase 1): Architecture Review**
  - *Validator*: Senior Architect Agent + Human
  - *Check*: Do the Zod schemas cover every data point mentioned in the PRD and Workflows? Are the routes logically sound?
  
- **Gate B (Post-Phase 2): UX Structural Review**
  - *Validator*: UX Review Agent
  - *Check*: Does the wireframe account for error states? Is the primary CTA always above the fold?
  
- **Gate C (Post-Phase 3): Vibe Check**
  - *Validator*: Brand Agent / Human
  - *Check*: Do the colors and fonts reflect the target demographic? Are contrast ratios accessible (WCAG check)?
  
- **Gate D (Phase 4): The Visual Diff**
  - *Validator*: Vision LLM
  - *Check*: Automated pixel-matching between Figma/Pencil elements and Storybook renders. Will not allow component assembly until similarity score is > 98%.

