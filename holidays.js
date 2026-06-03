// Myanmar Public Holidays — data is loaded from holidays.json
// Edit holidays.json to add or update holiday dates. No JS knowledge needed.

let myanmarHolidays = { fixed: [], byYear: {} };

// Promise that resolves once the JSON is loaded.
// app.js awaits this before first render.
// The Service Worker intercepts this fetch:
//   • Online  → fetches from network, caches in DATA_CACHE
//   • Offline → serves from DATA_CACHE (or empty fallback if never cached)
const holidaysReady = fetch('holidays.json')
    .then(r => {
        if (!r.ok) throw new Error('Could not load holidays.json: ' + r.status);
        return r.json();
    })
    .then(data => {
        myanmarHolidays = data;
    })
    .catch(err => {
        console.warn('Holiday data unavailable:', err.message);
    });

// ── Hot-reload holidays data (called when back online or SW signals update) ──
// Fetches the latest holidays.json (SW serves from its DATA_CACHE which was
// already refreshed), replaces the in-memory data, and returns true if the
// data actually changed so the caller can decide whether to re-render.
async function reloadHolidays() {
    try {
        const r = await fetch('holidays.json');
        if (!r.ok) return false;
        const data = await r.json();
        // Quick structural diff — stringify is accurate enough for this payload
        if (JSON.stringify(data) !== JSON.stringify(myanmarHolidays)) {
            myanmarHolidays = data;
            return true;   // data changed
        }
        return false;      // no change
    } catch {
        return false;
    }
}



function getHolidayInfo(year, month, day) {
    const holidays = [];

    for (const h of myanmarHolidays.fixed) {
        if (h.month === month && h.day === day) {
            holidays.push({ name: h.name, nameMM: h.nameMM, type: 'fixed' });
        }
    }

    const yearData = myanmarHolidays.byYear[String(year)];
    if (yearData) {
        for (const h of yearData) {
            if (h.month === month && h.day === day) {
                holidays.push({
                    name: h.name,
                    nameMM: h.nameMM,
                    description: h.description || '',
                    type: 'variable',
                });
            }
        }
    }

    return holidays;
}

function getMonthHolidays(year, month) {
    const result = [];
    const daysInMonth = new Date(year, month, 0).getDate();
    for (let day = 1; day <= daysInMonth; day++) {
        const dayHolidays = getHolidayInfo(year, month, day);
        if (dayHolidays.length > 0) result.push({ day, holidays: dayHolidays });
    }
    return result;
}
