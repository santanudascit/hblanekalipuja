H B LANE KALI PUJA 2025 - BILL SEARCH
=====================================
public/index.html            The app (all 272 bills from your Excel are embedded in it)
netlify/functions/status.mjs Saves Paid/Due so everyone sees the same status
netlify.toml, package.json   Netlify config

OPTION A - Quick (drag & drop, 1 minute)
  Go to app.netlify.com/drop and drop the "public" folder.
  Search works. Paid/Due changes are saved only on the device used.

OPTION B - Shared Paid/Due for everyone (recommended)
  1. Push this whole folder to a GitHub repo, then in Netlify: Add new site > Import from Git.
     (or run: npm i -g netlify-cli && netlify deploy --prod)
  2. Optional but recommended: Site settings > Environment variables > add ADMIN_PIN = your secret PIN.
     Then only people who know the PIN can mark Paid/Due (anyone can still search).
  Data is stored in Netlify Blobs; the original Excel values remain the starting point.
