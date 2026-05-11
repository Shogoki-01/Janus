# Janus — Design Comps

This folder holds single-file HTML mockups for every screen, **before** any React component is written.

## Why HTML mockups

- Claude (and any LLM) iterates on HTML+Tailwind faster and more accurately than on Figma descriptions or React JSX.
- A static file you can open in a browser is the cheapest possible feedback loop — no build step, no dev server, no framework noise.
- Once a mockup is approved, the React component is a near-mechanical port. The mockup remains as the source-of-truth visual spec.

## Conventions

- **One file per screen.** Naming: `NN-screen-name.html` where `NN` is a sort key.
- **Tailwind via CDN** — `<script src="https://cdn.tailwindcss.com"></script>` in the head. No build step.
- **No JS unless behavior is being designed** — these are visual comps, not prototypes. State changes use `:hover` / `:focus` / multiple side-by-side variants instead.
- **Mobile-first.** Janus is responsive-only; every comp should look correct at 375px wide and scale up.
- **Real copy, not lorem ipsum.** Real applicant names, real screening criteria, real recommendation reasoning. Forces design + content to align early.
- **One brand stylesheet later.** When the design language stabilizes, extract shared tokens (colors, type scale, spacing) into a shared `<style>` block referenced by every file. Don't premature-abstract — wait until 3+ files repeat the same patterns.

## How to iterate

1. Open the file in a browser (`file://` is fine — no server needed).
2. Resize the viewport from 375px → 1440px and check breakpoints.
3. Ask Claude to revise — point at the file, describe the change. Claude edits in place.
4. When approved, port to React. Keep the HTML in this folder as the spec.

## Current screens

| File | Screen | State |
|---|---|---|
| `00-landing.html` | Marketing landing page | Starter — concept only, copy is a first draft |

More screens to add as the product takes shape:

- Property-manager dashboard (applications inbox)
- Application detail / decision page
- Applicant intake — start screen
- Applicant intake — identity verification step
- Applicant intake — income verification step
- Applicant intake — references step
- Applicant intake — payment step
- Email + Slack notification templates
- Policy configuration screen (thresholds per property)
