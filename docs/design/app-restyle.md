# App restyle

The existing home page remains the brand reference: ZUS green, Source Sans 3,
white surfaces, pale green ground and round primary actions. The app-screen draw
selected Pastel consumer, seed 490286444, keeping palette and type. The existing
labelled top navigation survives instead of the dealt icon rail: this is a restyle,
and the app has more destinations than an unlabelled rail should carry. No redraws.

## Product and jobs

- Two parents with independently configured employment and sickness insurance.
- Monthly income in PLN, gross amounts and already deducted Z-3/Z-3a bases.
- A 12-month history with absent months and top-up amounts.
- Birth, adoption and foster-care scenarios; existing ZUS example imports.
- Number of children, birth date, maternity weeks and parental leave allocation.
- Non-transferable weeks, paternity days and work during parental leave.
- Payment choice, benefit amounts, missing evidence and rule versions.
- Parents use the calculator to compare financial and leave choices on phones and desktops.
- Every amount continues to come from the existing calculation engine.

Question: what benefit and leave allocation do our circumstances allow?
Face: the family guide's pale green, green section headings and Source Sans figures.
Signature: the existing mother/father insurance groups and actual leave/payment choices.
The two parents' circumstances become readable paired groups in a shared family worksheet.
Live interaction: calculate, inspect the result, compare variants and refine parameters.

## Changes

Shared page headings, cards, buttons and native form fields carry the home page's
style across working routes. Fields are 44px tall; normal buttons are at least 44px.
A flat white card replaces the former default ring shadow. Small green text uses
the deeper green on tinted working surfaces to retain contrast.

The advanced form uses the whole frame instead of a long narrow column beside an
empty rail. Income, insurance, leave and payment choices retain their existing
behaviour. Result focus and scrolling bring the answer into view after calculation.
The demo explanation is a keyboard-operable disclosure. Mobile mode labels are
compact; all input details remain available. Tables retain their own scrolling.

The homepage timeline's accessible labels now include its visible abbreviated
week label, with explicit whitespace between its two visible spans.

## Visual critique — final round

Read first: the calculator title, mode choice, then the family worksheet.
Edges: one shared full-width frame; the former empty right-hand column is gone.
Colour: existing brand green on headings, selected choices and the primary action.
Numbers: engine output preserved; tabular figures on native inputs and result data.
Phone: navigation folds, fields stack, no horizontal overflow at 320, 390, 768 or 1440px.
Result: keyboard focus and scroll move to the real calculated answer.
Scores (subjective): visual consistency 8/10; usability 8/10; clarity 8/10.
Remaining limitation: this is a detailed form and still requires substantial scrolling
on phones. Long-form guidance and technical audit data remain deliberately available.

Final inspector: 0 FAIL, 3 WARN at 1440, 768 and 390px on the production build.
The advanced mode was selected before measurement using a temporary inspector entry
script; its measurements and rules were unchanged.
Warnings: strong borders belong to selected radio controls; the detailed form extends
below the first screen; reference panels share bottom edges and therefore have modest
extra space. Source lint: 0 FAIL; warnings refer to explicit shadow removal, real
engine/rule identifiers in monospace, and existing Polish punctuation/missing values.
All eight final inspector sheets were reviewed as a contact sheet.

The baseline inspector encountered the original database's missing rules (LR-134,
LR-101, LR-102); it captured the offline state rather than the working calculator.
Its measurements are not a like-for-like visual comparison. Verification used a new
local zpr_restyle database, with committed migrations and demo seed data. The existing
database was not changed.

## Verification

- Production Next.js build, TypeScript and ESLint passed.
- 39 web unit tests passed.
- 50 route tests and 8 calculator tests passed across desktop and mobile.
- 24 route accessibility checks passed across reruns after correcting contrast and
  the homepage timeline's accessible names; separate advanced-mode axe scan passed.
- Advanced calculation succeeded at desktop/mobile and focused the results region.
- 12-month mode exposes 12 income inputs without mobile horizontal overflow.
- 11 main routes checked at 1440/390px without horizontal overflow; advanced mode
  also checked at 768/320px.
- Screenshots show real production UI with demo database values.

No new photography, external assets, dependencies or invented proof were added.
Existing image credits remain in public/images/CREDITS.md and the site's footer.
Existing demo examples and seeded values remain demonstrative.
