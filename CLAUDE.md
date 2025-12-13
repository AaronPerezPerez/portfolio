# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at localhost:4321
npm run build    # Build production site to ./dist/
npm run preview  # Preview production build locally
```

## Architecture

This is an Astro 5 portfolio site using the basics starter template.

**Key directories:**
- `src/pages/` - File-based routing (`.astro` files become routes)
- `src/layouts/` - Page wrapper components (Layout.astro)
- `src/components/` - Reusable Astro components
- `src/assets/` - Optimized assets processed by Astro
- `public/` - Static assets served as-is (favicon, etc.)

**Astro component structure:**
Astro files use frontmatter (`---`) for server-side JavaScript/TypeScript, followed by HTML template with `<style>` and `<script>` blocks for scoped styles and client-side JS.

## TypeScript

Uses Astro's strict TypeScript config. Type definitions are auto-generated in `.astro/types.d.ts`.
