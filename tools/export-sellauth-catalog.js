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

const rows = [
  [
    "name",
    "sku",
    "category",
    "grouped_product",
    "review_level",
    "warehouse",
    "package",
    "price_usd",
    "bulk_price_usd",
    "bulk_minimum",
    "description",
    "sellauth_product_id",
    "sellauth_variant_id",
  ],
];

for (const product of products) {
  for (const option of product.options) {
    rows.push([
      product.name,
      option.sku,
      product.categoryLabel,
      product.productType,
      product.reviewLabel,
      option.warehouse || product.warehouse,
      option.label,
      option.basePrice || "",
      option.bulkPrice || "",
      option.bulkMinimum || "",
      product.notes,
      "",
      "",
    ]);
  }
}

fs.writeFileSync(outPath, rows.map((row) => row.map(csv).join(",")).join("\n"));
console.log(`Wrote ${rows.length - 1} products to ${outPath}`);
