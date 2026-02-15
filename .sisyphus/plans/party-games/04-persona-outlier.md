# Masquerade Misfit

> **Wave**: 4 | **Tier**: 4 | **Effort**: L | **Players**: 5–12
> **Category**: Identity / Grouping

## Concept
You are at a high-society Masquerade Ball. Everyone belongs to one of three secret societies (The Owls, The Snakes, The Cats). However, there is one "Outlier" who has been given a fake invitation and has NO IDEA which group they are supposed to be in.

## Core Mechanic
Hidden Role Bundles. Players are given a "Persona" (e.g., "The Librarian") and a "Society" (e.g., "The Owls"). The Outlier gets a Persona but a "Glitch" society. Through in-character Q&A, you must find your teammates and form an "Alliance."

## Game Flow
1. **Lobby** → Roles and Societies assigned.
2. **The Inquiry** → A prompt appears: "What is your society's favorite time of day?" Everyone answers.
3. **The Mingling** → Players can "Whisper" (send private messages) to two other players to test their knowledge.
4. **Alliance Formation** → Players must "Group Up" on their devices. You can only be in a group of 3 or 4.
5. **The Unmasking** → Groups are revealed. If a group contains only members of the same society, they win. If the Outlier successfully sneaks into a group, they steal all the points.

## Scoring System
- **Perfect Society**: 1000 points for each member of a "Pure" group.
- **The Great Pretender**: 2000 points for the Outlier if they are in a group.
- **Social Butterfly**: Points for every "Whisper" that resulted in a successful alliance.
- **Misfit Hunter**: Points for correctly identifying the Outlier during the reveal.

## Content Requirements
- 30+ Secret Societies with "Lore" (Themes, Likes, Dislikes).
- 200+ Inquiry Prompts.

## Technical Implementation
### Template Changes
- `PlayerState`: Add `societyId` and `currentGroupId`.
- `GroupEntity`: A dynamic container for players who have "Allied."

### New Infrastructure
- **Hidden Role Bundles**: A system to package multiple pieces of secret info (Role + Society + Lore) and deliver them securely.
- **Alliance UI**: A drag-and-drop interface on the phone where players can "Invite" others to their group and "Accept/Decline" invitations.
- **Proximity Chat (Optional)**: If playing in person, the UI could use Bluetooth/Sound-pairing to suggest nearby players.

### Input Types Used
- `AllianceInvite`: Grouping mechanic.
- `SecretText`: Private messaging/Whispers.

### Estimated Phases
- `LOBBY`
- `ASSIGNMENT`
- `INQUIRY`
- `MINGLING`
- `GROUPING`
- `REVEAL`
- `RESULTS`

## Dependencies
- `GroupingSystem` (New)
- `SecretMessagingService` (New)

## Design Notes
- The Outlier's panic is the core of the fun. They have to guess the "Vibe" of a group based on very vague answers.
- Pitfall: Groups forming too quickly. Solution: A "Shuffle" event halfway through the Mingling phase.
