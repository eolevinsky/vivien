import assert from 'node:assert/strict';
import test from 'node:test';

import { getUpcomingEvents, sortEventsByStartDate } from '../src/utils/events.js';

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

test('filters hidden, invalid and expired events and sorts upcoming events chronologically', () => {
  const events = [
    { ...event('later', '2026-08-20T18:00:00+03:00') },
    { ...event('hidden', '2026-08-18T18:00:00+03:00'), hidden: true },
    { ...event('current-range', '2026-08-13T12:00:00+03:00'), endIso: '2026-08-19T23:59:00+03:00' },
    { ...event('expired-range', '2026-08-10T12:00:00+03:00'), endIso: '2026-08-15T23:59:00+03:00' },
    event('invalid', 'not-a-date'),
  ];

  assert.deepEqual(
    getUpcomingEvents(events, new Date('2026-08-16T10:00:00+03:00')).map(({ id }) => id),
    ['current-range', 'later'],
  );
});

test('keeps a range through its Riga-local end date around midnight', () => {
  const events = [{
    ...event('range', '2026-08-13T12:00:00+03:00'),
    endIso: '2026-08-19T12:00:00+03:00',
  }];

  assert.equal(getUpcomingEvents(events, new Date('2026-08-18T21:01:00Z')).length, 1);
  assert.equal(getUpcomingEvents(events, new Date('2026-08-19T21:01:00Z')).length, 0);
});

test('falls back to startIso for the expiry of legacy records', () => {
  assert.equal(
    getUpcomingEvents([event('today', '2026-08-16T08:00:00+03:00')], new Date('2026-08-16T23:00:00+03:00')).length,
    1,
  );
});
