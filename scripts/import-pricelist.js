const fs = require("fs");
const path = require("path");

const root = path.resolve(__dirname, "..");
const inputPath = path.join(root, "data", "raw-price-list.csv");
const outputPath = path.join(root, "data", "products.json");
const DEFAULT_DESCRIPTION = "Available variants listed below. Availability and fulfillment are confirmed when the order is reviewed.";

const featuredNames = new Set(["Tirzepatide", "Semaglutide", "Retatrutide", "BPC 157", "TB-500", "GHK-CU", "NAD+", "BAC Water"]);
const sourcePriority = {
  "WWB Pricelist 21-5-2026": 4,
  "WWB Partnership Pricelist": 3,
  "WWB Pricelist 5-11-2026": 2,
  "China Warehouse": 1,
};

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

function titleCase(value) {
  return String(value || "")
    .trim()
    .replace(/\s+/g, " ")
    .replace(/\b([a-z])([a-z]*)/gi, (_match, first, rest) => first.toUpperCase() + rest.toLowerCase())
    .replace(/\bNad\b/g, "NAD")
    .replace(/\bGhK\b/gi, "GHK")
    .replace(/\bBpc\b/g, "BPC")
    .replace(/\bTb\b/g, "TB")
    .replace(/\bKpv\b/g, "KPV")
    .replace(/\bHgh\b/g, "HGH")
    .replace(/\bHcg\b/g, "HCG")
    .replace(/\bHmg\b/g, "HMG")
    .replace(/\bBam\b/g, "BAM")
    .replace(/\bSlu\b/g, "SLU");
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

function stripStrength(value) {
  return String(value || "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\b\d+(\.\d+)?\s*(mcg|mg|iu|ml|g)\b.*$/i, "")
    .replace(/\b\d+(\.\d+)?\s*x\s*\d+.*$/i, "")
    .replace(/\s+blend\b/i, " blend")
    .replace(/[,|-]\s*$/g, "")
    .trim();
}

function normalizedProductName(row) {
  const sku = row.code || "";
  const current = String(row.name || "").trim();
  const label = labelFor(row);
  const dosage = row.dosage || "";

  if (/^raw-/i.test(row.category)) return current;
  if (/raw powder/i.test(row.category) || /Partnership/i.test(row.sourceList)) return current;
  if (/BAC Water/i.test(current) || /^BA\d/i.test(sku)) return "BAC Water";
  if (/AA Water/i.test(label) || /^AA/i.test(sku)) return "AA Water";
  if (/Tirzepatide/i.test(current) || /^TR(?!500)/.test(sku)) return "Tirzepatide";
  if (/Semaglutide/i.test(current) || /^SM(?!500|M)/.test(sku)) return "Semaglutide";
  if (/Retatrutide/i.test(current) || /^RT/.test(sku)) return "Retatrutide";
  if (/BPC 157|BPC-157/i.test(current) && !/blend/i.test(current)) return "BPC 157";
  if (/TB-?500/i.test(current) && !/blend/i.test(current)) return "TB-500";
  if (/GHK \/ GHK-CU|AHK-CU/i.test(current) && /^AU/.test(sku)) return "AHK-CU";
  if (/GHK \/ GHK-CU|GHK Basic/i.test(current) && /^GH/.test(sku)) return "GHK Basic";
  if (/GHK \/ GHK-CU|GHK-CU/i.test(current) && /^CU/.test(sku)) return "GHK-CU";
  if (/NAD/i.test(current) || /^NJ/.test(sku)) return "NAD+";
  if (/HGH/i.test(current) || /^H\d/.test(sku)) return "HGH 191AA Somatropin";
  if (/HCG|HMG/i.test(current) || /^G(75|2K|5K|10K)/.test(sku)) return "HCG / HMG";
  if (/Tesamorelin|Sermorelin/i.test(current) && /^SMO/.test(sku)) return "Sermorelin Acetate";
  if (/Tesamorelin|Sermorelin/i.test(current) && /^TSM/.test(sku)) return "Tesamorelin";
  if (/Selank/i.test(current) && /^SK|^NSK/.test(sku)) return /^NSK/.test(sku) ? "NA Selank Amidate" : "Selank";
  if (/Semax/i.test(current) && /^XA|^NXA/.test(sku)) return /^NXA/.test(sku) ? "NA Semax Amidate" : "Semax";
  if (/CJC-1295 \/ Ipamorelin/i.test(current) && /^CP/.test(sku)) return "CJC-1295 / Ipamorelin Blend";
  if (/CJC-1295 \/ Ipamorelin/i.test(current) && /^CND/.test(sku)) return "CJC-1295 without DAC";
  if (/CJC-1295 \/ Ipamorelin/i.test(current) && /^CD/.test(sku)) return "CJC-1295 with DAC";
  if (/CJC-1295 \/ Ipamorelin/i.test(current) && /^IP/.test(sku)) return "Ipamorelin";
  if (/Other peptide kits|Oral metabolic products|Prescription oral review lines|Restricted endocrine orals|Injectable review lines/i.test(current)) {
    const cleaned = stripStrength(dosage || label);
    return titleCase(cleaned || current);
  }
  return current;
}

function catalogCategory(row, productName) {
  const haystack = `${productName} ${row.name} ${row.dosage} ${row.category} ${row.code}`.toLowerCase();
  if (/partnership|raw powder/.test(haystack)) return "Raw Powders";
  if (/bac water|aa water/.test(haystack)) return "Accessories / Water";
  if (/tablet|capsule|orals|anavar|anadrol|dianabol|sildenafil|tadalafil|clenbuterol|clomid|letrozole|cabergoline|orforglipron|slupp|slu-pp/.test(haystack)) return "Orals";
  if (/hgh|hcg|hmg|epo|somatropin|fertility|endocrine|test cypionate|test enanthate|tren |primobolan|deca/.test(haystack)) return "Hormones / Fertility";
  if (/blend|glow|klow|bpc.*tb|cagri.*sema|reta.*cagri/.test(haystack)) return "Blends";
  if (/tirzepatide|semaglutide|retatrutide|cagrilintide|mazdutide|liraglutide|survodutide|tesofensine/.test(haystack)) return "GLP-1 / Metabolic";
  if (/ghk|ahk|snap|matrixyl|hyaluronic|cosmetic|skin|botulinum/.test(haystack)) return "Cosmetic / Skin";
  if (/bpc|tb-?500|kpv|ll37|aod9604|thymosin|glutathione|mots|ptd|nad/.test(haystack)) return "Recovery / Repair";
  if (/sermorelin|tesamorelin|ipamorelin|cjc|selank|semax|dsip|epithalon|kisspeptin|oxytocin|pinealon|igf|peg|vip|pt-141|pt141|gonadorelin|hexarelin|ghrp|mt-1|mt-2|melanotan|bronchogen|cardiogen|vesugen|cartalax|vilon|humanin/.test(haystack)) return "Peptides";
  if (/peptide/.test(haystack)) return "Peptides";
  return "Other";
}

function sortGroupFor(category, productName) {
  if (featuredNames.has(productName)) return "Featured / Popular";
  return category;
}

function cleanDescription(productName, category) {
  if (category === "GLP-1 / Metabolic") return "Metabolic and GLP-1 product variants from the current WWB price list.";
  if (category === "Recovery / Repair") return "Peptide variants grouped for fast variant and quantity selection.";
  if (category === "Blends") return "Blend variants grouped by formula and package size.";
  if (category === "Raw Powders") return "Raw powder items from the partnership price list, priced by gram where available.";
  if (category === "Accessories / Water") return "Accessory and water products used as add-on order items.";
  if (category === "Orals") return "Bottle-based tablet and capsule products from the current list.";
  if (category === "Hormones / Fertility") return "Hormone, fertility, and restricted-review products from the current list.";
  if (category === "Cosmetic / Skin") return "Cosmetic and skin-support product variants from the catalog.";
  if (category === "Peptides") return "Peptide product variants grouped for fast package and quantity selection.";
  return `${productName} variants from the WWB price list.`;
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
    const name = normalizedProductName(row);
    const category = catalogCategory(row, name);
    const id = slug(`${category}-${name}`);
    const sourceList = row.sourceList || "WWB price list";
    const bulkPrice = numberOrNull(row.bulkPrice);
    const price = numberOrNull(row.price);
    const bulkMin = numberOrNull(row.bulkMin);
    const featured = row.featured ? /^(true|1|yes)$/i.test(row.featured) : featuredNames.has(name);
    const sortGroup = row.sortGroup || sortGroupFor(category, name);

    if (!grouped.has(id)) {
      grouped.set(id, {
        id,
        name,
        category,
        sourceList,
        featured,
        sortGroup,
        description: cleanDescription(name, category),
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
      sourceList,
    });
  });

  return Array.from(grouped.values()).map((product) => ({
    ...product,
    variants: product.variants.sort(sortVariants),
  })).sort((a, b) => {
    if (a.featured !== b.featured) return a.featured ? -1 : 1;
    return a.sortGroup.localeCompare(b.sortGroup) || a.name.localeCompare(b.name);
  });
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

  const recordsBySku = new Map();
  rows.map((row) => parseRow(headers, row)).forEach((record) => {
    const existing = recordsBySku.get(record.code);
    const incomingRank = sourcePriority[record.sourceList] || 0;
    const existingRank = sourcePriority[existing?.sourceList] || 0;
    if (!existing || incomingRank >= existingRank) recordsBySku.set(record.code, record);
  });
  const records = Array.from(recordsBySku.values());
  const catalog = buildCatalog(records);
  fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`);
  const variantCount = catalog.reduce((sum, product) => sum + product.variants.length, 0);
  console.log(`Generated data/products.json with ${catalog.length} product families and ${variantCount} variants.`);
}

main();
