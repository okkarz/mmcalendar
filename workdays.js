// Myanmar Government Office Schedule
// ကြားရက် (bridge holidays) ↔ အစားထိုး ရုံးတက်ရက် (substitute working Saturdays)
//
// Data is loaded from workdays.json — edit that file to update the schedule.
// No JS knowledge needed to add a year.

let myanmarWorkdays = { byYear: {} };

// Promise that resolves once the JSON is loaded.
// app.js awaits this before the first render.
const workdaysReady = fetch('workdays.json')
    .then(r => {
        if (!r.ok) throw new Error('Could not load workdays.json: ' + r.status);
        return r.json();
    })
    .then(data => {
        myanmarWorkdays = data;
    })
    .catch(err => {
        console.warn('Office schedule data unavailable:', err.message);
    });

// ── Hot-reload (called when back online or the SW signals an update) ──
async function reloadWorkdays() {
    try {
        const r = await fetch('workdays.json');
        if (!r.ok) return false;
        const data = await r.json();
        if (JSON.stringify(data) !== JSON.stringify(myanmarWorkdays)) {
            myanmarWorkdays = data;
            _wdIndex = null;   // invalidate the lookup index
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

// ── Lookup index (built lazily, invalidated on reload) ──────────────────
// A pair is registered under BOTH dates, so either side of the
// relationship can be resolved in a single Map lookup.
let _wdIndex = null;
const _wdKey = (y, m, d) => y + '-' + m + '-' + d;

function _buildWdIndex() {
    const work   = new Map();   // substitute working day → pair
    const bridge = new Map();   // bridge holiday        → pair
    const byYear = myanmarWorkdays.byYear || {};

    for (const [yearStr, list] of Object.entries(byYear)) {
        const baseYear = Number(yearStr);
        for (const entry of (list || [])) {
            if (!entry || !entry.bridge || !entry.workday) continue;

            const pair = { bridge: { ...entry.bridge }, workday: { ...entry.workday } };
            // An omitted year means "same year as the block key"
            pair.bridge.year  = pair.bridge.year  || baseYear;
            pair.workday.year = pair.workday.year || baseYear;

            work.set(_wdKey(pair.workday.year, pair.workday.month, pair.workday.day), pair);
            bridge.set(_wdKey(pair.bridge.year,  pair.bridge.month,  pair.bridge.day),  pair);
        }
    }
    return { work, bridge };
}

function _wd() {
    if (!_wdIndex) _wdIndex = _buildWdIndex();
    return _wdIndex;
}

// The pair if `year-month-day` is a substitute working day, else null.
function getSubstituteWorkday(year, month, day) {
    return _wd().work.get(_wdKey(year, month, day)) || null;
}

// The pair if `year-month-day` is a bridge holiday that is compensated
// by a substitute working day, else null.
function getBridgeHoliday(year, month, day) {
    return _wd().bridge.get(_wdKey(year, month, day)) || null;
}
