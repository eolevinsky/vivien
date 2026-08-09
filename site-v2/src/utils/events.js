const EVENT_TIME_ZONE = 'Europe/Riga';

const dateKeyFormatter = new Intl.DateTimeFormat('en-CA', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  timeZone: EVENT_TIME_ZONE,
});

function dateKey(date) {
  const parts = dateKeyFormatter.formatToParts(date);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year}-${values.month}-${values.day}`;
}

export function sortEventsByStartDate(events, now = new Date()) {
  const today = dateKey(now);

  return events
    .map((event, index) => {
      const start = new Date(event.startIso);
      const valid = !Number.isNaN(start.getTime());

      return {
        event,
        index,
        start,
        upcoming: valid && dateKey(start) >= today,
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
