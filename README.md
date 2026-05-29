# WWB / Wuhan Wansheng Biotechnology

Static GitHub Pages storefront plus a simple Express backend for order intake.

Last production verification pass: 2026-05-29.

The frontend loads `data/products.json`, lets customers browse product families, select variants, add items to a cart, applies the locked `SUMMER` 5% product discount, and sends checkout orders to the backend. The backend recalculates product totals from trusted catalog data before sending seller notifications.

Shipping is handled manually by the seller after the customer submits address and contact info. The storefront collects the address and order details, and the backend sends them to the seller. Shipping route, timing, and cost are confirmed separately if needed. SellAuth is payment-only and does not calculate shipping.

Production checkout stays offline until `server/` is deployed and `js/config.js` has a real `deployedBackendUrl`. GitHub Pages by itself can browse products and manage the cart, but it cannot process orders or contact messages without the backend.

The catalog is generated from WWB price-list source material. `WWB Pricelist 21-5-2026` is treated as the primary/latest normal product price source. `WWB Partnership Pricelist` is used for raw powder items. Older China Warehouse / May 11 rows are fallback data only when a newer SKU row is not present.

## Project Structure

- `index.html` - storefront, catalog, cart, checkout, payment info, policies
- `styles.css` - responsive storefront styling
- `js/config.js` - frontend backend URL config
- `app.js` - frontend catalog/cart/checkout behavior
- `data/raw-price-list.csv` - editable price-list source
- `data/products.json` - generated product catalog used by frontend and backend
- `js/state.js` - local cart/form persistence
- `js/validation.js` - frontend checkout validation
- `scripts/import-pricelist.js` - converts CSV price list into products JSON
- `scripts/export-sellauth-csv.js` - creates `sellauth-products.csv`
- `scripts/sellauth-sync.js` - safe SellAuth dry-run/map/export workflow
- `server/server.js` - Express backend with `/health`, `/api/status`, `/api/orders`, `/api/contact`
- `server/data/orders.jsonl` - local append-only MVP order log, ignored by git
- `server/.env.example` - backend environment template

Root `.env.example` mirrors `server/.env.example` for deployment reference. `server/.env.example` is the source of truth for the Express backend.

## Catalog Organization

The generated catalog currently contains 96 product families and 172 variants. Product families are organized into customer-facing groups:

- Featured / Popular
- GLP-1 / Metabolic
- Peptides
- Blends
- Recovery / Repair
- Cosmetic / Skin
- Hormones / Fertility
- Orals
- Accessories / Water
- Raw Powders
- Other

The storefront includes a featured products row, card view, compact table view, category/source/price filters, a bulk-pricing filter, and SKU/name search. Searching an exact SKU such as `TR5` keeps the Tirzepatide family visible and selects the matching variant.

## Run Frontend

From the repo root:

```bash
python -m http.server 8000
```

Open `http://127.0.0.1:8000`.

## Run Backend

```bash
cd server
npm install
cp .env.example .env
npm start
```

Required environment variables:

```bash
SELLAUTH_API_KEY=
SELLAUTH_SHOP_ID=
SELLAUTH_SHOP_SLUG=
DISCORD_WEBHOOK_URL=
PAYPAL_EMAIL=
CORS_ORIGINS=http://localhost:8000,http://127.0.0.1:8000,https://sqndqi.github.io
ADMIN_TOKEN=
MAX_QTY_PER_LINE=999
MAX_CART_LINES=50
ORDER_RATE_LIMIT_MAX=20
CONTACT_RATE_LIMIT_MAX=10
RATE_LIMIT_WINDOW_MS=900000
NODE_ENV=development
```

Do not commit `.env`, API keys, Discord webhooks, or payment secrets.

`CORS_ORIGINS` is a comma-separated allowlist. Localhost origins are allowed automatically when `NODE_ENV` is not `production`; production should include the GitHub Pages origin and any custom frontend domain.

Order and contact write endpoints are rate-limited. Defaults are 20 order attempts and 10 contact messages per 15 minutes per IP. `/health` and `/api/status` are not rate-limited.

The backend caps cart size with `MAX_CART_LINES` and line quantities with `MAX_QTY_PER_LINE`. Frontend validation mirrors these caps for friendly errors, but the backend is the source of truth.

Orders are appended to `server/data/orders.jsonl`. The admin endpoint reads recent orders:

```bash
curl -H "Authorization: Bearer $ADMIN_TOKEN" "http://localhost:3000/api/admin/orders?limit=50"
```

List responses mask customer contact/address fields by default. Use `?full=true` with the same `ADMIN_TOKEN` only when you need full order details. If malformed JSONL lines are skipped, the response includes `skippedMalformedLines`. If `ADMIN_TOKEN` is missing, the admin endpoint is disabled.

## API URL For GitHub Pages

Local development defaults to `http://localhost:3000`.

For production GitHub Pages, edit `js/config.js` and set `deployedBackendUrl` to your deployed backend URL:

```js
const deployedBackendUrl = "https://your-backend-url.example";
```

GitHub Pages alone cannot process orders or contact messages. The backend must be deployed separately, and the storefront checkout remains offline until `deployedBackendUrl` points to that deployed backend.

## Editing Products And Prices

Edit `data/raw-price-list.csv`.

Required columns:

```csv
code,name,category,dosage,packageSize,unitLabel,price,bulkMin,bulkPrice,sourceList,featured,sortGroup
```

Then rebuild:

```bash
npm run build:catalog
```

This regenerates:

- `data/products.json`
- `sellauth-products.csv`

Bulk pricing rule: if quantity is greater than or equal to `bulkMin` and `bulkPrice` exists, the cart and backend apply `bulkPrice`. Empty or `*` bulk prices become bulk quote fields in the generated data.

The importer groups rows by normalized product family name, deduplicates matching SKUs, and prefers newer source rows over older duplicates.

## SellAuth Automation

Get the API key from SellAuth Dashboard > API Access. Store it only in environment variables.

Safe dry run:

```bash
npm run sellauth:dry-run
```

Sync/map existing SellAuth products:

```bash
npm run sellauth:sync
```

The sync script reads SellAuth environment variables, fetches existing products when possible, saves known IDs to ignored `data/sellauth-map.json`, and regenerates `sellauth-products.csv`. Product creation is not fully automatic unless the API write schema is confirmed. The generated `sellauth-products.csv` is available for import and mapping.

## Checkout And Payments

This MVP does not process payments automatically. Checkout creates an order, the backend recalculates product totals, and the seller receives order and address details by Discord webhook if configured.

Supported payment methods shown to the customer:

- Crypto
- PayPal

The confirmation message tells the customer that payment is not complete yet and the seller will review the address and confirm shipping after order review. Manual-flow payment remains in place unless SellAuth is truly wired.

## Deployment

- Frontend: GitHub Pages
- Backend: Render, Railway, Fly.io, or VPS

Deployment steps:

1. Deploy `server/` to Render, Railway, Fly.io, or a VPS.
2. In the backend environment, set `CORS_ORIGINS=https://sqndqi.github.io` plus any custom storefront domain.
3. In the backend environment, set `ADMIN_TOKEN` to a long private random value. Treat it like a password.
4. In the backend environment, set `DISCORD_WEBHOOK_URL` so order notifications reach the seller.
5. Test the deployed backend directly: `GET /health` and `GET /api/status` must return `ok: true`.
6. Edit `js/config.js` and set `const deployedBackendUrl = "https://your-deployed-backend.example";`.
7. Push the frontend change and test checkout from GitHub Pages.

`server/data/orders.jsonl` is append-only MVP storage for early orders. It is ignored by git and should be replaced with a real database/admin dashboard when order volume grows.

## Testing Checklist

- `node --check app.js` passes
- `npm run build:catalog` works
- `data/products.json` is generated and valid JSON
- `sellauth-products.csv` is generated
- `npm run sellauth:dry-run` works without writing to SellAuth
- Backend starts
- `GET /health` returns `{ ok: true }`
- `GET /api/status` returns payment/status JSON
- `POST /api/orders` accepts a valid cart and stores the order in `server/data/orders.jsonl`
- `POST /api/orders` rejects zero, negative, decimal, non-numeric, or over-cap quantities
- `POST /api/contact` rejects invalid emails and empty or huge messages
- `GET /api/admin/orders` rejects missing/invalid tokens and works when `ADMIN_TOKEN` is configured
- Frontend loads products
- Search by product name and SKU works
- Variant dropdown works
- Add product to cart
- Quantity `10` applies bulk price
- `SUMMER` discount applies 5% to product subtotal
- Shipping displays as pending seller review
- Checkout rejects missing fields
- Checkout submits to backend when backend is online
- Discord receives order if `DISCORD_WEBHOOK_URL` is configured
- Frontend disables checkout if backend is unavailable

## Still Needed For Production

- Deployed backend URL connected to GitHub Pages
- Production database/admin tooling beyond JSONL MVP storage
- Admin dashboard
- SellAuth import/write workflow confirmed against your account
- Inventory and payment reconciliation
- Stronger abuse prevention, logging, alerting, and monitoring
- Operational support/contact details
