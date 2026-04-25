# IponMate (Static Web App)

Lists Philippine savings/time deposit rates (from a local dataset you can edit) and lets you estimate earnings based on deposit amount, time, compounding, and withholding tax. Includes extra category pages (Pag-IBIG, Funds, Bonds, Dividends, Metals) as a PH-focused hub.

## Run locally

Open `ph-savings-interest/index.html` in your browser.

If your browser blocks `localStorage` for `file://` pages, run a tiny local server instead:

```sh
cd "ph-savings-interest"
python3 -m http.server 5173
```

Then open `http://localhost:5173`.

## Update rates

- Edit the built-in list in `ph-savings-interest/rates.js`

## Pages

- Deposits: `ph-savings-interest/index.html`
- Pag-IBIG / Gov: `ph-savings-interest/gov.html`
- Funds + range calculator: `ph-savings-interest/funds.html`
- Bonds: `ph-savings-interest/bonds.html`
- Dividends: `ph-savings-interest/dividends.html`
- Metals: `ph-savings-interest/metals.html`

## Ads (placeholders)

Pages include clearly labeled ad placeholders (top / sidebar / bottom). If you add real ads/analytics, add a proper privacy policy and disclosures.

## SEO (basic)

- `ph-savings-interest/robots.txt` is included.
- `ph-savings-interest/sitemap.xml` is included, but you should replace `BASE_URL` with your deployed site URL (example: GitHub Pages URL) so the `<loc>` entries become valid absolute URLs.

## Notes

- Rates change often. Always confirm with the bank/product’s official page.
- This is an estimator. Actual credited interest can differ due to daily balance, tiering, promos, fees, and rounding.
