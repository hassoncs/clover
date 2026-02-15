# The Curio Cabinet

> **Wave**: 3 | **Tier**: 3 | **Effort**: M | **Players**: 3-8
> **Category**: Writing, Comedy, Storytelling

## Concept
You are an antique dealer specializing in "Unidentified Objects." You'll buy a piece of junk, give it a name, a tragic backstory, and a catchy tagline. Then, you'll try to sell it to the group for the highest possible price.

## Core Mechanic
Players are presented with three weird images (AI-generated "junk"). They pick one. Then, they fill out a "Listing": Name, Backstory, and Tagline. The group then votes on which object they'd rather own. The "Price" of the object increases with every vote.

## Game Flow
1. **Lobby** → Players choose their "Shop Name."
2. **The Acquisition**: Players pick one of three weird objects.
3. **The Listing**: Players write the Name, Backstory, and Tagline for their object.
4. **The Auction**: Objects are presented in pairs. The group votes on the better listing.
5. **The Collection**: Winners of each pair move to a final "Showroom" where the ultimate winner is crowned.

## Scoring System
- **Sale Price**: +100 points per vote received.
- **Appraisal Bonus**: +500 points if you win your 1v1 matchup.
- **Collection King**: +2000 points for winning the final Showroom.

## Content Requirements
- Content type: `OddityImage` (New schema: `{ url: string, tags: string[] }`).
- Volume needed: 50+ weird object images.
- Generation approach: `Scenario.com` AI generation for "surreal junk."

## Technical Implementation
### Template Changes
Requires a multi-step text input phase (3 fields). The `reveal` phase needs to display the image alongside the three text fields in a "Museum" style layout.

### New Infrastructure
- **AI Image Pipeline**: Integration with `Scenario.com` to generate unique "Oddities" if the library runs low.
- **Layout Engine**: A way to dynamically arrange text and images for the "Auction" reveal.

### Input Types Used
- `choice`: For picking the object.
- `text`: For the Name, Backstory, and Tagline.

### Estimated Phases
`lobby` → `acquisition` → `writing` → `auction` → `showroom` → `winner`

## Dependencies
- `Scenario.com` asset generation.
- `storage-ops` for handling the oddity images.

## Design Notes
The fun is in making something worthless seem priceless. "This isn't a rusty spoon, it's the 'Spoon of Eternal Sorrow' used by a depressed king."
