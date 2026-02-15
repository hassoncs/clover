# Shark Tank: Slop Edition (Pitch Factory)

> **Wave**: 4 | **Tier**: 4 | **Effort**: XL | **Players**: 3-8
> **Category**: Invention Pitching / Drawing

## Concept
Players are desperate inventors pitching useless products to "The Slops" (a panel of wealthy, eccentric investors). You must draw your invention, name it, and then give a LIVE 30-second pitch to convince the room to fund you.

## Core Mechanic
The game combines drawing, naming, and live verbal presentation. The "Funding" mechanic replaces traditional voting—players "invest" their limited budget into the pitches they like best.

## Game Flow
1. **Lobby** → Inventors prepare their "briefcases."
2. **The Problem** → Everyone writes a "mundane problem" (e.g., "My socks are always slightly damp").
3. **The Assignment** → Problems are shuffled. You get someone else's problem.
4. **The Invention** → You must:
    - Draw the invention.
    - Give it a name.
    - Write a "tagline."
5. **The Pitch** → Your drawing and name are shown on the big screen. You have 30 seconds to explain how it works using your phone as a microphone.
6. **The Funding** → Other players have $10,000 to distribute among all other inventions. They can go "All In" on one or spread it out.
7. **The Reveal** → Total funding for each invention is revealed.

## Scoring System
- **Funding Total**: 1 point per $1 invested.
- **Problem Solver**: +500 points to the person who wrote the problem if the resulting invention gets the most funding.
- **Pitch Master**: +300 points for the most "enthusiastic" pitch (voted by the room).

## Content Requirements
- 100+ "Starter Problems" for when players are stuck.
- Corporate "Pitch Deck" visual templates.

## Technical Implementation
### Template Changes
- `pitch-factory.ts`: Manages the drawing, naming, and multi-user funding state.

### New Infrastructure
- **Drawing Canvas**: A robust drawing input type with colors and brush sizes.
- **Mic Template**: For the live 30-second pitch. Requires real-time audio streaming or fast upload/playback.
- **Funding UI**: A specialized "Investment" input where players can drag sliders to allocate a fixed budget across multiple items.

### Input Types Used
- `text`: For problems and names.
- `drawing`: For the invention.
- `mic`: For the live pitch.
- `investment`: New input type for budget allocation.

### Estimated Phases
- `Lobby`
- `ProblemWriting`
- `InventionDesign`
- `ThePitch` (Loop per player)
- `Funding`
- `Winner`

## Dependencies
- `BlobStore` for drawings and audio clips.
- High-bandwidth connection for smooth audio playback.

## Design Notes
- **Fun Factor**: The "Live Pitch" is the heart of the game; it turns shy players into salesmen.
- **Balance**: The "Problem Solver" bonus ensures everyone is invested in the whole process.
- **Pitfalls**: Drawing on a phone can be hard; keep the requirements simple ("Just a sketch!").
