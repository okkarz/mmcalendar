# Myanmar Calendar 2025

A simple and smart calendar application that displays both Gregorian and Myanmar calendar dates with public holidays.

## Features

- 📅 **Dual Calendar Display**: Shows both Gregorian and Myanmar calendar dates
- 🎉 **Public Holidays**: Includes all Myanmar public holidays for 2025
- 🌙 **Moon Phases**: Displays moon phases (Full Moon, New Moon, Waxing, Waning)
- 🎨 **Modern UI**: Beautiful, responsive design with gradient colors
- 📱 **Mobile Friendly**: Works perfectly on all devices
- 🖱️ **Interactive**: Click on any day to see detailed information

## Public Holidays Included

### Fixed Gregorian Holidays
- Independence Day (Jan 4)
- Union Day (Feb 12)
- Peasants' Day (Mar 2)
- Armed Forces Day (Mar 27)
- Labour Day (May 1)
- Martyrs' Day (Jul 19)
- Christmas Day (Dec 25)
- New Year's Eve (Dec 31)

### Myanmar Calendar Based Holidays
- Thingyan Festival (Water Festival / Myanmar New Year)
- Kason Full Moon (Buddha's Birthday)
- Waso Full Moon (Beginning of Buddhist Lent)
- Thadingyut Full Moon (End of Buddhist Lent / Festival of Lights)
- Tazaungmon Full Moon (Festival of Lights)
- National Day
- Tabaung Full Moon
- Karen New Year
- Kayin New Year

## Files Structure

```
mmcalendar/
├── index.html       # Main HTML file
├── style.css        # Styling and design
├── mmcal.js         # Myanmar calendar calculation engine
├── holidays.js      # Holiday data and helper functions
├── app.js           # Main application logic
└── README.md        # This file
```

## How to Use

1. Open `index.html` in a modern web browser
2. Navigate through months using "Previous" and "Next" buttons
3. Click on any day to see detailed information including:
   - Myanmar calendar date
   - Moon phase
   - Holidays (if any)
4. View all holidays for the current month in the "Public Holidays" section

## Technical Details

### Myanmar Calendar Calculation
The calendar uses the traditional Myanmar calendar calculation algorithm based on:
- Solar year: 365.2587565 days
- Lunar month: 29.53058795 days
- Based on the mmcal project by yan9a (https://github.com/yan9a/mmcal)

### Technologies Used
- HTML5
- CSS3 (with CSS Grid and Flexbox)
- Vanilla JavaScript (no frameworks required)

## Features Explanation

### Calendar Display
- **Today's Date**: Highlighted with purple gradient
- **Holidays**: Marked with yellow background and golden indicator (●)
- **Full Moon Days**: Marked with blue border
- **Myanmar Day Number**: Shown below the Gregorian date

### Holiday Types
1. **Gregorian Calendar Holidays**: Fixed dates every year
2. **Myanmar Calendar Holidays**: Based on lunar calendar (moon phases)
3. **Special Festivals**: Multi-day events like Thingyan

## Browser Compatibility

Works on all modern browsers:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Credits

- Myanmar Calendar Algorithm: Based on yan9a/mmcal
- Holiday Information: Myanmar government official holidays
- Design: Custom modern UI

## License

MIT License - Feel free to use and modify

## Future Enhancements

Possible improvements:
- Add more regional holidays
- Support for other languages
- Print functionality
- Export events to Google Calendar/iCal
- Historical dates lookup
- Astrological information
- Festival details and customs

---

Made with ❤️ for Myanmar
