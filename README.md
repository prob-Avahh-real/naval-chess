# naval-chess (万船齐发)

Chinese calligraphy-themed naval chess game with full international chess rules.

## Tech Stack
- **Language:** JavaScript (Vanilla)
- **Rendering:** HTML5 Canvas
- **Style:** Chinese woodblock print aesthetic

## Getting Started
Open `index.html` in a browser — no build step required.

## Features
- Full chess rules: castling, en passant, pawn promotion, 50-move rule
- Woodblock print visual style with animated wave effects
- Touch + mouse input with highlight for selected pieces
- Move history with Chinese notation
- Captured pieces display
- Board flip functionality
- Responsive layout for mobile and landscape

## Scripts
- `make test` — Run tests (placeholder)

## Project Structure
```
├── index.html           # Main page (inline CSS)
├── js/
│   ├── chess-engine.js  # Full chess rules engine
│   ├── renderer.js      # Canvas woodblock renderer
│   └── app.js           # Controller + UI logic
├── Makefile
└── AGENTS.md
```
