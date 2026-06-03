// Myanmar Calendar Core Functions
// Accurate algorithm from yan9a/mmcal

class MyanmarCalendar {
    constructor() {
        this.SY = 1577917828.0 / 4320000.0; // solar year (365.2587565)
        this.LM = 1577917828.0 / 53433336.0; // lunar month (29.53058795)
        this.MO = 1954168.050623; // beginning of 0 ME for MMT
    }

    // Binary search helper
    bSearch2(k, A) {
        let i = 0;
        let l = 0;
        let u = A.length - 1;
        while (u >= l) {
            i = Math.floor((l + u) / 2);
            if (A[i][0] > k) u = i - 1;
            else if (A[i][0] < k) l = i + 1;
            else return i;
        }
        return -1;
    }

    // Get Myanmar Year Constants depending on era
    getMyConst(my) {
        let EI, WO, NM, EW = 0;
        let fme, wte;
        
        // The third era (the era after Independence 1312 ME and after)
        if (my >= 1312) {
            EI = 3;
            WO = -0.5;
            NM = 8;
            fme = [[1377, 1]];
            wte = [1344, 1345];
        }
        // The second era (the era under British colony: 1217 ME - 1311 ME)
        else if (my >= 1217) {
            EI = 2;
            WO = -1;
            NM = 4;
            fme = [[1234, 1], [1261, -1]];
            wte = [1263, 1264];
        }
        // The first era (the era of Myanmar kings: ME1216 and before)
        // Thandeikta (ME 1100 - 1216)
        else if (my >= 1100) {
            EI = 1.3;
            WO = -0.85;
            NM = -1;
            fme = [[1120, 1], [1126, -1], [1150, 1], [1172, -1], [1207, 1]];
            wte = [1201, 1202];
        }
        // Makaranta system 2 (ME 798 - 1099)
        else if (my >= 798) {
            EI = 1.2;
            WO = -1.1;
            NM = -1;
            fme = [[813, -1], [849, -1], [851, -1], [854, -1], [927, -1], 
                   [933, -1], [936, -1], [938, -1], [949, -1], [952, -1], 
                   [963, -1], [968, -1], [1039, -1]];
            wte = [];
        }
        // Makaranta system 1 (ME 0 - 797)
        else {
            EI = 1.1;
            WO = -1.1;
            NM = -1;
            fme = [[205, 1], [246, 1], [471, 1], [572, -1], [651, 1], 
                   [653, 2], [656, 1], [672, 1], [729, 1], [767, -1]];
            wte = [];
        }
        
        const i = this.bSearch2(my, fme);
        if (i >= 0) WO += fme[i][1]; // full moon day offset exceptions
        
        if (wte.indexOf(my) >= 0) EW = 1; // watat exceptions
        
        return { EI, WO, NM, EW };
    }

    // Check watat (intercalary month)
    calWatat(my) {
        const c = this.getMyConst(my);
        const TA = (this.SY / 12 - this.LM) * (12 - c.NM);
        let ed = (this.SY * (my + 3739)) % this.LM;
        if (ed < TA) ed += this.LM;
        const fm = Math.round(this.SY * my + this.MO - ed + 4.5 * this.LM + c.WO);
        
        let TW = 0;
        let watat = 0;
        
        if (c.EI >= 2) {
            TW = this.LM - (this.SY / 12 - this.LM) * c.NM;
            if (ed >= TW) watat = 1;
        } else {
            watat = (my * 7 + 2) % 19;
            if (watat < 0) watat += 19;
            watat = Math.floor(watat / 12);
        }
        
        watat ^= c.EW; // correct watat exceptions
        
        return { fm, watat };
    }

    // Check Myanmar Year
    calMy(my) {
        let yd = 0;
        const y2 = this.calWatat(my);
        let myt = y2.watat;
        let y1;
        let nd = 0;
        let werr = 0;
        let fm = 0;
        
        do {
            yd++;
            y1 = this.calWatat(my - yd);
        } while (y1.watat == 0 && yd < 3);
        
        if (myt) {
            nd = (y2.fm - y1.fm) % 354;
            myt = Math.floor(nd / 31) + 1;
            fm = y2.fm;
            if (nd != 30 && nd != 31) werr = 1;
        } else {
            fm = y1.fm + 354 * yd;
        }
        
        const tg1 = y1.fm + 354 * yd - 102;
        
        return { myt, tg1, fm, werr };
    }

    // Julian Day Number to Myanmar Date
    j2m(jdn) {
        jdn = Math.round(jdn);
        const my = Math.floor((jdn - 0.5 - this.MO) / this.SY);
        const yo = this.calMy(my);
        let dd = jdn - yo.tg1 + 1;
        
        const b = Math.floor(yo.myt / 2);
        const c = Math.floor(1 / (yo.myt + 1));
        const myl = 354 + (1 - c) * 30 + b;
        const mmt = Math.floor((dd - 1) / myl);
        dd -= mmt * myl;  // modify dd, don't create new variable
        
        const a = Math.floor((dd + 423) / 512);
        const mm = Math.floor((dd - b * a + c * a * 30 + 29.26) / 29.544);
        const e = Math.floor((mm + 12) / 16);
        const f = Math.floor((mm + 11) / 16);
        const md = dd - Math.floor(29.544 * mm - 29.26) - b * e + c * f * 30;
        const mmf = mm + f * 3 - e * 4 + 12 * mmt;
        
        return {
            my: my,
            mm: mmf,
            md: md,
            myt: yo.myt
        };
    }

    // Western Date to Julian Day Number
    w2j(y, m, d, h = 12, n = 0, s = 0) {
        const a = Math.floor((14 - m) / 12);
        const y2 = y + 4800 - a;
        const m2 = m + (12 * a) - 3;
        
        const jd = d + Math.floor((153 * m2 + 2) / 5) + (365 * y2) + 
                   Math.floor(y2 / 4) - Math.floor(y2 / 100) + 
                   Math.floor(y2 / 400) - 32045;
        
        const jf = ((h - 12) / 24.0) + (n / 1440.0) + (s / 86400.0);
        
        return jd + jf;
    }

    // Get month length
    getMonthLength(mm, myt) {
        let mml = 30 - mm % 2;
        if (mm == 3) mml += Math.floor(myt / 2);
        return mml;
    }

    // Get fortnight day from day of month
    getFortnightDay(md) {
        return md - 15 * Math.floor(md / 16);
    }

    // Get moon phase from day of month, month, and year type
    getMoonPhase(md, mm, myt) {
        const mml = this.getMonthLength(mm, myt);
        const mp = Math.floor((md + 1) / 16) + Math.floor(md / 16) + Math.floor(md / mml);
        const phases = ["Waxing", "Full Moon", "Waning", "New Moon"];
        return phases[mp];
    }

    // Get Myanmar Month Name
    getMonthName(mm) {
        const months = [
            "First Waso", "Tagu", "Kason", "Nayon", "Waso", 
            "Wagaung", "Tawthalin", "Thadingyut", "Tazaungmon",
            "Nadaw", "Pyatho", "Tabodwe", "Tabaung", 
            "Late Tagu", "Late Kason"
        ];
        return months[mm] || "";
    }

    // Get Myanmar Month Name in Myanmar
    getMonthNameMM(mm) {
        const months = [
            "ပထမဝါဆို", "တန်ခူး", "ကဆုန်", "နယုန်", "ဝါဆို", 
            "ဝါခေါင်", "တော်သလင်း", "သီတင်းကျွတ်", "တန်ဆောင်မုန်း",
            "နတ်တော်", "ပြာသို", "တပို့တွဲ", "တပေါင်း", 
            "နောက်ဆုံးတန်ခူး", "နောက်ဆုံးကဆုန်"
        ];
        return months[mm] || "";
    }

    getMonthNameEN(mm) {
        const months = [
            "First Waso", "Tagu", "Kason", "Nayon", "Waso",
            "Wagaung", "Tawthalin", "Thadingyut", "Tazaungmon",
            "Nadaw", "Pyatho", "Tabodwe", "Tabaung",
            "Late Tagu", "Late Kason"
        ];
        return months[mm] || "";
    }

    // Get Moon Phase in Myanmar
    getMoonPhaseMM(md, mm, myt) {
        const mml = this.getMonthLength(mm, myt);
        const mp = Math.floor((md + 1) / 16) + Math.floor(md / 16) + Math.floor(md / mml);
        const phases = ["လဆန်း", "လပြည့်", "လဆုတ်", "လကွယ်"];
        return phases[mp];
    }

    getMoonPhaseEN(md, mm, myt) {
        const mml = this.getMonthLength(mm, myt);
        const mp = Math.floor((md + 1) / 16) + Math.floor(md / 16) + Math.floor(md / mml);
        const phases = ["Waxing", "Full Moon", "Waning", "New Moon"];
        return phases[mp];
    }

    // Get English day name
    getDayName(dayOfWeek) {
        const days = ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        return days[dayOfWeek];
    }

    // Get Myanmar day name
    getDayNameMM(dayOfWeek) {
        const days = ["စနေ", "တနင်္ဂနွေ", "တနင်္လာ", "အင်္ဂါ", "ဗုဒ္ဓဟူး", "ကြာသပတေး", "သောကြာ"];
        return days[dayOfWeek];
    }

    // Calculate Yatyaza (ရက်ရာဇာ)
    // input: mm = month [0-14], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if yatyaza, 0 otherwise
    calYatyaza(mm, wd) {
        // First waso is considered waso
        const m1 = mm % 4;
        const wd1 = Math.floor(m1 / 2) + 4;
        const wd2 = ((1 - Math.floor(m1 / 2)) + m1 % 2) * (1 + 2 * (m1 % 2));
        return ((wd === wd1) || (wd === wd2)) ? 1 : 0;
    }

    // Calculate Pyathada (ပြဿဒါး)
    // input: mm = month [0-14], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1=pyathada, 2=afternoon pyathada, 0=none
    calPyathada(mm, wd) {
        // First waso is considered waso
        const m1 = mm % 4;
        const wda = [1, 3, 3, 0, 2, 1, 2];
        if ((m1 === 0) && (wd === 4)) return 2; // afternoon pyathada
        if (m1 === wda[wd]) return 1;
        return 0;
    }

    // Calculate Mahabote (မဟာဘုတ်)
    // input: my = Myanmar year, wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 0-6 representing [Binga, Atun, Yaza, Adipati, Marana, Thike, Puti]
    calMahabote(my, wd) {
        return (my - wd) % 7;
    }

    // Get Mahabote name in Myanmar
    getMahaboteMM(value) {
        const names = ["ဘင်္ဂ ဖွား", "အထွန်း ဖွား", "ရာဇ ဖွား", "အဓိပတိ ဖွား", "မရဏ ဖွား", "သိုက် ဖွား", "ပုတိ ဖွား"];
        return names[value];
    }

    getMahaboteEN(value) {
        const names = ["Binga", "Atun", "Yaza", "Adipati", "Marana", "Thike", "Puti"];
        return names[value];
    }

    // Calculate Nakhat (နက္ခက်) - Human/Elf/Ogre
    // input: my = Myanmar year
    // output: 0=Ogre, 1=Elf, 2=Human
    calNakhat(my) {
        return my % 3;
    }

    // Get Nakhat name in Myanmar
    getNakhatMM(value) {
        const names = ["ဘီလူး", "နတ်", "လူ"];
        return names[value];
    }

    getNakhatEN(value) {
        const names = ["Ogre", "Elf", "Human"];
        return names[value];
    }

    // Calculate Nagahle (နဂါးခေါင်း) - Naga head direction
    // input: mm = month [0-14]
    // output: 0=West, 1=North, 2=East, 3=South
    calNagahle(mm) {
        let m = mm;
        if (m <= 0) m = 4; // first waso is considered waso
        return Math.floor((m % 12) / 3);
    }

    // Get Nagahle direction in Myanmar
    getNagahleMM(value) {
        const directions = ["အနောက်ဘက်ပြု", "မြောက်ဘက်ပြု", "အရှေ့ဘက်ပြု", "တောင်ဘက်ပြု"];
        return directions[value];
    }

    getNagahleEN(value) {
        const directions = ["West", "North", "East", "South"];
        return directions[value];
    }

    // Calculate Thamanyo (သမား)
    // input: my = Myanmar year
    // output: 0=white (even year - auspicious), 1=black (odd year - inauspicious)
    calThamanyo(my) {
        return my % 2; // 0=even=white, 1=odd=black
    }

    // Get Thamanyo name in English
    getThamanyo(value) {
        const names = ["White (Even Year)", "Black (Odd Year)"];
        return names[value];
    }

    // Get Thamanyo name in Myanmar
    getThamanyoMM(value) {
        const names = ["သမားဖြူ (စုံနှစ်)", "သမားညို (မညှစ်)"];
        return names[value];
    }

    // Calculate Myanmar 12-year name index (0-11)
    // r = my mod 12 with safe mod for negatives
    calYearName(my) {
        return ((my % 12) + 12) % 12;
    }

    // Get Myanmar 12-year name (Sanskrit + Myanmar)
    getYearNameMM(value) {
        const names = [
            "Pushya (ပုဿနှစ် / ဖုသျှနှစ်)",
            "Magha (မာခနှစ်)",
            "Phalguni (ဖ္လကိုန်နှစ်)",
            "Chitra (စယ်နှစ် / စယနှစ်)",
            "Visakha (ပိသျက်နှစ်)",
            "Jyeshtha (စိဿနှစ်)",
            "Ashadha (အာသတ်နှစ်)",
            "Sravana (သရဝန်နှစ် / သရဝဏ်နှစ်)",
            "Bhadrapaha (ဘဒ္ဒြသံဝစ္ဆိုရ်နှစ်)",
            "Asvini (အာသိန်နှစ်)",
            "Krittika (ကြတိုက်နှစ်)",
            "Mrigasiras (မြိက္ကသိုဝ်နှစ် / မိဂသီနှစ်)"
        ];
        return names[value];
    }

    getYearNameEN(value) {
        const names = [
            "Pushya", "Magha", "Phalguni", "Chitra", "Visakha",
            "Jyeshtha", "Ashadha", "Sravana", "Bhadrapada",
            "Asvini", "Krittika", "Mrigasiras"
        ];
        return names[value];
    }

    // Calculate Buddhist Era from Myanmar Year
    // BE = MY + 1182
    getBuddhistEra(my) {
        return my + 1182;
    }

    // Calculate Sabbath (ဥပုသ်) and Sabbath Eve (အဖိတ်)
    // input: md = day of month [0-30], mml = length of month
    // output: {sabbath: 0/1, sabbatheve: 0/1}
    calSabbath(md, mml) {
        const sabbath = (md === 8 || md === 15 || md === 23 || md === mml) ? 1 : 0;
        const sabbatheve = (md === 7 || md === 14 || md === 22 || md === (mml - 1)) ? 1 : 0;
        return { sabbath, sabbatheve };
    }

    // Calculate Thamanyo day (သမားညို) - different from year-based Thamanyo
    // Based on month and weekday
    // input: mm = month [0-14], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if thamanyo day, 0 otherwise
    calThamanyoDay(mm, wd) {
        let m1 = mm - 1 - Math.floor(mm / 9);
        const wd1 = (m1 * 2 - Math.floor(m1 / 8)) % 7;
        const wd2 = (wd + 7 - wd1) % 7;
        return (wd2 <= 1) ? 1 : 0;
    }

    // Calculate Amyeittasote (အမြိတ္တစုတ်) - auspicious day
    // input: d = waxing or waning day [1-15], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if amyeittasote, 0 otherwise
    calAmyeittasote(d, wd) {
        const wda = [5, 8, 3, 7, 2, 4, 1];
        return (d === wda[wd]) ? 1 : 0;
    }

    // Calculate Warameittugyi (ဝါရမိတ္တုကြီး) - inauspicious day
    // input: d = waxing or waning day [0-15], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if warameittugyi, 0 otherwise
    calWarameittugyi(d, wd) {
        const wda = [7, 1, 4, 8, 9, 6, 3];
        return (d === wda[wd]) ? 1 : 0;
    }

    // Calculate Warameittunge (ဝါရမိတ္တုငယ်) - inauspicious day
    // input: d = waxing or waning day [1-15], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if warameittunge, 0 otherwise
    calWarameittunge(d, wd) {
        const wn = (wd + 6) % 7;
        return ((12 - d) === wn) ? 1 : 0;
    }

    // Calculate Yatpote (ရက်ပုပ်) - inauspicious day
    // input: d = waxing or waning day [1-15], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if yatpote, 0 otherwise
    calYatpote(d, wd) {
        const wda = [8, 1, 4, 6, 9, 8, 7];
        return (d === wda[wd]) ? 1 : 0;
    }

    // Calculate Thamaphyu (သမားဖြူ) - auspicious day
    // input: d = waxing or waning day [1-15], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if thamaphyu, 0 otherwise
    calThamaphyu(d, wd) {
        const wda1 = [1, 2, 6, 6, 5, 6, 7];
        if (d === wda1[wd]) return 1;
        const wda2 = [0, 1, 0, 0, 0, 3, 3];
        if (d === wda2[wd]) return 1;
        if ((d === 4) && (wd === 5)) return 1;
        return 0;
    }

    // Calculate Nagapor (နဂါးပေါ်) - inauspicious day
    // input: md = day of month [0-30], wd = weekday [0=sat, 1=sun, ..., 6=fri]
    // output: 1 if nagapor, 0 otherwise
    calNagapor(md, wd) {
        const wda1 = [26, 21, 2, 10, 18, 2, 21];
        if (md === wda1[wd]) return 1;
        const wda2 = [17, 19, 1, 0, 9, 0, 0];
        if (md === wda2[wd]) return 1;
        if ((md === 2 && wd === 1) || ((md === 12 || md === 4 || md === 18) && wd === 2)) return 1;
        return 0;
    }

    // Calculate Yatyotema (ရက်ယုတ်မာ) - inauspicious day
    // input: mm = month [0-14], d = waxing or waning day [1-15]
    // output: 1 if yatyotema, 0 otherwise
    calYatyotema(mm, d) {
        let m1 = (mm % 2) ? mm : ((mm + 9) % 12);
        m1 = (m1 + 4) % 12 + 1;
        return (d === m1) ? 1 : 0;
    }

    // Calculate Mahayatkyan (မဟာရက်ကြမ်း) - inauspicious day
    // input: mm = month [0-14], d = waxing or waning day [1-15]
    // output: 1 if mahayatkyan, 0 otherwise
    calMahayatkyan(mm, d) {
        const m1 = (Math.floor((mm % 12) / 2) + 4) % 6 + 1;
        return (d === m1) ? 1 : 0;
    }

    // Calculate Shanyat (ရှမ်းရက်) - inauspicious day
    // input: mm = month [0-14], d = waxing or waning day [1-15]
    // output: 1 if shanyat, 0 otherwise
    calShanyat(mm, d) {
        const sya = [8, 8, 2, 2, 9, 3, 3, 5, 1, 4, 7, 4];
        // Map mm to 1-12 range
        let m = mm;
        if (m <= 0) m = 4; // First waso = waso
        const idx = (m - 1) % 12;
        return (d === sya[idx]) ? 1 : 0;
    }
}

// Create global instance
const mmCal = new MyanmarCalendar();
