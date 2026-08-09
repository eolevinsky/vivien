import assert from 'node:assert/strict';
import test from 'node:test';

import { sortEventsByStartDate } from '../src/utils/events.js';

const event = (id, startIso) => ({ id, startIso });

test('puts upcoming events first in ascending order, then past events in descending order', () => {
  const events = [
    event('oldest', '2026-07-10T17:00:00+03:00'),
    event('next', '2026-08-08T12:00:00+03:00'),
    event('latest-past', '2026-08-06T19:00:00+03:00'),
    event('later', '2026-08-12T18:00:00+03:00'),
    event('older', '2026-07-14T17:00:00+03:00'),
  ];

  const sorted = sortEventsByStartDate(events, new Date('2026-08-07T10:00:00+03:00'));

  assert.deepEqual(sorted.map(({ id }) => id), [
    'next',
    'later',
    'latest-past',
    'older',
    'oldest',
  ]);
});

test('treats an event starting earlier today as current/upcoming in Riga', () => {
  const events = [
    event('tomorrow', '2026-08-08T09:00:00+03:00'),
    event('yesterday', '2026-08-06T23:00:00+03:00'),
    event('today', '2026-08-07T08:00:00+03:00'),
  ];

  const sorted = sortEventsByStartDate(events, new Date('2026-08-07T22:00:00+03:00'));

  assert.deepEqual(sorted.map(({ id }) => id), ['today', 'tomorrow', 'yesterday']);
});

test('keeps events with invalid dates at the end in their original order', () => {
  const events = [
    event('missing'),
    event('future', '2026-08-08T09:00:00+03:00'),
    event('invalid', 'not-a-date'),
  ];

  const sorted = sortEventsByStartDate(events, new Date('2026-08-07T10:00:00+03:00'));

  assert.deepEqual(sorted.map(({ id }) => id), ['future', 'missing', 'invalid']);
});
