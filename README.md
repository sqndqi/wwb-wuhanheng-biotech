# WWB / Wuhan Wansheng Biotechnology

Static GitHub Pages build for a B2B biotech/pharmaceutical quote-request portal.

This site is intentionally not an unrestricted checkout. The catalog supports product discovery, visible source-list pricing, quote bag building, buyer verification intake, documentation requests, and sales-desk review. Regulated or restricted products must be reviewed before any order can proceed.

## Structure

- `index.html` - page structure, forms, policy sections, product dialog shell
- `styles.css` - responsive B2B portal styling
- `data/products.js` - structured product families, variants, source-list prices, and bulk pricing rules
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

Each product family has an `options` array. Edit option fields to update price-list rows:

- `sku` - price-list code, such as `TR5`
- `label` - dosage/package shown in cards and the quote bag
- `basePrice` - normal unit price shown as `$35 / kit`
- `bulkPrice` - discounted unit price used when quantity reaches `bulkMinimum`
- `bulkMinimum` - default is `10`
- `bulkQuoteRequired` - use when the PDF has `*` for bulk pricing

Price types are computed from the product review path. Restricted products can show source-list prices, but the UI keeps them in sales review and does not create payment checkout.

Do not add direct checkout links for regulated, prescription, injectable, hormone, or restricted raw-material products.

## Static Quote Flow

The quote bag is stored in `localStorage`. Quote submission is mocked by `js/api.js`, generates a local reference such as `WWB-QR-20260528-1234`, and stores the request in the browser only. The copy button produces an email-ready request summary.

Current MVP discount code: `SUMMER` for 10% off priced items in the quote estimate.

Account access requests generate a local `WWB-ACCT-YYYYMMDD-XXXX` reference. Existing-client sign-in is disabled until a backend is connected.

## Testing Bulk Pricing

Open the catalog, find `Tirzepatide`, set quantity to `10`, and add `TR5` to the request. The quote bag should use the 10+ bulk price of `$30 / kit`, with an estimated line subtotal of `$300`. If a PDF row uses `*` for the bulk column, the bag shows `Bulk quote required` instead of calculating that bulk line.

## Still Needs Backend

- real client authentication
- email/CRM quote submission
- admin dashboard
- payment processing after approved quotes
- inventory and price management
- compliance verification workflow
- database and server-side audit trail
