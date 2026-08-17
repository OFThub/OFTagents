# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- `oftagents` marketplace catalog with relative plugin sources.
- `precode` plugin 0.1.0 — `PreToolUse` gate on `Write|Edit` that denies the first code
  write into a project with no documentation baseline.
- `mdfile` skill — detects missing documentation, profiles the project before asking
  anything, and generates each document against its published standard.
- `/precode:docs` command with `check`, `init`, `skip` and `unskip`.
- Shared `config/required-docs.json` so the gate and the skill can never disagree about
  which documents are required.
- Document templates for the core, open-source and complex tiers.
- Unit suite for the gate (`node:test`, no framework, filesystem injected).
