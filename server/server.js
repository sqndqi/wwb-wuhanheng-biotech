const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const fs = require("fs");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DISCOUNT_CODE = "SUMMER";
const DISCOUNT_RATE = 0.05;
const SHIPPING_STATUS = "Pending seller review";
const SHIPPING_LABEL = "To be confirmed by seller after address review";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

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
    if (!Number.isFinite(quantity) || quantity < 1) throw new Error(`Invalid quantity for ${item.sku}`);
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
  if (String(body.discountCode || "").toUpperCase() !== DISCOUNT_CODE) errors.push("Discount code must be SUMMER.");
  if (!["crypto", "paypal"].includes(body.paymentMethod)) errors.push("Payment method must be crypto or paypal.");
  const customer = body.customer || {};
  if (!customer.fullName?.trim()) errors.push("Customer full name is required.");
  if (!email(customer.email)) errors.push("Valid customer email is required.");
  if (!customer.country?.trim()) errors.push("Country is required.");
  if (!customer.city?.trim()) errors.push("City is required.");
  if (!customer.address?.trim()) errors.push("Shipping address is required.");
  for (const item of body.items || []) {
    if (!Number(item.quantity) || Number(item.quantity) < 1) errors.push("Quantities must be positive.");
  }
  return errors;
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

app.post("/api/orders", async (req, res) => {
  try {
    const errors = validateOrder(req.body || {});
    if (errors.length) return res.status(400).json({ ok: false, error: errors.join(" ") });

    const priced = calculateOrder(req.body.items);
    const id = orderId();
    const order = {
      orderId: id,
      createdAt: new Date().toISOString(),
      customer: req.body.customer,
      paymentMethod: req.body.paymentMethod,
      notes: req.body.notes || "",
      lines: priced.lines,
      totals: priced.totals,
    };

    const notification = await sendDiscordOrder(order);
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

app.post("/api/contact", async (req, res) => {
  try {
    const webhook = process.env.DISCORD_WEBHOOK_URL;
    if (!webhook) return res.status(503).json({ ok: false, error: "Contact backend webhook is not configured." });
    const message = [`New WWB contact message`, `Name: ${req.body.name || "N/A"}`, `Email: ${req.body.email || "N/A"}`, `Message: ${req.body.message || ""}`].join("\n");
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

app.listen(PORT, () => {
  console.log(`WWB order backend listening on ${PORT}`);
});
