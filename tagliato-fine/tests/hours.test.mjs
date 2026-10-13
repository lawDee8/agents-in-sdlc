import { test } from "node:test";
import assert from "node:assert/strict";
import { autoTheme, hoursKnown, openStatus, parisParts } from "../js/hours.js";

const every = (ranges) => Object.fromEntries(
  ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].map((d) => [d, ranges]));
const infos = { hours: every([{ from: "08:00", to: "22:00" }]), special_hours: [] };

// 2026-10-14 is a Wednesday, Paris is UTC+2 (summer time).
const summer = (hhmm) => new Date(`2026-10-14T${hhmm}:00+02:00`);
// 2026-12-09 is a Wednesday, Paris is UTC+1.
const winter = (hhmm) => new Date(`2026-12-09T${hhmm}:00+01:00`);

for (const [label, at] of [["summer", summer], ["winter", winter]]) {
  test(`open/closed boundaries (${label})`, () => {
    assert.equal(openStatus(infos, at("07:59")).open, false);
    assert.equal(openStatus(infos, at("08:00")).open, true);
    assert.equal(openStatus(infos, at("21:59")).open, true);
    assert.equal(openStatus(infos, at("22:00")).open, false);
  });

  test(`theme follows the café (${label})`, () => {
    assert.equal(autoTheme(infos, at("07:59")), "dark");
    assert.equal(autoTheme(infos, at("08:00")), "light");
    assert.equal(autoTheme(infos, at("21:59")), "light");
    assert.equal(autoTheme(infos, at("22:00")), "dark");
  });
}

test("Paris time is used whatever the visitor's zone", () => {
  // 06:30 in New York = 12:30 in Paris (summer).
  const p = parisParts(new Date("2026-10-14T06:30:00-04:00"));
  assert.deepEqual(p, { date: "2026-10-14", weekday: "wednesday", minutes: 750 });
  assert.equal(autoTheme(infos, new Date("2026-10-14T06:30:00-04:00")), "light");
});

test("reopening time when closed", () => {
  const early = openStatus(infos, summer("07:59"));
  assert.deepEqual(early.next, { offset: 0, weekday: "wednesday", time: "08:00" });
  const late = openStatus(infos, summer("22:00"));
  assert.deepEqual(late.next, { offset: 1, weekday: "thursday", time: "08:00" });
});

test("closing day and special hours", () => {
  const withMonday = { ...infos, hours: { ...infos.hours, thursday: "closed" } };
  const late = openStatus(withMonday, summer("23:00"));
  assert.equal(late.next.weekday, "friday");
  assert.equal(late.next.offset, 2);

  const holiday = { ...infos, special_hours: [{ date: "2026-10-14", ranges: "closed" }] };
  assert.equal(openStatus(holiday, summer("12:00")).open, false);
  const short = { ...infos, special_hours: [{ date: "2026-10-14", ranges: [{ from: "10:00", to: "14:00" }] }] };
  assert.equal(openStatus(short, summer("09:00")).open, false);
  assert.equal(openStatus(short, summer("13:59")).open, true);
});

test("midnight closing", () => {
  const night = { ...infos, hours: every([{ from: "08:00", to: "00:00" }]) };
  assert.equal(openStatus(night, summer("23:59")).open, true);
});

test("unconfirmed hours: no badge, light theme", () => {
  const draft = { ...infos, hours: { ...infos.hours, todo: "confirm" } };
  assert.equal(hoursKnown(draft), false);
  assert.equal(openStatus(draft, summer("23:00")), null);
  assert.equal(autoTheme(draft, summer("23:00")), "light");
  assert.equal(hoursKnown({}), false);
});
