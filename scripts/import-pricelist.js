const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "data", "raw-price-list.csv");
const outputPath = path.join(root, "data", "products.json");

function parseCsv(text) {
  const rows = [];
  let field = "";
  let row = [];
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted) {
      if (char === '"' && next === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (char !== "\r") {
      field += char;
    }
  }

  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((entry) => entry.some((value) => String(value).trim()));
}

function slug(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function numberOrNull(value) {
  const raw = String(value ?? "").trim();
  if (!raw || raw === "*") return null;
  const parsed = Number(raw.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function parseRow(headers, row) {
  const out = {};
  headers.forEach((header, index) => {
    out[header] = String(row[index] ?? "").trim();
  });
  return out;
}

function labelFor(row) {
  const dosage = row.dosage || "";
  const packageSize = row.packageSize || "";
  if (dosage && packageSize) return `${dosage} * ${packageSize}`;
  return dosage || packageSize || row.name;
}

function sortVariants(a, b) {
  const aPrice = a.price ?? Number.MAX_SAFE_INTEGER;
  const bPrice = b.price ?? Number.MAX_SAFE_INTEGER;
  return aPrice - bPrice || a.sku.localeCompare(b.sku);
}

function buildCatalog(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    if (!row.code || !row.name) return;
    const id = slug(row.name);
    const sourceList = row.sourceList || "WWB price list";
    const category = row.category || "Products";
    const bulkPrice = numberOrNull(row.bulkPrice);
    const price = numberOrNull(row.price);
    const bulkMin = numberOrNull(row.bulkMin);

    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        name: row.name,
        category,
        sourceList,
        description: "Available variants listed below. Availability and fulfillment are confirmed when the order is reviewed.",
        variants: [],
      });
    }

    const product = grouped.get(id);
    if (!product.category && category) product.category = category;
    if (!product.sourceList && sourceList) product.sourceList = sourceList;

    product.variants.push({
      sku: row.code,
      label: labelFor(row),
      dosage: row.dosage || labelFor(row),
      packageSize: row.packageSize || "",
      unitLabel: row.unitLabel || "unit",
      price,
      bulkMin,
      bulkPrice,
    });
  });

  return Array.from(grouped.values()).map((product) => ({
    ...product,
    variants: product.variants.sort(sortVariants),
  }));
}

function main() {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Missing ${path.relative(root, inputPath)}. Create it before running import.`);
  }

  const rows = parseCsv(fs.readFileSync(inputPath, "utf8"));
  const headers = rows.shift().map((header) => header.trim());
  const required = ["code", "name", "category", "dosage", "packageSize", "unitLabel", "price", "bulkMin", "bulkPrice", "sourceList"];
  const missing = required.filter((header) => !headers.includes(header));
  if (missing.length) throw new Error(`Missing CSV columns: ${missing.join(", ")}`);

  const records = rows.map((row) => parseRow(headers, row));
  const catalog = buildCatalog(records);
  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  const variantCount = catalog.reduce((sum, product) => sum + product.variants.length, 0);
  console.log(`Generated data/products.json with ${catalog.length} product families and ${variantCount} variants.`);
}

main();
