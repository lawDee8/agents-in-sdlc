// "Open now", today's hours and the living theme. All times are Europe/Paris.
// Pure functions first (tested in Node), DOM wiring at the bottom.

export const WEEKDAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const TZ = "Europe/Paris";
const DAY_MS = 86400000;

const partsFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  weekday: "long",
  hourCycle: "h23",
});

// Wall-clock time in Paris for an absolute instant.
export function parisParts(date) {
  const p = Object.fromEntries(partsFormatter.formatToParts(date).map((x) => [x.type, x.value]));
  return {
    date: `${p.year}-${p.month}-${p.day}`,
    weekday: p.weekday.toLowerCase(),
    minutes: Number(p.hour) * 60 + Number(p.minute),
  };
}

export function toMinutes(hhmm) {
  const m = /^(\d{2}):(\d{2})$/.exec(hhmm ?? "");
  if (!m) return NaN;
  const value = Number(m[1]) * 60 + Number(m[2]);
  // "00:00" or "24:00" as a closing time means midnight at the end of the day.
  return value === 0 ? 1440 : value;
}

const fromMinutes = (hhmm) => (hhmm === "00:00" ? 0 : toMinutes(hhmm));

// Hours are usable only when present, without todo, and every range is well-formed.
export function hoursKnown(infos) {
  const hours = infos?.hours;
  if (!hours || typeof hours !== "object" || hours.todo) return false;
  return WEEKDAYS.every((d) => {
    const ranges = hours[d];
    if (ranges === "closed" || (Array.isArray(ranges) && ranges.length === 0)) return true;
    return Array.isArray(ranges) && ranges.every((r) => fromMinutes(r.from) < toMinutes(r.to));
  });
}

// Ranges for one Paris calendar day: special_hours override the weekday.
export function rangesFor(infos, isoDate, weekday) {
  const special = (infos.special_hours ?? []).find((s) => s.date === isoDate);
  const ranges = special ? special.ranges : infos.hours[weekday];
  return { ranges: Array.isArray(ranges) ? ranges : [], special: special ?? null };
}

// Paris calendar date + weekday, `offset` days after `parts`.
function shiftDay(parts, offset) {
  const [y, m, d] = parts.date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) + offset * DAY_MS);
  return {
    date: dt.toISOString().slice(0, 10),
    weekday: WEEKDAYS[(dt.getUTCDay() + 6) % 7],
  };
}

// Status at an instant. Returns null when hours are not confirmed.
export function openStatus(infos, now = new Date()) {
  if (!hoursKnown(infos)) return null;
  const here = parisParts(now);
  const today = rangesFor(infos, here.date, here.weekday);
  const open = today.ranges.some((r) => here.minutes >= fromMinutes(r.from) && here.minutes < toMinutes(r.to));

  let next = null;
  if (!open) {
    for (let offset = 0; offset <= 7 && !next; offset++) {
      const day = offset === 0 ? here : shiftDay(here, offset);
      const { ranges } = rangesFor(infos, day.date, day.weekday);
      const r = ranges
        .filter((x) => offset > 0 || fromMinutes(x.from) > here.minutes)
        .sort((a, b) => fromMinutes(a.from) - fromMinutes(b.from))[0];
      if (r) next = { offset, weekday: day.weekday, time: r.from };
    }
  }
  return { open, today: today.ranges, special: today.special, next, weekday: here.weekday, date: here.date };
}

// Theme follows the café; unknown hours keep the light (CSS default) theme.
export function autoTheme(infos, now = new Date()) {
  const status = openStatus(infos, now);
  return status && !status.open ? "dark" : "light";
}

export function formatTime(hhmm) {
  return hhmm.replace(/^0(\d)/, "$1");
}

export function formatRanges(ranges) {
  return ranges.map((r) => `${formatTime(r.from)}–${formatTime(r.to)}`).join(", ");
}

// ---------- DOM ----------

const STORAGE_KEY = "theme-override";

function readOverride() {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return v === "light" || v === "dark" ? v : null;
  } catch {
    return null;
  }
}

function writeOverride(value) {
  try {
    if (value) localStorage.setItem(STORAGE_KEY, value);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
}

export function weekdayName(weekday, lang) {
  // 2024-01-01 was a Monday.
  const d = new Date(Date.UTC(2024, 0, 1 + WEEKDAYS.indexOf(weekday), 12));
  return new Intl.DateTimeFormat(lang, { weekday: "long", timeZone: "UTC" }).format(d);
}

export function statusText(status, t, lang) {
  if (!status.open) {
    const n = status.next;
    let when = "";
    if (n?.offset === 0) when = t.status_opens_at.replace("{time}", formatTime(n.time));
    else if (n?.offset === 1) when = t.status_opens_tomorrow.replace("{time}", formatTime(n.time));
    else if (n) when = t.status_opens_day.replace("{day}", weekdayName(n.weekday, lang)).replace("{time}", formatTime(n.time));
    return { badge: t.status_closed, detail: when };
  }
  return { badge: t.status_open, detail: `${t.status_today} ${formatRanges(status.today)}` };
}

export function initHours(infos, t, lang) {
  const root = document.documentElement;
  const statusEl = document.getElementById("status");
  const toggle = document.getElementById("theme-toggle");
  let override = readOverride();
  let auto = "light";

  const apply = () => {
    root.dataset.theme = override ?? auto;
    if (toggle) {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      toggle.setAttribute("aria-label", next === "dark" ? t.theme_to_dark : t.theme_to_light);
    }
  };

  const tick = () => {
    const now = new Date();
    auto = infos ? autoTheme(infos, now) : "light";
    const status = infos ? openStatus(infos, now) : null;
    if (statusEl) {
      statusEl.replaceChildren();
      if (status) {
        const { badge, detail } = statusText(status, t, lang);
        const b = document.createElement("span");
        b.className = "status-badge";
        b.textContent = badge;
        statusEl.append(b, detail ? ` ${detail}` : "");
        statusEl.hidden = false;
      } else {
        statusEl.hidden = true;
      }
    }
    apply();
  };

  if (toggle) {
    toggle.hidden = false;
    toggle.addEventListener("click", () => {
      const wanted = root.dataset.theme === "dark" ? "light" : "dark";
      // Picking the automatic theme again clears the override.
      override = wanted === auto ? null : wanted;
      writeOverride(override);
      apply();
    });
  }

  tick();
  // Enable the colour cross-fade only after the first paint in the right theme.
  requestAnimationFrame(() => root.classList.add("theme-ready"));
  setInterval(tick, 60000);
}
