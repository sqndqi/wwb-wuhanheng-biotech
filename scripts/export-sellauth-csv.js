const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const productsPath = path.join(root, "data", "products.json");
const mapPath = path.join(root, "data", "sellauth-map.json");
const outputPath = path.join(root, "sellauth-products.csv");

function csv(value) {
  const text = String(value ?? "");
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const products = readJson(productsPath, []);
  const map = readJson(mapPath, { products: {}, variants: {} });
  const header = [
    "product_name",
    "product_description",
    "variant_name",
    "sku",
    "category",
    "price",
    "bulk_min",
    "bulk_price",
    "sellauth_product_id",
    "sellauth_variant_id",
  ];

  const lines = [header.join(",")];
  products.forEach((product) => {
    product.variants.forEach((variant) => {
      lines.push(
        [
          product.name,
          product.description,
          variant.label,
          variant.sku,
          product.category,
          variant.price ?? "",
          variant.bulkMin ?? "",
          variant.bulkPrice ?? "",
          map.products?.[product.id] || "",
          map.variants?.[variant.sku] || "",
        ]
          .map(csv)
          .join(",")
      );
    });
  });

  fs.writeFileSync(outputPath, `${lines.join("\n")}\n`);
  console.log(`Generated sellauth-products.csv with ${lines.length - 1} rows.`);
}

main();
