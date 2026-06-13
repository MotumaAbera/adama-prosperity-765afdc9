## Update primary system color to #3e7edd

### What to change

1. **Update `src/styles.css`** — change the primary color and its related tokens:
   - `:root --primary`: `#22427d` → `#3e7edd`
   - Light-theme `ring`, `sidebar-primary`, `sidebar-ring`: update from hue `263` (purplish-blue) to hue `~204` (matching `#3e7edd`) with adjusted lightness/chroma for consistency.
   - Dark-theme `--primary`: update from `oklch(0.7 0.13 263)` to a lighter variant of the new blue.
   - Dark-theme `ring`, `sidebar-primary`, `sidebar-ring`: update to match the new blue hue.

2. **Verify dashboard & login** — both pages use Tailwind `bg-primary`, `text-primary`, `border-primary`, etc., so they will automatically inherit the new color. No file edits required there.

### What stays the same
- Chart colors on the dashboard (they use independent palette tokens, not the primary brand color).
- Any other page or component using the primary CSS variable will update automatically.

### Acceptance criteria
- Login page buttons, accents, and highlights render in `#3e7edd`.
- Dashboard sidebar active items, stat-card icons, and primary elements render in `#3e7edd`.
- Dark mode primary color remains legible and consistent with the new hue.