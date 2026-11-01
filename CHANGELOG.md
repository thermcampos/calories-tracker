# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Regular items: flag a food entry as "Repeat daily" when adding or editing it. Regular items show up every day as grayed-out planned cards that don't count toward totals until confirmed with the Add button. When editing an entry that matches a regular item, check "Also update regular item" to carry the change over; otherwise only that day's entry changes. Manage them in Settings.
- `nutrition-info` Appwrite Function: AI nutrition info now goes through a backend function with a cache shared by all users. Moved from Claude Haiku 4.5 to Claude Haiku 5.5.

### Security
- The Anthropic API key is no longer shipped in the frontend bundle (`VITE_CLAUDE_API_KEY` removed).

## 2026-08-05

### Added
- Caching service to hold user account.

### Changed
- All dependencies bumped to latest version.

## 2026-07-20

### Added
- Exercise tracking.
- BMI panel with current data and last update date.

## 2026-07-17

### Added
- New section with options to export data based in range dates.

### Changed
- The Food Log entries now are displayed collapsed.
- AI integration to provide more information.

## 2026-07-16

### Added
- Suggestions based in the latest two days records in the last and next 2 hours.
- AGENTS.md file covering the app for better LLM integration.
- User settings option to disable suggestions to be loaded when the app starts.
- Category tag in the suggested foods.

### Changed
- Suggestions panel to be dismissible and clickable.
- Rotated Anthropic SDK API Key

### Fixed
- Lint issues that AI generated and did not fix.
