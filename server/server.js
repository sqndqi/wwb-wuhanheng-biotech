const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const fs = require("fs");
const rateLimit = require("express-rate-limit");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DISCOUNT_CODE = "SUMMER";
const DISCOUNT_RATE = 0.05;
const SHIPPING_STATUS = "Pending seller review";
const SHIPPING_LABEL = "To be confirmed by seller after address review";
const MAX_QTY_PER_LINE = positiveInteger(process.env.MAX_QTY_PER_LINE, 999);
const MAX_CART_LINES = positiveInteger(process.env.MAX_CART_LINES, 50);
const ORDER_RATE_LIMIT_MAX = positiveInteger(process.env.ORDER_RATE_LIMIT_MAX, 20);
const CONTACT_RATE_LIMIT_MAX = positiveInteger(process.env.CONTACT_RATE_LIMIT_MAX, 10);
const RATE_LIMIT_WINDOW_MS = positiveInteger(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
const DATA_DIR = path.resolve(__dirname, "data");
const ORDERS_PATH = path.join(DATA_DIR, "orders.jsonl");

app.use(corsGate);
app.use(express.json({ limit: "1mb" }));

const orderLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: ORDER_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many order attempts. Try again later." },
});

const contactLimiter = rateLimit({
  windowMs: RATE_LIMIT_WINDOW_MS,
  limit: CONTACT_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: "Too many contact messages. Try again later." },
});

function positiveInteger(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function allowedOrigins() {
  return String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}

function isLocalhostOrigin(origin) {
  return /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(origin || "");
}

function isAllowedOrigin(origin) {
  const configured = allowedOrigins();
  const isProduction = process.env.NODE_ENV === "production";
  if (!origin) return true;
  if (configured.includes(origin)) return true;
  return !isProduction && isLocalhostOrigin(origin);
}

function corsOptions() {
  return {
    origin(origin, callback) {
      return callback(null, isAllowedOrigin(origin));
    },
  };
}

function corsGate(req, res, next) {
  const origin = req.headers.origin;
  if (!isAllowedOrigin(origin)) {
    return res.status(403).json({ ok: false, error: `CORS blocked origin: ${origin}` });
  }
  return cors(corsOptions())(req, res, next);
}

function safeString(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function cleanCustomer(customer = {}) {
  return {
    fullName: safeString(customer.fullName, 120),
    email: safeString(customer.email, 160).toLowerCase(),
    contact: safeString(customer.contact, 160),
    country: safeString(customer.country, 80),
    city: safeString(customer.city, 80),
    address: safeString(customer.address, 500),
    postalCode: safeString(customer.postalCode, 40),
  };
}

function ensureDataDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function saveOrder(order, notification) {
  ensureDataDir();
  const record = {
    createdAt: order.createdAt,
    orderId: order.orderId,
    customer: order.customer,
    paymentMethod: order.paymentMethod,
    notes: order.notes,
    lines: order.lines,
    totals: order.totals,
    notification,
  };
  fs.appendFileSync(ORDERS_PATH, `${JSON.stringify(record)}\n`, "utf8");
}

function recentOrders(limit = 50) {
  if (!fs.existsSync(ORDERS_PATH)) return { orders: [], skippedMalformedLines: 0 };
  const capped = Math.min(positiveInteger(limit, 50), 200);
  const orders = [];
  let skippedMalformedLines = 0;
  const lines = fs
    .readFileSync(ORDERS_PATH, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .reverse();
  for (const line of lines) {
    if (orders.length >= capped) break;
    try {
      orders.push(JSON.parse(line));
    } catch {
      skippedMalformedLines += 1;
      // Keep the admin endpoint usable if a JSONL line is partially written or corrupted.
    }
  }
  return { orders, skippedMalformedLines };
}

function maskEmail(value) {
  const raw = String(value || "");
  const [name, domain] = raw.split("@");
  if (!name || !domain) return raw ? "masked" : "";
  return `${name.slice(0, 2)}***@${domain}`;
}

function maskText(value) {
  const raw = String(value || "");
  if (!raw) return "";
  return raw.length <= 4 ? "****" : `${raw.slice(0, 2)}***${raw.slice(-2)}`;
}

function maskOrder(order) {
  return {
    ...order,
    customer: {
      fullName: maskText(order.customer?.fullName),
      email: maskEmail(order.customer?.email),
      contact: maskText(order.customer?.contact),
      country: order.customer?.country || "",
      city: order.customer?.city || "",
      address: order.customer?.address ? "masked" : "",
      postalCode: order.customer?.postalCode ? "masked" : "",
    },
    notes: order.notes ? "masked" : "",
  };
}

function loadCatalog() {
  const dataPath = path.resolve(__dirname, "..", "data", "products.json");
  return JSON.parse(fs.readFileSync(dataPath, "utf8"));
}

const products = loadCatalog();

function email(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

function orderId() {
  const now = new Date();
  const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `WWB-${date}-${suffix}`;
}

function money(value) {
  return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function numeric(value) {
  if (value === null || value === undefined || value === "" || value === "*") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

function findVariant(product, sku) {
  return product?.variants.find((variant) => variant.sku === sku);
}

function lineTotal(variant, quantity) {
  let unitPrice = numeric(variant.price);
  let bulkApplied = false;
  let pricePending = unitPrice === null;

  if (variant.bulkMin && quantity >= Number(variant.bulkMin)) {
    const bulk = numeric(variant.bulkPrice);
    if (bulk !== null) {
      unitPrice = bulk;
      bulkApplied = true;
      pricePending = false;
    } else if (unitPrice === null) {
      pricePending = true;
    }
  }

  return {
    unitPrice,
    bulkApplied,
    pricePending,
    subtotal: unitPrice !== null ? Math.round(unitPrice * quantity * 100) / 100 : null,
  };
}

function calculateOrder(items) {
  const lines = items.map((item) => {
    const product = findProduct(item.productId);
    if (!product) throw new Error(`Unknown product: ${item.productId}`);
    const variant = findVariant(product, item.sku);
    if (!variant) throw new Error(`Unknown SKU: ${item.sku}`);
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1 || quantity > MAX_QTY_PER_LINE) throw new Error(`Invalid quantity for ${item.sku}`);
    const totals = lineTotal(variant, quantity);
    return {
      productId: product.id,
      code: variant.sku,
      name: product.name,
      category: product.category,
      variant: variant.label,
      quantity,
      unitLabel: variant.unitLabel,
      unitPrice: totals.unitPrice,
      basePrice: variant.price,
      bulkPrice: variant.bulkPrice,
      bulkMinimum: variant.bulkMin,
      bulkApplied: totals.bulkApplied,
      pricePending: totals.pricePending,
      subtotal: totals.subtotal,
    };
  });

  const subtotal = Math.round(lines.reduce((sum, line) => sum + (line.subtotal || 0), 0) * 100) / 100;
  const discount = Math.round(subtotal * DISCOUNT_RATE * 100) / 100;
  const productTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  return {
    lines,
    totals: {
      subtotal,
      discount,
      discountAmount: discount,
      productTotal,
      total: productTotal,
      discountCode: DISCOUNT_CODE,
      discountRate: DISCOUNT_RATE,
      shippingStatus: SHIPPING_STATUS,
      shippingLabel: SHIPPING_LABEL,
    },
  };
}

function validateOrder(body) {
  const errors = [];
  if (!Array.isArray(body.items) || !body.items.length) errors.push("Cart is empty.");
  if (Array.isArray(body.items) && body.items.length > MAX_CART_LINES) errors.push(`Cart cannot exceed ${MAX_CART_LINES} lines.`);
  if (String(body.discountCode || "").toUpperCase() !== DISCOUNT_CODE) errors.push("Discount code must be SUMMER.");
  if (!["crypto", "paypal"].includes(body.paymentMethod)) errors.push("Payment method must be crypto or paypal.");
  const customer = cleanCustomer(body.customer || {});
  if (!customer.fullName?.trim()) errors.push("Customer full name is required.");
  if (!email(customer.email)) errors.push("Valid customer email is required.");
  if (!customer.country?.trim()) errors.push("Country is required.");
  if (!customer.city?.trim()) errors.push("City is required.");
  if (!customer.address?.trim()) errors.push("Shipping address is required.");
  for (const item of body.items || []) {
    const quantity = Number(item.quantity);
    if (!Number.isInteger(quantity) || quantity < 1) errors.push("Quantities must be positive whole numbers.");
    if (Number.isInteger(quantity) && quantity > MAX_QTY_PER_LINE) errors.push(`Quantity for ${item.sku || "item"} cannot exceed ${MAX_QTY_PER_LINE}.`);
  }
  return errors;
}

function validateContact(body = {}) {
  const name = safeString(body.name, 120);
  const contactEmail = safeString(body.email, 160).toLowerCase();
  const message = safeString(body.message, 1500);
  const errors = [];
  if (!name) errors.push("Name is required.");
  if (!email(contactEmail)) errors.push("Valid email is required.");
  if (message.length < 10) errors.push("Message must be at least 10 characters.");
  if (String(body.message || "").length > 1500) errors.push("Message is too long.");
  return { errors, data: { name, email: contactEmail, message } };
}

function paymentInstructions(method, id, totals) {
  const summary = `Order ${id} created. Payment is not complete yet. Seller will review your address and confirm shipping after order review.`;
  if (method === "paypal") {
    const paypalEmail = process.env.PAYPAL_EMAIL || "";
    return {
      method: "PayPal",
      summary,
      details: `Continue with PayPal payment instructions using order reference ${id}. Product total: ${money(totals.total)}. Shipping is handled by the seller after address review.`,
      paypalEmail,
    };
  }
  return {
    method: "Crypto",
    summary,
    details: `Continue with Crypto payment instructions using order reference ${id}. Product total: ${money(totals.total)}. Shipping is handled by the seller after address review.`,
  };
}

function field(name, value, inline = false) {
  return { name, value: String(value || "Not provided").slice(0, 1024), inline };
}

async function sendDiscordOrder(order) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return { sent: false, warning: "Discord webhook not configured." };
  }

  const itemText = order.lines
    .map((line) => {
      const price = line.unitPrice !== null ? `${money(line.unitPrice)}${line.bulkApplied ? " bulk" : ""}` : "TBD";
      const subtotal = line.subtotal !== null ? money(line.subtotal) : "TBD";
      return `${line.code} | ${line.name} | ${line.variant} | Qty ${line.quantity} | ${price} | ${subtotal}`;
    })
    .join("\n")
    .slice(0, 1024);

  const payload = {
    embeds: [
      {
        title: "New WWB Order",
        color: 0x0b6f72,
        fields: [
          field("Order ID", order.orderId, true),
          field("Payment method", order.paymentMethod, true),
          field("Customer", order.customer.fullName, true),
          field("Email", order.customer.email, true),
          field("Phone / Telegram / WhatsApp", order.customer.contact, true),
          field("Country", order.customer.country, true),
          field("City", order.customer.city, true),
          field("Address", order.customer.address),
          field("Postal code", order.customer.postalCode || "N/A", true),
          field("Items", itemText || "No items"),
          field("Subtotal", money(order.totals.subtotal), true),
          field("SUMMER discount", `-${money(order.totals.discount)}`, true),
          field("Product total", money(order.totals.productTotal), true),
          field("Shipping", order.totals.shippingStatus, true),
          field("Due now", money(order.totals.total), true),
          field("Notes", order.notes || "None"),
        ],
        timestamp: order.createdAt,
      },
    ],
  };

  const response = await fetch(webhook, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Discord webhook failed with status ${response.status}`);
  }

  return { sent: true };
}

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/api/status", (_req, res) => {
  res.json({
    ok: true,
    payments: ["crypto", "paypal"],
    mode: "manual",
    sellauthConfigured: Boolean(process.env.SELLAUTH_API_KEY && process.env.SELLAUTH_SHOP_ID && process.env.SELLAUTH_SHOP_SLUG),
  });
});

app.get("/api/admin/orders", (req, res) => {
  const configuredToken = process.env.ADMIN_TOKEN;
  const provided = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if (!configuredToken) return res.status(503).json({ ok: false, error: "Admin token is not configured." });
  if (!provided || provided !== configuredToken) return res.status(401).json({ ok: false, error: "Unauthorized." });
  const full = String(req.query.full || "").toLowerCase() === "true";
  const result = recentOrders(req.query.limit);
  res.json({
    ok: true,
    masked: !full,
    skippedMalformedLines: result.skippedMalformedLines,
    orders: full ? result.orders : result.orders.map(maskOrder),
  });
});

app.post("/api/orders", orderLimiter, async (req, res) => {
  try {
    const errors = validateOrder(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(" ") });

    const priced = calculateOrder(req.body.items);
    const id = orderId();
    const order = {
      orderId: id,
      createdAt: new Date().toISOString(),
      customer: cleanCustomer(req.body.customer),
      paymentMethod: req.body.paymentMethod,
      notes: safeString(req.body.notes, 1000),
      lines: priced.lines,
      totals: priced.totals,
    };

    let notification;
    try {
      notification = await sendDiscordOrder(order);
    } catch (error) {
      notification = { sent: false, warning: error.message || "Discord notification failed." };
    }
    saveOrder(order, notification);
    res.json({
      ok: true,
      orderId: id,
      subtotal: priced.totals.subtotal,
      discountCode: DISCOUNT_CODE,
      discountAmount: priced.totals.discount,
      productTotal: priced.totals.productTotal,
      shippingStatus: priced.totals.shippingStatus,
      shippingLabel: priced.totals.shippingLabel,
      total: priced.totals.total,
      paymentMethod: req.body.paymentMethod,
      totals: priced.totals,
      lines: priced.lines,
      paymentInstructions: paymentInstructions(req.body.paymentMethod, id, priced.totals),
      notification,
      warning: notification.warning,
    });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "Could not create order." });
  }
});

app.post("/api/contact", contactLimiter, async (req, res) => {
  try {
    const validated = validateContact(req.body || {});
    if (validated.errors.length) return res.status(400).json({ ok: false, error: validated.errors.join(" ") });
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return res.status(503).json({ ok: false, error: "Contact backend webhook is not configured." });
    const message = [`New WWB contact message`, `Name: ${validated.data.name}`, `Email: ${validated.data.email}`, `Message: ${validated.data.message}`].join("\n");
    const response = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: message.slice(0, 1800) }),
    });
    if (!response.ok) throw new Error("Discord webhook failed.");
    res.json({ ok: true });
  } catch (error) {
    res.status(400).json({ ok: false, error: error.message || "Could not send contact message." });
  }
});

app.use((error, _req, res, _next) => {
  if (String(error.message || "").startsWith("CORS blocked origin:")) {
    return res.status(403).json({ ok: false, error: error.message });
  }
  return res.status(500).json({ ok: false, error: "Server error." });
});

app.listen(PORT, () => {
  console.log(`WWB order backend listening on ${PORT}`);
});
