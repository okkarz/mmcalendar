const fs = require('fs');
const code = fs.readFileSync('mmcal.js', 'utf8');
eval(code);

const jdn = mmCal.w2j(2026, 2, 11);
const mDate = mmCal.j2m(jdn);
const dayOfWeek = (Math.round(jdn) + 2) % 7;

console.log('Testing Feb 11, 2026:');
console.log('===================');
console.log('JDN:', Math.round(jdn));
console.log('Day of week:', dayOfWeek, '-', mmCal.getDayName(dayOfWeek));
console.log('Myanmar Year:', mDate.my);
console.log('Myanmar Month:', mDate.mm, '-', mmCal.getMonthNameMM(mDate.mm));
console.log('Myanmar Day:', mDate.md);
console.log('Year type:', mDate.myt);
console.log('Moon Phase:', mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt));
console.log('');
console.log('Expected: Wednesday, Tabodwe (mm=11), Waning (လဆုတ်), Day 10');
console.log('Got:', mmCal.getDayName(dayOfWeek) + ',', mmCal.getMonthName(mDate.mm), '(mm=' + mDate.mm + '),', mmCal.getMoonPhaseMM(mDate.md, mDate.mm, mDate.myt) + ',', 'Day', mDate.md);
