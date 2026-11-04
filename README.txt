H B LANE KALI PUJA - BILL SEARCH (2025 locked / 2026 editable)
==============================================================
public/index.html            The app (all 272 bills from your 2025 Excel are embedded, read-only)
netlify/functions/status.mjs Saves 2026 status, 2026 amounts and manual entries so everyone sees the same data
netlify.toml, package.json   Netlify config

2025: amount and status come from the Excel and cannot be changed in the app.
2026: Mark Paid / Mark Due, edit amount, add manual entries, delete manual entries.
Export: "Export CSV" downloads both years in one file (opens in Excel).

OPTION A - Quick (drag & drop)
  Drop the "public" folder on app.netlify.com/drop.
  Everything works, but 2026 changes are saved only on the device/browser used.

OPTION B - Shared 2026 data for everyone (recommended)
  1. Push this whole folder to GitHub, then in Netlify: Add new site > Import from Git
     (or: npm i -g netlify-cli && netlify deploy --prod).
  2. Recommended: Site settings > Environment variables > add ADMIN_PIN = your secret PIN.
     Then only people who know the PIN can change 2026 data (anyone can still search).
