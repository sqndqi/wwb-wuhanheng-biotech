# WWB / Wuhan Wansheng Biotechnology

Static GitHub Pages storefront plus a simple Express backend for order intake.

The frontend loads `data/products.json`, lets customers add variants to a cart, applies the locked `SUMMER` 5% product discount, calculates `$25` shipping with free shipping above `$150` product subtotal, and sends checkout orders to the backend. The backend recalculates all prices from trusted product data before sending seller notifications.

## Project Structure

- `index.html` - storefront, catalog, cart, checkout, payment info, policies
- `styles.css` - responsive storefront styling
- `app.js` - frontend catalog/cart/checkout behavior
- `data/raw-price-list.csv` - editable price-list source
- `data/products.json` - generated product catalog used by frontend and backend
- `js/state.js` - local cart/form persistence
- `js/validation.js` - frontend checkout validation
- `scripts/import-pricelist.js` - converts CSV price list into products JSON
- `scripts/export-sellauth-csv.js` - creates `sellauth-products.csv`
- `scripts/sellauth-sync.js` - safe SellAuth dry-run/map/export workflow
- `server/server.js` - Express backend with `/health`, `/api/status`, `/api/orders`, `/api/contact`
- `server/.env.example` - backend environment template

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
NODE_ENV=development
```

Never commit `.env`, API keys, Discord webhooks, or payment secrets.

## API URL For GitHub Pages

At the top of `app.js`:

```js
window.WWB_API_BASE_URL = window.WWB_API_BASE_URL || "http://localhost:3000";
```

For production GitHub Pages, set this to your deployed backend URL before loading `app.js`, or edit the fallback after deploying the backend.

## Editing Products And Prices

Edit `data/raw-price-list.csv`.

Required columns:

```csv
code,name,category,dosage,packageSize,unitLabel,price,bulkMin,bulkPrice,sourceList
```

Then rebuild:

```bash
npm run build:catalog
```

This regenerates:

- `data/products.json`
- `sellauth-products.csv`

Bulk pricing rule: if quantity is greater than or equal to `bulkMin` and `bulkPrice` exists, the cart and backend apply `bulkPrice`. Empty or `*` bulk prices become bulk quote fields in the generated data.

## SellAuth Automation

Get the API key from SellAuth Dashboard > API Access. Store it only in environment variables.

Dry run:

```bash
npm run sellauth:dry-run
```

Sync/map existing SellAuth products:

```bash
npm run sellauth:sync
```

The sync script reads SellAuth environment variables, fetches existing products when possible, saves known IDs to `data/sellauth-map.json`, and regenerates `sellauth-products.csv`. Product/variant creation is intentionally not executed because the public variant write payload is unclear; use the generated CSV/import manually for missing items unless you confirm the exact SellAuth write schema.

Official docs referenced: [SellAuth Products API](https://docs.sellauth.com/api-documentation/products).

## Checkout And Payments

This MVP does not process payments automatically. Checkout creates an order, the backend recalculates totals, and the seller receives the order details by Discord webhook if configured.

Supported payment methods shown to the customer:

- Crypto
- PayPal

The confirmation message tells the customer that payment is not complete yet and the seller will confirm payment instructions with the order reference.

## Deployment

- Frontend: GitHub Pages
- Backend: Render, Railway, Fly.io, or VPS

GitHub Pages alone cannot receive backend orders. Deploy `server/` separately and set `window.WWB_API_BASE_URL` to that backend URL.

## Testing Checklist

- `npm run build:catalog` works
- `data/products.json` is generated
- `sellauth-products.csv` is generated
- `npm run sellauth:dry-run` works without writing to SellAuth
- Backend starts
- `GET /health` returns `{ ok: true }`
- `GET /api/status` returns payment/status JSON
- Frontend loads products
- Add product to cart
- Quantity `10` applies bulk price
- `SUMMER` discount applies 5% to product subtotal
- Shipping is `$25` below `$150` product subtotal
- Shipping is free above `$150` product subtotal
- Checkout rejects missing fields
- Checkout submits to backend
- Discord receives order if `DISCORD_WEBHOOK_URL` is configured
- Frontend shows a clear backend error if backend is unavailable

## Still Needed For Production

- Deployed backend URL connected to GitHub Pages
- Real persistent database/order storage
- Admin dashboard
- SellAuth import/write workflow confirmed against your account
- Inventory and payment reconciliation
- Rate limiting, abuse prevention, logging, and monitoring
- Operational support/contact details
