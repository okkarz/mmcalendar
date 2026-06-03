// ═══════════════════════════════════════════════════════
//  Myanmar Calendar — iOS-style App Logic
// ═══════════════════════════════════════════════════════

// ── State ──────────────────────────────────────────────
let today          = new Date();   // refreshed at midnight
let currentYear    = today.getFullYear();
let currentMonth   = today.getMonth() + 1;
let currentLang    = localStorage.getItem('mm-lang')  || 'en';
let currentView    = localStorage.getItem('mm-view')  || 'month';
let selectedDay    = null;  // { year, month, day }
let pickerYear     = currentYear;
let notes          = loadNotes();
let alarms         = loadAlarms();
const _firedAlarms = new Set(); // prevent double-firing within same minute

// ── Helpers ────────────────────────────────────────────
function t(en, mm) { return currentLang === 'mm' ? mm : en; }

function toMM(num) {
    return num.toString().split('').map(d => '၀၁၂၃၄၅၆၇၈၉'[+d]).join('');
}

function isToday(y, m, d) {
    return y === today.getFullYear() && m === today.getMonth() + 1 && d === today.getDate();
}

function escHtml(str) {
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ── Toast notifications ─────────────────────────────────
let _toastTimer = null;
function showToast(msg, type = 'success') {
    let toast = document.getElementById('appToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'appToast';
        document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = 'app-toast app-toast--' + type + ' app-toast--show';
    clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => { toast.classList.remove('app-toast--show'); }, 2200);
}

// ── Offline banner helper ───────────────────────────────
function _setOfflineBanner(offline) {
    const banner = document.getElementById('offlineBanner');
    if (banner) banner.classList.toggle('visible', offline);
}

function getDayData(year, month, day) {
    const jdn      = mmCal.w2j(year, month, day);
    const mDate    = mmCal.j2m(jdn);
    const dow      = new Date(year, month - 1, day).getDay();
    const wdMM     = (dow + 1) % 7;
    const fd       = mmCal.getFortnightDay(mDate.md);
    const mml      = (mDate.myt >= 2) ? 30 : 29;
    const moon     = mmCal.getMoonPhase(mDate.md, mDate.mm, mDate.myt);
    const moonMM   = mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt);
    const sabbath  = mmCal.calSabbath(mDate.md, mml);
    const yatyaza  = mmCal.calYatyaza(mDate.mm, wdMM);
    const pyathada = mmCal.calPyathada(mDate.mm, wdMM);
    const amye     = mmCal.calAmyeittasote(fd, wdMM);
    const thamaphyu= mmCal.calThamaphyu(fd, wdMM);
    const holidays = getHolidayInfo(year, month, day);
    return { mDate, dow, wdMM, fd, mml, moon, moonMM, sabbath, yatyaza, pyathada, amye, thamaphyu, holidays };
}

// ── Internationalisation ────────────────────────────────
const MONTH_EN = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTH_SHORT_EN = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTH_SHORT_MM = ['ဇန်','ဖေ','မတ်','ဧပြီ','မေ','ဇွန်','ဇူး','ဩ','စက်','အောက်','နို','ဒီ'];
const DAY_EN  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const DAY_MM  = ['တနင်္ဂနွေ','တနင်္လာ','အင်္ဂါ','ဗုဒ္ဓဟူး','ကြာသပတေး','သောကြာ','စနေ'];
const DAY_SHORT_EN = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const DAY_SHORT_MM = ['နွေ','လာ','ဂါ','ဟူး','တေး','ကြာ','နေ'];

function getMmMonthLabel(year, month) {
    const dim = new Date(year, month, 0).getDate();
    const seen = [];
    for (let d = 1; d <= dim; d++) {
        const jdn = mmCal.w2j(year, month, d);
        const md  = mmCal.j2m(jdn);
        const key = `${md.my}-${md.mm}`;
        if (!seen.find(x => x.key === key)) seen.push({ key, mm: md.mm, my: md.my, myt: md.myt });
    }
    const isWaso = seen.some(s => s.myt >= 1);
    const names  = seen.map(s => {
        let n = mmCal.getMonthNameMM(s.mm).replace(/^နောက်ဆုံး/, '');
        if (isWaso && s.mm === 4) n = 'ဒုတိယဝါဆို';
        return n;
    }).filter((n, i, a) => a.indexOf(n) === i);
    const namesEN = seen.map(s => {
        let n = mmCal.getMonthNameEN(s.mm).replace(/^Late /, '');
        if (isWaso && s.mm === 4) n = 'Second Waso';
        return n;
    }).filter((n, i, a) => a.indexOf(n) === i);
    const years  = [...new Set(seen.map(s => s.my))];
    return {
        mmMonthStr: names.join(' / '),
        mmYearStr:  years.map(toMM).join('-'),
        enMonthStr: namesEN.join(' / '),
        enYearStr:  years.join('-')
    };
}

// ═══════════════════════════════════════════════════════
//  NOTES — client-side localStorage
// ═══════════════════════════════════════════════════════
const NOTE_ICONS  = ['📝','📌','⭐','❤️','🔔','💊','🎂','✈️','💼','🏠','🎵','💰','🏃','🍽️','🎉','🎯','📅','🌟','💬','🔖'];
const NOTE_COLORS = ['#FF3B30','#FF9500','#FFCC00','#34C759','#007AFF','#AF52DE','#FF2D55','#30B0C7'];

function noteDateKey(y, m, d) {
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function loadNotes() {
    try { return JSON.parse(localStorage.getItem('mm-notes') || '{}'); }
    catch(e) { return {}; }
}
function saveNotes() {
    localStorage.setItem('mm-notes', JSON.stringify(notes));
}
function getNotesForDate(y, m, d) {
    return notes[noteDateKey(y, m, d)] || [];
}
function addNote(y, m, d, text, icon, color) {
    const key = noteDateKey(y, m, d);
    if (!notes[key]) notes[key] = [];
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    notes[key].push({ id, text, icon, color });
    saveNotes();
}
function deleteNote(y, m, d, id) {
    const key = noteDateKey(y, m, d);
    if (!notes[key]) return;
    notes[key] = notes[key].filter(n => n.id !== id);
    if (!notes[key].length) delete notes[key];
    saveNotes();
}

// ═══════════════════════════════════════════════════════
//  ALARM SYSTEM
// ═══════════════════════════════════════════════════════

// ── Storage ─────────────────────────────────────────────
function loadAlarms() {
    try { return JSON.parse(localStorage.getItem('mm-alarms') || '{}'); }
    catch(e) { return {}; }
}
function saveAlarms() {
    localStorage.setItem('mm-alarms', JSON.stringify(alarms));
}
function getAlarmsForDate(y, m, d) {
    return alarms[noteDateKey(y, m, d)] || [];
}
function addAlarm(y, m, d, time, label) {
    const key = noteDateKey(y, m, d);
    if (!alarms[key]) alarms[key] = [];
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    alarms[key].push({ id, time, label: label || '', enabled: true });
    saveAlarms();
    return id;
}
function deleteAlarm(y, m, d, id) {
    const key = noteDateKey(y, m, d);
    if (!alarms[key]) return;
    alarms[key] = alarms[key].filter(a => a.id !== id);
    if (!alarms[key].length) delete alarms[key];
    saveAlarms();
}
function toggleAlarm(y, m, d, id) {
    const key = noteDateKey(y, m, d);
    const alarm = (alarms[key] || []).find(a => a.id === id);
    if (alarm) { alarm.enabled = !alarm.enabled; saveAlarms(); }
}

// ── Sound — Web Audio API ────────────────────────────────
function playAlarmSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const pattern = [
            { freq: 880, start: 0,    dur: 0.18 },
            { freq: 880, start: 0.22, dur: 0.18 },
            { freq: 1100,start: 0.44, dur: 0.28 },
            { freq: 880, start: 0.76, dur: 0.18 },
            { freq: 1100,start: 0.98, dur: 0.38 },
        ];
        pattern.forEach(({ freq, start, dur }) => {
            const osc  = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.type = 'sine';
            osc.frequency.value = freq;
            gain.gain.setValueAtTime(0, ctx.currentTime + start);
            gain.gain.linearRampToValueAtTime(0.6, ctx.currentTime + start + 0.02);
            gain.gain.linearRampToValueAtTime(0,   ctx.currentTime + start + dur);
            osc.start(ctx.currentTime + start);
            osc.stop(ctx.currentTime  + start + dur + 0.05);
        });
        setTimeout(() => ctx.close(), 2000);
    } catch(e) { /* AudioContext unavailable */ }
}

// ── Popup alarm notification ─────────────────────────────
function showAlarmPopup(alarmObj, dateLabel) {
    // Existing popup check
    document.getElementById('alarmPopup')?.remove();

    // Web Notification (background / lock-screen)
    if (Notification.permission === 'granted') {
        new Notification(t('⏰ Alarm', '⏰ နှိုးစက်'), {
            body: (alarmObj.label || t('Alarm', 'နှိုးစက်')) + ' — ' + dateLabel,
            icon: '/icon.png',
            tag:  'alarm-' + alarmObj.id,
        });
    }

    // In-app popup
    const overlay = document.createElement('div');
    overlay.id = 'alarmPopup';
    overlay.className = 'alarm-popup-overlay';
    overlay.innerHTML = `
      <div class="alarm-popup">
        <div class="alarm-popup-icon">⏰</div>
        <div class="alarm-popup-time">${alarmObj.time}</div>
        <div class="alarm-popup-label">${escHtml(alarmObj.label || t('Alarm','နှိုးစက်'))}</div>
        <div class="alarm-popup-date">${escHtml(dateLabel)}</div>
        <button class="alarm-popup-dismiss" id="alarmDismissBtn">
          ${t('Dismiss','ပိတ်မည်')}
        </button>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('alarm-popup-overlay--show'));

    const dismiss = () => {
        overlay.classList.remove('alarm-popup-overlay--show');
        setTimeout(() => overlay.remove(), 300);
    };
    document.getElementById('alarmDismissBtn').addEventListener('click', dismiss);
    overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(); });
}

// ── Check alarms every 30 s ──────────────────────────────
function checkAlarms() {
    const now    = new Date();
    const y      = now.getFullYear();
    const m      = now.getMonth() + 1;
    const d      = now.getDate();
    const hh     = String(now.getHours()).padStart(2,'0');
    const mm     = String(now.getMinutes()).padStart(2,'0');
    const nowStr = `${hh}:${mm}`;
    const key    = noteDateKey(y, m, d);

    (alarms[key] || []).forEach(alarm => {
        if (!alarm.enabled || alarm.time !== nowStr) return;
        const fireKey = `${key}-${alarm.id}-${nowStr}`;
        if (_firedAlarms.has(fireKey)) return;
        _firedAlarms.add(fireKey);

        const dow      = now.getDay();
        const dateLabel = t(
            `${DAY_SHORT_EN[dow]}, ${MONTH_SHORT_EN[m-1]} ${d}, ${y}`,
            `${DAY_SHORT_MM[dow]} ၊ ${MONTH_SHORT_MM[m-1]} ${toMM(d)}`
        );
        playAlarmSound();
        showAlarmPopup(alarm, dateLabel);
    });

    // Clean up fire-keys older than today to prevent unbounded growth
    _firedAlarms.forEach(k => { if (!k.startsWith(key)) _firedAlarms.delete(k); });
}
function startAlarmChecker() {
    checkAlarms();
    // Align to the next whole minute, then tick every 30 s
    const now   = new Date();
    const msToNextMin = (60 - now.getSeconds()) * 1000 - now.getMilliseconds();
    setTimeout(() => {
        checkAlarms();
        setInterval(checkAlarms, 30_000);
    }, msToNextMin);
}

// ── Request notification permission ─────────────────────
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// ── Build alarm section HTML ─────────────────────────────
function buildAlarmsHtml(y, m, d) {
    const dayAlarms = getAlarmsForDate(y, m, d);
    let html = `<div class="di-section di-alarms-section">
        <p class="di-section-header">${t('⏰ Alarms','⏰ နှိုးစက်များ')}</p>
        <div class="di-section-block">`;
    if (dayAlarms.length === 0) {
        html += `<div class="note-empty">${t('No alarms for this day','ဤနေ့တွင် နှိုးစက်မရှိသေး')}</div>`;
    } else {
        dayAlarms.forEach(a => {
            html += `<div class="alarm-card" data-alarm-id="${a.id}">
                <div class="alarm-card-left">
                    <span class="alarm-time">${escHtml(a.time)}</span>
                    <span class="alarm-label">${escHtml(a.label || t('Alarm','နှိုးစက်'))}</span>
                </div>
                <div class="alarm-card-right">
                    <button class="alarm-toggle-btn${a.enabled ? ' alarm-toggle-on' : ''}" type="button"
                        aria-label="${t('Toggle alarm','နှိုးစက် ဖွင့်/ပိတ်')}" data-alarm-id="${a.id}">
                        <span class="alarm-toggle-thumb"></span>
                    </button>
                    <button class="note-delete-btn alarm-delete-btn" type="button"
                        aria-label="${t('Delete alarm','နှိုးစက်ဖျက်ရန်')}" data-alarm-id="${a.id}">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                    </button>
                </div>
            </div>`;
        });
    }
    html += `<button class="note-add-btn alarm-add-btn" type="button">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${t('Add Alarm','နှိုးစက်ထည့်ရန်')}
    </button>
    <div class="alarm-form" hidden>
        <div class="alarm-form-row">
            <label class="alarm-form-label">${t('Time','အချိန်')}</label>
            <input type="time" class="alarm-time-input" required>
        </div>
        <div class="alarm-form-row">
            <label class="alarm-form-label">${t('Label (optional)','ခေါင်းစဉ်')}</label>
            <input type="text" class="alarm-label-input" maxlength="60"
                placeholder="${t('e.g. Wake up','ဥပမာ — နိုးရန်')}">
        </div>
        <div class="note-form-actions">
            <button type="button" class="note-cancel-btn alarm-cancel-btn">${t('Cancel','မလုပ်တော့')}</button>
            <button type="button" class="note-save-btn alarm-save-btn">${t('Set Alarm','သတ်မှတ်မည်')}</button>
        </div>
    </div>
    </div></div>`;
    return html;
}

function attachAlarmInteractions(container, y, m, d) {
    // Delete
    container.querySelectorAll('.alarm-delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.dataset.alarmId;
            if (!id) return;
            deleteAlarm(y, m, d, id);
            refreshAlarmSection(container, y, m, d);
            showToast(t('Alarm deleted','နှိုးစက် ဖျက်ပြီး'), 'info');
        });
    });
    // Toggle
    container.querySelectorAll('.alarm-toggle-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.dataset.alarmId;
            if (!id) return;
            toggleAlarm(y, m, d, id);
            refreshAlarmSection(container, y, m, d);
        });
    });
    // Add form
    const addBtn = container.querySelector('.alarm-add-btn');
    const form   = container.querySelector('.alarm-form');
    if (!addBtn || !form) return;
    addBtn.addEventListener('click', () => {
        form.hidden = false;
        addBtn.hidden = true;
        // Default time = now rounded up to next 5 min
        const n = new Date(); n.setMinutes(Math.ceil(n.getMinutes()/5)*5, 0, 0);
        form.querySelector('.alarm-time-input').value =
            String(n.getHours()).padStart(2,'0') + ':' + String(n.getMinutes()).padStart(2,'0');
        form.querySelector('.alarm-time-input').focus();
        requestNotificationPermission();
    });
    form.querySelector('.alarm-cancel-btn')?.addEventListener('click', () => {
        form.hidden = true;
        addBtn.hidden = false;
        form.querySelector('.alarm-label-input').value = '';
    });
    form.querySelector('.alarm-save-btn')?.addEventListener('click', () => {
        const timeVal  = form.querySelector('.alarm-time-input').value;
        if (!timeVal) { form.querySelector('.alarm-time-input').focus(); return; }
        const labelVal = form.querySelector('.alarm-label-input').value.trim();
        addAlarm(y, m, d, timeVal, labelVal);
        refreshAlarmSection(container, y, m, d);
        showToast(t('Alarm set for ' + timeVal, timeVal + ' တွင် နှိုးစက်သတ်မှတ်ပြီး'), 'success');
    });
}

function refreshAlarmSection(container, y, m, d) {
    const sec = container.querySelector('.di-alarms-section');
    if (!sec) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = buildAlarmsHtml(y, m, d);
    sec.replaceWith(tmp.firstElementChild);
    attachAlarmInteractions(container, y, m, d);
}

function buildNotesHtml(y, m, d) {
    const dayNotes = getNotesForDate(y, m, d);
    let html = `<div class="di-section di-notes-section">
        <p class="di-section-header">${t('📋 Notes','📋 မှတ်စုများ')}</p>
        <div class="di-section-block">`;
    if (dayNotes.length === 0) {
        html += `<div class="note-empty">${t('No notes for this day','ဤနေ့တွင် မှတ်စုမရှိသေး')}</div>`;
    } else {
        dayNotes.forEach(n => {
            html += `<div class="note-card" data-note-id="${n.id}">
                <span class="note-card-icon" style="background:${n.color}">${n.icon}</span>
                <span class="note-card-text">${escHtml(n.text)}</span>
                <button class="note-delete-btn" type="button" aria-label="${t('Delete note','မှတ်စုဖျက်ရန်')}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            </div>`;
        });
    }
    html += `<button class="note-add-btn" type="button">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
        ${t('Add Note','မှတ်စုထည့်ရန်')}
    </button>
    <div class="note-form" hidden>
        <textarea class="note-textarea" placeholder="${t('Write a note…','မှတ်စုရေးပါ…')}" rows="3"></textarea>
        <div class="note-icon-grid">`;
    NOTE_ICONS.forEach(ic => {
        html += `<button type="button" class="note-icon-btn" data-icon="${ic}" aria-label="${ic}">${ic}</button>`;
    });
    html += `</div><div class="note-color-row">`;
    NOTE_COLORS.forEach(col => {
        html += `<button type="button" class="note-color-btn" data-color="${col}" style="background:${col}" aria-label="${col}"></button>`;
    });
    html += `</div>
        <div class="note-form-actions">
            <button type="button" class="note-cancel-btn">${t('Cancel','မလုပ်တော့')}</button>
            <button type="button" class="note-save-btn">${t('Save','သိမ်းမည်')}</button>
        </div>
    </div>
    </div></div>`;
    return html;
}

function attachNoteInteractions(container, y, m, d) {
    container.querySelectorAll('.note-delete-btn').forEach(btn => {
        btn.addEventListener('click', e => {
            e.stopPropagation();
            const id = btn.closest('.note-card')?.dataset?.noteId;
            if (!id) return;
            deleteNote(y, m, d, id);
            refreshNoteSection(container, y, m, d);
            refreshCalendarCells(y, m, d);
            showToast(t('Note deleted', 'မှတ်စုဖျက်ပြီး'), 'info');
        });
    });
    const addBtn = container.querySelector('.note-add-btn');
    const form   = container.querySelector('.note-form');
    if (!addBtn || !form) return;
    addBtn.addEventListener('click', () => {
        form.hidden = false;
        addBtn.hidden = true;
        form.querySelector('.note-textarea')?.focus();
    });
    form.querySelector('.note-cancel-btn')?.addEventListener('click', () => {
        form.hidden = true;
        addBtn.hidden = false;
        form.querySelector('.note-textarea').value = '';
        form.querySelectorAll('.note-icon-btn, .note-color-btn').forEach(b => b.classList.remove('active'));
    });
    form.querySelectorAll('.note-icon-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            form.querySelectorAll('.note-icon-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    form.querySelectorAll('.note-color-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            form.querySelectorAll('.note-color-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
    form.querySelector('.note-save-btn')?.addEventListener('click', () => {
        const textarea = form.querySelector('.note-textarea');
        const text = textarea.value.trim();
        if (!text) { textarea.focus(); return; }
        const icon  = form.querySelector('.note-icon-btn.active')?.dataset?.icon  || '📝';
        const color = form.querySelector('.note-color-btn.active')?.dataset?.color || '#007AFF';
        addNote(y, m, d, text, icon, color);
        refreshNoteSection(container, y, m, d);
        refreshCalendarCells(y, m, d);
        showToast(t('Note saved', 'မှတ်စုသိမ်းပြီး'), 'success');
    });
}

function refreshNoteSection(container, y, m, d) {
    const sec = container.querySelector('.di-notes-section');
    if (!sec) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = buildNotesHtml(y, m, d);
    sec.replaceWith(tmp.firstElementChild);
    attachNoteInteractions(container, y, m, d);
}

function refreshCalendarCells(y, m, d) {
    if (y === currentYear && m === currentMonth) {
        renderDays(currentYear, currentMonth);
        renderCompact();
        renderList();
    }
}

// ── Favicon ─────────────────────────────────────────────
function generateDateFavicon() {
    const now = new Date();
    const day = now.getDate();
    const mon = MONTH_SHORT_EN[now.getMonth()];
    const sz  = 64;
    const c   = document.createElement('canvas');
    c.width = c.height = sz;
    const ctx = c.getContext('2d');
    const r = 14;
    ctx.beginPath();
    ctx.moveTo(r,0); ctx.lineTo(sz-r,0); ctx.quadraticCurveTo(sz,0,sz,r);
    ctx.lineTo(sz,sz-r); ctx.quadraticCurveTo(sz,sz,sz-r,sz);
    ctx.lineTo(r,sz); ctx.quadraticCurveTo(0,sz,0,sz-r);
    ctx.lineTo(0,r); ctx.quadraticCurveTo(0,0,r,0); ctx.closePath(); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(0,0,sz,sz);
    const hh = 20;
    ctx.fillStyle = '#FF3B30'; ctx.fillRect(0,0,sz,hh);
    ctx.fillStyle = '#fff'; ctx.font = 'bold 13px -apple-system,sans-serif';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(mon.toUpperCase(), sz/2, hh/2);
    ctx.fillStyle = '#1c1c1e'; ctx.font = 'bold 30px -apple-system,sans-serif';
    ctx.textBaseline = 'middle'; ctx.fillText(day, sz/2, hh+(sz-hh)/2+1);
    let lnk = document.querySelector("link[rel='icon']");
    if (!lnk) { lnk = document.createElement('link'); lnk.rel='icon'; document.head.appendChild(lnk); }
    lnk.href = c.toDataURL('image/png');
    const ms = new Date(now.getFullYear(), now.getMonth(), now.getDate()+1) - now;
    setTimeout(() => {
        // Update today reference so isToday() stays accurate after midnight
        today = new Date();
        generateDateFavicon();
        renderAll();
    }, ms);
}

// ═══════════════════════════════════════════════════════
//  INIT
// ═══════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
    await holidaysReady;

    // Restore lang / theme
    document.documentElement.setAttribute('data-lang', currentLang);
    document.querySelectorAll('.lang-seg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
        btn.setAttribute('aria-pressed', String(btn.dataset.lang === currentLang));
    });

    // Restore view
    applyView(currentView, false);

    // Default selected day = today
    selectedDay = { year: today.getFullYear(), month: today.getMonth()+1, day: today.getDate() };

    renderAll();
    setupListeners();
    generateDateFavicon();
    startAlarmChecker();
});

// ── Apply view mode ─────────────────────────────────────
function applyView(view, save = true) {
    currentView = view;
    if (save) {
        localStorage.setItem('mm-view', view);
        document.documentElement.setAttribute('data-view', view);
    }
    document.querySelectorAll('.view-seg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.view === view);
    });
}

// ── Master render ───────────────────────────────────────
function renderAll() {
    updateNavHeader();
    renderDays(currentYear, currentMonth);
    renderHolidaysList(currentYear, currentMonth);
    renderCompact();
    renderList();
}

// ── Nav header ──────────────────────────────────────────
function updateNavHeader() {
    const { mmMonthStr, mmYearStr, enMonthStr, enYearStr } = getMmMonthLabel(currentYear, currentMonth);

    const hm = document.getElementById('headerMonth');
    const hy = document.getElementById('headerYear');
    const hs = document.getElementById('headerMmMonth');
    if (hm) hm.innerHTML = `<span class="t-en">${MONTH_EN[currentMonth-1]}</span><span class="t-mm">${mmMonthStr}</span>`;
    if (hy) hy.innerHTML = `<span class="t-en">${currentYear}</span><span class="t-mm">${mmYearStr}</span>`;
    if (hs) hs.innerHTML = `<span class="t-en">${enMonthStr} · ${enYearStr}</span><span class="t-mm">${MONTH_SHORT_MM[currentMonth-1]} ${toMM(currentYear)}</span>`;

    // Hidden compat
    const cm = document.getElementById('currentMonth');
    if (cm) cm.innerHTML = `<span class="t-en">${MONTH_EN[currentMonth-1]} ${currentYear}</span><span class="t-mm">${mmMonthStr} ${currentYear}</span>`;
    const md = document.getElementById('myanmarDate');
    if (md) md.textContent = `မြန်မာသက္ကရာဇ် ${mmYearStr} ခု`;
}

// ═══════════════════════════════════════════════════════
//  MONTH VIEW — calendar grid
// ═══════════════════════════════════════════════════════
function renderDays(year, month) {
    const grid = document.getElementById('calendarDays');
    if (!grid) return;
    grid.innerHTML = '';

    const firstDay  = new Date(year, month-1, 1).getDay();
    const dim       = new Date(year, month, 0).getDate();

    for (let i = 0; i < firstDay; i++) {
        const e = document.createElement('div');
        e.className = 'calendar-day empty';
        grid.appendChild(e);
    }

    for (let day = 1; day <= dim; day++) {
        const { mDate, dow, moon, fd, sabbath, yatyaza, pyathada, amye, thamaphyu, holidays } = getDayData(year, month, day);
        const isSelected = selectedDay && selectedDay.year === year && selectedDay.month === month && selectedDay.day === day;

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        if (dow === 0)          cell.classList.add('sunday');
        if (isToday(year,month,day)) cell.classList.add('today');
        if (isSelected)         cell.classList.add('selected');
        if (holidays.length)    cell.classList.add('holiday');
        if (moon === 'Full Moon') cell.classList.add('full-moon');
        if (yatyaza === 1)      cell.classList.add('yatyaza');
        if (pyathada > 0)       cell.classList.add('pyathada');
        if (sabbath.sabbath === 1 || amye === 1 || thamaphyu === 1) cell.classList.add('auspicious-day');

        let moonIco = '';
        if (moon === 'Full Moon') moonIco = '<div class="moon-indicator">🌕</div>';
        else if (moon === 'New Moon') moonIco = '<div class="moon-indicator">🌑</div>';

        let dots = '';
        if (holidays.length)   dots += '<span class="dot dot-holiday"></span>';
        if (moon === 'Full Moon') dots += '<span class="dot dot-fullmoon"></span>';
        if (sabbath.sabbath === 1 || amye === 1 || thamaphyu === 1) dots += '<span class="dot dot-auspicious"></span>';
        if (yatyaza === 1)     dots += '<span class="dot dot-yatyaza"></span>';
        if (pyathada > 0)      dots += '<span class="dot dot-pyathada"></span>';

        const dayNotesMv = getNotesForDate(year, month, day);
        let noteBadgeMv = '';
        if (dayNotesMv.length) {
            cell.classList.add('has-note');
            const fn = dayNotesMv[0];
            noteBadgeMv = `<span class="cell-note-badge" style="background:${fn.color}">${fn.icon}</span>`;
        }
        const dayAlarmsMv = getAlarmsForDate(year, month, day).filter(a => a.enabled);
        const alarmBadgeMv = dayAlarmsMv.length
            ? `<span class="cell-alarm-badge" title="${dayAlarmsMv[0].time}${dayAlarmsMv[0].label ? ' — '+dayAlarmsMv[0].label : ''}">⏰</span>`
            : '';
        cell.innerHTML = `<div class="day-number-wrap">${moonIco}<span class="day-number">${day}</span>${noteBadgeMv}${alarmBadgeMv}</div><div class="day-dots">${dots}</div><div class="myanmar-day">${toMM(fd)}</div>`;

        cell.addEventListener('click', () => {
            selectedDay = { year, month, day };
            document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
            cell.classList.add('selected');
            showDayInfo(year, month, day, cell);
        });
        grid.appendChild(cell);
    }
}

// ── Month holidays list ─────────────────────────────────
function renderHolidaysList(year, month) {
    const el          = document.getElementById('holidaysList');
    const mobileEl    = document.getElementById('mobileHolidaysList');
    const mobilePanel = document.getElementById('mobileHolidaysPanel');

    const list = getMonthHolidays(year, month);

    if (!list.length) {
        if (el) el.innerHTML = `<p class="no-holidays">${t('No public holidays this month','ဤလတွင် ရုံးပိတ်ရက် မရှိပါ')}</p>`;
        if (mobilePanel) mobilePanel.hidden = true;
        return;
    }

    let html = '<div class="holidays-list">';
    for (const item of list) {
        for (const h of item.holidays) {
            html += `<div class="holiday-item">
                <div class="holiday-date-badge">
                    <span class="holiday-date-day">${item.day}</span>
                    <span class="holiday-date-mon"><span class="t-en">${MONTH_SHORT_EN[month-1]}</span><span class="t-mm">${MONTH_SHORT_MM[month-1]}</span></span>
                </div>
                <div class="holiday-details">
                    <div class="holiday-name">${t(h.name, h.nameMM)}</div>
                    ${h.description ? `<div class="holiday-desc">${h.description}</div>` : ''}
                </div>
            </div>`;
        }
    }
    html += '</div>';

    if (el) el.innerHTML = html;
    if (mobileEl) mobileEl.innerHTML = html;
    if (mobilePanel) mobilePanel.hidden = false;
}

// ═══════════════════════════════════════════════════════
//  COMPACT VIEW — week strip + day detail
// ═══════════════════════════════════════════════════════
function renderCompact() {
    const strip = document.getElementById('compactWeekDays');
    if (!strip) return;
    strip.innerHTML = '';

    // Determine week containing selectedDay (or today)
    const ref = selectedDay || { year: today.getFullYear(), month: today.getMonth()+1, day: today.getDate() };
    const refDate = new Date(ref.year, ref.month-1, ref.day);
    const startOfWeek = new Date(refDate);
    startOfWeek.setDate(refDate.getDate() - refDate.getDay()); // Sunday

    for (let i = 0; i < 7; i++) {
        const d    = new Date(startOfWeek);
        d.setDate(startOfWeek.getDate() + i);
        const y = d.getFullYear(), m = d.getMonth()+1, dd = d.getDate();
        const isTd   = isToday(y, m, dd);
        const isSel  = selectedDay && selectedDay.year === y && selectedDay.month === m && selectedDay.day === dd;
        const isSun  = d.getDay() === 0;
        const { holidays, moon, sabbath, amye, thamaphyu } = getDayData(y, m, dd);
        const hasDot = holidays.length || moon === 'Full Moon' || sabbath.sabbath || amye || thamaphyu;

        const btn = document.createElement('button');
        btn.className = 'compact-day';
        if (isSun)  btn.classList.add('sunday');
        if (isTd)   btn.classList.add('today');
        if (isSel)  btn.classList.add('selected');
        if (holidays.length) btn.classList.add('holiday');

        const dayNotesCv = getNotesForDate(y, m, dd);
        const noteIndCv = dayNotesCv.length ? `<span class="compact-note-badge" style="background:${dayNotesCv[0].color}">${dayNotesCv[0].icon}</span>` : '';
        const dayAlarmsCv = getAlarmsForDate(y, m, dd).filter(a => a.enabled);
        const alarmIndCv = dayAlarmsCv.length ? `<span class="compact-alarm-badge">⏰</span>` : '';
        btn.innerHTML = `<div class="compact-day-num-wrap"><span class="compact-day-num">${dd}</span>${noteIndCv}${alarmIndCv}</div><span class="compact-day-dot${hasDot ? '' : ' invisible'}"></span>`;

        btn.addEventListener('click', () => {
            // If clicking a different month, navigate
            if (m !== currentMonth || y !== currentYear) {
                currentYear = y; currentMonth = m;
                updateNavHeader();
                renderDays(currentYear, currentMonth);
                renderHolidaysList(currentYear, currentMonth);
            }
            selectedDay = { year: y, month: m, day: dd };
            renderCompact();
            renderCompactDayDetail(y, m, dd);
        });
        strip.appendChild(btn);
    }

    // Show detail for selected day
    const rd = selectedDay || { year: today.getFullYear(), month: today.getMonth()+1, day: today.getDate() };
    renderCompactDayDetail(rd.year, rd.month, rd.day);
}

function renderCompactDayDetail(year, month, day) {
    const hdr  = document.getElementById('compactDayHdr');
    const body = document.getElementById('compactDayBody');
    if (!hdr || !body) return;

    const { mDate, dow, moon, moonMM, fd, sabbath, yatyaza, pyathada, amye, thamaphyu, holidays } = getDayData(year, month, day);
    const { mmMonthStr } = getMmMonthLabel(year, month);
    const monthNameMM = mmCal.getMonthNameMM(mDate.mm);
    const monthNameEN = mmCal.getMonthNameEN(mDate.mm);

    hdr.innerHTML = `
        <div class="compact-day-hdr-date">
            <span class="t-en">${DAY_EN[dow]}, ${MONTH_SHORT_EN[month-1]} ${day}</span>
            <span class="t-mm">${DAY_MM[dow]} ၊ ${MONTH_SHORT_MM[month-1]} ${toMM(day)}</span>
        </div>
        <div class="compact-day-hdr-mm">
            <span class="t-en">${monthNameEN} ${mmCal.getMoonPhaseEN(mDate.md, mDate.mm, mDate.myt)} ${fd}</span>
            <span class="t-mm">${monthNameMM} ${mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt)} ${toMM(fd)} ရက်</span>
        </div>
    `;
    body.innerHTML = buildDayInfoHtml(year, month, day, { mDate, dow, moon, moonMM: mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt), fd, sabbath, yatyaza, pyathada, amye, thamaphyu, holidays });
    attachNoteInteractions(body, year, month, day);
    attachAlarmInteractions(body, year, month, day);
}

// ═══════════════════════════════════════════════════════
//  LIST VIEW — agenda / list
// ═══════════════════════════════════════════════════════
function renderList() {
    const body = document.getElementById('listBody');
    if (!body) return;
    body.innerHTML = '';

    const dim = new Date(currentYear, currentMonth, 0).getDate();
    const monthHdr = document.createElement('div');
    monthHdr.className = 'list-month-header';
    monthHdr.innerHTML = `<span class="t-en">${MONTH_EN[currentMonth-1]} ${currentYear}</span><span class="t-mm">${getMmMonthLabel(currentYear, currentMonth).mmMonthStr} ${toMM(currentYear)}</span>`;
    body.appendChild(monthHdr);

    for (let day = 1; day <= dim; day++) {
        const { mDate, dow, moon, fd, sabbath, yatyaza, pyathada, amye, thamaphyu, holidays } = getDayData(currentYear, currentMonth, day);
        const isTd = isToday(currentYear, currentMonth, day);

        const row = document.createElement('div');
        row.className = 'list-day-row';
        if (dow === 0)  row.classList.add('sunday');
        if (isTd)       row.classList.add('today');
        if (holidays.length) row.classList.add('holiday');

        const monthNameMM = mmCal.getMonthNameMM(mDate.mm);
        const monthNameEN = mmCal.getMonthNameEN(mDate.mm);
        const moonPhaseMM = mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt);
        const moonPhaseEN = mmCal.getMoonPhaseEN(mDate.md, mDate.mm, mDate.myt);
        let events = '';

        // Holidays
        for (const h of holidays) {
            events += `<div class="list-event">
                <span class="list-event-dot" style="background:var(--ios-red)"></span>
                <span class="list-event-name list-event-holiday">${t(h.name, h.nameMM)}</span>
            </div>`;
        }
        // Moon phases
        if (moon === 'Full Moon') {
            events += `<div class="list-event"><span class="list-event-dot" style="background:var(--ios-teal)"></span><span class="list-event-name list-event-special">🌕 ${t('Full Moon Day','လပြည့်နေ့')}</span></div>`;
        } else if (moon === 'New Moon') {
            events += `<div class="list-event"><span class="list-event-dot" style="background:var(--label-tertiary)"></span><span class="list-event-name list-event-special">🌑 ${t('New Moon Day','လကွယ်နေ့')}</span></div>`;
        }
        // Auspicious
        if (sabbath.sabbath) events += `<div class="list-event"><span class="list-event-dot" style="background:var(--ios-green)"></span><span class="list-event-name list-event-special">${t('☸️ Sabbath Day','☸️ ဥပုသ်နေ့')}</span></div>`;
        if (amye)  events += `<div class="list-event"><span class="list-event-dot" style="background:var(--ios-green)"></span><span class="list-event-name list-event-special">✅ ${t('Amyeittasote','အမြိတ္တစုတ်')}</span></div>`;
        // Yatyaza / Pyathada
        if (yatyaza) events += `<div class="list-event"><span class="list-event-dot" style="background:var(--ios-orange)"></span><span class="list-event-name list-event-special">🌈 ${t('Yatyazar Day','ရက်ရာဇာနေ့')}</span></div>`;
        if (pyathada) events += `<div class="list-event"><span class="list-event-dot" style="background:var(--ios-purple)"></span><span class="list-event-name list-event-special">⚠️ ${t('Pyathada Day','ပြဿဒါးနေ့')}</span></div>`;

        // User notes
        getNotesForDate(currentYear, currentMonth, day).forEach(n => {
            events += `<div class="list-event list-event-note">
                <span class="list-note-icon" style="background:${n.color}">${n.icon}</span>
                <span class="list-event-name">${escHtml(n.text)}</span>
            </div>`;
        });
        // Alarms
        getAlarmsForDate(currentYear, currentMonth, day).filter(a => a.enabled).forEach(a => {
            events += `<div class="list-event list-event-alarm">
                <span class="list-alarm-icon">⏰</span>
                <span class="list-event-name">${escHtml(a.time)}${a.label ? ' — ' + escHtml(a.label) : ''}</span>
            </div>`;
        });

        if (!events) {
            events = `<div class="list-no-content">${t('—','—')}</div>`;
        }

        row.innerHTML = `
            <div class="list-day-left">
                <span class="list-day-weekday"><span class="t-en">${DAY_SHORT_EN[dow]}</span><span class="t-mm">${DAY_SHORT_MM[dow]}</span></span>
                <div class="list-day-num-wrap"><span class="list-day-num">${day}</span></div>
            </div>
            <div class="list-day-right">
                <div class="list-day-mm-date"><span class="t-en">${monthNameEN} ${moonPhaseEN} ${fd}</span><span class="t-mm">${monthNameMM} ${moonPhaseMM} ${toMM(fd)} ရက်</span></div>
                ${events}
            </div>`;

        row.addEventListener('click', () => {
            selectedDay = { year: currentYear, month: currentMonth, day };
            showDayInfo(currentYear, currentMonth, day, null);
        });
        body.appendChild(row);
    }
}

// ═══════════════════════════════════════════════════════
//  DAY INFO — show in panel or bottom sheet
// ═══════════════════════════════════════════════════════
function showDayInfo(year, month, day, cell) {
    const data = getDayData(year, month, day);
    const { dow } = data;
    const dateEN = `${DAY_EN[dow]}, ${MONTH_SHORT_EN[month-1]} ${day}, ${year}`;
    const dateMM = `${DAY_MM[dow]} ၊ ${MONTH_SHORT_MM[month-1]} ${toMM(day)}, ${toMM(year)}`;
    const dateLabel = t(dateEN, dateMM);
    const html = buildDayInfoHtml(year, month, day, data);

    if (window.innerWidth >= 768) {
        // Desktop/tablet: side panel
        if (cell) {
            document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
            cell.classList.add('selected');
        }
        const ddpTitle = document.getElementById('ddpTitle');
        const ddpBody  = document.getElementById('ddpBody');
        const rp       = document.getElementById('rightPane');
        if (ddpTitle) ddpTitle.textContent = dateLabel;
        if (ddpBody)  { ddpBody.innerHTML = html; attachNoteInteractions(ddpBody, year, month, day); attachAlarmInteractions(ddpBody, year, month, day); ddpBody.scrollTop = 0; }
        if (rp)       rp.classList.add('detail-open');
    } else {
        // Mobile: bottom sheet
        document.getElementById('modalTitle').textContent = dateLabel;
        const dayInfoEl = document.getElementById('dayInfo');
        dayInfoEl.innerHTML = html;
        attachNoteInteractions(dayInfoEl, year, month, day);
        attachAlarmInteractions(dayInfoEl, year, month, day);
        document.getElementById('modalOverlay').classList.add('active');
    }
}

// ── Build day info HTML ─────────────────────────────────
function buildDayInfoHtml(year, month, day, data) {
    const { mDate, dow, moon, fd, sabbath, yatyaza, pyathada, amye, thamaphyu, holidays } = data;
    const wdMM = (dow + 1) % 7;
    const moonPhaseMM = mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt);
    const moonPhaseEN = mmCal.getMoonPhaseEN(mDate.md, mDate.mm, mDate.myt);
    const monthNameMM = mmCal.getMonthNameMM(mDate.mm);
    const monthNameEN = mmCal.getMonthNameEN(mDate.mm);
    const mahaboteMM  = mmCal.getMahaboteMM(mmCal.calMahabote(mDate.my, wdMM));
    const mahaboteEN  = mmCal.getMahaboteEN(mmCal.calMahabote(mDate.my, wdMM));
    const nakhatMM    = mmCal.getNakhatMM(mmCal.calNakhat(mDate.my));
    const nakhatEN    = mmCal.getNakhatEN(mmCal.calNakhat(mDate.my));
    const nagahleMM   = mmCal.getNagahleMM(mmCal.calNagahle(mDate.mm));
    const nagahleEN   = mmCal.getNagahleEN(mmCal.calNagahle(mDate.mm));
    const yearNameMM  = mmCal.getYearNameMM(mmCal.calYearName(mDate.my));
    const yearNameEN  = mmCal.getYearNameEN(mmCal.calYearName(mDate.my));
    const buddhistEra = mmCal.getBuddhistEra(mDate.my);
    const thamanyoDay = mmCal.calThamanyoDay(mDate.mm, wdMM);
    const warameittugyi = mmCal.calWarameittugyi(fd, wdMM);
    const warameittunge = mmCal.calWarameittunge(fd, wdMM);
    const yatpote     = mmCal.calYatpote(fd, wdMM);
    const nagapor     = mmCal.calNagapor(mDate.md, wdMM);
    const yatyotema   = mmCal.calYatyotema(mDate.mm, fd);
    const mahayatkyan = mmCal.calMahayatkyan(mDate.mm, fd);
    const shanyat     = mmCal.calShanyat(mDate.mm, fd);

    let html = '<div class="day-info-content">';

    // 1. Holidays
    if (holidays.length) {
        html += `<div class="di-section"><p class="di-section-header">${t('Holidays','ရုံးပိတ်ရက်')}</p><div class="di-section-block">`;
        holidays.forEach((h, i) => {
            html += `<div class="di-row${i ? ' di-row-sep' : ''} di-row-holiday">
                <div class="di-row-holiday-content">
                    <div class="di-row-holiday-name">${t(h.name, h.nameMM)}</div>
                    ${h.description ? `<div class="di-row-holiday-desc">${h.description}</div>` : ''}
                </div>
                <span class="di-row-holiday-icon">🗓️</span>
            </div>`;
        });
        html += '</div></div>';
    }

    // 2. Myanmar date
    html += `<div class="di-section"><p class="di-section-header">${t('Myanmar Calendar','မြန်မာပြက္ခဒိန်')}</p><div class="di-section-block">`;
    html += `<div class="di-row"><span class="di-row-label">${t('Buddhist Era','ဗုဒ္ဓသာသနာ')}</span><span class="di-row-value">${t(buddhistEra, toMM(buddhistEra) + ' ခု')}</span></div>`;
    html += `<div class="di-row di-row-sep"><span class="di-row-label">${t('Myanmar Era','မြန်မာသက္ကရာဇ်')}</span><span class="di-row-value">${t(mDate.my, toMM(mDate.my) + ' ခု')}</span></div>`;
    html += `<div class="di-row di-row-sep"><span class="di-row-label">${t('Year Name','နှစ်အမည်')}</span><span class="di-row-value">${t(yearNameEN, yearNameMM)}</span></div>`;
    html += `<div class="di-row di-row-sep"><span class="di-row-label">${t('MM Date','နေ့ရက်')}</span><span class="di-row-value">${t(monthNameEN + ' ' + moonPhaseEN + ' ' + fd, monthNameMM + ' ' + moonPhaseMM + ' ' + toMM(fd) + ' ရက်')}</span></div>`;
    if (moon === 'Full Moon') html += `<div class="di-row di-row-sep di-row-moon"><span class="di-row-label">${t('Moon','လ')}</span><span class="di-row-value">🌕 ${t('Full Moon','လပြည့်')}</span></div>`;
    else if (moon === 'New Moon') html += `<div class="di-row di-row-sep di-row-moon"><span class="di-row-label">${t('Moon','လ')}</span><span class="di-row-value">🌑 ${t('New Moon','လကွယ်')}</span></div>`;
    html += '</div></div>';

    // 3. Astrology
    html += `<div class="di-section"><p class="di-section-header">${t('Astrology','နက္ခတ်ဗေဒင်')}</p><div class="di-section-block">`;
    html += `<div class="di-row"><span class="di-row-label">${t('Mahabote','မဟာဘုတ်')}</span><span class="di-row-value">${t(mahaboteEN, mahaboteMM)}</span></div>`;
    html += `<div class="di-row di-row-sep"><span class="di-row-label">${t('Nakhat','နက္ခက်')}</span><span class="di-row-value">${t(nakhatEN, nakhatMM)}</span></div>`;
    html += `<div class="di-row di-row-sep"><span class="di-row-label">${t('Nagahle','နဂါးခေါင်း')}</span><span class="di-row-value">${t(nagahleEN, nagahleMM)}</span></div>`;
    html += '</div></div>';

    // 4. Warnings
    if (yatyaza || pyathada) {
        html += `<div class="di-section"><p class="di-section-header">${t('Caution','သတိပြုရက်')}</p><div class="di-section-block">`;
        let first = true;
        if (yatyaza) { html += `<div class="di-row${first?'':' di-row-sep'} di-row-warn"><span class="di-row-label">${t('🌈 Yatyaza Day','🌈 ရက်ရာဇာနေ့')}</span></div>`; first=false; }
        if (pyathada===1) { html += `<div class="di-row${first?'':' di-row-sep'} di-row-warn"><span class="di-row-label">${t('⚠️ Pyathada Day','⚠️ ပြဿဒါးနေ့')}</span></div>`; first=false; }
        if (pyathada===2) { html += `<div class="di-row${first?'':' di-row-sep'} di-row-warn"><span class="di-row-label">${t('⚠️ Evening Pyathada','⚠️ ညနေပြဿဒါးနေ့')}</span></div>`; }
        html += '</div></div>';
    }

    // 5. Special days
    const good = [], bad = [];
    if (sabbath.sabbath)    good.push(t('☸️ Sabbath','☸️ ဥပုသ်'));
    if (sabbath.sabbatheve) good.push(t('🕉️ Sabbath Eve','🕉️ အဖိတ်နေ့'));
    if (amye)               good.push(t('✅ Amyeittasote','✅ အမြိတ္တစုတ်'));
    if (thamaphyu)          good.push(t('⚪ Thamaphyu','⚪ သမားဖြူ'));
    if (thamanyoDay)        bad.push(t('⚫ Thamanyo','⚫ သမားညို'));
    if (warameittugyi)      bad.push(t('⚠️ Warameittugyi','⚠️ ဝါရမိတ္တုကြီး'));
    if (warameittunge)      bad.push(t('⚠️ Warameittunge','⚠️ ဝါရမိတ္တုငယ်'));
    if (yatpote)            bad.push(t('⚠️ Yatpote','⚠️ ရက်ပုပ်'));
    if (nagapor)            bad.push(t('🐉 Nagapor','🐉 နဂါးပေါ်'));
    if (yatyotema)          bad.push(t('⛔ Yatyotema','⛔ ရက်ယုတ်မာ'));
    if (mahayatkyan)        bad.push(t('⛔ Mahayatkyan','⛔ မဟာရက်ကြမ်း'));
    if (shanyat)            bad.push(t('⚠️ Shanyat','⚠️ ရှမ်းရက်'));

    if (good.length || bad.length) {
        html += `<div class="di-section"><p class="di-section-header">${t('Special Days','အခါကြောင်းပြ ရက်')}</p><div class="di-section-block">`;
        if (good.length) { html += '<div class="di-badges-row">'; good.forEach(n => { html += `<span class="di-good-badge">${n}</span>`; }); html += '</div>'; }
        if (bad.length)  { html += `<div class="di-badges-row${good.length?' di-row-sep':''}">`;  bad.forEach(n => { html += `<span class="di-bad-badge">${n}</span>`; }); html += '</div>'; }
        html += '</div></div>';
    }

    // Notes
    html += buildNotesHtml(year, month, day);

    // Alarms
    html += buildAlarmsHtml(year, month, day);

    html += '</div>';
    return html;
}

// ═══════════════════════════════════════════════════════
//  PICKER
// ═══════════════════════════════════════════════════════
function openPicker() {
    pickerYear = currentYear;
    renderPickerMonths();
    document.getElementById('pickerPanel').classList.add('open');
    const tb = document.getElementById('headerTitleBlock');
    if (tb) tb.setAttribute('aria-expanded', 'true');
}
function closePicker() {
    document.getElementById('pickerPanel').classList.remove('open');
    const tb = document.getElementById('headerTitleBlock');
    if (tb) tb.setAttribute('aria-expanded', 'false');
}
function renderPickerMonths() {
    const grid = document.getElementById('pickerMonthsGrid');
    const lbl  = document.getElementById('pickerYearLabel');
    if (lbl) lbl.textContent = pickerYear;
    if (!grid) return;
    grid.innerHTML = '';
    MONTH_SHORT_EN.forEach((nameEN, idx) => {
        const m   = idx + 1;
        const btn = document.createElement('button');
        btn.className = 'picker-month-btn';
        btn.innerHTML = `<span class="t-en">${nameEN}</span><span class="t-mm">${MONTH_SHORT_MM[idx]}</span>`;
        if (pickerYear === currentYear && m === currentMonth) btn.classList.add('active');
        btn.addEventListener('click', e => {
            e.stopPropagation();
            currentYear = pickerYear; currentMonth = m;
            renderAll(); closePicker();
        });
        grid.appendChild(btn);
    });
}

// ─ Modal close ──────────────────────────────────────────
function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

// ══════════════════════════════════════════════════════
//  EVENT LISTENERS
// ═══════════════════════════════════════════════════════
function setupListeners() {
    // Prev / next month
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--; if (currentMonth < 1) { currentMonth=12; currentYear--; }
        renderAll();
    });
    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++; if (currentMonth > 12) { currentMonth=1; currentYear++; }
        renderAll();
    });

    // Today
    document.getElementById('todayBtn').addEventListener('click', () => {
        currentYear = today.getFullYear(); currentMonth = today.getMonth()+1;
        selectedDay = { year: currentYear, month: currentMonth, day: today.getDate() };
        renderAll(); closePicker();
    });

    // Lang
    document.querySelectorAll('.lang-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            currentLang = btn.dataset.lang;
            localStorage.setItem('mm-lang', currentLang);
            document.documentElement.setAttribute('data-lang', currentLang);
            document.querySelectorAll('.lang-seg-btn').forEach(b => {
                b.classList.toggle('active', b.dataset.lang === currentLang);
                b.setAttribute('aria-pressed', String(b.dataset.lang === currentLang));
            });
            closeModal();
            const rp = document.getElementById('rightPane');
            if (rp) rp.classList.remove('detail-open');
            renderAll();
        });
    });

    // Theme
    document.getElementById('themeToggle').addEventListener('click', () => {
        const dark = document.documentElement.getAttribute('data-theme') === 'dark';
        const meta = document.getElementById('metaThemeColor');
        if (dark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('mm-theme', 'light');
            if (meta) meta.setAttribute('content', '#f2f2f7');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('mm-theme', 'dark');
            if (meta) meta.setAttribute('content', '#1c1c1e');
        }
    });

    // View segment
    document.querySelectorAll('.view-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            applyView(btn.dataset.view);
            renderCompact();  // always refresh compact (week may differ)
        });
    });

    // Detail back button
    const ddpBack = document.getElementById('ddpBack');
    if (ddpBack) ddpBack.addEventListener('click', () => {
        const rp = document.getElementById('rightPane');
        if (rp) rp.classList.remove('detail-open');
        document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
    });

    // Sheet close
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Picker toggle
    const titleBtn = document.getElementById('headerTitleBlock');
    if (titleBtn) {
        titleBtn.addEventListener('click', e => {
            e.stopPropagation();
            document.getElementById('pickerPanel').classList.contains('open') ? closePicker() : openPicker();
        });
        titleBtn.addEventListener('keydown', e => {
            if (e.key==='Enter'||e.key===' ') { e.preventDefault(); titleBtn.click(); }
        });
    }
    const pPrev = document.getElementById('pickerPrevYear');
    const pNext = document.getElementById('pickerNextYear');
    if (pPrev) pPrev.addEventListener('click', e => { e.stopPropagation(); pickerYear--; renderPickerMonths(); });
    if (pNext) pNext.addEventListener('click', e => { e.stopPropagation(); pickerYear++; renderPickerMonths(); });
    document.getElementById('pickerToday').addEventListener('click', e => {
        e.stopPropagation();
        currentYear = today.getFullYear(); currentMonth = today.getMonth()+1;
        renderAll(); closePicker();
    });

    // Close picker on outside click
    document.addEventListener('click', e => {
        const p = document.getElementById('pickerPanel');
        const tb = document.getElementById('headerTitleBlock');
        if (p && !p.contains(e.target) && !(tb && tb.contains(e.target))) closePicker();
    });

    // Escape
    document.addEventListener('keydown', e => {
        if (e.key==='Escape') { closeModal(); closePicker(); }
    });

    // Resize: close sheet when going to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth >= 768) closeModal();
    }, { passive: true });

    // ── Online / Offline ─────────────────────────────────────────────────────
    // Initialise banner to match current network state
    _setOfflineBanner(!navigator.onLine);

    window.addEventListener('online', async () => {
        _setOfflineBanner(false);
        // Back online — ask the SW to refresh holidays.json from the network.
        // reloadHolidays() fetches through the SW (network-first), so if the
        // server has new data the SW will update DATA_CACHE before returning.
        const changed = await reloadHolidays();
        if (changed) {
            renderAll();
            showToast(t('Holidays updated', 'ရုံးပိတ်ရက်ဒေတာ အပ်ဒိတ်ပြီး'), 'info');
        }
    });

    window.addEventListener('offline', () => {
        _setOfflineBanner(true);
    });

    // ── SW message: holidays.json was updated while the app was open ─────────
    // The SW's network-first handler sends this when a background fetch detects
    // changed server data (e.g. the page was loaded while online and the server
    // had newer holidays since the last visit).
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', async event => {
            if (event.data?.type === 'HOLIDAYS_UPDATED') {
                const changed = await reloadHolidays();
                if (changed) {
                    renderAll();
                    showToast(t('Holidays updated', 'ရုံးပိတ်ရက်ဒေတာ အပ်ဒိတ်ပြီး'), 'info');
                }
            }
        });
    }

    setupSwipeListeners();
}

// ══════════════════════════════════════════════════════
//  SWIPE NAVIGATION
// ═══════════════════════════════════════════════════════
function setupSwipeListeners() {
    const MIN_X = 42; // minimum horizontal distance (px) to register a swipe

    function attachSwipe(el, onSwipeLeft, onSwipeRight) {
        if (!el) return;
        let sx = null, sy = null;

        el.addEventListener('touchstart', e => {
            sx = e.touches[0].clientX;
            sy = e.touches[0].clientY;
        }, { passive: true });

        el.addEventListener('touchend', e => {
            if (sx === null) return;
            const dx = e.changedTouches[0].clientX - sx;
            const dy = e.changedTouches[0].clientY - sy;
            sx = sy = null;
            // Trigger only when horizontal movement dominates and clears threshold
            if (Math.abs(dx) >= MIN_X && Math.abs(dx) > Math.abs(dy)) {
                dx < 0 ? onSwipeLeft() : onSwipeRight();
            }
        }, { passive: true });

        el.addEventListener('touchcancel', () => { sx = sy = null; }, { passive: true });
    }

    // ── Month & List views: navigate by month ───────────
    function goNextMonth() {
        currentMonth++; if (currentMonth > 12) { currentMonth = 1; currentYear++; }
        renderAll();
    }
    function goPrevMonth() {
        currentMonth--; if (currentMonth < 1) { currentMonth = 12; currentYear--; }
        renderAll();
    }

    // ── Compact view: navigate by week (crosses months) ─
    function shiftWeek(delta) {
        const ref = selectedDay || { year: today.getFullYear(), month: today.getMonth() + 1, day: today.getDate() };
        const d = new Date(ref.year, ref.month - 1, ref.day);
        d.setDate(d.getDate() + delta * 7);
        selectedDay = { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
        // Sync nav header & month view if we crossed a month boundary
        if (selectedDay.year !== currentYear || selectedDay.month !== currentMonth) {
            currentYear  = selectedDay.year;
            currentMonth = selectedDay.month;
            updateNavHeader();
            renderDays(currentYear, currentMonth);
            renderHolidaysList(currentYear, currentMonth);
            renderList();
        }
        renderCompact();
    }

    // Month view: swipe calendar grid area
    attachSwipe(document.getElementById('viewMonth'), goNextMonth, goPrevMonth);

    // Compact view: swipe week strip + detail area
    attachSwipe(document.getElementById('viewCompact'), () => shiftWeek(1), () => shiftWeek(-1));

    // List view: swipe list body
    attachSwipe(document.getElementById('viewList'), goNextMonth, goPrevMonth);
}
