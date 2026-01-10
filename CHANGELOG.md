# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-10

### Added
- 8 predefined levels with increasing difficulty
- ICE agent patrol system with hallway constraints
- Room search behavior for ICE agents
- Store system with upgrades:
  - Form capacity ($30)
  - Sprint boost ($20, 11 seconds)
  - No ICE powerup ($50, 15 seconds)
- Admin level editor with drag-and-drop at `/admin`
- Debug overlay for ICE agents (`window.DEBUG_ICE = true`)
- Mobile joystick support
- Google Analytics tracking
- Vercel Analytics and Speed Insights

### Fixed
- ICE agents now properly follow assigned hallways
- Door collision zones reduced for tighter gameplay

### Infrastructure
- GitHub releases with semantic versioning
- Branch protection on main (no force pushes)
- CI/CD pipeline with GitHub Actions
- Multiple analytics platforms for visitor tracking
