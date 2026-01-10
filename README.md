# Learing™

> Hyper-casual enrollment management simulation

A browser-based mini-game where you collect enrollment forms and drop them off at the desk while avoiding suspicion.

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to play.

## Controls

| Platform | Movement |
|----------|----------|
| Desktop | WASD / Arrow Keys |
| Mobile | Virtual Joystick |

## How to Play

1. **Collect** enrollment forms scattered around the room (walk into them)
2. **Carry** up to 3 forms at a time (visual stack follows you)
3. **Drop off** at the Enrollment Desk (auto-drops when you enter)
4. **Survive** until the 75-second inspection timer runs out
5. **Watch out** - suspicion rises over time and with each drop!

## Win/Lose Conditions

- **WIN**: Survive until timer hits 0
- **LOSE**: Suspicion reaches 100%

## Action → Meter Impact

| Action | Enrollments | Funding | Suspicion |
|--------|-------------|---------|-----------|
| Collect Form | - | - | - |
| Drop Form at Desk | +1 | +$5 | +5% |
| Time (per second) | - | - | +0.3% |

## Tech Stack

- Next.js 14 + TypeScript
- HTML5 Canvas (60fps)
- Tailwind CSS
- No backend (local state only)

## Project Structure

```
src/
├── app/                 # Next.js app router
├── components/
│   ├── Game.tsx         # Main game component
│   ├── GameHUD.tsx      # Stats bar + suspicion meter
│   ├── MainMenu.tsx     # Start screen
│   ├── EndScreen.tsx    # Win/lose screen
│   └── TouchControls.tsx # Mobile joystick
├── game/
│   ├── constants.ts     # Game config
│   ├── engine.ts        # Game logic
│   └── renderer.ts      # Canvas rendering
└── types/
    └── game.ts          # TypeScript types
```

## Game Constants

| Setting | Value |
|---------|-------|
| Inspection Timer | 75 seconds |
| Carry Capacity | 3 forms |
| Max Suspicion | 100% |
| Suspicion per Drop | 5% |
| Suspicion per Second | 0.3% |
| Funding per Form | $5 |

---

*"Quality Learning Centers"*
