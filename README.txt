HAZRA BAGAN LANE SARBOJANIN SRI SRI KALI PUJA SAMITY (Reg. No. S0060686) - BILLS & EXPENSES (2025 locked / 2026 editable)
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

BILL NOT ISSUED / PREMIUM MEMBERS
  An entry with 2026 data (amount or payment status) but no 2026 bill number is tagged "Bill not issued"
  and listed under the "Bill not issued" button. It disappears from there once a bill number is saved.
  2026 bill numbers 251-300 are premium members: they get a gold "Premium Member" badge and card,
  and are listed under the "Premium members" button (PREMIUM_MIN / PREMIUM_MAX in public/index.html).

EXPENSES (2026)  - "Expenses" tab at the top of the page
  Add Expense (bottom bar, when the Expenses tab is open) = manual entry: Paid to / For, Note (optional), Date,
  and a choice of "Full payment" or "Partial payment" + the amount.
  Partial payment: the expense card shows an "Add another payment" field (amount + date) under the same name.
  Every payment is listed, with a "Total payment" line that adds them all up. A payment can be deleted (x) if
  there is more than one; the whole expense can be deleted too.
  IN-HAND BALANCE = 2026 bill collection (all 2026 bills marked Paid) - 2026 total expenses (all payments).
  It is shown at the top of the Expenses tab and as a box on the Bills tab (tap it to open Expenses).
  The balance turns red when it is negative.
  Data > "Export expenses" downloads a CSV of every payment plus total / collection / in-hand balance.
  Expenses are included in Backup / Restore (older backups without expenses leave current expenses untouched).
  Editing needs the same ADMIN_PIN as the rest of 2026 data.

EXPENSE SEARCH
  The Expenses tab has a search bar with auto-complete (name, note, date or amount). Picking a suggestion or pressing Search
  filters the list; the info line shows the total of the matching expenses. The balance card always shows the overall figures.
  The 2025 Collected / 2025 Due boxes were removed from the top of the Bills tab (the 2025 Paid / Due filter buttons remain).

OTHER INCOME (Expenses tab)
  "Add Expense / Income" > switch to "Other income" for money that is not a bill collection, e.g. "Withdrawn from bank".
  Fields: Source, Note (optional), Date, Amount received. Entries are listed under "Other income" in the Expenses tab
  (searchable, can be deleted) and are included in the expenses CSV export and in Backup / Restore.
  IN-HAND BALANCE = 2026 bill collection + other income - 2026 total expenses.

NO DATE IN EXPENSE / INCOME ENTRY
  The Add Expense / Other income form and the "Add another payment" field no longer ask for a date.
  Today's date is saved quietly in the background (used only to keep newest entries first); it is not shown,
  not searched and not in the expenses CSV any more.

LOGO / THEME
  public/logo.jpg                Maa Kali picture shown in the page header (round, gold ring) and on the "Search to begin" screen
  public/icon-192.png, icon-512.png, apple-touch-icon.png, manifest.webmanifest
                                 browser tab icon and "Add to Home Screen" icon / name
  To change the picture later, replace these image files (same names).

TITLE, REG. NO. & FIREWORKS
  The header shows "HAZRA BAGAN LANE SARBOJANIN SRI SRI KALI PUJA SAMITY" and "Reg. No. S0060686"
  (also used as the page title and the Home Screen app name).
  Fireworks play on a canvas behind the page. Data panel > "Fireworks background" switches them on/off on that device.
  See FEATURES.txt for the full feature list.

SUB CATEGORY (partial payments)
  When "Partial payment" is chosen in Add Expense, an optional "Sub category" text field appears next to the first payment.
  Every "Add another payment" box also has an optional "Sub category" field. It is shown on each payment line
  (e.g. "Payment 2 · Labour"), can be searched, is saved in backups and has its own column in the expenses CSV.
