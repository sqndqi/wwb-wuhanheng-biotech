# WWB / Wuhan Wansheng Biotechnology

Static GitHub Pages build for a B2B biotech/pharmaceutical quote-request portal.

This site is intentionally not an unrestricted checkout. The catalog supports product discovery, quote bag building, buyer verification intake, documentation requests, and sales-desk review. Regulated or restricted products must be reviewed before any order can proceed.

## Structure

- `index.html` - page structure, forms, policy sections, product dialog shell
- `styles.css` - responsive B2B portal styling
- `data/products.js` - generated catalog and product metadata
- `js/api.js` - mocked backend-ready API functions
- `js/state.js` - localStorage quote/form persistence
- `js/validation.js` - quote and account-request validation
- `app.js` - UI rendering and interactions
- `tools/export-sellauth-catalog.js` - exports catalog rows to `sellauth-products.csv`

## Backend Hooks

Replace the mock functions in `js/api.js` when a real backend exists:

- `fetchCatalog()`
- `submitQuoteRequest()`
- `requestAccountAccess()`
- `loginClient()`

Do not store passwords or secrets in frontend code.

## Editing Products and Prices

Edit product data in `data/products.js`.

Each product is generated from `catalogGroups` plus category defaults in `categoryProfiles`. Sample MVP prices live in the `samplePricing` object. Use these price types:

- `fixed` - displays like `$120 / vial` and contributes to estimated subtotal
- `from` - displays like `From $120` and contributes to estimated subtotal as a rough estimate
- `quote` - displays `Quote required`
- `restricted` - displays `Restricted review`

Do not add direct checkout links for regulated, prescription, injectable, hormone, or restricted raw-material products.

## Static Quote Flow

The quote bag is stored in `localStorage`. Quote submission is mocked by `js/api.js`, generates a local reference such as `WWB-QR-20260528-1234`, and stores the request in the browser only. The copy button produces an email-ready request summary.

## Still Needs Backend

- real client authentication
- email/CRM quote submission
- admin dashboard
- payment processing after approved quotes
- inventory and price management
- compliance verification workflow
- database and server-side audit trail
