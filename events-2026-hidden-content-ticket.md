# Ticket: Add the August–September 2026 event programme as hidden content

## Goal

Add all events from the chef's programme to `site-v2/src/content/site.js` now, with every new record set to `hidden: true`. Nothing in this ticket may become publicly visible, receive a generated landing page or appear in the upcoming-events UI until an editor explicitly changes that event to `hidden: false`.

The dates and weekdays in the brief correspond to 2026.

## Content to add

Create seven distinct event records with stable kebab-case IDs. Use `Europe/Riga` offsets and add `endIso` for multi-day events.

### 1. Onion Soup Week

- Suggested ID: `onion-soup-week-2026`
- Dates: 20–26 August 2026 inclusive
- `startIso`: `2026-08-20T12:00:00+03:00`
- `endIso`: `2026-08-26T23:59:59+03:00`
- Specials:
  - Classic onion soup — €8
  - Onion soup with pulled beef — €10
  - Onion soup with truffle and Parmesan croutons — €10
  - Onion soup with beer and garlic croutons — €10

### 2. End-of-summer party

- Suggested ID: `end-of-summer-party-2026`
- Date: not confirmed; it should take place after 26 August and before 1 September 2026
- Specials: not confirmed
- Keep hidden and do not invent a date, time, dishes or prices.

### 3. First day of school

- Suggested ID: `first-day-of-school-2026`
- Date: Tuesday, 1 September 2026
- `startIso`: `2026-09-01T12:00:00+03:00`
- Operational note: open at 12:00 and replenish children's-menu stock in advance.
- No special dishes are planned. Do not add an empty “special menu” heading to the guest-facing content.

### 4. Picnic

- Suggested ID: `september-picnic-2026`
- Date: Saturday, 5 September 2026
- Time: not confirmed
- Proposed specials, prices not confirmed:
  - truffle fries with Parmesan and truffle sauce;
  - chestnuts;
  - snacks;
  - roast-beef sandwiches;
  - other picnic items to be confirmed.
- Operational question: can the television be used that day?

### 5. Chanterelle Week

- Suggested ID: `chanterelle-week-2026`
- Dates: 10–16 September 2026 inclusive
- `startIso`: `2026-09-10T12:00:00+03:00`
- `endIso`: `2026-09-16T23:59:59+03:00`
- Specials and prices: not confirmed.
- Editorial note: successful dishes may later be moved into the permanent menu.

### 6. Cheese and Wine Week

- Suggested ID: `cheese-and-wine-week-2026`
- Dates: 17–23 September 2026 inclusive
- `startIso`: `2026-09-17T12:00:00+03:00`
- `endIso`: `2026-09-23T23:59:59+03:00`
- Proposed specials, prices not confirmed:
  - cheese platter;
  - hot Camembert with roasted grapes;
  - gougères;
  - cheese fondue with pear, grapes, croutons and figs.
- Mark fondue as tentative: it must be tested before publication and is expected to have a premium price.

### 7. La Nuit de la Pleine Lune — Full Moon Night

- Suggested ID: `full-moon-night-2026`
- Date: Saturday, 26 September 2026
- Time: not confirmed
- Specials and prices: not confirmed.
- Preserve the French campaign name `La Nuit de la Pleine Lune`; localize the explanatory subtitle.

## Content and schema requirements

1. Set `hidden: true` and `ticketed: false` on every record.
2. Supply editorial drafts for `title`, `dateLabel`, `lead`, `alt` and any confirmed `points` in `en`, `lv`, `fr` and `ru`. Keep the meaning faithful to the chef's brief; do not fabricate offers.
3. Do not use guest-facing `points` for operational notes, unconfirmed questions or internal approval state. If needed, add a clearly internal field such as `editorialNotes` that components and structured data never render.
4. Model unknown specials as an omitted/empty `points` collection and unknown prices as omitted/empty price values. The components must render neither empty headings nor blank price containers.
5. A hidden draft may temporarily use no image. Before an event can be unhidden, require a real localized alt text and an approved image path; do not publish a broken placeholder URL.
6. Ensure all public consumers continue to filter `hidden` records:
   - homepage Events section and upcoming-events calendar;
   - static event landing pages;
   - sitemap and short-link generation;
   - any event JSON-LD.
7. Add a small validation/test helper that rejects publication (`hidden: false`) when required public fields or a valid date are missing, while still allowing incomplete hidden drafts.

## Short chef follow-up

Keep the missing information in one concise checklist so the content can be completed quickly after a reply:

> Please confirm: (1) date/time and specials with prices for the end-of-summer party; (2) picnic start time, final dishes and prices, and whether the TV can be used; (3) chanterelle dishes and prices; (4) cheese-and-wine prices and whether the fondue passed testing; (5) Full Moon Night start time, dishes and prices.

No additional question is needed for 1 September unless opening at 12:00 changes.

## Acceptance criteria

- Exactly seven new event records exist and all are hidden.
- Soup Week contains all four supplied dishes with the exact supplied prices.
- No unconfirmed special, price, date or time has been invented.
- Week ranges are represented with `endIso` and localized date labels.
- The 1 September operational note is retained internally and no specials are shown.
- The picnic TV question and fondue testing requirement are retained internally.
- Hidden drafts produce no public carousel item, upcoming-list row, event landing page, sitemap URL, short link or JSON-LD.
- Empty optional content does not create empty UI elements when an event is later completed and published.
- Tests and the production build pass from `site-v2/`.

## Publication workflow

After the chef replies, update only the affected event fields, add/approve imagery and translations, run validation and preview the event in all four locales. Change `hidden` to `false` only as a separate, explicit publication step.
