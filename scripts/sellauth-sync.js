const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const productsPath = path.join(root, "data", "products.json");
const mapPath = path.join(root, "data", "sellauth-map.json");
const csvScript = path.join(__dirname, "export-sellauth-csv.js");
const apiBase = process.env.SELLAUTH_API_BASE_URL || "https://api.sellauth.com/v1";

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function totals(products, map) {
  const variants = products.flatMap((product) => product.variants.map((variant) => ({ product, variant })));
  const missing = variants.filter(({ variant }) => !map.variants?.[variant.sku]);
  return {
    families: products.length,
    variants: variants.length,
    missing: missing.length,
  };
}

function printSummary(products, map, mode) {
  const summary = totals(products, map);
  console.log(`SellAuth ${mode}`);
  console.log(`Product families: ${summary.families}`);
  console.log(`Variants: ${summary.variants}`);
  console.log(`Variants missing SellAuth IDs: ${summary.missing}`);
  console.log(`Would create/update ${summary.families} product families and ${summary.missing} missing variants if a safe write endpoint is enabled.`);
}

function exportCsv() {
  require(csvScript);
}

async function request(endpoint, options = {}) {
  const token = process.env.SELLAUTH_API_KEY;
  const response = await fetch(`${apiBase}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body?.message || body?.error || `SellAuth API ${response.status}`;
    throw new Error(message);
  }
  return body;
}

async function fetchExistingProducts(shopId) {
  const body = await request(`/shops/${shopId}/products?perPage=100&type=variant`, { method: "GET" });
  return Array.isArray(body?.data) ? body.data : Array.isArray(body) ? body : [];
}

function mapExisting(products, existing) {
  const next = { products: {}, variants: {} };
  const byPath = new Map(existing.map((entry) => [entry.path || slug(entry.name), entry]));
  products.forEach((product) => {
    const remote = byPath.get(slug(product.name)) || byPath.get(product.id);
    if (!remote) return;
    next.products[product.id] = remote.id;
    const remoteVariants = Array.isArray(remote.variants) ? remote.variants : [];
    product.variants.forEach((variant) => {
      const remoteVariant = remoteVariants.find((entry) => entry.name?.includes(variant.sku) || entry.name === variant.label);
      if (remoteVariant) next.variants[variant.sku] = remoteVariant.id;
    });
  });
  return next;
}

async function sync() {
  const token = process.env.SELLAUTH_API_KEY;
  const shopId = process.env.SELLAUTH_SHOP_ID;
  if (!token) throw new Error("SELLAUTH_API_KEY is required for sync.");
  if (!shopId) throw new Error("SELLAUTH_SHOP_ID is required for sync.");

  const products = readJson(productsPath, []);
  const existing = await fetchExistingProducts(shopId);
  const map = mapExisting(products, existing);
  fs.writeFileSync(mapPath, `${JSON.stringify(map, null, 2)}\n`);
  printSummary(products, map, "sync");
  console.log("Saved data/sellauth-map.json with matching existing SellAuth IDs.");
  console.log("SellAuth product create/update is intentionally not executed because the public variant write payload is unclear. Use generated CSV/import manually for missing items.");
  exportCsv();
}

async function main() {
  const products = readJson(productsPath, []);
  const map = readJson(mapPath, { products: {}, variants: {} });
  const dryRun = process.argv.includes("--dry-run");
  const doSync = process.argv.includes("--sync");

  if (dryRun || !doSync) {
    printSummary(products, map, "dry run");
    exportCsv();
    return;
  }

  try {
    await sync();
  } catch (error) {
    console.error(`SellAuth sync stopped safely: ${error.message}`);
    console.error("SellAuth product creation/update endpoint unavailable or unclear. Use generated CSV/import manually.");
    exportCsv();
    process.exitCode = 1;
  }
}

main();
