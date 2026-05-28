const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const dataPath = path.join(root, "data", "products.js");
const outPath = path.join(root, "sellauth-products.csv");
const source = fs.readFileSync(dataPath, "utf8");

const context = { window: {} };
vm.createContext(context);
vm.runInContext(source, context);
const products = context.window.WWBData.products;

if (!Array.isArray(products) || !products.length) {
  throw new Error("Could not load products from data/products.js");
}

function csv(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

function sku(name, category, index) {
  const initials = name
    .replace(/raw$/i, "")
    .split(/[\s+/()-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return `${category.slice(0, 2).toUpperCase()}-${String(index + 1).padStart(3, "0")}-${initials || "ITEM"}`;
}

const rows = [
  [
    "name",
    "sku",
    "category",
    "grouped_product",
    "checkout_phase",
    "price_usd",
    "description",
    "sellauth_product_id",
    "sellauth_variant_id",
  ],
];

for (const [index, product] of products.entries()) {
  rows.push([
    product.name,
    sku(product.name, product.category, index),
    product.category,
    product.family,
    product.priceType,
    product.unitPrice || "",
    product.description,
    "",
    "",
  ]);
}

fs.writeFileSync(outPath, rows.map((row) => row.map(csv).join(",")).join("\n"));
console.log(`Wrote ${rows.length - 1} products to ${outPath}`);
