const EVENT_TIME_ZONE = 'Europe/Riga';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: EVENT_TIME_ZONE,
});

export function rigaDateKey(date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const parts = dateKeyFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function isEventCurrentOrFuture(event, now = new Date()) {
  const start = new Date(event?.startIso);
  const boundary = new Date(event?.endIso || event?.startIso);

  return event?.hidden !== true
    && !Number.isNaN(start.getTime())
    && !Number.isNaN(boundary.getTime())
    && boundary.getTime() >= start.getTime()
    && rigaDateKey(boundary) >= rigaDateKey(now);
}

export function getUpcomingEvents(events, now = new Date()) {
  return events
    .map((event, index) => {
      const start = new Date(event?.startIso);
      return { event, index, start };
    })
    .filter(({ event }) => isEventCurrentOrFuture(event, now))
    .sort((left, right) => left.start.getTime() - right.start.getTime() || left.index - right.index)
    .map(({ event }) => event);
}

export function sortEventsByStartDate(events, now = new Date()) {
  return events
    .map((event, index) => {
      const start = new Date(event.startIso);
      const valid = !Number.isNaN(start.getTime());

      return {
        event,
        index,
        start,
        // A multi-day event remains current through its Riga-local end date.
        // This keeps an event that has already started ahead of future events.
        upcoming: valid && isEventCurrentOrFuture(event, now),
        valid,
      };
    })
    .sort((left, right) => {
      if (left.valid !== right.valid) return left.valid ? -1 : 1;
      if (!left.valid) return left.index - right.index;
      if (left.upcoming !== right.upcoming) return left.upcoming ? -1 : 1;

      const timeDifference = left.start.getTime() - right.start.getTime();
      if (timeDifference === 0) return left.index - right.index;

      return left.upcoming ? timeDifference : -timeDifference;
    })
    .map(({ event }) => event);
}
