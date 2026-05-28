const cors = require("cors");
const dotenv = require("dotenv");
const express = require("express");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const DISCOUNT_CODE = "SUMMER";
const DISCOUNT_RATE = 0.05;
const SHIPPING_FEE = 25;
const FREE_SHIPPING_MINIMUM = 150;

app.use(cors());
app.use(express.json({ limit: "1mb" }));

function loadCatalog() {
  const dataPath = path.resolve(__dirname, "..", "data", "products.js");
  const source = fs.readFileSync(dataPath, "utf8");
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(source, context, { filename: "products.js" });
  return context.window.WWBData.products;
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

function findProduct(productId) {
  return products.find((product) => product.id === productId);
}

function findVariant(product, sku) {
  return product?.options.find((variant) => variant.sku === sku);
}

function lineTotal(variant, quantity) {
  let unitPrice = Number(variant.basePrice) || null;
  let bulkApplied = false;
  let pricePending = !unitPrice;

  if (variant.bulkMinimum && quantity >= variant.bulkMinimum) {
    if (Number(variant.bulkPrice)) {
      unitPrice = Number(variant.bulkPrice);
      bulkApplied = true;
      pricePending = false;
    } else if (variant.bulkQuoteRequired) {
      unitPrice = null;
      pricePending = true;
    }
  }

  return {
    unitPrice,
    bulkApplied,
    pricePending,
    subtotal: unitPrice ? Math.round(unitPrice * quantity * 100) / 100 : null,
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
      category: product.categoryLabel,
      variant: variant.label,
      quantity,
      unitLabel: variant.unitLabel,
      unitPrice: totals.unitPrice,
      basePrice: variant.basePrice,
      bulkPrice: variant.bulkPrice,
      bulkMinimum: variant.bulkMinimum,
      bulkApplied: totals.bulkApplied,
      pricePending: totals.pricePending,
      subtotal: totals.subtotal,
    };
  });

  const subtotal = Math.round(lines.reduce((sum, line) => sum + (line.subtotal || 0), 0) * 100) / 100;
  const discount = Math.round(subtotal * DISCOUNT_RATE * 100) / 100;
  const afterDiscount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
  const shipping = afterDiscount >= FREE_SHIPPING_MINIMUM || afterDiscount === 0 ? 0 : SHIPPING_FEE;
  const total = Math.max(0, Math.round((afterDiscount + shipping) * 100) / 100);
  return {
    lines,
    totals: {
      subtotal,
      discount,
      afterDiscount,
      shipping,
      total,
      discountCode: DISCOUNT_CODE,
      discountRate: DISCOUNT_RATE,
      freeShippingMinimum: FREE_SHIPPING_MINIMUM,
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
  if (method === "paypal") {
    const paypalEmail = process.env.PAYPAL_EMAIL || "";
    return {
      method: "PayPal",
      summary: `Order ${id} created. Send PayPal payment only after confirming the order reference.`,
      details: `Use order reference ${id}. Final total: ${money(totals.total)}.`,
      paypalEmail,
    };
  }
  return {
    method: "Crypto",
    summary: `Order ${id} created. Seller will provide crypto wallet/network instructions with this order reference.`,
    details: `Use order reference ${id}. Final total: ${money(totals.total)}. Do not send funds without matching the order reference.`,
  };
}

function field(name, value, inline = false) {
  return { name, value: String(value || "Not provided").slice(0, 1024), inline };
}

async function sendDiscordOrder(order) {
  const webhook = process.env.DISCORD_WEBHOOK_URL;
  if (!webhook) {
    return { sent: false, reason: "DISCORD_WEBHOOK_URL not configured" };
  }

  const itemText = order.lines
    .map((line) => {
      const price = line.unitPrice ? `${money(line.unitPrice)}${line.bulkApplied ? " bulk" : ""}` : "TBD";
      const subtotal = line.subtotal ? money(line.subtotal) : "TBD";
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
          field("Shipping", order.totals.shipping ? money(order.totals.shipping) : "Free", true),
          field("Final total", money(order.totals.total), true),
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
      totals: priced.totals,
      paymentInstructions: paymentInstructions(req.body.paymentMethod, id, priced.totals),
      notification,
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
