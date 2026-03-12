// Myanmar Public Holidays — data is loaded from holidays.json
// Edit holidays.json to add or update holiday dates. No JS knowledge needed.

let myanmarHolidays = { fixed: [], byYear: {} };

// Promise that resolves once the JSON is loaded.
// app.js awaits this before first render.
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


// ── Lookup helpers (unchanged API — no edits needed in app.js) ────────────────

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
