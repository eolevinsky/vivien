import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
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

test('returns only visible, non-expired events in chronological order', () => {
  const events = [
    event('later', '2026-09-01T12:00:00+03:00'),
    { ...event('hidden', '2026-08-28T18:00:00+03:00'), hidden: true },
    event('next', '2026-08-29T19:00:00+03:00'),
    event('past', '2026-08-20T12:00:00+03:00'),
    event('invalid', 'not-a-date'),
  ];

  assert.deepEqual(
    getUpcomingEvents(events, new Date('2026-08-21T10:00:00+03:00')).map(({ id }) => id),
    ['next', 'later'],
  );
});

test('keeps a multi-day event through its Riga-local end date', () => {
  const events = [{
    ...event('range', '2026-08-20T12:00:00+03:00'),
    endIso: '2026-08-22T23:59:59+03:00',
  }];

  assert.equal(getUpcomingEvents(events, new Date('2026-08-22T20:00:00+03:00')).length, 1);
  assert.equal(getUpcomingEvents(events, new Date('2026-08-23T00:01:00+03:00')).length, 0);
});

test('uses the end date when present and otherwise the start date', () => {
  const events = [
    {
      ...event('finished-range', '2026-08-20T12:00:00+03:00'),
      endIso: '2026-08-26T23:59:59+03:00',
    },
    event('finished-single-day', '2026-08-29T19:00:00+03:00'),
    {
      ...event('ends-today', '2026-08-28T12:00:00+03:00'),
      endIso: '2026-08-30T00:01:00+03:00',
    },
    event('future', '2026-09-01T12:00:00+03:00'),
  ];

  assert.deepEqual(
    getUpcomingEvents(events, new Date('2026-08-30T11:15:00+03:00')).map(({ id }) => id),
    ['ends-today', 'future'],
  );
});

test('uses the end date for a started range but does not keep a started event without one', () => {
  const events = [
    {
      ...event('ongoing-range', '2026-09-17T12:00:00+03:00'),
      endIso: '2026-09-24T23:59:59+03:00',
    },
    event('started-without-end', '2026-09-17T12:00:00+03:00'),
    event('future-without-end', '2026-09-26T12:00:00+03:00'),
  ];

  assert.deepEqual(
    getUpcomingEvents(events, new Date('2026-09-20T18:00:00+03:00')).map(({ id }) => id),
    ['ongoing-range', 'future-without-end'],
  );
});

test('keeps the live Chanterelle Week and future calendar entries in the site content', () => {
  const source = readFileSync(new URL('../src/content/site.js', import.meta.url), 'utf8');

  assert.match(source, /id: 'chanterelle-week-2026'/);
  assert.match(source, /id: 'cheese-week-2026'/);
  assert.match(source, /id: 'saints-cosmas-damian-day-2026'/);
});
