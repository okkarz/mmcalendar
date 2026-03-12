// Main Application Logic

let currentDate = new Date();
let currentYear = currentDate.getFullYear();
let currentMonth = currentDate.getMonth() + 1;

// Convert to Myanmar numerals
function convertToMyanmarNumber(num) {
    const myanmarDigits = ['၀', '၁', '၂', '၃', '၄', '၅', '၆', '၇', '၈', '၉'];
    return num.toString().split('').map(d => myanmarDigits[parseInt(d)]).join('');
}

// Initialize calendar
document.addEventListener('DOMContentLoaded', async function() {
    await holidaysReady;           // wait for holidays.json to load
    renderCalendar(currentYear, currentMonth);
    setupEventListeners();
});

function setupEventListeners() {
    document.getElementById('prevMonth').addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 1) { currentMonth = 12; currentYear--; }
        renderCalendar(currentYear, currentMonth);
    });

    document.getElementById('nextMonth').addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 12) { currentMonth = 1; currentYear++; }
        renderCalendar(currentYear, currentMonth);
    });

    // Print button
    document.getElementById('printBtn').addEventListener('click', () => window.print());

    // Dark / light mode toggle
    document.getElementById('themeToggle').addEventListener('click', () => {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (isDark) {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('mm-theme', 'light');
        } else {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('mm-theme', 'dark');
        }
    });

    // Modal close button
    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target === e.currentTarget) closeModal();
    });

    // Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { closeModal(); closePicker(); }
    });

    // Month/Year picker toggle
    const currentDateBtn = document.getElementById('currentDateBtn');
    currentDateBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = document.getElementById('monthPicker').classList.contains('open');
        isOpen ? closePicker() : openPicker();
    });

    // Picker year nav
    document.getElementById('pickerPrevYear').addEventListener('click', (e) => {
        e.stopPropagation();
        pickerYear--;
        renderPicker();
    });
    document.getElementById('pickerNextYear').addEventListener('click', (e) => {
        e.stopPropagation();
        pickerYear++;
        renderPicker();
    });

    // Today button inside picker
    document.getElementById('pickerToday').addEventListener('click', (e) => {
        e.stopPropagation();
        const today = new Date();
        currentYear  = today.getFullYear();
        currentMonth = today.getMonth() + 1;
        renderCalendar(currentYear, currentMonth);
        closePicker();
    });

    // Close picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!document.getElementById('currentDateBtn').contains(e.target)) {
            closePicker();
        }
    });
}

// ——— Picker state ———
let pickerYear = currentYear;

function openPicker() {
    pickerYear = currentYear;
    renderPicker();
    document.getElementById('monthPicker').classList.add('open');
    document.getElementById('currentDateBtn').setAttribute('aria-expanded', 'true');
}

function closePicker() {
    document.getElementById('monthPicker').classList.remove('open');
    document.getElementById('currentDateBtn').setAttribute('aria-expanded', 'false');
}

function renderPicker() {
    const monthAbbr = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    document.getElementById('pickerYear').textContent = pickerYear;

    const grid = document.getElementById('pickerMonthsGrid');
    grid.innerHTML = '';
    monthAbbr.forEach((name, idx) => {
        const m = idx + 1;
        const btn = document.createElement('button');
        btn.className = 'picker-month-btn';
        btn.textContent = name;
        if (pickerYear === currentYear && m === currentMonth) btn.classList.add('active');
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            currentYear = pickerYear;
            currentMonth = m;
            renderCalendar(currentYear, currentMonth);
            closePicker();
        });
        grid.appendChild(btn);
    });
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
}

function renderCalendar(year, month) {
    // Update header
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];

    // Compute which Myanmar months appear in this Gregorian month
    // (one Eng month can span 2, rarely 3 Myanmar months)
    const daysInMonth = new Date(year, month, 0).getDate();
    const seen = [];
    for (let d = 1; d <= daysInMonth; d++) {
        const jdn = mmCal.w2j(year, month, d);
        const md  = mmCal.j2m(jdn);
        const key = `${md.my}-${md.mm}`;
        if (!seen.find(x => x.key === key)) {
            seen.push({ key, mm: md.mm, my: md.my, myt: md.myt });
        }
    }

    // Build display strings
    // In a Waso-leap year (myt >= 1), ဝါဆို (mm=4) is the 2nd Waso → rename to ဒုတိယဝါဆို
    const isWasoLeap = seen.some(s => s.myt >= 1);
    // Strip နောက်ဆုံး prefix — just show the base month name, deduplicate
    const rawNames = seen.map(s => {
        let name = mmCal.getMonthNameMM(s.mm).replace(/^နောက်ဆုံး/, '');
        if (isWasoLeap && s.mm === 4) name = 'ဒုတိယဝါဆို';
        return name;
    });
    const mmMonthNames = rawNames.filter((name, i) => rawNames.indexOf(name) === i);
    const mmYears      = [...new Set(seen.map(s => s.my))];
    const mmMonthStr   = mmMonthNames.join(' / ');
    const mmYearStr    = mmYears.map(y => convertToMyanmarNumber(y)).join('-');
    // Subtitle inside picker button = months only (year shown separately below)
    const mmMonthSubtitle = mmMonthStr;
    // Full string for print header
    const mmSubtitle = `${mmMonthStr}၊ မြန်မာသက္ကရာဇ် ${mmYearStr} ခု`;

    document.getElementById('currentMonth').innerHTML = `
        <div>${monthNames[month - 1]} ${year}</div>
        <div style="font-size: 0.82em; margin-top: 4px; color: #6b7285;">${mmMonthSubtitle}</div>
    `;

    // Mirror into print-only header
    const ptEN = document.getElementById('printTitleEN');
    const ptMM = document.getElementById('printTitleMM');
    if (ptEN) ptEN.textContent = `${monthNames[month - 1]} ${year}`;
    if (ptMM) ptMM.textContent = mmSubtitle;

    // Update picker sub-label — year only, shown once
    document.getElementById('myanmarDate').textContent = `မြန်မာသက္ကရာဇ် ${mmYearStr} ခု`;

    // Render calendar days
    renderDays(year, month);
    
    // Render holidays list
    renderHolidaysList(year, month);
}

function renderDays(year, month) {
    const calendarDays = document.getElementById('calendarDays');
    calendarDays.innerHTML = '';
    
    const firstDay = new Date(year, month - 1, 1).getDay();
    const daysInMonth = new Date(year, month, 0).getDate();
    const today = new Date();
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDiv = document.createElement('div');
        emptyDiv.classList.add('calendar-day', 'empty');
        calendarDays.appendChild(emptyDiv);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dayDiv = document.createElement('div');
        dayDiv.classList.add('calendar-day');
        
        // Check if today
        if (year === today.getFullYear() && 
            month === today.getMonth() + 1 && 
            day === today.getDate()) {
            dayDiv.classList.add('today');
        }
        
        // Get Myanmar date
        const jdn = mmCal.w2j(year, month, day);
        const mDate = mmCal.j2m(jdn);
        const moonPhase = mmCal.getMoonPhase(mDate.md, mDate.mm, mDate.myt);
        const fortnightDay = mmCal.getFortnightDay(mDate.md);
        const dayOfWeek = new Date(year, month - 1, day).getDay();
        const weekdayMM = (dayOfWeek + 1) % 7; // Convert to Myanmar weekday [0=sat, 1=sun, ...]
        const yatyaza = mmCal.calYatyaza(mDate.mm, weekdayMM);
        const pyathada = mmCal.calPyathada(mDate.mm, weekdayMM);
        
        // Calculate special days for grid display
        const d = fortnightDay;
        const mml = (mDate.myt >= 2) ? 30 : 29;
        const sabbath = mmCal.calSabbath(mDate.md, mml);
        const amyeittasote = mmCal.calAmyeittasote(d, weekdayMM);
        const thamaphyu = mmCal.calThamaphyu(d, weekdayMM);
        
        // Check for holidays
        const holidays = getHolidayInfo(year, month, day);
        
        if (holidays.length > 0) {
            dayDiv.classList.add('holiday');
        }
        
        // Check for full moon
        if (moonPhase === 'Full Moon') {
            dayDiv.classList.add('full-moon');
        }
        
        // Check for yatyaza or pyathada
        if (yatyaza === 1) {
            dayDiv.classList.add('yatyaza');
        }
        if (pyathada > 0) {
            dayDiv.classList.add('pyathada');
        }
        
        // Check for special auspicious days
        if (sabbath.sabbath === 1 || amyeittasote === 1 || thamaphyu === 1) {
            dayDiv.classList.add('auspicious-day');
        }
        
        // Add moon phase indicator
        let moonIndicator = '';
        if (moonPhase === 'Full Moon') {
            moonIndicator = '<div class="moon-indicator full-moon-icon">🌕</div>';
        } else if (moonPhase === 'New Moon') {
            moonIndicator = '<div class="moon-indicator new-moon-icon">🌑</div>';
        }
        
        // Build day content
        const holidayLabel = holidays.length > 0
            ? `<div class="holiday-label" title="${holidays.map(h => h.name).join(', ')}">${holidays[0].nameMM}</div>`
            : '';

        dayDiv.innerHTML = `
            <div class="day-number">${day}</div>
            <div class="myanmar-day">${convertToMyanmarNumber(fortnightDay)}</div>
            ${moonIndicator}
            ${holidayLabel}
        `;
        
        // Add click event
        dayDiv.addEventListener('click', () => {
            showDayInfo(year, month, day, mDate, holidays);
        });
        
        calendarDays.appendChild(dayDiv);
    }
}

function renderHolidaysList(year, month) {
    const holidaysList = document.getElementById('holidaysList');
    const holidays = getMonthHolidays(year, month);
    
    if (holidays.length === 0) {
        holidaysList.innerHTML = '<p class="no-holidays">No public holidays this month</p>';
        return;
    }
    
    let html = '<div class="holidays-list">';
    for (const item of holidays) {
        for (const holiday of item.holidays) {
            html += `
                <div class="holiday-item">
                    <div class="holiday-date">${month}/${item.day}</div>
                    <div class="holiday-details">
                        <div class="holiday-name">${holiday.name}</div>
                        <div class="holiday-name-mm">${holiday.nameMM}</div>
                        ${holiday.description ? `<div class="holiday-desc">${holiday.description}</div>` : ''}
                    </div>
                </div>
            `;
        }
    }
    html += '</div>';
    
    holidaysList.innerHTML = html;
}

function showDayInfo(year, month, day, mDate, holidays) {
    const dayInfo = document.getElementById('dayInfo');
    
    const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    const monthNamesMM = [
        'ဇန်နဝါရီ', 'ဖေဖော်ဝါရီ', 'မတ်', 'ဧပြီ', 'မေ', 'ဇွန်',
        'ဇူလိုင်', 'ဩဂုတ်', 'စက်တင်ဘာ', 'အောက်တိုဘာ', 'နိုဝင်ဘာ', 'ဒီဇင်ဘာ'
    ];
    
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayNamesMM = ['တနင်္ဂနွေ', 'တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ'];
    const dayOfWeek = new Date(year, month - 1, day).getDay();
    
    const monthName = mmCal.getMonthName(mDate.mm);
    const monthNameMM = mmCal.getMonthNameMM(mDate.mm);
    const moonPhase = mmCal.getMoonPhase(mDate.md, mDate.mm, mDate.myt);
    const moonPhaseMM = mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt);
    const fortnightDay = mmCal.getFortnightDay(mDate.md);
    const weekdayMM = (dayOfWeek + 1) % 7; // Convert to Myanmar weekday [0=sat, 1=sun, ...]
    const yatyaza = mmCal.calYatyaza(mDate.mm, weekdayMM);
    const pyathada = mmCal.calPyathada(mDate.mm, weekdayMM);
    const mahabote = mmCal.calMahabote(mDate.my, weekdayMM);
    const mahaboteMM = mmCal.getMahaboteMM(mahabote);
    const nakhat = mmCal.calNakhat(mDate.my);
    const nakhatMM = mmCal.getNakhatMM(nakhat);
    const nagahle = mmCal.calNagahle(mDate.mm);
    const nagahleMM = mmCal.getNagahleMM(nagahle);
    const thamanyo = mmCal.calThamanyo(mDate.my);
    const thamanyoMM = mmCal.getThamanyoMM(thamanyo);
    
    // Calculate special days
    const d = fortnightDay; // waxing or waning day
    const mml = (mDate.myt >= 2) ? 30 : 29; // month length
    const sabbath = mmCal.calSabbath(mDate.md, mml);
    const thamanyoDay = mmCal.calThamanyoDay(mDate.mm, weekdayMM);
    const amyeittasote = mmCal.calAmyeittasote(d, weekdayMM);
    const warameittugyi = mmCal.calWarameittugyi(d, weekdayMM);
    const warameittunge = mmCal.calWarameittunge(d, weekdayMM);
    const yatpote = mmCal.calYatpote(d, weekdayMM);
    const thamaphyu = mmCal.calThamaphyu(d, weekdayMM);
    const nagapor = mmCal.calNagapor(mDate.md, weekdayMM);
    const yatyotema = mmCal.calYatyotema(mDate.mm, d);
    const mahayatkyan = mmCal.calMahayatkyan(mDate.mm, d);
    const shanyat = mmCal.calShanyat(mDate.mm, d);
    
    // Calculate year name and Buddhist Era
    const yearName = mmCal.calYearName(mDate.my);
    const yearNameMM = mmCal.getYearNameMM(yearName);
    const buddhistEra = mmCal.getBuddhistEra(mDate.my);
    
    let html = `
        <div class="day-info-content">
            <h4>${dayNames[dayOfWeek]}, ${monthNames[month - 1]} ${day}, ${year}</h4>
            <p class="myanmar-text di-date-mm">${dayNamesMM[dayOfWeek]}၊ ${monthNamesMM[month - 1]} ${convertToMyanmarNumber(day)}၊ ${convertToMyanmarNumber(year)}</p>
            <div class="myanmar-info">
                <p class="myanmar-text di-mm-era">
                    သာသနာသက္ကရာဇ် ${convertToMyanmarNumber(buddhistEra)} ခု<br>
                    မြန်မာသက္ကရာဇ် ${convertToMyanmarNumber(mDate.my)} ခု (${yearNameMM})<br>
                    ${monthNameMM} ${moonPhaseMM} ${convertToMyanmarNumber(fortnightDay)} ရက်
                    ${moonPhase === 'Full Moon' ? '<span class="di-moon">🌕 လပြည့်</span>' : ''}
                    ${moonPhase === 'New Moon' ? '<span class="di-moon">🌑 လကွယ်</span>' : ''}
                </p>
                ${yatyaza === 1 || pyathada > 0 ? '<div class="di-warn-box">' : ''}
                ${yatyaza === 1 ? '<p class="di-warn-text di-warn-red">⚠️ ရက်ရာဇာနေ့</p>' : ''}
                ${pyathada === 1 ? '<p class="di-warn-text di-warn-orange">⚠️ ပြဿဒါးနေ့</p>' : ''}
                ${pyathada === 2 ? '<p class="di-warn-text di-warn-orange">⚠️ ညနေခင်းပြဿဒါးနေ့</p>' : ''}
                ${yatyaza === 1 || pyathada > 0 ? '</div>' : ''}
                <div class="di-astro-box">
                    <p class="di-astro-title">🔮 နက္ခတ်ဗေဒင်</p>
                    <div class="di-astro-grid">
                        <div><span class="di-astro-label">မြန်မာနှစ်:</span> <strong>${yearNameMM}</strong></div>
                        <div><span class="di-astro-label">မဟာဘုတ်:</span> <strong>${mahaboteMM}</strong></div>
                        <div><span class="di-astro-label">နက္ခက်:</span> <strong>${nakhatMM}</strong></div>
                        <div><span class="di-astro-label">နဂါးခေါင်း:</span> <strong>${nagahleMM}</strong></div>
                    </div>
                </div>
            </div>
    `;
    
    // Special days section
    const specialDays = [];
    if (sabbath.sabbath === 1) specialDays.push({ name: 'Sabbath', nameMM: '🕉️ ဥပုသ်', type: 'good' });
    if (sabbath.sabbatheve === 1) specialDays.push({ name: 'Sabbath Eve', nameMM: '🕉️ အဖိတ်နေ့', type: 'good' });
    if (amyeittasote === 1) specialDays.push({ name: 'Amyeittasote', nameMM: '✅ အမြိတ္တစုတ်', type: 'good' });
    if (thamaphyu === 1) specialDays.push({ name: 'Thamaphyu', nameMM: '⚪ သမားဖြူ', type: 'good' });
    if (thamanyoDay === 1) specialDays.push({ name: 'Thamanyo Day', nameMM: '⚫ သမားညို', type: 'bad' });
    if (warameittugyi === 1) specialDays.push({ name: 'Warameittugyi', nameMM: '⚠️ ဝါရမိတ္တုကြီး', type: 'bad' });
    if (warameittunge === 1) specialDays.push({ name: 'Warameittunge', nameMM: '⚠️ ဝါရမိတ္တုငယ်', type: 'bad' });
    if (yatpote === 1) specialDays.push({ name: 'Yatpote', nameMM: '⚠️ ရက်ပုပ်', type: 'bad' });
    if (nagapor === 1) specialDays.push({ name: 'Nagapor', nameMM: '🐉 နဂါးပေါ်', type: 'bad' });
    if (yatyotema === 1) specialDays.push({ name: 'Yatyotema', nameMM: '⛔ ရက်ယုတ်မာ', type: 'bad' });
    if (mahayatkyan === 1) specialDays.push({ name: 'Mahayatkyan', nameMM: '⛔ မဟာရက်ကြမ်း', type: 'bad' });
    if (shanyat === 1) specialDays.push({ name: 'Shanyat', nameMM: '⚠️ ရှမ်းရက်', type: 'bad' });
    
    if (specialDays.length > 0) {
        const goodDays = specialDays.filter(d => d.type === 'good');
        const badDays = specialDays.filter(d => d.type === 'bad');
        
        html += '<div class="di-special-box">';
        html += '<p class="di-special-title">📅 အခါပေးရက်များ</p>';

        if (goodDays.length > 0) {
            html += '<div class="di-special-group">';
            html += '<p class="di-good-label">ကောင်းသောရက်:</p>';
            goodDays.forEach(day => {
                html += `<span class="di-good-badge">${day.nameMM}</span>`;
            });
            html += '</div>';
        }

        if (badDays.length > 0) {
            html += '<div class="di-special-group">';
            html += '<p class="di-bad-label">ရှောင်ရှားရမည့်ရက်:</p>';
            badDays.forEach(day => {
                html += `<span class="di-bad-badge">${day.nameMM}</span>`;
            });
            html += '</div>';
        }
        
        html += '</div>';
    }
    
    if (holidays.length > 0) {
        html += '<div class="day-holidays"><p><strong>Holidays:</strong></p>';
        for (const holiday of holidays) {
            html += `
                <div class="holiday-badge">
                    <div>${holiday.name}</div>
                    <div class="holiday-mm">${holiday.nameMM}</div>
                </div>
            `;
        }
        html += '</div>';
    }
    
    html += '</div>';
    dayInfo.innerHTML = html;
    document.getElementById('modalOverlay').classList.add('active');
}
