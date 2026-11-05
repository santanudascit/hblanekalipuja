H B LANE KALI PUJA - BILL SEARCH (2025 locked / 2026 editable)
==============================================================
public/index.html            The app (all 272 bills from your 2025 Excel are embedded, read-only)
netlify/functions/status.mjs Saves 2026 status, 2026 amounts and manual entries so everyone sees the same data
netlify.toml, package.json   Netlify config

2025: amount and status come from the Excel and cannot be changed in the app.
2026: Mark Paid / Mark Due, edit amount, add or edit the 2026 bill number (also for bills found from 2025), add manual entries, delete manual entries.
Export: "Export CSV" downloads both years in one file (opens in Excel).

OPTION A - Quick (drag & drop)
  Drop the "public" folder on app.netlify.com/drop.
  Everything works, but 2026 changes are saved only on the device/browser used.

OPTION B - Shared 2026 data for everyone (recommended)
  1. Push this whole folder to GitHub, then in Netlify: Add new site > Import from Git
     (or: npm i -g netlify-cli && netlify deploy --prod).
  2. Recommended: Site settings > Environment variables > add ADMIN_PIN = your secret PIN.
     Then only people who know the PIN can change 2026 data (anyone can still search).

EDITING PIN
  If ADMIN_PIN is set, the app asks for the PIN the first time someone tries to edit/add/delete.
  Once the correct PIN is entered it is remembered on that device (until browser data is cleared
  or the lock button in the bottom bar is used to lock the device again).
  If you change ADMIN_PIN in Netlify, devices will be asked again automatically.

BHOG (2026)
  Two optional switches on each entry: "To be delivered" and "Issued". Mark one, both, or none; switch off to undo.
  "Issued" can only be marked from 9 Nov 2026, 12:00 noon India time. Before that the app and the server
  both say "Bhog not ready". The date is BHOG_OPEN in netlify/functions/status.mjs and in public/index.html.
  The top boxes and filter buttons list each group (sorted by 2026 bill number).
  The CSV export has "2026 Bhog To Be Delivered" and "2026 Bhog Issued" columns.

EXPORT / BACKUP / RESTORE  (bottom bar, database icon)
  Export 2026 list : CSV with SL NO, NAME, ADDRESS, AMOUNT, PAYMENT STATUS - 2026 entries only,
                     in ascending 2026 bill-number order (SL NO = the 2026 bill number).
  Backup           : downloads a .json file with all saved 2026 data (amounts, bill nos, status, bhog, manual entries).
  Restore          : pick a backup .json; it REPLACES all current 2026 data (needs the admin PIN). 2025 data is never touched.

BHOG BOXES
  When "Issued" is on, a "Boxes issued" number box appears (whole number) on the entry and in the Add Entry form.
  Switching Issued off clears it. The top "Bhog issued" box also shows the total boxes issued. Included in backups.
