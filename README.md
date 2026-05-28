# WWB / Wuhan Wansheng Biotechnology

Static product catalog frontend plus a simple Express order backend.

The frontend is deployable on GitHub Pages. The backend receives checkout orders, recalculates trusted totals from `data/products.js`, applies the locked `SUMMER` 5% discount, and sends order details to the seller Discord webhook from an environment variable.

## Structure

- `index.html` - catalog, cart, checkout, payment info, policies
- `styles.css` - responsive storefront styling
- `app.js` - frontend catalog/cart/checkout behavior
- `data/products.js` - product families, variants, prices, and bulk tiers
- `js/state.js` - local cart/form persistence
- `js/validation.js` - frontend checkout validation
- `server/server.js` - Express backend with `/health`, `/api/orders`, `/api/contact`
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

Required env:

```bash
DISCORD_WEBHOOK_URL=
PAYPAL_EMAIL=
NODE_ENV=production
```

Never hardcode webhook URLs or payment secrets in frontend code.

## API URL For GitHub Pages

At the top of `app.js`:

```js
window.WWB_API_BASE_URL = window.WWB_API_BASE_URL || "http://localhost:3000";
```

For production GitHub Pages, set `window.WWB_API_BASE_URL` to the deployed backend URL before loading `app.js`, or edit the fallback after deploying the backend.

## Editing Products And Prices

Edit `data/products.js`.

Each product has `options`:

- `sku` - product code
- `label` - dosage/package text
- `basePrice` - normal unit price
- `bulkPrice` - 10+ or bulk unit price
- `bulkMinimum` - default `10`
- `bulkQuoteRequired` - true when source list uses `*`

The backend imports the same file and recalculates totals server-side.

## SUMMER Discount

`SUMMER` is forced in checkout and cannot be removed. It applies exactly 5% off priced items.

## Testing Checklist

- Add product to cart
- Change quantity to `10` and verify bulk price
- Confirm `SUMMER` discount is 5%
- Place order with Crypto
- Place order with PayPal
- Backend sends Discord message when `DISCORD_WEBHOOK_URL` is configured
- Backend rejects bad email, empty cart, missing address, and invalid payment method
- Backend recalculates totals server-side

## Deployment

- Frontend: GitHub Pages
- Backend: Render, Railway, Fly.io, or VPS

Backend still needs production hardening such as rate limits, persistent database/order storage, admin dashboard, and operational monitoring.
