# Ticket: Compact upcoming-events calendar in the Events section

## Goal

Make the schedule of upcoming Brasserie Vivien events easy to scan without replacing the existing event carousel.

Add a compact upcoming-events list to the `Events` section. Prefer a small calendar-icon button that opens a pop-up list on mobile; the same data may be shown inline on wider screens if that is visually cleaner.

## Current implementation

- Event content is stored in `site-v2/src/content/site.js` as `events`.
- `site-v2/src/components/EventsSection.astro` filters out `hidden` events and sorts the rest through `sortEventsByStartDate()`.
- The full event cards remain the primary place for descriptions, specials, prices and booking.
- Event landing pages are generated only for non-hidden events.

## Requirements

1. Follow a mobile-first UX approach. Design and implement the 320–375 px experience first, using a compact calendar-icon button and touch-friendly pop-up; enhance it for tablets and desktops only after the mobile interaction works without horizontal scrolling, clipped content or overlap with the sticky booking CTA.
2. Use the existing `events` collection as the only source of truth. Do not create a second manually maintained calendar list.
3. Include only events where `hidden !== true` and whose event end date has not passed in the `Europe/Riga` timezone.
4. Sort chronologically. A multi-day event appears once and shows its full date range.
5. Each row contains only:
   - localized date or date range;
   - localized event title.
6. Selecting a row must activate the matching event in the existing carousel and scroll/focus it into view. Reuse the existing `?event=<id>#events` selection behavior where practical.
7. The calendar control must not appear when there are no visible upcoming events.
8. Add localized accessible labels and UI copy for `en`, `lv`, `fr` and `ru`.
9. The pop-up must support keyboard use:
   - calendar button exposes its expanded state;
   - focus moves into the pop-up when opened and returns to the button when closed;
   - `Escape`, clicking outside, and the close control dismiss it;
   - focus is not lost behind the overlay.
10. Use touch targets of at least 44 × 44 px for interactive controls. The mobile pop-up must remain usable with browser text zoom and device safe-area insets.
11. Match the existing dark brasserie styling, typography and gold accents. Keep the collapsed control visually compact and do not cover the sticky booking CTA on mobile.
12. Respect `prefers-reduced-motion` and avoid adding a large client-side dependency.

## Event date model

The upcoming list needs a reliable end date for week-long events. Add an optional `endIso` field to event records and use it for both date-range display and expiry. For legacy records without `endIso`, fall back to `startIso`.

Keep `dateLabel` available for editorially controlled labels on full event cards, but derive the compact calendar label from `startIso`/`endIso` with `Intl.DateTimeFormat` so all locales remain consistent.

## Analytics

Push lightweight events through the existing analytics helper:

- `events_calendar_open` when the list is opened;
- `events_calendar_select` with `event_id` when an event is selected.

Do not count opening the calendar as booking intent.

## Acceptance criteria

- A calendar control/list is visible in `#events` when at least one public upcoming event exists.
- Hidden, invalid and expired entries never appear.
- Dates and titles render correctly in all four locales, including date ranges.
- Selecting an item opens the corresponding carousel slide.
- The interaction works with mouse, touch and keyboard and has sensible screen-reader labels.
- The mobile-first layout works at 320, 375 and 390 px widths, supports text zoom, and does not obscure the sticky booking CTA.
- Tablet and desktop enhancements do not change or regress the core mobile interaction.
- Existing carousel autoplay, deep links and event landing pages continue to work.
- Unit tests cover filtering, range expiry and chronological sorting around Riga-local midnight.
- `npm test` and `npm run build` pass from `site-v2/`.

## Out of scope

- A separate calendar page.
- Month-grid navigation.
- Editing event content from the browser.
- Publishing currently hidden events.
