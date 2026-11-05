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
  Each entry has a Bhog status: "To be delivered" or "Issued". Set it from the entry card,
  or when adding a new entry. The top boxes and filter buttons list each group
  (sorted by 2026 bill number). The CSV export has a "2026 Bhog" column.
