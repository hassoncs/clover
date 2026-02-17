# Game UI Wireframing Process

> **Meta-document**: Captures the goal, process, and learnings for iterating on game UI design.

## Goal

Create visual HTML wireframes for all games in `r2/games/` to:
1. **Visualize game flow** before committing to asset production
2. **Identify UI patterns** that can be shared across games
3. **Surface UX gaps** early in the design process
4. **Create a review artifact** for stakeholder feedback

## Process

### Phase 1: Data Extraction
- Extract game metadata from `manifest.json` files
- Key fields: title, description, instructions, phases, inputTypes, roundCount
- Brand-specific titles/descriptions for Amen variant

### Phase 2: Wireframe Structure

Each wireframe follows this structure:

```
┌─────────────────────────────────┐
│         HEADER/NAV              │  Game title, round info
├─────────────────────────────────┤
│                                 │
│         MAIN CONTENT            │  Primary game interaction
│         (flex-grow: 1)          │
│                                 │
├─────────────────────────────────┤
│         INPUT AREA              │  Text input, buttons, choices
├─────────────────────────────────┤
│         PLAYER STATE            │  Scores, players, timer
└─────────────────────────────────┘
```

### Phase 3: Page Types

#### Party Games (Multi-Phase)
Each phase gets its own "screen" within the wireframe:
1. **Lobby** - Player join, ready status, game settings
2. **Input Phase** - Text entry, drawing canvas, choice selection
3. **Voting/Reveal** - Show options, timer, selection UI
4. **Scores** - Leaderboard, round progression
5. **Winner** - Final celebration, play again

#### Arcade Games (Single-Screen)
- Game canvas area
- Score/progress overlay
- Win/lose dialogs
- Pause menu

### Phase 4: Wireframe Generation

Using flexbox-based HTML with:
- Mobile-first layout (375px width)
- Semantic color coding:
  - Blue: Primary actions
  - Green: Success/confirm
  - Gray: Inactive/disabled
  - Yellow: Warning/timer
- Placeholder shapes for assets
- No actual graphics, just layout boxes

## Learnings (First Pass - Feb 2026)

### What worked well
- **Phase tabs navigation** - Shows all screens in one scrollable page, easy to compare flow
- **Shared CSS** - Reduced duplication, consistent visual language across all wireframes
- **Mobile-first layout** - 375px width simulates actual game viewport
- **Semantic color coding** - Blue/primary, Green/success, Red/accent made wireframes readable
- **Batch creation** - Creating multiple wireframes in parallel was efficient

### What to improve next time
- **Standardize phase naming** - Some games had different phase names for similar mechanics
- **Add interaction notes** - Wireframes show static states; should include notes on transitions
- **Responsive variations** - Only mobile layout done; tablet/desktop variations needed
- **Accessibility markers** - Should mark touch target sizes, contrast ratios
- **Asset placeholder system** - Use consistent placeholder graphics (not just emoji)

### Patterns discovered
- **Common party game flow**: Lobby → Input → Voting → Reveal → Scores → Winner
- **Recurring UI components**:
  - Timer (top-right, urgency styling)
  - Prompt card (centered, prominent text)
  - Choice list (stacked cards with author attribution)
  - Scoreboard (ranked list with points)
  - Players list (horizontal wrap, avatar + name)
  - Input area (bottom-sticky, full-width button)
- **Phase indicator** - Dots or progress bar showing round/phase progression
- **Lobby pattern** - Room code + player list + start button

### Tooling ideas
- **Template generator** - Script to scaffold wireframe HTML from manifest.json
- **Component library** - Extract common HTML patterns (timer, choice list, etc.)
- **Visual diff tool** - Compare wireframes side-by-side to identify inconsistencies
- **Figma/Sketch export** - Convert HTML layouts to design tool format
- **Responsive preview** - Tool to preview at multiple viewport sizes

## File Structure

```
wireframes/
├── index.html           # Navigation to all games
├── shared.css           # Common styles (550+ lines of reusable components)
├── party/               # 28 party game wireframes
│   ├── quiplash.html
│   ├── truth-trap.html
│   ├── sketch-bluff.html
│   ├── drawful-animate.html
│   ├── percent-panic.html
│   ├── chain-reaction.html
│   └── ... (22 more)
└── slopcade/            # 24 arcade game wireframes
    ├── flappy-bird.html
    ├── ball-sort.html
    ├── snake.html
    ├── breakout-bouncer.html
    ├── slopeggle.html
    ├── gem-crush.html
    └── ... (18 more)
```

**Total: 52 wireframe files** (55 including index + shared.css)

## Next Steps After Wireframes

1. **Review with stakeholder** - Get feedback on flow and layout
2. **Identify shared components** - Buttons, dialogs, timers, etc.
3. **Create asset specifications** - Sizes, formats, animation needs
4. **Design actual assets** - Using the wireframes as reference
5. **Implement in React Native** - Convert wireframe layouts to components
