// ═══════════════════════════════════════════════════════
//  Myanmar Calendar — iOS-style App Logic
// ═══════════════════════════════════════════════════════

const APP_VERSION = '3.4.0';
const APP_CACHE_VERSION = 'v55'; // matches SHELL_CACHE in sw.js

// ── State ──────────────────────────────────────────────
let today          = new Date();   // refreshed at midnight
let currentYear    = today.getFullYear();
let currentMonth   = today.getMonth() + 1;
let currentLang    = localStorage.getItem('mm-lang')  || 'en';
let currentView    = localStorage.getItem('mm-view')  || 'month';
let notesEnabled   = localStorage.getItem('mm-notes-enabled')  !== 'false';
let alarmsEnabled  = localStorage.getItem('mm-alarms-enabled') === 'true'; // default OFF
let hideEmptyListDays = localStorage.getItem('mm-hide-empty-list') !== 'false';
let saturdayRed    = localStorage.getItem('mm-saturday-red') !== 'false'; // default ON — Saturday red like Sunday
let substituteWorkdays = localStorage.getItem('mm-substitute-workdays') !== 'false'; // default ON — follow the official ကြားရက် schedule
let funEmployee    = localStorage.getItem('mm-fun-employee') === 'true';  // default OFF — playful extra
let funDays        = Math.min(30, Math.max(1, parseInt(localStorage.getItem('mm-fun-days') || '', 10) || 4));
let funDisplay     = localStorage.getItem('mm-fun-display') || 'card';    // card | toast | popup
let funTitleEn     = localStorage.getItem('mm-fun-title-en') || '';      // '' = built-in default
let funTitleMm     = localStorage.getItem('mm-fun-title-mm') || '';
let selectedDay    = null;  // { year, month, day }
let pickerYear     = currentYear;
let notes          = loadNotes();
let alarms         = loadAlarms();
let customHolidays = loadCustomHolidays();
let noteCategories = null; // initialized after DEFAULT_NOTE_CATEGORIES below
let categoriesEnabled = localStorage.getItem('mm-note-categories-enabled') !== 'false';
const _firedAlarms = new Set(); // prevent double-firing within same minute

// ── Helpers ────────────────────────────────────────────
function t(en, mm) { return currentLang === 'mm' ? mm : en; }

function toMM(num) {
    return num.toString().split('').map(d => '၀၁၂၃၄၅၆၇၈၉'[+d]).join('');
}

function formatNum(num) {
    const n = Number(num);
    if (isNaN(n)) return String(num);
    return n.toLocaleString('en-US', { maximumFractionDigits: 2 });
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

// ── Note categories (Main + Sub) ────────────────────────
// noteCategories: [{ id, name, nameMM, subs: [{ id, name, nameMM, type, unit, agg, sign }] }]
// type: 'none' | 'amount' | 'time' | 'length' | 'weight'  (unit customizable)
// agg:  'sum' (total) | 'net' (signed total) | 'last' (latest value) | 'avg' (average)
// sign: 1 | -1  — used with agg 'net' (e.g. Income +1, Expense -1)
const SUB_TYPES = {
    none:   { type: 'none',   icon: '📝', label: 'None',   labelMM: 'မရှိ',     unit: '' },
    amount: { type: 'amount', icon: '💰', label: 'Amount', labelMM: 'ငွေပမာဏ', unit: 'MMK' },
    time:   { type: 'time',   icon: '⏱️', label: 'Time',   labelMM: 'အချိန်',   unit: 'hr' },
    length: { type: 'length', icon: '📏', label: 'Length', labelMM: 'အလျား',   unit: 'm' },
    weight: { type: 'weight', icon: '⚖️', label: 'Weight', labelMM: 'အလေးချိန်', unit: 'kg' },
};
const AGG_MODES = {
    sum:  { label: 'Sum',     labelMM: 'စုစုပေါင်း', icon: '∑' },
    net:  { label: 'Net',     labelMM: 'အသားတင်',   icon: '±' },
    last: { label: 'Last',    labelMM: 'နောက်ဆုံး', icon: '↗' },
    avg:  { label: 'Average', labelMM: 'ပျမ်းမျှ',   icon: '∅' },
};
const EYE_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>';
const EYE_OFF_SVG = '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>';
const DEFAULT_NOTE_CATEGORIES = [
    { id: 'cat-work', name: 'Work', nameMM: 'အလုပ်', subs: [
        { id: 'sub-meeting', name: 'Meeting', nameMM: 'အစည်းအဝေး', type: 'time',   unit: 'hr', agg: 'sum' },
        { id: 'sub-task',    name: 'Task',    nameMM: 'တာဝန်',       type: 'none',  unit: '',    agg: 'sum' },
    ]},
    { id: 'cat-personal', name: 'Personal', nameMM: 'ကိုယ်ရေး', subs: [
        { id: 'sub-family', name: 'Family', nameMM: 'မိသားစု',     type: 'none',  unit: '',    agg: 'sum' },
        { id: 'sub-health', name: 'Health', nameMM: 'ကျန်းမာရေး', type: 'weight', unit: 'kg', agg: 'last' },
    ]},
    { id: 'cat-finance', name: 'Finance', nameMM: 'ငွေရေး', subs: [
        { id: 'sub-income',  name: 'Income',  nameMM: 'ဝင်ငွေ', type: 'amount', unit: 'MMK', agg: 'net', sign: 1 },
        { id: 'sub-expense', name: 'Expense', nameMM: 'ထွက်ငွေ', type: 'amount', unit: 'MMK', agg: 'net', sign: -1 },
    ]},
];

function loadNoteCategories() {
    let cats;
    try {
        const raw = JSON.parse(localStorage.getItem('mm-note-categories') || 'null');
        cats = Array.isArray(raw) && raw.length ? raw : JSON.parse(JSON.stringify(DEFAULT_NOTE_CATEGORIES));
    } catch(e) { cats = JSON.parse(JSON.stringify(DEFAULT_NOTE_CATEGORIES)); }
    // Normalize: fill agg/sign defaults for older stored data
    for (const c of cats) {
        for (const s of c.subs) {
            if (!s.agg) {
                if (s.type === 'amount') { s.agg = 'net'; s.sign = (s.name === 'Expense' || s.nameMM === 'ထွက်ငွေ') ? -1 : 1; }
                else if (s.type === 'weight') { s.agg = 'last'; s.sign = 1; }
                else { s.agg = 'sum'; s.sign = 1; }
            }
            if (s.sign === undefined) s.sign = 1;
        }
    }
    return cats;
}
// Initialize after DEFAULT_NOTE_CATEGORIES is defined
noteCategories = loadNoteCategories();
function saveNoteCategories() {
    localStorage.setItem('mm-note-categories', JSON.stringify(noteCategories));
}
function addMainCategory(name, nameMM) {
    const id = 'cat-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    noteCategories.push({ id, name, nameMM: nameMM || '', subs: [] });
    saveNoteCategories();
}
function renameMainCategory(id, name, nameMM) {
    const cat = noteCategories.find(c => c.id === id);
    if (cat) { cat.name = name; if (nameMM) cat.nameMM = nameMM; saveNoteCategories(); }
}
function deleteMainCategory(id) {
    noteCategories = noteCategories.filter(c => c.id !== id);
    saveNoteCategories();
}
function addSubCategory(catId, name, nameMM, type, unit, agg, sign) {
    const cat = noteCategories.find(c => c.id === catId);
    if (!cat) return;
    const id = 'sub-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    cat.subs.push({ id, name, nameMM: nameMM || '', type: type || 'none', unit: unit || (SUB_TYPES[type]?.unit || ''), agg: agg || 'sum', sign: sign || 1 });
    saveNoteCategories();
}
function renameSubCategory(catId, subId, name, nameMM, type, unit, agg, sign) {
    const cat = noteCategories.find(c => c.id === catId);
    const sub = cat?.subs.find(s => s.id === subId);
    if (sub) {
        sub.name = name;
        if (nameMM) sub.nameMM = nameMM;
        if (type) { sub.type = type; sub.unit = unit || (SUB_TYPES[type]?.unit || ''); }
        if (agg) { sub.agg = agg; sub.sign = sign || 1; }
        saveNoteCategories();
    }
}
// Get aggregation config for a sub-category
function getSubAgg(subId) {
    for (const c of noteCategories) {
        const s = c.subs.find(x => x.id === subId);
        if (s) return { agg: s.agg || 'sum', sign: s.sign || 1 };
    }
    return { agg: 'sum', sign: 1 };
}
// Compute a sub-category's value from its notes (sorted newest first)
// items: [{ key, note }]  — returns { value, count }
function computeSubValue(items) {
    const { agg, sign } = getSubAgg(items[0]?.note?.subId);
    const vals = items.map(i => Number(i.note.value) || 0);
    if (!vals.length) return { value: 0, count: 0 };
    if (agg === 'last') return { value: vals[0], count: vals.length }; // items sorted newest first
    if (agg === 'avg') return { value: vals.reduce((a, b) => a + b, 0) / vals.length, count: vals.length };
    if (agg === 'net') return { value: vals.reduce((a, b) => a + b * sign, 0), count: vals.length };
    return { value: vals.reduce((a, b) => a + b, 0), count: vals.length }; // sum
}
function getSubType(subId) {
    for (const c of noteCategories) {
        const s = c.subs.find(x => x.id === subId);
        if (s) return SUB_TYPES[s.type] || SUB_TYPES.none;
    }
    return SUB_TYPES.none;
}
function getSubUnit(subId) {
    for (const c of noteCategories) {
        const s = c.subs.find(x => x.id === subId);
        if (s) return s.unit || (SUB_TYPES[s.type]?.unit || '');
    }
    return '';
}
function deleteSubCategory(catId, subId) {
    const cat = noteCategories.find(c => c.id === catId);
    if (!cat) return;
    cat.subs = cat.subs.filter(s => s.id !== subId);
    saveNoteCategories();
}
// ── Hide / show (without deleting) ─────────────────────
function toggleMainCategoryHidden(id) {
    const cat = noteCategories.find(c => c.id === id);
    if (cat) { cat.hidden = !cat.hidden; saveNoteCategories(); }
}
function toggleSubCategoryHidden(catId, subId) {
    const cat = noteCategories.find(c => c.id === catId);
    const sub = cat?.subs.find(s => s.id === subId);
    if (sub) { sub.hidden = !sub.hidden; saveNoteCategories(); }
}
function getVisibleCategories() {
    return noteCategories.filter(c => !c.hidden);
}
function getVisibleSubs(catId) {
    const cat = noteCategories.find(c => c.id === catId);
    return cat ? cat.subs.filter(s => !s.hidden) : [];
}
function getCategoryName(catId) {
    const cat = noteCategories.find(c => c.id === catId);
    return cat ? t(cat.name, cat.nameMM || cat.name) : '';
}
function getSubCategoryName(catId, subId) {
    const cat = noteCategories.find(c => c.id === catId);
    const sub = cat?.subs.find(s => s.id === subId);
    return sub ? t(sub.name, sub.nameMM || sub.name) : '';
}

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
function addNote(y, m, d, text, icon, color, catId, subId, value, attachments) {
    const key = noteDateKey(y, m, d);
    if (!notes[key]) notes[key] = [];
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    notes[key].push({ id, text, icon, color, catId: catId || '', subId: subId || '', value: (value !== undefined && value !== null && value !== '') ? Number(value) : null, attachments: attachments || [] });
    saveNotes();
}
function deleteNote(y, m, d, id) {
    const key = noteDateKey(y, m, d);
    if (!notes[key]) return;
    const note = notes[key].find(n => n.id === id);
    // Remove attachment blobs from IndexedDB
    if (note && note.attachments && note.attachments.length) {
        note.attachments.forEach(a => deleteAttachmentBlob(a.id));
    }
    notes[key] = notes[key].filter(n => n.id !== id);
    if (!notes[key].length) delete notes[key];
    saveNotes();
}

// ═══════════════════════════════════════════════════════
//  NOTE ATTACHMENTS — stored client-side in IndexedDB
//  Note stores metadata (id, name, type, size); the file
//  blob lives in IndexedDB so binary data never bloats
//  localStorage. All data stays on the client device.
// ═══════════════════════════════════════════════════════
const ATTACH_DB = 'mm-attachments';
let _attachDB = null;
function openAttachDB() {
    return new Promise((resolve, reject) => {
        if (_attachDB) return resolve(_attachDB);
        if (!('indexedDB' in window)) return reject(new Error('IndexedDB not supported'));
        const req = indexedDB.open(ATTACH_DB, 1);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains('files')) {
                db.createObjectStore('files', { keyPath: 'id' });
            }
        };
        req.onsuccess = () => { _attachDB = req.result; resolve(_attachDB); };
        req.onerror = () => reject(req.error);
    });
}
function saveAttachmentBlob(id, blob) {
    return openAttachDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').put({ id, blob });
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}
function getAttachmentBlob(id) {
    return openAttachDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readonly');
        const req = tx.objectStore('files').get(id);
        req.onsuccess = () => resolve(req.result ? req.result.blob : null);
        req.onerror = () => reject(req.error);
    }));
}
function deleteAttachmentBlob(id) {
    return openAttachDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
    }));
}
// Icon + label for a file type
function getFileMeta(type, name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (type.startsWith('image/')) return { icon: '🖼️', label: t('Image','ပုံ') };
    if (type.startsWith('video/')) return { icon: '🎬', label: t('Video','ဗီဒီယို') };
    if (type.startsWith('audio/')) return { icon: '🎵', label: t('Audio','အသံ') };
    if (type === 'application/pdf' || ext === 'pdf') return { icon: '📄', label: 'PDF' };
    if (['doc','docx'].includes(ext)) return { icon: '📝', label: 'DOC' };
    if (['xls','xlsx','csv'].includes(ext)) return { icon: '📊', label: 'XLS' };
    if (['zip','rar','7z'].includes(ext)) return { icon: '🗜️', label: 'ZIP' };
    if (['txt','md','json','js','css','html','xml','log','ini','yml','yaml','ts','py','c','cpp','java','sh','sql'].includes(ext)) return { icon: '📃', label: 'TXT' };
    return { icon: '📎', label: t('File','ဖိုင်') };
}
// Is this a text file we can preview inline?
function isTextFile(type, name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    return type.startsWith('text/') || ['txt','md','json','csv','js','css','html','xml','log','ini','yml','yaml','ts','py','c','cpp','java','sh','sql'].includes(ext);
}
// Format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Attachment limits (Settings → Storage) ─────────────
let attachMaxSize  = parseInt(localStorage.getItem('mm-attach-max-size')  || '', 10) || 10 * 1024 * 1024; // default 10 MB
let attachMaxCount = parseInt(localStorage.getItem('mm-attach-max-count') || '', 10) || 10;               // default 10 files
const ATTACH_SIZE_OPTIONS = [
    { label: '1 MB',  value: 1 * 1024 * 1024 },
    { label: '5 MB',  value: 5 * 1024 * 1024 },
    { label: '10 MB', value: 10 * 1024 * 1024 },
    { label: '25 MB', value: 25 * 1024 * 1024 },
    { label: '50 MB', value: 50 * 1024 * 1024 },
    { label: '∞',     value: Infinity },
];
const ATTACH_COUNT_OPTIONS = [
    { label: '3',  value: 3 },
    { label: '5',  value: 5 },
    { label: '10', value: 10 },
    { label: '20', value: 20 },
    { label: '∞',  value: Infinity },
];
// Total bytes used by all attachment blobs
function getStorageUsage() {
    return openAttachDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readonly');
        const store = tx.objectStore('files');
        const req = store.openCursor();
        let total = 0, count = 0;
        req.onsuccess = () => {
            const cur = req.result;
            if (cur) { total += cur.value.blob.size; count++; cur.continue(); }
            else resolve({ total, count });
        };
        req.onerror = () => reject(req.error);
    }));
}
// Remove every attachment blob + strip attachment metadata from all notes
function clearAllAttachments() {
    return openAttachDB().then(db => new Promise((resolve, reject) => {
        const tx = db.transaction('files', 'readwrite');
        tx.objectStore('files').clear();
        tx.oncomplete = () => {
            for (const key of Object.keys(notes)) {
                notes[key].forEach(n => { n.attachments = []; });
            }
            saveNotes();
            resolve();
        };
        tx.onerror = () => reject(tx.error);
    }));
}
// Render the Storage section in Settings
function renderStorageInfo() {
    const usedEl = document.getElementById('storageUsed');
    const countEl = document.getElementById('storageCount');
    const navSummary = document.getElementById('storageNavSummary');
    getStorageUsage().then(({ total, count }) => {
        if (usedEl) usedEl.textContent = formatFileSize(total);
        if (countEl) countEl.textContent = count;
        if (navSummary) navSummary.textContent = `${formatFileSize(total)} · ${count}`;
    }).catch(() => {
        if (usedEl) usedEl.textContent = '0 B';
        if (countEl) countEl.textContent = '0';
        if (navSummary) navSummary.textContent = '0 B · 0';
    });
    // Sync limit chips
    document.querySelectorAll('#maxSizeChips .storage-chip').forEach(c =>
        c.classList.toggle('active', Number(c.dataset.value) === attachMaxSize));
    document.querySelectorAll('#maxCountChips .storage-chip').forEach(c =>
        c.classList.toggle('active', Number(c.dataset.value) === attachMaxCount));
}

// ── Storage sheet — list all attachments across notes ──
function openStorageSheet() {
    renderStorageInfo();
    renderStorageFiles();
    document.getElementById('storageSheet').classList.add('active');
}
function closeStorageSheet() {
    document.getElementById('storageSheet').classList.remove('active');
}

// ── About sheet — app info + README features ───────────
function openAboutSheet() {
    document.getElementById('aboutSheet').classList.add('active');
}
function closeAboutSheet() {
    document.getElementById('aboutSheet').classList.remove('active');
}

// Collect every attachment: [{ attachId, noteId, key, y, m, d, name, type, size, noteText }]
function getAllAttachments() {
    const out = [];
    for (const [key, dayNotes] of Object.entries(notes)) {
        const [yy, mm, dd] = key.split('-').map(Number);
        for (const n of dayNotes) {
            if (n.attachments && n.attachments.length) {
                for (const a of n.attachments) {
                    out.push({ attachId: a.id, noteId: n.id, key, y: yy, m: mm, d: dd, name: a.name, type: a.type, size: a.size, noteText: n.text });
                }
            }
        }
    }
    out.sort((a, b) => (a.key < b.key ? 1 : -1));
    return out;
}

// Delete a single attachment (blob + metadata)
function deleteOneAttachment(attachId, noteId, key) {
    deleteAttachmentBlob(attachId);
    const dayNotes = notes[key] || [];
    const note = dayNotes.find(n => n.id === noteId);
    if (note && note.attachments) {
        note.attachments = note.attachments.filter(a => a.id !== attachId);
        saveNotes();
    }
}

function renderStorageFiles() {
    const listEl = document.getElementById('storageFilesList');
    if (!listEl) return;
    const all = getAllAttachments();
    if (!all.length) {
        listEl.innerHTML = `<div class="custom-holiday-empty">${t('No attachments yet','ဖိုင်မရှိသေးပါ')}</div>`;
        return;
    }
    listEl.innerHTML = all.map(a => {
        const fm = getFileMeta(a.type, a.name);
        const dateStr = `${MONTH_SHORT_EN[a.m-1]} ${a.d}, ${a.y}`;
        const isImage = a.type.startsWith('image/');
        return `<div class="storage-file-item" data-attach-id="${a.attachId}" data-note-id="${a.noteId}" data-key="${a.key}">
            <span class="storage-file-thumb${isImage ? ' is-image' : ''}" data-thumb-for="${a.attachId}">${fm.icon}</span>
            <div class="storage-file-info">
                <div class="storage-file-name">${escHtml(a.name)}</div>
                <div class="storage-file-meta">${escHtml(dateStr)} · ${escHtml(a.noteText)} · ${formatFileSize(a.size)}</div>
            </div>
            <button class="storage-file-view" type="button" aria-label="${t('View','ကြည့်ရန်')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            </button>
            <button class="storage-file-del" type="button" aria-label="${t('Delete','ဖျက်ရန်')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
        </div>`;
    }).join('');

    // Load image thumbnails from IndexedDB (async)
    all.forEach(a => {
        if (!a.type.startsWith('image/')) return;
        getAttachmentBlob(a.attachId).then(blob => {
            if (!blob) return;
            const thumb = listEl.querySelector(`.storage-file-thumb[data-thumb-for="${a.attachId}"]`);
            if (!thumb) return;
            const url = URL.createObjectURL(blob);
            const img = document.createElement('img');
            img.className = 'storage-file-thumb-img';
            img.src = url;
            img.alt = a.name;
            img.onload = () => URL.revokeObjectURL(url);
            thumb.textContent = '';
            thumb.appendChild(img);
        }).catch(() => { /* keep icon fallback */ });
    });

    // View
    listEl.querySelectorAll('.storage-file-view').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.storage-file-item');
            const attachId = item.dataset.attachId;
            const noteId = item.dataset.noteId;
            const key = item.dataset.key;
            getAttachmentBlob(attachId).then(blob => {
                if (!blob) { showToast(t('Attachment not found','ဖိုင် မတွေ့ပါ'), 'error'); return; }
                const note = (notes[key] || []).find(n => n.id === noteId);
                const meta = note?.attachments?.find(a => a.id === attachId) || { name: 'file', type: blob.type, size: blob.size };
                showAttachmentViewer(blob, meta);
            });
        });
    });
    // Delete
    listEl.querySelectorAll('.storage-file-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const item = btn.closest('.storage-file-item');
            deleteOneAttachment(item.dataset.attachId, item.dataset.noteId, item.dataset.key);
            renderStorageFiles();
            renderStorageInfo();
            if (selectedDay) showDayInfo(selectedDay.year, selectedDay.month, selectedDay.day, null);
            showToast(t('Attachment deleted','ဖိုင် ဖျက်ပြီး'), 'info');
        });
    });
}

// ═══════════════════════════════════════════════════════
//  CUSTOM DAYS — client-side localStorage
//  Each entry: { id, name, nameMM, month, day, year, type }  — year 0 = every year
//  type: 'holiday' | 'birthday' | 'anniversary' | 'event' | 'reminder' | 'other'
// ═══════════════════════════════════════════════════════
const CUSTOM_DAY_TYPES = {
    holiday:    { icon: '🎌', label: 'Holiday',    labelMM: 'ရုံးပိတ်' },
    birthday:   { icon: '🎂', label: 'Birthday',   labelMM: 'မွေးနေ့' },
    anniversary:{ icon: '💍', label: 'Anniversary', labelMM: 'နှစ်ပတ်လည်' },
    event:      { icon: '🎉', label: 'Event',      labelMM: 'ပွဲ' },
    reminder:   { icon: '⏰', label: 'Reminder',   labelMM: 'သတိပေးချက်' },
    other:      { icon: '📌', label: 'Other',      labelMM: 'အခြား' },
};
function loadCustomHolidays() {
    try { return JSON.parse(localStorage.getItem('mm-custom-holidays') || '[]'); }
    catch(e) { return []; }
}
function saveCustomHolidays() {
    localStorage.setItem('mm-custom-holidays', JSON.stringify(customHolidays));
}
function addCustomHoliday(name, nameMM, month, day, recurring, type) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
    customHolidays.push({ id, name, nameMM: nameMM || '', month, day, year: recurring ? 0 : new Date().getFullYear(), type: type || 'holiday' });
    saveCustomHolidays();
}
function deleteCustomHoliday(id) {
    customHolidays = customHolidays.filter(h => h.id !== id);
    saveCustomHolidays();
}
function getCustomDayType(type) {
    return CUSTOM_DAY_TYPES[type] || CUSTOM_DAY_TYPES.other;
}
function renderCustomHolidays() {
    const listEl = document.getElementById('customHolidaysList');
    if (!listEl) return;
    if (!customHolidays.length) {
        listEl.innerHTML = `<div class="custom-holiday-empty">${t('No custom days yet','ကိုယ်ပိုင် နေ့များ မရှိသေးပါ')}</div>`;
        syncCustomLegend();
        return;
    }
    syncCustomLegend();
    listEl.innerHTML = customHolidays.map(h => {
        const dateStr = t(
            `${MONTH_SHORT_EN[h.month-1]} ${h.day}${h.year ? ', ' + h.year : ' · every year'}`,
            `${MONTH_SHORT_MM[h.month-1]} ${toMM(h.day)}${h.year ? '၊ ' + toMM(h.year) : ' · နှစ်စဉ်'}`
        );
        const dt = getCustomDayType(h.type);
        return `<div class="custom-holiday-item" data-id="${h.id}">
            <span class="custom-holiday-item-icon">${dt.icon}</span>
            <div class="custom-holiday-item-info">
                <div class="custom-holiday-item-name">${escHtml(t(h.name, h.nameMM || h.name))}</div>
                <div class="custom-holiday-item-date">${dt.icon} ${escHtml(t(dt.label, dt.labelMM))} · ${escHtml(dateStr)}</div>
            </div>
            <button class="custom-holiday-delete" type="button" aria-label="${t('Delete','ဖျက်ရန်')}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
            </button>
        </div>`;
    }).join('');
    // Wire delete buttons
    listEl.querySelectorAll('.custom-holiday-delete').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.closest('.custom-holiday-item')?.dataset?.id;
            if (!id) return;
            deleteCustomHoliday(id);
            renderCustomHolidays();
            renderAll();
            showToast(t('Day deleted','နေ့ ဖျက်ပြီး'), 'info');
        });
    });
}

// Show the "Custom" legend item only when custom holidays exist
function syncCustomLegend() {
    const item = document.getElementById('legendCustom');
    if (item) item.style.display = customHolidays.length ? '' : 'none';
}

// ── Note categories — settings management UI ────────────
function renderNoteCategories() {
    const listEl = document.getElementById('noteCatsList');
    if (!listEl) return;
    if (!noteCategories.length) {
        listEl.innerHTML = `<div class="custom-holiday-empty">${t('No categories yet','အမျိုးအစား မရှိသေးပါ')}</div>`;
        return;
    }
    listEl.innerHTML = noteCategories.map(cat => {
        const catHidden = !!cat.hidden;
        const subs = cat.subs.map(s => {
            const st = SUB_TYPES[s.type] || SUB_TYPES.none;
            const typeTag = st.type !== 'none'
                ? `<span class="note-sub-type">${st.icon} ${escHtml(s.unit || st.unit)}</span>`
                : '';
            const subHidden = !!s.hidden;
            return `
            <div class="note-sub-item${subHidden ? ' is-hidden' : ''}" data-cat-id="${cat.id}" data-sub-id="${s.id}">
                <span class="note-sub-dot"></span>
                <span class="note-sub-name">${escHtml(t(s.name, s.nameMM || s.name))}</span>
                ${subHidden ? `<span class="hidden-badge">${t('Hidden','ဝှက်')}</span>` : ''}
                ${typeTag}
                <button class="note-sub-hide" type="button" aria-label="${subHidden ? t('Show','ပြရန်') : t('Hide','ဝှက်ရန်')}">
                    ${subHidden ? EYE_OFF_SVG : EYE_SVG}
                </button>
                <button class="note-sub-edit" type="button" aria-label="${t('Edit','ပြင်ရန်')}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="note-sub-del" type="button" aria-label="${t('Delete','ဖျက်ရန်')}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            </div>`;
        }).join('');
        return `
        <div class="note-cat-item${catHidden ? ' is-hidden' : ''}" data-cat-id="${cat.id}">
            <div class="note-cat-item-hdr">
                <span class="note-cat-item-icon">🗂️</span>
                <span class="note-cat-item-name">${escHtml(t(cat.name, cat.nameMM || cat.name))}</span>
                ${catHidden ? `<span class="hidden-badge">${t('Hidden','ဝှက်')}</span>` : ''}
                <button class="note-cat-add-sub" type="button" aria-label="${t('Add sub category','အမျိုးအစားခွဲ ထည့်ရန်')}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                </button>
                <button class="note-cat-hide" type="button" aria-label="${catHidden ? t('Show','ပြရန်') : t('Hide','ဝှက်ရန်')}">
                    ${catHidden ? EYE_OFF_SVG : EYE_SVG}
                </button>
                <button class="note-cat-edit" type="button" aria-label="${t('Edit','ပြင်ရန်')}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
                </button>
                <button class="note-cat-del" type="button" aria-label="${t('Delete','ဖျက်ရန်')}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>
                </button>
            </div>
            ${subs ? `<div class="note-sub-list">${subs}</div>` : ''}
        </div>`;
    }).join('');

    // ── Wire up management buttons ──
    listEl.querySelectorAll('.note-cat-hide').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.closest('.note-cat-item')?.dataset?.catId;
            if (!id) return;
            toggleMainCategoryHidden(id);
            renderNoteCategories();
            showToast(t('Category updated','အမျိုးအစား ပြောင်းပြီး'), 'info');
        });
    });
    listEl.querySelectorAll('.note-sub-hide').forEach(btn => {
        btn.addEventListener('click', () => {
            const catId = btn.closest('.note-sub-item')?.dataset?.catId;
            const subId = btn.closest('.note-sub-item')?.dataset?.subId;
            if (!catId || !subId) return;
            toggleSubCategoryHidden(catId, subId);
            renderNoteCategories();
            showToast(t('Sub category updated','အမျိုးအစားခွဲ ပြောင်းပြီး'), 'info');
        });
    });
    listEl.querySelectorAll('.note-cat-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.closest('.note-cat-item')?.dataset?.catId;
            if (!id) return;
            deleteMainCategory(id);
            renderNoteCategories();
            showToast(t('Category deleted','အမျိုးအစား ဖျက်ပြီး'), 'info');
        });
    });
    listEl.querySelectorAll('.note-cat-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.closest('.note-cat-item')?.dataset?.catId;
            const cat = noteCategories.find(c => c.id === id);
            if (!cat) return;
            openNoteCatEdit(id, cat.name, cat.nameMM, null);
        });
    });
    listEl.querySelectorAll('.note-cat-add-sub').forEach(btn => {
        btn.addEventListener('click', () => {
            const id = btn.closest('.note-cat-item')?.dataset?.catId;
            openNoteCatEdit(id, '', '', 'sub');
        });
    });
    listEl.querySelectorAll('.note-sub-del').forEach(btn => {
        btn.addEventListener('click', () => {
            const catId = btn.closest('.note-sub-item')?.dataset?.catId;
            const subId = btn.closest('.note-sub-item')?.dataset?.subId;
            if (!catId || !subId) return;
            deleteSubCategory(catId, subId);
            renderNoteCategories();
            showToast(t('Sub category deleted','အမျိုးအစားခွဲ ဖျက်ပြီး'), 'info');
        });
    });
    listEl.querySelectorAll('.note-sub-edit').forEach(btn => {
        btn.addEventListener('click', () => {
            const catId = btn.closest('.note-sub-item')?.dataset?.catId;
            const subId = btn.closest('.note-sub-item')?.dataset?.subId;
            const cat = noteCategories.find(c => c.id === catId);
            const sub = cat?.subs.find(s => s.id === subId);
            if (!cat || !sub) return;
            openNoteCatEdit(catId, sub.name, sub.nameMM, subId);
        });
    });
}

// Open the add/edit category form (mode: 'main' | 'sub' | subId for edit)
function openNoteCatEdit(catId, name, nameMM, subId) {
    const form = document.getElementById('noteCatForm');
    const addBtn = document.getElementById('noteCatAdd');
    if (!form) return;
    form.hidden = false;
    if (addBtn) addBtn.hidden = true;
    document.getElementById('ncNameEn').value = name || '';
    document.getElementById('ncNameMm').value = nameMM || '';
    form.dataset.catId = catId || '';
    form.dataset.subId = subId || '';
    form.dataset.mode = subId === 'sub' ? 'sub' : (subId ? 'sub-edit' : 'main');
    document.getElementById('ncSave').textContent = t('Add','ထည့်မည်');
    // Type/unit/agg state
    const isSub = !!subId;
    document.getElementById('ncTypeField').style.display = isSub ? '' : 'none';
    document.getElementById('ncAggField').style.display = isSub ? '' : 'none';
    let curType = 'none', curUnit = '', curAgg = 'sum', curSign = 1;
    if (isSub) {
        const cat = noteCategories.find(c => c.id === catId);
        const sub = cat?.subs.find(s => s.id === subId);
        if (sub) { curType = sub.type || 'none'; curUnit = sub.unit || ''; curAgg = sub.agg || 'sum'; curSign = sub.sign || 1; }
    }
    setNcType(curType);
    setNcAgg(curAgg, curSign);
    document.getElementById('ncUnit').value = curUnit;
    document.getElementById('ncUnitField').hidden = curType === 'none';
    document.getElementById('ncNameEn').focus();
}

// Set the selected data-type chip in the category form
function setNcType(type) {
    const chips = document.querySelectorAll('#ncTypeChips .nc-type-chip');
    chips.forEach(c => c.classList.toggle('active', c.dataset.type === type));
    document.getElementById('ncUnitField').hidden = type === 'none';
    const unitInput = document.getElementById('ncUnit');
    if (type !== 'none' && !unitInput.value) unitInput.value = SUB_TYPES[type]?.unit || '';
}

// Set the selected aggregation chip + sign
function setNcAgg(agg, sign) {
    const chips = document.querySelectorAll('#ncAggChips .nc-agg-chip');
    chips.forEach(c => c.classList.toggle('active', c.dataset.agg === agg));
    document.getElementById('ncSignRow').hidden = agg !== 'net';
    document.querySelectorAll('#ncSignRow .nc-sign-btn').forEach(b =>
        b.classList.toggle('active', String(b.dataset.sign) === String(sign)));
}

function syncCategoriesSwitch() {
    const sw = document.getElementById('categoriesSwitch');
    if (!sw) return;
    sw.classList.toggle('on', categoriesEnabled);
    sw.setAttribute('aria-checked', String(categoriesEnabled));
}

// ── Analytics — totals per typed sub-category ───────────
function renderAnalytics() {
    const body = document.getElementById('analyticsBody');
    const period = document.getElementById('analyticsPeriod');
    if (!body) return;
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    if (period) period.textContent = t(
        `${MONTH_EN[now.getMonth()]} ${now.getFullYear()} · This month`,
        `${MONTH_SHORT_MM[now.getMonth()]} ${toMM(now.getFullYear())} · ဤလ`
    );

    // Collect all notes with typed sub-categories
    const rows = []; // { subId, catId, name, icon, unit, agg, monthVal, allVal, count }
    const subMap = new Map();
    for (const c of noteCategories) {
        for (const s of c.subs) {
            if (s.hidden) continue;
            if ((SUB_TYPES[s.type] || SUB_TYPES.none).type !== 'none') {
                subMap.set(s.id, { subId: s.id, catId: c.id, name: t(s.name, s.nameMM || s.name), icon: SUB_TYPES[s.type].icon, unit: s.unit || SUB_TYPES[s.type].unit, agg: s.agg || 'sum', allItems: [], monthItems: [] });
            }
        }
    }
    for (const [key, dayNotes] of Object.entries(notes)) {
        const isThisMonth = key.startsWith(monthKey);
        for (const n of dayNotes) {
            if (!n.subId || n.value === null || n.value === undefined) continue;
            const row = subMap.get(n.subId);
            if (!row) continue;
            row.allItems.push({ key, note: n });
            if (isThisMonth) row.monthItems.push({ key, note: n });
        }
    }
    // Sort newest first (for 'last' mode)
    for (const r of subMap.values()) {
        r.allItems.sort((a, b) => (a.key < b.key ? 1 : -1));
        r.monthItems.sort((a, b) => (a.key < b.key ? 1 : -1));
        const all = computeSubValue(r.allItems);
        const mon = computeSubValue(r.monthItems);
        r.allVal = all.value; r.monthVal = mon.value; r.count = all.count;
    }
    rows.push(...subMap.values());

    if (!rows.length) {
        body.innerHTML = `<div class="custom-holiday-empty">${t('No data yet — add notes with a typed sub-category','ဒေတာမရှိသေးပါ — အမျိုးအစားခွဲပါသော မှတ်စုထည့်ပါ')}</div>`;
        return;
    }

    const max = Math.max(...rows.map(r => Math.abs(r.allVal)), 1);
    body.innerHTML = rows.map(r => {
        const pct = Math.max(4, Math.round((Math.abs(r.allVal) / max) * 100));
        const aggTag = AGG_MODES[r.agg] ? `<span class="analytics-agg-tag">${AGG_MODES[r.agg].icon} ${t(AGG_MODES[r.agg].label, AGG_MODES[r.agg].labelMM)}</span>` : '';
        return `<div class="analytics-row">
            <div class="analytics-row-top">
                <span class="analytics-row-name">${r.icon} ${escHtml(r.name)} ${aggTag}</span>
                <span class="analytics-row-total">${formatNum(r.allVal)} ${escHtml(r.unit)}</span>
            </div>
            <div class="analytics-bar"><div class="analytics-bar-fill" style="width:${pct}%"></div></div>
            <div class="analytics-row-sub">
                <span class="t-en">This month: ${formatNum(r.monthVal)} ${escHtml(r.unit)}</span>
                <span class="t-mm">ဤလ: ${formatNum(r.monthVal)} ${escHtml(r.unit)}</span>
                <span class="analytics-row-count">${r.count} ${t('entries','ခု')}</span>
            </div>
        </div>`;
    }).join('');
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
    if (!alarmsEnabled) return; // feature disabled in Settings
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
            const catBadge = categoriesEnabled && n.catId
                ? `<span class="note-card-cat">${escHtml(getCategoryName(n.catId))}${n.subId ? ' · ' + escHtml(getSubCategoryName(n.catId, n.subId)) : ''}</span>`
                : '';
            let valueBadge = '';
            if (n.value !== null && n.value !== undefined && n.subId) {
                const st = getSubType(n.subId);
                if (st && st.type !== 'none') {
                    const unit = getSubUnit(n.subId);
                    valueBadge = `<span class="note-card-value">${st.icon} ${formatNum(n.value)}${unit ? ' ' + escHtml(unit) : ''}</span>`;
                }
            }
            html += `<div class="note-card" data-note-id="${n.id}">
                <span class="note-card-icon" style="background:${n.color}">${n.icon}</span>
                <div class="note-card-main">
                    ${catBadge}
                    <span class="note-card-text">${escHtml(n.text)}</span>
                    ${valueBadge}
                    ${(n.attachments && n.attachments.length) ? `<div class="note-attach-list">` + n.attachments.map(a => {
                        const fm = getFileMeta(a.type, a.name);
                        return `<button class="note-attach-chip" type="button" data-attach-id="${a.id}" data-note-id="${n.id}" title="${escHtml(a.name)}">
                            <span class="note-attach-chip-icon">${fm.icon}</span>
                            <span class="note-attach-chip-name">${escHtml(a.name)}</span>
                            <span class="note-attach-chip-size">${formatFileSize(a.size)}</span>
                        </button>`;
                    }).join('') + `</div>` : ''}
                </div>
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
    <div class="note-form" hidden>`;

    // Category picker (only when categories feature is enabled)
    if (categoriesEnabled && noteCategories.length) {
        html += `<div class="note-cat-picker">
            <div class="note-cat-label">${t('Category','အမျိုးအစား')}</div>
            <div class="note-cat-chips" data-level="main">`;
        getVisibleCategories().forEach(c => {
            html += `<button type="button" class="note-cat-chip" data-cat-id="${c.id}">${escHtml(t(c.name, c.nameMM || c.name))}</button>`;
        });
        html += `</div>
            <div class="note-cat-chips note-sub-chips" data-level="sub" hidden></div>
            <div class="note-value-row" hidden>
                <span class="note-value-icon" id="noteValueIcon">💰</span>
                <input type="number" step="any" min="0" class="note-value-input" id="noteValueInput" placeholder="0">
                <span class="note-value-unit" id="noteValueUnit">MMK</span>
            </div>
        </div>`;
    }

    html += `<textarea class="note-textarea" placeholder="${t('Write a note…','မှတ်စုရေးပါ…')}" rows="3"></textarea>
        <div class="note-attach-row">
            <button class="note-attach-add" type="button">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>
                ${t('Add Attachment','ဖိုင် ထည့်ရန်')}
            </button>
            <input type="file" class="note-attach-input" multiple hidden>
            <div class="note-attach-pending"></div>
        </div>
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

    // ── View attachment (click on a saved attachment chip) ──
    container.querySelectorAll('.note-attach-chip').forEach(chip => {
        chip.addEventListener('click', e => {
            e.stopPropagation();
            const attachId = chip.dataset.attachId;
            const noteId   = chip.dataset.noteId;
            if (!attachId) return;
            getAttachmentBlob(attachId).then(blob => {
                if (!blob) { showToast(t('Attachment not found','ဖိုင် မတွေ့ပါ'), 'error'); return; }
                const note = getNotesForDate(y, m, d).find(n => n.id === noteId);
                const meta = note?.attachments?.find(a => a.id === attachId);
                showAttachmentViewer(blob, meta || { name: 'file', type: blob.type, size: blob.size });
            });
        });
    });

    const addBtn = container.querySelector('.note-add-btn');
    const form   = container.querySelector('.note-form');
    if (!addBtn || !form) return;

    // ── Attachment picker state ──
    const attachAddBtn = form.querySelector('.note-attach-add');
    const attachInput  = form.querySelector('.note-attach-input');
    const attachPending = form.querySelector('.note-attach-pending');
    let pendingAttachments = []; // [{ id, name, type, size }] — blobs already saved to IndexedDB

    function renderPendingAttachments() {
        if (!attachPending) return;
        if (!pendingAttachments.length) { attachPending.innerHTML = ''; return; }
        attachPending.innerHTML = pendingAttachments.map(a => {
            const fm = getFileMeta(a.type, a.name);
            return `<span class="note-attach-pending-chip" data-attach-id="${a.id}">
                <span class="note-attach-chip-icon">${fm.icon}</span>
                <span class="note-attach-chip-name">${escHtml(a.name)}</span>
                <button class="note-attach-pending-remove" type="button" aria-label="${t('Remove','ဖယ်ရန်')}">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </span>`;
        }).join('');
        attachPending.querySelectorAll('.note-attach-pending-remove').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.closest('.note-attach-pending-chip')?.dataset?.attachId;
                if (!id) return;
                pendingAttachments = pendingAttachments.filter(a => a.id !== id);
                deleteAttachmentBlob(id); // clean up the blob
                renderPendingAttachments();
            });
        });
    }

    if (attachAddBtn && attachInput) {
        attachAddBtn.addEventListener('click', () => attachInput.click());
        attachInput.addEventListener('change', () => {
            const files = Array.from(attachInput.files || []);
            attachInput.value = '';
            if (!files.length) return;
            // Enforce per-file size limit
            const maxSize = attachMaxSize; // bytes, Infinity = unlimited
            const overSize = files.filter(f => f.size > maxSize);
            if (overSize.length) {
                showToast(t(
                    `File too large (max ${formatFileSize(maxSize)})`,
                    `ဖိုင်ကြီးလွန်းသည် (အများဆုံး ${formatFileSize(maxSize)})`
                ), 'error');
            }
            // Enforce per-note attachment count limit
            const maxCount = attachMaxCount; // Infinity = unlimited
            const room = maxCount - pendingAttachments.length;
            const allowed = files.filter(f => f.size <= maxSize).slice(0, Math.max(0, room));
            if (allowed.length < files.filter(f => f.size <= maxSize).length) {
                showToast(t(
                    `Max ${maxCount} attachments per note`,
                    `မှတ်စုတစ်ခုလျှင် ဖိုင် ${maxCount} ခုသာ`
                ), 'error');
            }
            allowed.forEach(file => {
                const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
                saveAttachmentBlob(id, file).then(() => {
                    pendingAttachments.push({ id, name: file.name, type: file.type || 'application/octet-stream', size: file.size });
                    renderPendingAttachments();
                }).catch(() => showToast(t('Could not save attachment','ဖိုင် သိမ်း၍မရပါ'), 'error'));
            });
        });
    }

    // ── Category picker state ──
    let selCatId = '', selSubId = '';
    const mainChips = form.querySelector('.note-cat-chips[data-level="main"]');
    const subChips  = form.querySelector('.note-cat-chips[data-level="sub"]');
    const valueRow  = form.querySelector('.note-value-row');
    const valueInput = form.querySelector('.note-value-input');
    const valueIcon  = form.querySelector('.note-value-icon');
    const valueUnit  = form.querySelector('.note-value-unit');
    function updateValueRow() {
        if (!valueRow) return;
        const st = selSubId ? getSubType(selSubId) : SUB_TYPES.none;
        if (st.type === 'none') { valueRow.hidden = true; return; }
        valueRow.hidden = false;
        if (valueIcon) valueIcon.textContent = st.icon;
        if (valueUnit) valueUnit.textContent = getSubUnit(selSubId) || st.unit;
    }
    function renderSubChips() {
        if (!subChips) return;
        const cat = noteCategories.find(c => c.id === selCatId);
        const visibleSubs = cat ? getVisibleSubs(cat.id) : [];
        if (!visibleSubs.length) { subChips.hidden = true; subChips.innerHTML = ''; updateValueRow(); return; }
        subChips.hidden = false;
        subChips.innerHTML = visibleSubs.map(s => {
            const st = SUB_TYPES[s.type] || SUB_TYPES.none;
            const typeTag = st.type !== 'none' ? ` <span class="note-sub-type-tag">${st.icon}</span>` : '';
            return `<button type="button" class="note-cat-chip note-sub-chip${s.id === selSubId ? ' active' : ''}" data-sub-id="${s.id}">${escHtml(t(s.name, s.nameMM || s.name))}${typeTag}</button>`;
        }).join('');
        subChips.querySelectorAll('.note-sub-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                subChips.querySelectorAll('.note-sub-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selSubId = chip.dataset.subId;
                updateValueRow();
            });
        });
    }
    if (mainChips) {
        mainChips.querySelectorAll('.note-cat-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                mainChips.querySelectorAll('.note-cat-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                selCatId = chip.dataset.catId;
                selSubId = '';
                renderSubChips();
                updateValueRow();
            });
        });
    }

    addBtn.addEventListener('click', () => {
        form.hidden = false;
        addBtn.hidden = true;
        // Reset category selection
        selCatId = ''; selSubId = '';
        if (mainChips) mainChips.querySelectorAll('.note-cat-chip').forEach(c => c.classList.remove('active'));
        if (subChips) { subChips.hidden = true; subChips.innerHTML = ''; }
        if (valueRow) valueRow.hidden = true;
        if (valueInput) valueInput.value = '';
        // Reset pending attachments
        pendingAttachments = [];
        if (attachPending) attachPending.innerHTML = '';
        form.querySelector('.note-textarea')?.focus();
    });
    form.querySelector('.note-cancel-btn')?.addEventListener('click', () => {
        form.hidden = true;
        addBtn.hidden = false;
        form.querySelector('.note-textarea').value = '';
        form.querySelectorAll('.note-icon-btn, .note-color-btn').forEach(b => b.classList.remove('active'));
        // Clean up any pending attachment blobs
        pendingAttachments.forEach(a => deleteAttachmentBlob(a.id));
        pendingAttachments = [];
        if (attachPending) attachPending.innerHTML = '';
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
        const value = valueInput && !valueRow.hidden ? valueInput.value : null;
        addNote(y, m, d, text, icon, color, selCatId, selSubId, value, pendingAttachments);
        pendingAttachments = [];
        if (attachPending) attachPending.innerHTML = '';
        refreshNoteSection(container, y, m, d);
        refreshCalendarCells(y, m, d);
        showToast(t('Note saved', 'မှတ်စုသိမ်းပြီး'), 'success');
    });
}

// ── Attachment viewer (lightbox / download) ─────────────
function showAttachmentViewer(blob, meta) {
    const url = URL.createObjectURL(blob);
    const overlay = document.createElement('div');
    overlay.className = 'attach-viewer-overlay';
    const fm = getFileMeta(meta.type, meta.name);
    const isImage = meta.type.startsWith('image/');
    const isPdf   = meta.type === 'application/pdf' || (meta.name.split('.').pop() || '').toLowerCase() === 'pdf';
    const isText  = isTextFile(meta.type, meta.name);
    overlay.innerHTML = `
        <div class="attach-viewer">
            <div class="attach-viewer-hdr">
                <span class="attach-viewer-name">${fm.icon} ${escHtml(meta.name)}</span>
                <button class="attach-viewer-close" type="button" aria-label="${t('Close','ပိတ်မည်')}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
            </div>
            <div class="attach-viewer-body">
                ${isImage
                    ? `<img class="attach-viewer-img" src="${url}" alt="${escHtml(meta.name)}">`
                    : isPdf
                        ? `<iframe class="attach-viewer-pdf" src="${url}" title="${escHtml(meta.name)}"></iframe>`
                        : isText
                            ? `<div class="attach-viewer-text-wrap"><pre class="attach-viewer-text">${t('Loading…','ဖတ်နေသည်…')}</pre></div>`
                            : `<div class="attach-viewer-file">
                                <div class="attach-viewer-file-icon">${fm.icon}</div>
                                <div class="attach-viewer-file-name">${escHtml(meta.name)}</div>
                                <div class="attach-viewer-file-size">${formatFileSize(meta.size)} · ${fm.label}</div>
                            </div>`}
            </div>
            <div class="attach-viewer-actions">
                <a class="attach-viewer-download" href="${url}" download="${escHtml(meta.name)}">
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    ${t('Download','ဒေါင်းလုဒ်')}
                </a>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));

    // Load text content into the preview
    if (isText) {
        const pre = overlay.querySelector('.attach-viewer-text');
        blob.text().then(text => {
            pre.textContent = text;
        }).catch(() => {
            pre.textContent = t('Could not read file','ဖိုင် ဖတ်၍မရပါ');
        });
    }

    const close = () => {
        overlay.classList.remove('show');
        setTimeout(() => { overlay.remove(); URL.revokeObjectURL(url); }, 250);
    };
    overlay.querySelector('.attach-viewer-close').addEventListener('click', close);
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
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
    await workdaysReady;

    // Restore lang / theme
    document.documentElement.setAttribute('data-lang', currentLang);
    document.querySelectorAll('.lang-seg-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.lang === currentLang);
        btn.setAttribute('aria-pressed', String(btn.dataset.lang === currentLang));
    });
    syncThemeSeg();
    syncFeatureSwitches();
    syncFunSettings();
    applySaturdayRed();
    syncCustomLegend();
    syncCategoriesSwitch();
    // About section
    const vEl = document.getElementById('aboutVersion');
    if (vEl) vEl.textContent = 'v' + APP_VERSION;
    const vRow = document.getElementById('aboutVersionRow');
    if (vRow) vRow.textContent = APP_VERSION;
    const cRow = document.getElementById('aboutCacheRow');
    if (cRow) cRow.textContent = APP_CACHE_VERSION;

    // Restore view
    applyView(currentView, false);

    // Default selected day = today
    selectedDay = { year: today.getFullYear(), month: today.getMonth()+1, day: today.getDate() };

    renderAll();
    setupListeners();
    generateDateFavicon();
    startAlarmChecker();
    showFunFeature();   // Fun for Employee — card / toast / popup on open
});

// ── Settings page ───────────────────────────────────────
const MOBILE_HOLIDAYS_MAX = 3; // items shown before "Show all" on mobile

function openSettings() {
    syncThemeSeg();
    syncFeatureSwitches();
    syncFunSettings();
    syncCategoriesSwitch();
    renderStorageInfo();
    document.getElementById('settingsOverlay').classList.add('active');
}
function closeSettings() {
    document.getElementById('settingsOverlay').classList.remove('active');
}

// ── Management bottom sheets (opened from Settings) ────
function openCatSheet() {
    renderNoteCategories();
    document.getElementById('catSheet').classList.add('active');
}
function closeCatSheet() {
    document.getElementById('catSheet').classList.remove('active');
}
function openHolidaySheet() {
    renderCustomHolidays();
    document.getElementById('holidaySheet').classList.add('active');
}
function closeHolidaySheet() {
    document.getElementById('holidaySheet').classList.remove('active');
}
function openAnalyticsSheet() {
    renderAnalytics();
    document.getElementById('analyticsSheet').classList.add('active');
}
function closeAnalyticsSheet() {
    document.getElementById('analyticsSheet').classList.remove('active');
}
function closeAllSheets() {
    closeCatSheet(); closeHolidaySheet(); closeAnalyticsSheet();
}

// ── Analytics Dashboard (full page) ────────────────────
let dashRange = 'month';
function openAnalyticsPage() {
    document.getElementById('analyticsPage').classList.add('active');
    renderAnalyticsDashboard();
}
function closeAnalyticsPage() {
    document.getElementById('analyticsPage').classList.remove('active');
}

// Get date range bounds for a given range key
function getRangeBounds(range) {
    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    if (range === 'month') {
        return { start: new Date(y, m, 1), end: new Date(y, m + 1, 0) };
    }
    if (range === 'lastmonth') {
        return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0) };
    }
    if (range === 'year') {
        return { start: new Date(y, 0, 1), end: new Date(y, 11, 31) };
    }
    return { start: new Date(2000, 0, 1), end: new Date(y, 11, 31) };
}

// Collect notes within a range: [{ key, y, m, d, note }]
function getNotesInRange(range) {
    const { start, end } = getRangeBounds(range);
    const out = [];
    for (const [key, dayNotes] of Object.entries(notes)) {
        const [yy, mm, dd] = key.split('-').map(Number);
        const d = new Date(yy, mm - 1, dd);
        if (d < start || d > end) continue;
        for (const n of dayNotes) out.push({ key, y: yy, m: mm, d: dd, note: n });
    }
    out.sort((a, b) => (a.key < b.key ? 1 : -1));
    return out;
}

function renderAnalyticsDashboard() {
    const cards = document.getElementById('dashCards');
    const catBreak = document.getElementById('dashCategoryBreakdown');
    const dash360 = document.getElementById('dash360');
    const trend = document.getElementById('dashTrend');
    const notesList = document.getElementById('dashNotesList');
    if (!cards) return;

    const items = getNotesInRange(dashRange);
    const { start, end } = getRangeBounds(dashRange);
    const rangeLabel = t(
        `${MONTH_SHORT_EN[start.getMonth()]} ${start.getDate()}, ${start.getFullYear()} – ${MONTH_SHORT_EN[end.getMonth()]} ${end.getDate()}, ${end.getFullYear()}`,
        `${MONTH_SHORT_MM[start.getMonth()]} ${toMM(start.getDate())}, ${toMM(start.getFullYear())} – ${MONTH_SHORT_MM[end.getMonth()]} ${toMM(end.getDate())}, ${toMM(end.getFullYear())}`
    );

    // ── Summary cards ──
    const totalNotes = items.length;
    const typedItems = items.filter(i => i.note.value !== null && i.note.value !== undefined && i.note.subId);
    // Group typed items per sub-category (newest first) and compute with agg mode
    const subItemsMap = new Map();
    for (const it of typedItems) {
        if (!subItemsMap.has(it.note.subId)) subItemsMap.set(it.note.subId, []);
        subItemsMap.get(it.note.subId).push(it);
    }
    for (const arr of subItemsMap.values()) arr.sort((a, b) => (a.key < b.key ? 1 : -1));
    const subComputed = new Map(); // subId -> { value, count, type, unit }
    for (const [subId, arr] of subItemsMap) {
        const st = getSubType(subId);
        if (st.type === 'none') continue;
        const { value, count } = computeSubValue(arr);
        subComputed.set(subId, { value, count, type: st.type, unit: getSubUnit(subId) || st.unit });
    }
    let totalAmount = 0, totalTime = 0, totalLength = 0, totalWeight = 0;
    for (const sc of subComputed.values()) {
        if (sc.type === 'amount') totalAmount += sc.value;
        else if (sc.type === 'time') totalTime += sc.value;
        else if (sc.type === 'length') totalLength += sc.value;
        else if (sc.type === 'weight') totalWeight += sc.value;
    }
    const activeCats = noteCategories.filter(c => !c.hidden).length;
    cards.innerHTML = `
        <div class="dash-card dash-card-summary">
            <div class="dash-summary-item"><span class="dash-summary-num">${formatNum(totalNotes)}</span><span class="dash-summary-label">${t('Notes','မှတ်စု')}</span></div>
            <div class="dash-summary-item"><span class="dash-summary-num">${formatNum(typedItems.length)}</span><span class="dash-summary-label">${t('Entries','ဒေတာခု')}</span></div>
            <div class="dash-summary-item"><span class="dash-summary-num">${formatNum(totalAmount)}</span><span class="dash-summary-label">${t('Net Amount','အသားတင် ငွေ')}</span></div>
            <div class="dash-summary-item"><span class="dash-summary-num">${formatNum(activeCats)}</span><span class="dash-summary-label">${t('Categories','အမျိုးအစား')}</span></div>
        </div>
        <div class="dash-range-info">${escHtml(rangeLabel)}</div>`;

    // ── Category breakdown ──
    if (!items.length) {
        catBreak.innerHTML = `<div class="custom-holiday-empty">${t('No notes in this range','ဤကာလတွင် မှတ်စုမရှိပါ')}</div>`;
    } else {
        catBreak.innerHTML = noteCategories.filter(c => !c.hidden).map(c => {
            const cItems = items.filter(i => i.note.catId === c.id);
            if (!cItems.length) return '';
            const subRows = c.subs.filter(s => !s.hidden).map(s => {
                const sItems = cItems.filter(i => i.note.subId === s.id);
                if (!sItems.length) return '';
                const st = SUB_TYPES[s.type] || SUB_TYPES.none;
                const sc = subComputed.get(s.id);
                const aggTag = AGG_MODES[s.agg] ? ` <span class="dash-agg-tag">${AGG_MODES[s.agg].icon}</span>` : '';
                return `<div class="dash-cat-sub">
                    <span class="dash-cat-sub-name">${st.icon} ${escHtml(t(s.name, s.nameMM || s.name))}${aggTag}</span>
                    <span class="dash-cat-sub-val">${st.type !== 'none' && sc ? formatNum(sc.value) + ' ' + escHtml(s.unit || st.unit) : sItems.length + ' ' + t('items','ခု')}</span>
                </div>`;
            }).join('');
            return `<div class="dash-cat-block">
                <div class="dash-cat-hdr">
                    <span class="dash-cat-icon">🗂️</span>
                    <span class="dash-cat-name">${escHtml(t(c.name, c.nameMM || c.name))}</span>
                    <span class="dash-cat-count">${cItems.length} ${t('notes','မှတ်စု')}</span>
                </div>
                ${subRows}
            </div>`;
        }).join('') || `<div class="custom-holiday-empty">${t('No categorized notes','အမျိုးအစားပါ မှတ်စုမရှိပါ')}</div>`;
    }

    // ── 360° analytics ──
    if (!typedItems.length) {
        dash360.innerHTML = `<div class="custom-holiday-empty">${t('No typed data in this range','ဤကာလတွင် ဒေတာမရှိပါ')}</div>`;
    } else {
        // Top sub-categories by computed value (sorted by absolute value)
        const top = [...subComputed.entries()].map(([subId, sc]) => ({
            name: getSubCategoryName(typedItems.find(i => i.note.subId === subId)?.note.catId, subId),
            icon: SUB_TYPES[sc.type].icon,
            unit: sc.unit,
            total: sc.value,
            count: sc.count,
        })).sort((a, b) => Math.abs(b.total) - Math.abs(a.total)).slice(0, 5);
        const maxTop = Math.max(...top.map(x => Math.abs(x.total)), 1);
        dash360.innerHTML = `
            <div class="dash-360-grid">
                <div class="dash-360-col">
                    <p class="dash-360-title">${t('Top Categories','ထိပ်တန်း အမျိုးအစားများ')}</p>
                    ${top.map(x => `
                        <div class="dash-360-row">
                            <span class="dash-360-name">${x.icon} ${escHtml(x.name)}</span>
                            <div class="dash-360-bar"><div class="dash-360-fill" style="width:${Math.max(4, Math.round(Math.abs(x.total) / maxTop * 100))}%"></div></div>
                            <span class="dash-360-val">${formatNum(x.total)} ${escHtml(x.unit)}</span>
                        </div>`).join('')}
                </div>
                <div class="dash-360-col">
                    <p class="dash-360-title">${t('Type Totals','အမျိုးအစား စုစုပေါင်း')}</p>
                    <div class="dash-360-type-row"><span>💰 ${t('Net Amount','အသားတင် ငွေ')}</span><span>${formatNum(totalAmount)}</span></div>
                    <div class="dash-360-type-row"><span>⏱️ ${t('Time','အချိန်')}</span><span>${formatNum(totalTime)} hr</span></div>
                    <div class="dash-360-type-row"><span>📏 ${t('Length','အလျား')}</span><span>${formatNum(totalLength)} m</span></div>
                    <div class="dash-360-type-row"><span>⚖️ ${t('Weight','အလေးချိန်')}</span><span>${formatNum(totalWeight)} kg</span></div>
                </div>
            </div>`;
    }

    // ── Monthly trend (last 6 months) ──
    const now = new Date();
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months.push({ key, label: MONTH_SHORT_EN[d.getMonth()], count: 0, amount: 0 });
    }
    for (const [key, dayNotes] of Object.entries(notes)) {
        const mk = key.slice(0, 7);
        const mo = months.find(x => x.key === mk);
        if (!mo) continue;
        for (const n of dayNotes) {
            mo.count++;
            if (n.value !== null && n.value !== undefined && n.subId && getSubType(n.subId).type === 'amount') {
                const { sign } = getSubAgg(n.subId);
                mo.amount += (Number(n.value) || 0) * sign;
            }
        }
    }
    const maxCount = Math.max(...months.map(x => x.count), 1);
    trend.innerHTML = `<div class="dash-trend-bars">` + months.map(x => `
        <div class="dash-trend-col">
            <div class="dash-trend-bar-wrap"><div class="dash-trend-bar" style="height:${Math.max(4, Math.round(x.count / maxCount * 100))}%"></div></div>
            <span class="dash-trend-label">${x.label}</span>
            <span class="dash-trend-count">${x.count}</span>
        </div>`).join('') + `</div>`;

    // ── All notes in range ──
    if (!items.length) {
        notesList.innerHTML = `<div class="custom-holiday-empty">${t('No notes in this range','ဤကာလတွင် မှတ်စုမရှိပါ')}</div>`;
    } else {
        notesList.innerHTML = items.map(it => {
            const n = it.note;
            const catBadge = n.catId ? `<span class="dash-note-cat">${escHtml(getCategoryName(n.catId))}${n.subId ? ' · ' + escHtml(getSubCategoryName(n.catId, n.subId)) : ''}</span>` : '';
            let valBadge = '';
            if (n.value !== null && n.value !== undefined && n.subId) {
                const st = getSubType(n.subId);
                if (st.type !== 'none') valBadge = `<span class="dash-note-val">${st.icon} ${formatNum(n.value)} ${escHtml(getSubUnit(n.subId) || st.unit)}</span>`;
            }
            return `<div class="dash-note-item">
                <span class="dash-note-date">${MONTH_SHORT_EN[it.m - 1]} ${it.d}</span>
                <span class="dash-note-icon" style="background:${n.color}">${n.icon}</span>
                <div class="dash-note-main">
                    ${catBadge}
                    <span class="dash-note-text">${escHtml(n.text)}</span>
                </div>
                ${valBadge}
            </div>`;
        }).join('');
    }
}
// ── Theme: system / light / dark ────────────────────────
let themeMode = localStorage.getItem('mm-theme') || 'system';
const _darkMQ = window.matchMedia('(prefers-color-scheme: dark)');

function applyTheme(mode) {
    themeMode = mode;
    localStorage.setItem('mm-theme', mode);
    const meta = document.getElementById('metaThemeColor');
    const dark = mode === 'dark' || (mode === 'system' && _darkMQ.matches);
    if (dark) {
        document.documentElement.setAttribute('data-theme', 'dark');
        if (meta) meta.setAttribute('content', '#1c1c1e');
    } else {
        document.documentElement.removeAttribute('data-theme');
        if (meta) meta.setAttribute('content', '#f2f2f7');
    }
    syncThemeSeg();
}

function syncThemeSeg() {
    document.querySelectorAll('.theme-seg-btn').forEach(btn => {
        const active = btn.dataset.themeMode === themeMode;
        btn.classList.toggle('active', active);
        btn.setAttribute('aria-pressed', String(active));
    });
}

// Follow OS theme changes while in System mode
if (_darkMQ.addEventListener) {
    _darkMQ.addEventListener('change', () => {
        if (themeMode === 'system') applyTheme('system');
    });
} else if (_darkMQ.addListener) { // older Safari
    _darkMQ.addListener(() => { if (themeMode === 'system') applyTheme('system'); });
}

function syncFeatureSwitches() {
    const ns = document.getElementById('notesSwitch');
    if (ns) {
        ns.classList.toggle('on', notesEnabled);
        ns.setAttribute('aria-checked', String(notesEnabled));
    }
    const as = document.getElementById('alarmsSwitch');
    if (as) {
        as.classList.toggle('on', alarmsEnabled);
        as.setAttribute('aria-checked', String(alarmsEnabled));
    }
    const hs = document.getElementById('hideEmptyListSwitch');
    if (hs) {
        hs.classList.toggle('on', hideEmptyListDays);
        hs.setAttribute('aria-checked', String(hideEmptyListDays));
    }
    const sr = document.getElementById('saturdayRedSwitch');
    if (sr) {
        sr.classList.toggle('on', saturdayRed);
        sr.setAttribute('aria-checked', String(saturdayRed));
    }
    const sw = document.getElementById('substituteWorkdaysSwitch');
    if (sw) {
        sw.classList.toggle('on', substituteWorkdays);
        sw.setAttribute('aria-checked', String(substituteWorkdays));
    }
}

// ── Saturday in red (Settings → Appearance) ────────────
// Sunday is always red.  When enabled, Saturday is styled the
// same way.  Purely CSS-driven via a root attribute, so toggling
// it needs no re-render — the .saturday marker class is always
// present on the cells and the CSS decides whether to paint it.
function applySaturdayRed() {
    document.documentElement.setAttribute('data-saturday-red', saturdayRed ? 'on' : 'off');
}

// ── Substitute working days · အစားထိုး ရုံးတက်ရက် ─────────
// When the government grants a ကြားရက် (bridge holiday), staff make it
// up by working a specific Saturday.  Those Saturdays are normal
// working days, so they are NOT painted red.
//
// Gated in JS rather than CSS because the setting also controls the
// 🏢 badge, which lives in the cell markup — toggling re-renders.
function isSubstituteWorkday(year, month, day) {
    return substituteWorkdays ? !!getSubstituteWorkday(year, month, day) : false;
}

// "၁-၃-၂၀၂၇ (တနင်္လာနေ့)" / "Mon, 1 Mar 2027"
function formatPairDate(date) {
    const dow = new Date(date.year, date.month - 1, date.day).getDay();
    return {
        en: `${DAY_SHORT_EN[dow]}, ${date.day} ${MONTH_SHORT_EN[date.month-1]} ${date.year}`,
        mm: `${toMM(date.day)}-${toMM(date.month)}-${toMM(date.year)} (${DAY_MM[dow]}နေ့)`,
    };
}

// ── Fun for Employee · ရုံးပိတ်ရက် ရေတွက်ခြင်း ──────────
// A playful helper: "red day = office closed", so the next real
// break is the next run of N consecutive red days.
// isRedDay() mirrors EXACTLY what the calendar paints red, so the
// count can never disagree with the grid the user is looking at.
let _funBreakKey   = '';
let _funBreakCache = null;

function invalidateFunBreak() { _funBreakKey = ''; }

function isRedDay(y, m, d) {
    const { dow, holidays } = getDayData(y, m, d);
    if (holidays.length) return true;                 // holiday → always closed
    if (isSubstituteWorkday(y, m, d)) return false;   // worked Saturday → never closed
    if (dow === 0) return true;                       // Sunday
    if (dow === 6) return saturdayRed;                // Saturday (setting)
    return false;
}

// First run of >= n consecutive red days, scanning forward from today.
// The WHOLE run is returned (not just the first n days) so a 7-day request
// can reveal a 9-day Thingyan break. Bounded to ~13 months so a huge n
// can never spin forever.
function findNextBreak(n) {
    const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const at = i => {
        const dt = new Date(base.getFullYear(), base.getMonth(), base.getDate() + i);
        return { y: dt.getFullYear(), m: dt.getMonth() + 1, d: dt.getDate() };
    };
    let startIdx = -1, run = 0;
    for (let i = 0; i <= 400; i++) {
        const dt = at(i);
        if (isRedDay(dt.y, dt.m, dt.d)) {
            if (run === 0) startIdx = i;
            run++;
        } else if (run) {
            if (run >= n) return { start: at(startIdx), end: at(i - 1), daysUntil: startIdx, length: run };
            run = 0;
            startIdx = -1;
        }
    }
    if (run >= n) return { start: at(startIdx), end: at(400), daysUntil: startIdx, length: run };
    return null;
}

// Memoised — renderDays() asks per cell, so the scan runs at most once.
function getFunBreak() {
    if (!funEmployee) return null;
    const key = [funDays, today.getTime(), saturdayRed, substituteWorkdays].join('|');
    if (_funBreakKey !== key) {
        _funBreakCache = findNextBreak(funDays);
        _funBreakKey = key;
    }
    return _funBreakCache;
}

function isFunBreakDay(y, m, d) {
    const brk = getFunBreak();
    if (!brk) return false;
    const v  = y * 10000 + m * 100 + d;
    const lo = brk.start.y * 10000 + brk.start.m * 100 + brk.start.d;
    const hi = brk.end.y   * 10000 + brk.end.m   * 100 + brk.end.d;
    return v >= lo && v <= hi;
}

function formatBreakRange(brk) {
    const s = brk.start, e = brk.end;
    if (s.y === e.y && s.m === e.m) {
        return {
            en: `${s.d}–${e.d} ${MONTH_SHORT_EN[s.m-1]} ${s.y}`,
            mm: `${toMM(s.d)}–${toMM(e.d)} ${MONTH_SHORT_MM[s.m-1]} ${toMM(s.y)}`,
        };
    }
    return {
        en: `${s.d} ${MONTH_SHORT_EN[s.m-1]} – ${e.d} ${MONTH_SHORT_EN[e.m-1]} ${e.y}`,
        mm: `${toMM(s.d)} ${MONTH_SHORT_MM[s.m-1]} – ${toMM(e.d)} ${MONTH_SHORT_MM[e.m-1]} ${toMM(e.y)}`,
    };
}

// Title resolution — custom title (with {n} placeholder) or the built-in default.
// Returns RAW text: the toast renders via textContent, while the card and sheet
// pass it through escHtml() at their injection points.  Escaping here instead
// would double-encode ('&' → '&amp;amp;') on the textContent path.
function resolveFunTitle(custom, isMm, n) {
    const trimmed = (custom || '').trim();
    if (!trimmed) return isMm ? `${toMM(n)} ရက် အနားယူရက်` : `${n}-day break`;
    return trimmed.replace(/\{n\}/gi, isMm ? toMM(n) : String(n));
}

// Bilingual copy shared by the card, toast and popup
function funCopy() {
    if (!funEmployee) return null;
    const brk = getFunBreak();

    // No run of that length within the scanned window
    if (!brk) {
        const titleEn = resolveFunTitle(funTitleEn, false, funDays);
        const titleMm = resolveFunTitle(funTitleMm, true, funDays);
        const msgEn = 'No such break in the next year 😅';
        const msgMm = 'လာမည့်တစ်နှစ်အတွင်း မတွေ့ပါ 😅';
        return {
            emoji: '😅', brk: null, titleEn, titleMm,
            countEn: msgEn, countMm: msgMm, rangeEn: '', rangeMm: '',
            oneLine: `😅 ${t(`${titleEn} · ${msgEn}`, `${titleMm} · ${msgMm}`)}`,
        };
    }

    const range = formatBreakRange(brk);
    const k = brk.daysUntil;
    let emoji, countEn, countMm;
    if (k === 0)      { emoji = '🎉'; countEn = 'Today!';        countMm = 'ဒီနေ့ပဲ!'; }
    else if (k === 1) { emoji = '🥳'; countEn = 'Tomorrow!';     countMm = 'မနက်ဖန်!'; }
    else              { emoji = '🎉'; countEn = `${k} days to go`; countMm = `${toMM(k)} ရက် လိုသေးတယ်`; }
    // Title uses the days ACTUALLY available — a 7-day request can reveal a 9-day Thingyan run.
    const len = brk.length || funDays;
    const titleEn = resolveFunTitle(funTitleEn, false, len);
    const titleMm = resolveFunTitle(funTitleMm, true, len);
    return {
        emoji, brk, titleEn, titleMm, countEn, countMm,
        rangeEn: range.en, rangeMm: range.mm,
        oneLine: `${emoji} ${t(`${titleEn} · ${countEn} · ${range.en}`, `${titleMm} · ${countMm} · ${range.mm}`)}`,
    };
}

// Card is only drawn in 'card' mode — the three modes are exclusive.
function renderFunCard() {
    const card = document.getElementById('funCard');
    if (!card) return;
    const c = (funEmployee && funDisplay === 'card') ? funCopy() : null;
    if (!c) { card.hidden = true; card.innerHTML = ''; card._html = ''; return; }
    const html =
        `<span class="fun-card-emoji">${c.emoji}</span>` +
        `<span class="fun-card-text">` +
            `<span class="fun-card-title">${escHtml(t(c.titleEn, c.titleMm))}</span>` +
            `<span class="fun-card-sub">${escHtml(t(`${c.countEn} · ${c.rangeEn}`, `${c.countMm} · ${c.rangeMm}`))}</span>` +
        `</span>`;
    // Only touch the DOM when something actually changed, so the
    // entry animation doesn't replay on every renderAll().
    if (card._html !== html) {
        card.innerHTML = html;
        card._html = html;
    }
    card.hidden = false;
}

function renderFunSheet() {
    const body = document.getElementById('funSheetBody');
    const c = funCopy();
    if (!body || !c) return;
    const rows = c.brk ? `
        <div class="di-section-block fun-sheet-block">
            <div class="di-row"><span class="di-row-label">${t('Days to go','လိုသေးသည့်ရက်')}</span><span class="di-row-value">${t(String(c.brk.daysUntil), toMM(c.brk.daysUntil))}</span></div>
            <div class="di-row di-row-sep"><span class="di-row-label">${t('Break length','အနားယူရက် အရေအတွက်')}</span><span class="di-row-value">${t(String(c.brk.length), toMM(c.brk.length))}</span></div>
            <div class="di-row di-row-sep"><span class="di-row-label">${t('You asked for','သင်တောင်းသည့်ရက်')}</span><span class="di-row-value">${t(String(funDays), toMM(funDays))}</span></div>
            <div class="di-row di-row-sep"><span class="di-row-label">${t('Counted as red','အနီရက်အဖြစ် တွက်သည်')}</span><span class="di-row-value">${t('Holidays · Sun' + (saturdayRed ? ' · Sat' : ''), 'ရုံးပိတ် · တနင်္ဂနွေ' + (saturdayRed ? ' · စနေ' : ''))}</span></div>
        </div>
        <p class="fun-footnote">${t('The break days are highlighted on the calendar.','အနားယူရက်များကို ပြက္ခဒိန်တွင် မီးမောင်းထိုးပြထားသည်။')}</p>` : '';
    body.innerHTML = `
        <div class="fun-hero">
            <div class="fun-hero-emoji">${c.emoji}</div>
            <div class="fun-hero-count">${escHtml(t(c.countEn, c.countMm))}</div>
            <div class="fun-hero-title">${escHtml(t(c.titleEn, c.titleMm))}</div>
            ${c.rangeEn ? `<div class="fun-hero-range">${escHtml(t(c.rangeEn, c.rangeMm))}</div>` : ''}
        </div>
        ${rows}
    `;
}

// Run on app open, on mode change, and when the toggle turns on
function showFunFeature() {
    renderFunCard();
    if (!funEmployee) return;
    const c = funCopy();
    if (!c) return;
    if (funDisplay === 'toast') {
        showToast(c.oneLine, 'info');
    } else if (funDisplay === 'popup') {
        renderFunSheet();
        document.getElementById('funSheet')?.classList.add('active');
    }
}

function syncFunSettings() {
    const sw = document.getElementById('funEmployeeSwitch');
    if (sw) {
        sw.classList.toggle('on', funEmployee);
        sw.setAttribute('aria-checked', String(funEmployee));
    }
    for (const id of ['funDaysRow', 'funDisplayRow', 'funTitleRow']) {
        const row = document.getElementById(id);
        if (row) row.hidden = !funEmployee;
    }
    const inp = document.getElementById('funDaysInput');
    if (inp) inp.value = String(funDays);
    // Placeholders show what the default title would be at the current day count
    const tEn = document.getElementById('funTitleEn');
    if (tEn) { tEn.value = funTitleEn; tEn.placeholder = `${funDays}-day break`; }
    const tMm = document.getElementById('funTitleMm');
    if (tMm) { tMm.value = funTitleMm; tMm.placeholder = `${toMM(funDays)} ရက် အနားယူရက်`; }
    document.querySelectorAll('.fun-display-seg .theme-seg-btn').forEach(b => {
        const active = b.dataset.funDisplay === funDisplay;
        b.classList.toggle('active', active);
        b.setAttribute('aria-pressed', String(active));
    });
}

function saveFunTitle() {
    const en = document.getElementById('funTitleEn');
    const mm = document.getElementById('funTitleMm');
    if (!en || !mm) return;
    funTitleEn = en.value.trim();
    funTitleMm = mm.value.trim();
    localStorage.setItem('mm-fun-title-en', funTitleEn);
    localStorage.setItem('mm-fun-title-mm', funTitleMm);
    syncFunSettings();
    renderAll();
    const usingDefault = !funTitleEn && !funTitleMm;
    showToast(usingDefault
        ? t('Title reset to default', 'ခေါင်းစဉ် မူလအတိုင်း ပြန်ထားပြီး')
        : t('Title saved', 'ခေါင်းစဉ် သိမ်းပြီး'), 'success');
}

function saveFunDays() {
    const inp = document.getElementById('funDaysInput');
    if (!inp) return;
    let v = parseInt(inp.value, 10);
    if (isNaN(v)) v = 4;
    v = Math.min(30, Math.max(1, v));
    inp.value = String(v);
    funDays = v;
    localStorage.setItem('mm-fun-days', String(v));
    invalidateFunBreak();
    syncFunSettings();   // refresh the title placeholders (they mirror the default)
    renderAll();
    showToast(t(`Saved — ${v}-day break`, `သိမ်းပြီး — ${toMM(v)} ရက် အနားယူရက်`), 'success');
}

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
    renderFunCard();
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

    // Group cells into week rows so separators can span the full width
    let weekRow = null;
    function ensureWeekRow() {
        if (!weekRow) {
            weekRow = document.createElement('div');
            weekRow.className = 'cal-week';
            grid.appendChild(weekRow);
        }
        return weekRow;
    }

    for (let i = 0; i < firstDay; i++) {
        const e = document.createElement('div');
        e.className = 'calendar-day empty';
        ensureWeekRow().appendChild(e);
    }

    for (let day = 1; day <= dim; day++) {
        const { mDate, dow, moon, fd, sabbath, yatyaza, pyathada, amye, thamaphyu, holidays } = getDayData(year, month, day);
        const isSelected = selectedDay && selectedDay.year === year && selectedDay.month === month && selectedDay.day === day;
        const workPairMv = isSubstituteWorkday(year, month, day) ? getSubstituteWorkday(year, month, day) : null;

        const cell = document.createElement('div');
        cell.className = 'calendar-day';
        if (dow === 0)          cell.classList.add('sunday');
        if (dow === 6)          cell.classList.add('saturday');
        if (workPairMv)         cell.classList.add('workday');
        if (isFunBreakDay(year, month, day)) cell.classList.add('fun-break');
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
        if (holidays.some(h => h.type === 'custom')) dots += '<span class="dot dot-custom"></span>';
        if (holidays.some(h => h.type !== 'custom')) dots += '<span class="dot dot-holiday"></span>';
        if (moon === 'Full Moon') dots += '<span class="dot dot-fullmoon"></span>';
        if (sabbath.sabbath === 1 || amye === 1 || thamaphyu === 1) dots += '<span class="dot dot-auspicious"></span>';
        if (yatyaza === 1)     dots += '<span class="dot dot-yatyaza"></span>';
        if (pyathada > 0)      dots += '<span class="dot dot-pyathada"></span>';

        const dayNotesMv = getNotesForDate(year, month, day);
        let noteBadgeMv = '';
        if (dayNotesMv.length) {
            cell.classList.add('has-note');
            // Show up to 2 note badges; if more, add a "+N" count badge.
            const MAX_BADGES = 2;
            const shown = dayNotesMv.slice(0, MAX_BADGES);
            const extra = dayNotesMv.length - shown.length;
            const badges = shown.map(fn => {
                // Show the category data-type icon (💰/⏱️/📏/⚖️) when the note has a typed sub-category,
                // otherwise fall back to the note's own icon.
                let badgeIcon = fn.icon;
                if (fn.subId) {
                    const st = getSubType(fn.subId);
                    if (st && st.type !== 'none') badgeIcon = st.icon;
                }
                return `<span class="cell-note-badge" style="background:${fn.color}" title="${escHtml(fn.text)}">${badgeIcon}</span>`;
            }).join('');
            const extraBadge = extra > 0
                ? `<span class="cell-note-badge cell-note-badge-more" title="${extra} ${t('more notes','နောက်ထပ် မှတ်စု')}">+${extra}</span>`
                : '';
            noteBadgeMv = `<span class="cell-note-badges">${badges}${extraBadge}</span>`;
        }
        const dayAlarmsMv = getAlarmsForDate(year, month, day).filter(a => a.enabled);
        const alarmBadgeMv = dayAlarmsMv.length
            ? `<span class="cell-alarm-badge" title="${dayAlarmsMv[0].time}${dayAlarmsMv[0].label ? ' — '+dayAlarmsMv[0].label : ''}">⏰</span>`
            : '';
        // Custom day type icon badge (e.g. 🎂 Birthday, 🎉 Event)
        const customDay = holidays.find(h => h.type === 'custom');
        const customBadgeMv = customDay
            ? `<span class="cell-customday-badge" title="${escHtml(t(customDay.name, customDay.nameMM))}">${getCustomDayType(customDay.customType).icon}</span>`
            : '';
        const workBadgeMv = workPairMv
            ? `<span class="cell-workday-badge" title="${escHtml(t('Substitute working day', 'အစားထိုး ရုံးတက်ရက်'))}">🏢</span>`
            : '';
        cell.innerHTML = `<div class="day-number-wrap">${moonIco}<span class="day-number">${day}</span>${customBadgeMv}${workBadgeMv}${noteBadgeMv}${alarmBadgeMv}</div><div class="day-dots">${dots}</div><div class="myanmar-day">${toMM(fd)}</div>`;

        cell.addEventListener('click', () => {
            selectedDay = { year, month, day };
            document.querySelectorAll('.calendar-day.selected').forEach(el => el.classList.remove('selected'));
            cell.classList.add('selected');
            showDayInfo(year, month, day, cell);
        });
        ensureWeekRow().appendChild(cell);
        // Start a new week row after every 7th cell
        if ((firstDay + day) % 7 === 0) weekRow = null;
    }
}

// ── Month holidays list ─────────────────────────────────
function renderHolidaysList(year, month) {
    const el          = document.getElementById('holidaysList');
    const mobileEl    = document.getElementById('mobileHolidaysList');
    const mobilePanel = document.getElementById('mobileHolidaysPanel');
    const countBadge  = document.getElementById('mobileHolidaysCount');
    const toggleBtn   = document.getElementById('mobileHolidaysToggle');

    const list = getMonthHolidays(year, month);

    if (!list.length) {
        if (el) el.innerHTML = `<p class="no-holidays">${t('No public holidays this month','ဤလတွင် ရုံးပိတ်ရက် မရှိပါ')}</p>`;
        if (mobilePanel) mobilePanel.hidden = true;
        return;
    }

    let items = '';
    for (const item of list) {
        for (const h of item.holidays) {
            items += `<div class="holiday-item">
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

    if (el) el.innerHTML = `<div class="holidays-list">${items}</div>`;

    if (mobileEl) {
        mobileEl.innerHTML = `<div class="holidays-list">${items}</div>`;
        // Collapse long lists on mobile so the calendar stays visible
        const all = mobileEl.querySelectorAll('.holiday-item');
        if (all.length > MOBILE_HOLIDAYS_MAX) {
            all.forEach((it, i) => { if (i >= MOBILE_HOLIDAYS_MAX) it.classList.add('holiday-item-hidden'); });
            if (toggleBtn) {
                toggleBtn.hidden = false;
                toggleBtn.classList.remove('expanded');
                toggleBtn.querySelector('.t-en').textContent = t('Show all','အားလုံးပြရန်');
                toggleBtn.querySelector('.t-mm').textContent = t('Show all','အားလုံးပြရန်');
            }
        } else if (toggleBtn) {
            toggleBtn.hidden = true;
        }
    }

    if (countBadge) countBadge.textContent = list.reduce((n, item) => n + item.holidays.length, 0);
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
        const isSat  = d.getDay() === 6;
        const workPairCv = isSubstituteWorkday(y, m, dd) ? getSubstituteWorkday(y, m, dd) : null;
        const { holidays, moon, sabbath, amye, thamaphyu, fd } = getDayData(y, m, dd);
        const hasDot = holidays.length || moon === 'Full Moon' || sabbath.sabbath || amye || thamaphyu;

        const btn = document.createElement('button');
        btn.className = 'compact-day';
        if (isSun)  btn.classList.add('sunday');
        if (isSat)  btn.classList.add('saturday');
        if (workPairCv) btn.classList.add('workday');
        if (isFunBreakDay(y, m, dd)) btn.classList.add('fun-break');
        if (isTd)   btn.classList.add('today');
        if (isSel)  btn.classList.add('selected');
        if (holidays.length) btn.classList.add('holiday');

        const dayNotesCv = getNotesForDate(y, m, dd);
        const noteIndCv = dayNotesCv.length ? `<span class="compact-note-badge" style="background:${dayNotesCv[0].color}">${dayNotesCv[0].icon}</span>` : '';
        const dayAlarmsCv = getAlarmsForDate(y, m, dd).filter(a => a.enabled);
        const alarmIndCv = dayAlarmsCv.length ? `<span class="compact-alarm-badge">⏰</span>` : '';
        const workIndCv = workPairCv ? `<span class="compact-workday-badge" title="${escHtml(t('Substitute working day', 'အစားထိုး ရုံးတက်ရက်'))}">🏢</span>` : '';
        btn.innerHTML = `<div class="compact-day-num-wrap"><span class="compact-day-num">${dd}</span>${noteIndCv}${alarmIndCv}${workIndCv}</div><span class="compact-myanmar-num">${toMM(fd)}</span><span class="compact-day-dot${hasDot ? '' : ' invisible'}"></span>`;

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
        const workPairL = isSubstituteWorkday(currentYear, currentMonth, day) ? getSubstituteWorkday(currentYear, currentMonth, day) : null;

        const row = document.createElement('div');
        row.className = 'list-day-row';
        if (dow === 0)  row.classList.add('sunday');
        if (dow === 6)  row.classList.add('saturday');
        if (workPairL)  row.classList.add('workday');
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

        // Substitute working day — must be visible even when the day is otherwise empty
        if (workPairL) {
            const bd = formatPairDate(workPairL.bridge);
            events += `<div class="list-event">
                <span class="list-event-dot" style="background:var(--ios-indigo)"></span>
                <span class="list-event-name list-event-special">🏢 ${t('Substitute working day', 'အစားထိုး ရုံးတက်ရက်')} — ${t(bd.en, bd.mm)}</span>
            </div>`;
        }

        if (!events) {
            if (hideEmptyListDays) continue; // skip days with no data
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
            const icon = h.type === 'custom' ? (getCustomDayType(h.customType).icon) : '🗓️';
            html += `<div class="di-row${i ? ' di-row-sep' : ''} di-row-holiday">
                <div class="di-row-holiday-content">
                    <div class="di-row-holiday-name">${t(h.name, h.nameMM)}</div>
                    ${h.description ? `<div class="di-row-holiday-desc">${h.description}</div>` : ''}
                </div>
                <span class="di-row-holiday-icon">${icon}</span>
            </div>`;
        });
        html += '</div></div>';
    }

    // 1b. Office schedule — ကြားရက် (bridge holiday) ↔ အစားထိုး ရုံးတက်ရက်
    if (substituteWorkdays) {
        const wdPair = getSubstituteWorkday(year, month, day);
        const brPair = getBridgeHoliday(year, month, day);
        if (wdPair || brPair) {
            html += `<div class="di-section"><p class="di-section-header">${t('Office Schedule','ရုံးတက်/ရုံးပိတ် အစီအစဉ်')}</p><div class="di-section-block">`;
            if (wdPair) {
                const bd = formatPairDate(wdPair.bridge);
                html += `<div class="di-row di-row-workday">
                    <div class="di-row-holiday-content">
                        <div class="di-row-workday-name">${t('🏢 Substitute Working Day','🏢 အစားထိုး ရုံးတက်ရက်')}</div>
                        <div class="di-row-holiday-desc">${t(
                            `Working day — makes up for the bridge holiday on ${bd.en}`,
                            `ကြားရက် ${bd.mm} အတွက် အစားထိုး ရုံးတက်ရသည့်ရက် — ရုံးပိတ်ရက် မဟုတ်ပါ`
                        )}</div>
                    </div>
                    <span class="di-row-holiday-icon">🏢</span>
                </div>`;
            }
            if (brPair) {
                const wd = formatPairDate(brPair.workday);
                html += `<div class="di-row${wdPair ? ' di-row-sep' : ''} di-row-bridge">
                    <div class="di-row-holiday-content">
                        <div class="di-row-bridge-name">${t('🟣 Bridge Holiday','🟣 ကြားရက်')}</div>
                        <div class="di-row-holiday-desc">${t(
                            `Compensated by a substitute working Saturday on ${wd.en}`,
                            `အစားထိုး ရုံးတက်ရမည့်ရက် — ${wd.mm}`
                        )}</div>
                    </div>
                    <span class="di-row-holiday-icon">🟣</span>
                </div>`;
            }
            html += '</div></div>';
        }
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
    if (notesEnabled) html += buildNotesHtml(year, month, day);

    // Alarms
    if (alarmsEnabled) html += buildAlarmsHtml(year, month, day);

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

    // Lang (settings page)
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

    // Theme (settings page segmented control: System / Light / Dark)
    document.querySelectorAll('.theme-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => applyTheme(btn.dataset.themeMode));
    });

    // Features (settings page switches)
    const notesSwitch = document.getElementById('notesSwitch');
    if (notesSwitch) notesSwitch.addEventListener('click', () => {
        notesEnabled = !notesEnabled;
        localStorage.setItem('mm-notes-enabled', String(notesEnabled));
        syncFeatureSwitches();
        // Refresh open day detail so the section appears/disappears immediately
        if (selectedDay) showDayInfo(selectedDay.year, selectedDay.month, selectedDay.day, null);
    });
    const alarmsSwitch = document.getElementById('alarmsSwitch');
    if (alarmsSwitch) alarmsSwitch.addEventListener('click', () => {
        alarmsEnabled = !alarmsEnabled;
        localStorage.setItem('mm-alarms-enabled', String(alarmsEnabled));
        syncFeatureSwitches();
        if (selectedDay) showDayInfo(selectedDay.year, selectedDay.month, selectedDay.day, null);
    });
    const hideEmptyListSwitch = document.getElementById('hideEmptyListSwitch');
    if (hideEmptyListSwitch) hideEmptyListSwitch.addEventListener('click', () => {
        hideEmptyListDays = !hideEmptyListDays;
        localStorage.setItem('mm-hide-empty-list', String(hideEmptyListDays));
        syncFeatureSwitches();
        renderList();
    });
    const saturdayRedSwitch = document.getElementById('saturdayRedSwitch');
    if (saturdayRedSwitch) saturdayRedSwitch.addEventListener('click', () => {
        saturdayRed = !saturdayRed;
        localStorage.setItem('mm-saturday-red', String(saturdayRed));
        applySaturdayRed();
        syncFeatureSwitches();
    });
    const substituteWorkdaysSwitch = document.getElementById('substituteWorkdaysSwitch');
    if (substituteWorkdaysSwitch) substituteWorkdaysSwitch.addEventListener('click', () => {
        substituteWorkdays = !substituteWorkdays;
        localStorage.setItem('mm-substitute-workdays', String(substituteWorkdays));
        syncFeatureSwitches();
        invalidateFunBreak();
        renderAll();   // the marker class + badge live in the cell markup
    });

    // Fun for Employee (Settings → Features)
    const funEmployeeSwitch = document.getElementById('funEmployeeSwitch');
    if (funEmployeeSwitch) funEmployeeSwitch.addEventListener('click', () => {
        funEmployee = !funEmployee;
        localStorage.setItem('mm-fun-employee', String(funEmployee));
        invalidateFunBreak();
        syncFunSettings();
        renderAll();
        showFunFeature();
    });
    const funDaysSave = document.getElementById('funDaysSave');
    if (funDaysSave) funDaysSave.addEventListener('click', saveFunDays);
    const funDaysInput = document.getElementById('funDaysInput');
    if (funDaysInput) funDaysInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); saveFunDays(); }
    });
    const funTitleSave = document.getElementById('funTitleSave');
    if (funTitleSave) funTitleSave.addEventListener('click', saveFunTitle);
    ['funTitleEn', 'funTitleMm'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); saveFunTitle(); }
        });
    });
    document.querySelectorAll('.fun-display-seg .theme-seg-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            funDisplay = btn.dataset.funDisplay;
            localStorage.setItem('mm-fun-display', funDisplay);
            syncFunSettings();
            showFunFeature();   // immediate preview of the chosen mode
        });
    });

    const funSheetClose = document.getElementById('funSheetClose');
    if (funSheetClose) funSheetClose.addEventListener('click', () => {
        document.getElementById('funSheet').classList.remove('active');
    });

    // Settings open / close
    document.getElementById('settingsBtn').addEventListener('click', openSettings);
    document.getElementById('settingsBack').addEventListener('click', closeSettings);

    // Note categories (Settings → Notes & Categories)
    const categoriesSwitch = document.getElementById('categoriesSwitch');
    if (categoriesSwitch) categoriesSwitch.addEventListener('click', () => {
        categoriesEnabled = !categoriesEnabled;
        localStorage.setItem('mm-note-categories-enabled', String(categoriesEnabled));
        syncCategoriesSwitch();
        if (selectedDay) showDayInfo(selectedDay.year, selectedDay.month, selectedDay.day, null);
    });
    // Collapsible "Manage Categories" section
    const manageCatsBtn = document.getElementById('manageCatsBtn');
    if (manageCatsBtn) manageCatsBtn.addEventListener('click', openCatSheet);
    const catSheetClose = document.getElementById('catSheetClose');
    if (catSheetClose) catSheetClose.addEventListener('click', closeCatSheet);
    const analyticsBtn = document.getElementById('analyticsBtn');
    if (analyticsBtn) analyticsBtn.addEventListener('click', openAnalyticsSheet);
    const analyticsSheetClose = document.getElementById('analyticsSheetClose');
    if (analyticsSheetClose) analyticsSheetClose.addEventListener('click', closeAnalyticsSheet);
    // Detail analytics → full dashboard page
    const analyticsDetailBtn = document.getElementById('analyticsDetailBtn');
    if (analyticsDetailBtn) analyticsDetailBtn.addEventListener('click', openAnalyticsPage);
    const analyticsPageBack = document.getElementById('analyticsPageBack');
    if (analyticsPageBack) analyticsPageBack.addEventListener('click', closeAnalyticsPage);
    // Range chips
    document.querySelectorAll('#dashRangeChips .dash-range-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('#dashRangeChips .dash-range-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            dashRange = chip.dataset.range;
            renderAnalyticsDashboard();
        });
    });
    const holidaysBtn = document.getElementById('holidaysBtn');
    if (holidaysBtn) holidaysBtn.addEventListener('click', openHolidaySheet);
    const holidaySheetClose = document.getElementById('holidaySheetClose');
    if (holidaySheetClose) holidaySheetClose.addEventListener('click', closeHolidaySheet);
    // Close sheets on overlay tap
    ['catSheet','holidaySheet','analyticsSheet','storageSheet','aboutSheet','funSheet'].forEach(id => {
        const ov = document.getElementById(id);
        if (ov) ov.addEventListener('click', e => { if (e.target === ov) ov.classList.remove('active'); });
    });
    // Storage sheet open/close
    const storageBtn = document.getElementById('storageBtn');
    if (storageBtn) storageBtn.addEventListener('click', openStorageSheet);
    const storageSheetClose = document.getElementById('storageSheetClose');
    if (storageSheetClose) storageSheetClose.addEventListener('click', closeStorageSheet);
    // About sheet open/close
    const aboutBtn = document.getElementById('aboutBtn');
    if (aboutBtn) aboutBtn.addEventListener('click', openAboutSheet);
    const aboutSheetClose = document.getElementById('aboutSheetClose');
    if (aboutSheetClose) aboutSheetClose.addEventListener('click', closeAboutSheet);
    const ncAdd = document.getElementById('noteCatAdd');
    const ncForm = document.getElementById('noteCatForm');
    if (ncAdd && ncForm) {
        // Populate data-type chips
        const typeChips = document.getElementById('ncTypeChips');
        if (typeChips) {
            typeChips.innerHTML = Object.entries(SUB_TYPES).map(([key, st]) =>
                `<button type="button" class="nc-type-chip" data-type="${key}">${st.icon} <span class="t-en">${st.label}</span><span class="t-mm">${st.labelMM}</span></button>`
            ).join('');
            typeChips.querySelectorAll('.nc-type-chip').forEach(chip => {
                chip.addEventListener('click', () => setNcType(chip.dataset.type));
            });
        }
        // Populate aggregation chips
        const aggChips = document.getElementById('ncAggChips');
        if (aggChips) {
            aggChips.innerHTML = Object.entries(AGG_MODES).map(([key, m]) =>
                `<button type="button" class="nc-agg-chip" data-agg="${key}">${m.icon} <span class="t-en">${m.label}</span><span class="t-mm">${m.labelMM}</span></button>`
            ).join('');
            aggChips.querySelectorAll('.nc-agg-chip').forEach(chip => {
                chip.addEventListener('click', () => setNcAgg(chip.dataset.agg, 1));
            });
            document.querySelectorAll('#ncSignRow .nc-sign-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('#ncSignRow .nc-sign-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                });
            });
        }
        ncAdd.addEventListener('click', () => openNoteCatEdit('', '', '', ''));
        document.getElementById('ncCancel').addEventListener('click', () => {
            ncForm.hidden = true;
            ncAdd.hidden = false;
            document.getElementById('ncNameEn').value = '';
            document.getElementById('ncNameMm').value = '';
        });
        document.getElementById('ncSave').addEventListener('click', () => {
            const nameEn = document.getElementById('ncNameEn').value.trim();
            const nameMm = document.getElementById('ncNameMm').value.trim();
            if (!nameEn) { document.getElementById('ncNameEn').focus(); return; }
            const catId = ncForm.dataset.catId || '';
            const subId = ncForm.dataset.subId || '';
            const mode  = ncForm.dataset.mode || 'main';
            const selType = document.querySelector('#ncTypeChips .nc-type-chip.active')?.dataset?.type || 'none';
            const unit = document.getElementById('ncUnit').value.trim();
            const selAgg = document.querySelector('#ncAggChips .nc-agg-chip.active')?.dataset?.agg || 'sum';
            const selSign = parseInt(document.querySelector('#ncSignRow .nc-sign-btn.active')?.dataset?.sign || '1', 10);
            if (mode === 'main' && catId) {
                renameMainCategory(catId, nameEn, nameMm);
            } else if (mode === 'main') {
                addMainCategory(nameEn, nameMm);
            } else if (mode === 'sub') {
                addSubCategory(catId, nameEn, nameMm, selType, unit, selAgg, selSign);
            } else if (mode === 'sub-edit') {
                renameSubCategory(catId, subId, nameEn, nameMm, selType, unit, selAgg, selSign);
            } else {
                renameMainCategory(catId, nameEn, nameMm);
            }
            renderNoteCategories();
            renderAnalytics();
            ncForm.hidden = true;
            ncAdd.hidden = false;
            document.getElementById('ncNameEn').value = '';
            document.getElementById('ncNameMm').value = '';
            showToast(t('Category saved','အမျိုးအစား သိမ်းပြီး'), 'success');
        });
    }

    // Storage limits (Settings → Storage)
    const maxSizeWrap = document.getElementById('maxSizeChips');
    if (maxSizeWrap) {
        maxSizeWrap.innerHTML = ATTACH_SIZE_OPTIONS.map(o =>
            `<button type="button" class="storage-chip${o.value === attachMaxSize ? ' active' : ''}" data-value="${o.value}">${o.label}</button>`
        ).join('');
        maxSizeWrap.querySelectorAll('.storage-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                attachMaxSize = Number(chip.dataset.value);
                localStorage.setItem('mm-attach-max-size', String(attachMaxSize));
                maxSizeWrap.querySelectorAll('.storage-chip').forEach(c => c.classList.toggle('active', c === chip));
            });
        });
    }
    const maxCountWrap = document.getElementById('maxCountChips');
    if (maxCountWrap) {
        maxCountWrap.innerHTML = ATTACH_COUNT_OPTIONS.map(o =>
            `<button type="button" class="storage-chip${o.value === attachMaxCount ? ' active' : ''}" data-value="${o.value}">${o.label}</button>`
        ).join('');
        maxCountWrap.querySelectorAll('.storage-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                attachMaxCount = Number(chip.dataset.value);
                localStorage.setItem('mm-attach-max-count', String(attachMaxCount));
                maxCountWrap.querySelectorAll('.storage-chip').forEach(c => c.classList.toggle('active', c === chip));
            });
        });
    }
    const clearAttachBtn = document.getElementById('clearAttachmentsBtn');
    if (clearAttachBtn) clearAttachBtn.addEventListener('click', () => {
        if (!confirm(t('Delete ALL attachments from all notes? This cannot be undone.','မှတ်စုအားလုံးမှ ဖိုင်အားလုံးကို ဖျက်မည်လား? ပြန်ပြင်၍မရပါ။'))) return;
        clearAllAttachments().then(() => {
            renderStorageInfo();
            renderStorageFiles();
            if (selectedDay) showDayInfo(selectedDay.year, selectedDay.month, selectedDay.day, null);
            showToast(t('All attachments cleared','ဖိုင်အားလုံး ရှင်းပြီး'), 'success');
        });
    });

    // Custom days (Settings → Custom Days)
    const chAdd = document.getElementById('customHolidayAdd');
    const chForm = document.getElementById('customHolidayForm');
    if (chAdd && chForm) {
        // Populate day-type chips
        const chTypeChips = document.getElementById('chTypeChips');
        if (chTypeChips) {
            chTypeChips.innerHTML = Object.entries(CUSTOM_DAY_TYPES).map(([key, dt]) =>
                `<button type="button" class="ch-type-chip${key === 'holiday' ? ' active' : ''}" data-type="${key}">${dt.icon} <span class="t-en">${dt.label}</span><span class="t-mm">${dt.labelMM}</span></button>`
            ).join('');
            chTypeChips.querySelectorAll('.ch-type-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    chTypeChips.querySelectorAll('.ch-type-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                });
            });
        }
        // iOS-style month chips + day stepper
        const chipsWrap = document.getElementById('chMonthChips');
        const chDayNum  = document.getElementById('chDayNum');
        let chMonthVal = today.getMonth() + 1;
        let chDayVal   = today.getDate();

        function daysInChMonth() { return new Date(today.getFullYear(), chMonthVal, 0).getDate(); }
        function updateChDayDisplay() { if (chDayNum) chDayNum.textContent = chDayVal; }
        function resetChDate() {
            chMonthVal = today.getMonth() + 1;
            chDayVal   = today.getDate();
            chipsWrap.querySelectorAll('.ch-chip').forEach(c =>
                c.classList.toggle('active', parseInt(c.dataset.month, 10) === chMonthVal));
            updateChDayDisplay();
        }

        if (chipsWrap) {
            chipsWrap.innerHTML = MONTH_SHORT_EN.map((m, i) =>
                `<button type="button" class="ch-chip${i + 1 === chMonthVal ? ' active' : ''}" data-month="${i+1}">
                    <span class="t-en">${m}</span><span class="t-mm">${MONTH_SHORT_MM[i]}</span>
                </button>`
            ).join('');
            chipsWrap.querySelectorAll('.ch-chip').forEach(chip => {
                chip.addEventListener('click', () => {
                    chipsWrap.querySelectorAll('.ch-chip').forEach(c => c.classList.remove('active'));
                    chip.classList.add('active');
                    chMonthVal = parseInt(chip.dataset.month, 10);
                    if (chDayVal > daysInChMonth()) { chDayVal = daysInChMonth(); updateChDayDisplay(); }
                });
            });
        }
        document.getElementById('chDayMinus').addEventListener('click', () => {
            chDayVal = chDayVal > 1 ? chDayVal - 1 : 1;
            updateChDayDisplay();
        });
        document.getElementById('chDayPlus').addEventListener('click', () => {
            chDayVal = chDayVal < daysInChMonth() ? chDayVal + 1 : daysInChMonth();
            updateChDayDisplay();
        });
        updateChDayDisplay();

        chAdd.addEventListener('click', () => {
            chForm.hidden = false;
            chAdd.hidden = true;
            resetChDate();
            document.getElementById('chNameEn').focus();
        });
        document.getElementById('chCancel').addEventListener('click', () => {
            chForm.hidden = true;
            chAdd.hidden = false;
            document.getElementById('chNameEn').value = '';
            document.getElementById('chNameMm').value = '';
        });
        document.getElementById('chRecurring').addEventListener('click', () => {
            const sw = document.getElementById('chRecurring');
            const on = sw.classList.toggle('on');
            sw.setAttribute('aria-checked', String(on));
        });
        // Recurring defaults to ON — sync the visual state
        const chRecurringSw = document.getElementById('chRecurring');
        if (chRecurringSw && chRecurringSw.getAttribute('aria-checked') === 'true') {
            chRecurringSw.classList.add('on');
        }
        document.getElementById('chSave').addEventListener('click', () => {
            const nameEn = document.getElementById('chNameEn').value.trim();
            const nameMm = document.getElementById('chNameMm').value.trim();
            if (!nameEn) { document.getElementById('chNameEn').focus(); return; }
            const recurring = document.getElementById('chRecurring').classList.contains('on');
            const selType = document.querySelector('#chTypeChips .ch-type-chip.active')?.dataset?.type || 'holiday';
            addCustomHoliday(nameEn, nameMm, chMonthVal, chDayVal, recurring, selType);
            renderCustomHolidays();
            renderAll();
            chForm.hidden = true;
            chAdd.hidden = false;
            document.getElementById('chNameEn').value = '';
            document.getElementById('chNameMm').value = '';
            showToast(t('Day added','နေ့ ထည့်ပြီး'), 'success');
        });
    }

    // Mobile holidays: show all / show less
    const mhToggle = document.getElementById('mobileHolidaysToggle');
    if (mhToggle) mhToggle.addEventListener('click', () => {
        const expanded = mhToggle.classList.toggle('expanded');
        const listEl = document.getElementById('mobileHolidaysList');
        if (listEl) {
            listEl.querySelectorAll('.holiday-item').forEach((it, i) => {
                it.classList.toggle('holiday-item-hidden', !expanded && i >= MOBILE_HOLIDAYS_MAX);
            });
        }
        mhToggle.querySelector('.t-en').textContent = expanded ? t('Show less','လျှော့ပြရန်') : t('Show all','အားလုံးပြရန်');
        mhToggle.querySelector('.t-mm').textContent = expanded ? t('Show less','လျှော့ပြရန်') : t('Show all','အားလုံးပြရန်');
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
        if (e.key==='Escape') { closeModal(); closePicker(); closeSettings(); closeAllSheets(); closeStorageSheet(); closeAboutSheet(); closeAnalyticsPage(); }
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
        // Back online — ask the SW to refresh the data files from the network.
        // These fetches go through the SW (network-first), so if the server has
        // new data the SW updates DATA_CACHE before returning.
        const [holidaysChanged, scheduleChanged] = await Promise.all([reloadHolidays(), reloadWorkdays()]);
        if (holidaysChanged || scheduleChanged) {
            invalidateFunBreak();
            renderAll();
            showToast(t('Data updated', 'ဒေတာ အပ်ဒိတ်ပြီး'), 'info');
        }
    });

    window.addEventListener('offline', () => {
        _setOfflineBanner(true);
    });

    // ── SW message: a data file was updated while the app was open ──────────
    // The SW's network-first handler sends this when a background fetch detects
    // changed server data (e.g. the page was loaded while online and the server
    // had newer data since the last visit).
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.addEventListener('message', async event => {
            if (event.data?.type === 'DATA_UPDATED') {
                const [holidaysChanged, scheduleChanged] = await Promise.all([reloadHolidays(), reloadWorkdays()]);
                if (holidaysChanged || scheduleChanged) {
                    invalidateFunBreak();
                    renderAll();
                    showToast(t('Data updated', 'ဒေတာ အပ်ဒိတ်ပြီး'), 'info');
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
