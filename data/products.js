(function () {
  const sourceMay21 = "WWB Pricelist 21-5-2026";
  const sourcePartner = "WWB Partnership Pricelist";
  const chinaWarehouse = "China Warehouse";
  const partnershipWarehouse = "Partnership raw powder list";
  const defaultDocs = ["COA", "Batch details", "Shipping review"];

  const reviewLabels = {
    sales_review: "Sales review required",
    restricted_review: "Restricted review",
    raw_review: "Raw material review",
  };

  const categoryProfiles = {
    peptides: {
      label: "Peptides",
      description: "Lyophilized peptide kits from the May 21 China Warehouse list.",
    },
    blends: {
      label: "Peptide blends",
      description: "Blend kits with priced variants and sales-desk confirmation.",
    },
    metabolic: {
      label: "Metabolic",
      description: "Metabolic peptide and oral request lines with quote review.",
    },
    hormones: {
      label: "Hormone / endocrine",
      description: "Hormone, fertility, and endocrine items requiring restricted review.",
    },
    orals: {
      label: "Orals",
      description: "Bottle-based oral product request lines from the May 21 list.",
    },
    injectables: {
      label: "Injectables",
      description: "Injectable/oil lines shown only for restricted sales review.",
    },
    raws: {
      label: "Raw powders",
      description: "Partnership raw-powder products priced per gram.",
    },
  };

  const docsByCategory = {
    peptides: defaultDocs,
    blends: defaultDocs,
    metabolic: defaultDocs,
    hormones: ["COA", "Batch details", "Shipping review", "Restricted product review"],
    orals: ["COA", "Batch details", "Invoice", "Shipping review"],
    injectables: ["COA", "Batch details", "MSDS", "Restricted product review"],
    raws: ["COA", "MSDS", "Batch details", "Export docs"],
  };

  function slug(value) {
    return String(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function money(value) {
    if (value === "*" || value === null || value === undefined) return null;
    if (typeof value === "number") return value;
    return Number(String(value).replace(/[$,]/g, "")) || null;
  }

  function option(sku, label, basePrice, bulkPrice, extra = {}) {
    const bulk = bulkPrice === "*" ? null : money(bulkPrice);
    return {
      sku,
      label,
      dosage: extra.dosage || label,
      packageSize: extra.packageSize || label,
      unitLabel: extra.unitLabel || "kit",
      basePrice: money(basePrice),
      bulkPrice: bulk,
      bulkMinimum: extra.bulkMinimum === undefined ? 10 : extra.bulkMinimum,
      bulkQuoteRequired: bulkPrice === "*" || bulkPrice === null || bulkPrice === undefined,
      warehouse: extra.warehouse || chinaWarehouse,
      sourceList: extra.sourceList || sourceMay21,
      note: extra.note || "",
    };
  }

  function family(def) {
    const firstPriced = def.options.find((entry) => Number(entry.basePrice)) || def.options[0];
    const priceType = def.reviewLevel === "restricted_review" ? "restricted" : Number(firstPriced?.basePrice) ? "fixed" : "quote";
    return {
      id: def.id || slug(def.name),
      code: firstPriced?.sku || def.code || slug(def.name).toUpperCase(),
      name: def.name,
      category: def.category,
      categoryLabel: categoryProfiles[def.category].label,
      subcategory: def.subcategory || categoryProfiles[def.category].label,
      productType: def.productType || categoryProfiles[def.category].label,
      sourceList: def.sourceList || sourceMay21,
      warehouse: def.warehouse || chinaWarehouse,
      dosage: firstPriced?.dosage || firstPriced?.label || "",
      packageSize: firstPriced?.packageSize || firstPriced?.label || "",
      unitLabel: firstPriced?.unitLabel || "kit",
      basePrice: firstPriced?.basePrice || null,
      bulkPrice: firstPriced?.bulkPrice || null,
      bulkMinimum: firstPriced?.bulkMinimum || 10,
      priceType,
      availability: def.availability || "quote_available",
      reviewLevel: def.reviewLevel || "sales_review",
      reviewLabel: reviewLabels[def.reviewLevel || "sales_review"],
      documentation: def.documentation || docsByCategory[def.category] || defaultDocs,
      options: def.options,
      notes: def.notes || "Availability, documentation, and destination requirements are confirmed by the sales desk.",
      shippingNotes: def.shippingNotes || "Shipping method and storage requirements confirmed during quote review.",
      tags: [def.name, def.category, def.productType || "", ...(def.tags || [])].map((entry) => String(entry).toLowerCase()),
      sourcePriority: def.sourcePriority || 1,
      addedAt: def.addedAt || "2026-05-21",
    };
  }

  const products = [
    family({
      name: "Tirzepatide",
      category: "metabolic",
      productType: "Metabolic peptide",
      reviewLevel: "sales_review",
      tags: ["glp", "peptide", "china warehouse"],
      options: [
        option("TR5", "5mg * 10 vials", 35, 30),
        option("TR10", "10mg * 10 vials", 50, 45),
        option("TR15", "15mg * 10 vials", 60, 55),
        option("TR20", "20mg * 10 vials", 70, 65),
        option("TR30", "30mg * 10 vials", 90, 85),
        option("TR40", "40mg * 10 vials", 110, 105),
        option("TR50", "50mg * 10 vials", 130, 125),
        option("TR60", "60mg * 10 vials", 150, 145),
        option("TR100", "100mg * 10 vials", 230, 220),
      ],
    }),
    family({
      name: "Semaglutide",
      category: "metabolic",
      productType: "Metabolic peptide",
      reviewLevel: "sales_review",
      tags: ["glp", "peptide", "china warehouse"],
      options: [
        option("SM2", "2mg * 10 vials", 25, 20),
        option("SM5", "5mg * 10 vials", 35, 30),
        option("SM10", "10mg * 10 vials", 50, 45),
        option("SM15", "15mg * 10 vials", 60, 55),
        option("SM20", "20mg * 10 vials", 70, 65),
        option("SM30", "30mg * 10 vials", 90, 85),
      ],
    }),
    family({
      name: "Retatrutide",
      category: "metabolic",
      productType: "Metabolic peptide",
      reviewLevel: "sales_review",
      tags: ["glp", "peptide", "china warehouse"],
      options: [
        option("RT5", "5mg * 10 vials", 55, 50),
        option("RT10", "10mg * 10 vials", 80, 75),
        option("RT15", "15mg * 10 vials", 100, 95),
        option("RT20", "20mg * 10 vials", 120, 115),
        option("RT30", "30mg * 10 vials", 160, 155),
        option("RT40", "40mg * 10 vials", 200, 190),
        option("RT50", "50mg * 10 vials", 240, 230),
        option("RT60", "60mg * 10 vials", 280, 270),
      ],
    }),
    family({
      name: "TB-500",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("BT5", "5mg * 10 vials", 65, 60),
        option("BT10", "10mg * 10 vials", 120, 115),
        option("BT20", "20mg * 10 vials", 200, 190),
        option("B10F", "TB-500 Frag 10mg * 10 vials", 85, 80),
      ],
    }),
    family({
      name: "BPC 157",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("BC5", "5mg * 10 vials", 35, 30),
        option("BC10", "10mg * 10 vials", 55, 50),
        option("BC20", "20mg * 10 vials", 95, 90),
      ],
    }),
    family({
      name: "BPC / TB / KPV blends",
      category: "blends",
      productType: "Blend kit",
      reviewLevel: "sales_review",
      options: [
        option("BB10", "BPC157 5mg + TB500 5mg blend, 10mg * 10 vials", 85, 80),
        option("BB20", "BPC157 10mg + TB500 10mg blend, 20mg * 10 vials", 150, 140),
        option("BBK30", "BPC157 10mg + TB500 10mg + KPV 10mg blend, 30mg * 10 vials", 180, 170),
      ],
    }),
    family({
      name: "GLOW / KLOW blends",
      category: "blends",
      productType: "Aesthetic blend kit",
      reviewLevel: "sales_review",
      options: [
        option("BBG50", "GLOW GHK-CU 35mg + TB500 10mg + BPC157 5mg, 50mg * 10 vials", 150, 140),
        option("BBG70", "GLOW GHK-CU 50mg + TB500 10mg + BPC157 10mg, 70mg * 10 vials", 170, 160),
        option("KL80", "KLOW GHK-CU 50mg + TB500 10mg + BPC157 10mg + KPV 10mg, 80mg * 10 vials", 190, 180),
      ],
    }),
    family({
      name: "CJC-1295 / Ipamorelin",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("CP10", "CJC-1295 without DAC 5mg + IPA 5mg blend, 10mg * 10 vials", 90, 85),
        option("CP20", "CJC-1295 without DAC 10mg + IPA 10mg blend, 20mg * 10 vials", 160, 150),
        option("CND5", "CJC-1295 without DAC 5mg * 10 vials", 70, 65),
        option("CND10", "CJC-1295 without DAC 10mg * 10 vials", 115, 110),
        option("CD2", "CJC-1295 with DAC 2mg * 10 vials", 70, 65),
        option("CD5", "CJC-1295 with DAC 5mg * 10 vials", 130, 120),
        option("CD10", "CJC-1295 with DAC 10mg * 10 vials", 240, 230),
        option("IP2", "Ipamorelin 2mg * 10 vials", 30, 25),
        option("IP5", "Ipamorelin 5mg * 10 vials", 35, 30),
        option("IP10", "Ipamorelin 10mg * 10 vials", 60, 55),
      ],
    }),
    family({
      name: "GHK / GHK-CU / AHK-CU",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("AU100", "AHK-CU 100mg * 10 vials", 65, 60),
        option("GH50", "GHK Basic 50mg * 10 vials", 35, 30),
        option("CU50", "GHK-CU 50mg * 10 vials", 30, 25),
        option("CU100", "GHK-CU 100mg * 10 vials", 45, 40),
      ],
    }),
    family({
      name: "NAD+",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("NJ3100", "NAD+ 100mg * 10 vials", 35, 30),
        option("NJ250", "NAD+ 250mg * 10 vials", 50, 45),
        option("NJ500", "NAD+ 500mg * 10 vials", 70, 65),
        option("NJ1000", "NAD+ 1000mg * 10 vials", 120, 110),
        option("NJ100", "NAD+ 100mg 10ML vial", 15, null, { unitLabel: "vial", bulkMinimum: 10 }),
      ],
    }),
    family({
      name: "HGH 191AA Somatropin",
      category: "hormones",
      productType: "Hormone kit",
      reviewLevel: "restricted_review",
      availability: "restricted_review",
      options: [
        option("H06", "6iu * 10 vials", 40, "*"),
        option("H10", "10iu * 10 vials", 50, "*"),
        option("H12", "12iu * 10 vials", 60, "*"),
        option("H15", "15iu * 10 vials", 70, "*"),
        option("H24", "24iu * 10 vials", 100, "*"),
        option("H36", "36iu * 10 vials", 140, "*"),
        option("H50", "50iu * 10 vials", 190, "*"),
      ],
    }),
    family({
      name: "HCG / HMG",
      category: "hormones",
      productType: "Fertility hormone kit",
      reviewLevel: "restricted_review",
      availability: "restricted_review",
      options: [
        option("G75", "HMG 75IU * 10 vials", 60, 55),
        option("G2K", "HCG 2000IU * 10 vials", 45, 40),
        option("G5K", "HCG 5000IU * 10 vials", 70, 65),
        option("G10K", "HCG 10000IU * 10 vials", 130, 125),
      ],
    }),
    family({
      name: "Tesamorelin / Sermorelin",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("SMO5", "Sermorelin Acetate 5mg * 10 vials", 65, 60),
        option("SMO10", "Sermorelin Acetate 10mg * 10 vials", 110, 105),
        option("SMO15", "Sermorelin Acetate 15mg * 10 vials", 175, 165),
        option("TSM2", "Tesamorelin 2mg * 10 vials", 50, 45),
        option("TSM5", "Tesamorelin 5mg * 10 vials", 75, 70),
        option("TSM10", "Tesamorelin 10mg * 10 vials", 130, 125),
        option("TSM20", "Tesamorelin 20mg * 10 vials", 250, 240),
      ],
    }),
    family({
      name: "Selank / Semax",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("SK5", "Selank 5mg * 10 vials", 35, 30),
        option("SK10", "Selank 10mg * 10 vials", 55, 50),
        option("SK30", "Selank 30mg * 10 vials", 120, 110),
        option("XA5", "Semax 5mg * 10 vials", 35, 30),
        option("XA10", "Semax 10mg * 10 vials", 55, 50),
        option("XA30", "Semax 30mg * 10 vials", 120, 110),
        option("NSK30", "NA Selank amidate 30mg * 10 vials", 130, 120),
        option("NXA30", "NA Semax amidate 30mg * 10 vials", 130, 120),
      ],
    }),
    family({
      name: "Other peptide kits",
      category: "peptides",
      productType: "Peptide kit",
      reviewLevel: "sales_review",
      options: [
        option("AOD2", "AOD9604 2mg * 10 vials", 45, 40),
        option("AOD5", "AOD9604 5mg * 10 vials", 85, 80),
        option("CGL5", "Cagrilintide 5mg * 10 vials", 70, 65),
        option("CGL10", "Cagrilintide 10mg * 10 vials", 120, 115),
        option("GTT", "Glutathione 1500mg * 10 vials", 85, 80),
        option("MS10", "MOTS-C 10mg * 10 vials", 55, 50),
        option("MS40", "MOTS-C 40mg * 10 vials", 170, 160),
        option("PTD5", "PTD-DBM 5mg * 10 vials", 195, 185),
        option("TA5", "Thymosin Alpha-1 5mg * 10 vials", 75, 70),
        option("TA10", "Thymosin Alpha-1 10mg * 10 vials", 130, 125),
      ],
    }),
    family({
      name: "Oral metabolic products",
      category: "orals",
      productType: "Oral bottle",
      reviewLevel: "sales_review",
      options: [
        option("B157", "BPC-157 Arg 500mcg x 100 tablets", 45, 43, { unitLabel: "bottle" }),
        option("BC500", "BPC-157 500mcg x 60 capsules", 35, 33, { unitLabel: "bottle" }),
        option("T500", "Tesofensine 500mcg x 100 tablets", 35, 33, { unitLabel: "bottle" }),
        option("BAM50", "BAM15 50mg x 60 capsules", 80, 75, { unitLabel: "bottle" }),
        option("TR500", "Tirzepatide 500mcg x 25 tablets", 20, 18, { unitLabel: "bottle" }),
        option("SM500", "Semaglutide 500mcg x 25 tablets", 20, 18, { unitLabel: "bottle" }),
        option("SMM3", "Semaglutide 3mg x 25 tablets", 55, 53, { unitLabel: "bottle" }),
        option("SMM7", "Semaglutide 7mg x 25 tablets", 85, 83, { unitLabel: "bottle" }),
        option("AMQ50", "5-amino-1mq 50mg x 25 tablets", 35, 33, { unitLabel: "bottle" }),
        option("ORF6", "Orforglipron 6mg x 100 tablets", 115, 110, { unitLabel: "bottle" }),
        option("ORF12", "Orforglipron 12mg x 100 tablets", 195, 190, { unitLabel: "bottle" }),
      ],
    }),
    family({
      name: "SLU-PP-332 oral series",
      category: "orals",
      productType: "Oral bottle",
      reviewLevel: "sales_review",
      options: [
        option("SLU250", "250mcg x 100 tablets", 18, 16, { unitLabel: "bottle" }),
        option("SLU500", "500mcg x 100 tablets", 20, 18, { unitLabel: "bottle" }),
        option("SLU1000", "1mg x 100 tablets", 23, 21, { unitLabel: "bottle" }),
        option("SLU5", "5mg x 100 tablets", 38, 36, { unitLabel: "bottle" }),
        option("SLU20", "20mg x 100 tablets", 68, 63, { unitLabel: "bottle" }),
        option("SL50", "50mg x 100 tablets", 110, 105, { unitLabel: "bottle" }),
        option("SL100", "100mg x 60 capsules", 145, 140, { unitLabel: "bottle" }),
      ],
    }),
    family({
      name: "Prescription oral review lines",
      category: "orals",
      productType: "Oral bottle",
      reviewLevel: "restricted_review",
      availability: "restricted_review",
      options: [
        option("SD100", "Sildenafil 100mg x 100 tablets", 15, 13, { unitLabel: "bottle" }),
        option("DT20", "Tadalafil 20mg x 100 tablets", 15, 13, { unitLabel: "bottle" }),
        option("DAP30", "Dapoxetine 30mg x 100 tablets", 30, 28, { unitLabel: "bottle" }),
        option("ISO10", "Isotretinoin 10mg x 100 tablets", 18, 16, { unitLabel: "bottle" }),
        option("LV5", "Ivermectin 5mg x 100 tablets", 20, 18, { unitLabel: "bottle" }),
        option("MD5", "Minoxidil 5mg x 100 tablets", 15, 13, { unitLabel: "bottle" }),
        option("TM40", "Telmisartan 40mg x 100 tablets", 20, 18, { unitLabel: "bottle" }),
        option("MB20", "Methylene Blue 20mg x 100 tablets", 18, 16, { unitLabel: "bottle" }),
      ],
    }),
    family({
      name: "Restricted endocrine orals",
      category: "orals",
      productType: "Restricted oral bottle",
      reviewLevel: "restricted_review",
      availability: "restricted_review",
      options: [
        option("X10", "ANAVAR 10mg x 100 tablets", 40, "*", { unitLabel: "bottle" }),
        option("X25", "ANAVAR 25mg x 100 tablets", 55, "*", { unitLabel: "bottle" }),
        option("X50", "ANAVAR 50mg x 100 tablets", 80, "*", { unitLabel: "bottle" }),
        option("OXP50", "ANADROL 50mg x 100 tablets", 35, 33, { unitLabel: "bottle" }),
        option("D10", "DIANABOL 10mg x 100 tablets", 20, 18, { unitLabel: "bottle" }),
        option("D20", "DIANABOL 20mg x 100 tablets", 25, 23, { unitLabel: "bottle" }),
        option("D50", "DIANABOL 50mg x 100 tablets", 40, 38, { unitLabel: "bottle" }),
        option("CB40", "CLENBUTEROL 40mcg x 100 tablets", 15, 13, { unitLabel: "bottle" }),
        option("CD50", "Clomid 50mg x 100 tablets", 20, 18, { unitLabel: "bottle" }),
        option("LZ25", "Letrozole 2.5mg x 100 tablets", 20, 18, { unitLabel: "bottle" }),
        option("CG25", "Cabergoline 0.25mg x 100 tablets", 75, 70, { unitLabel: "bottle" }),
      ],
    }),
    family({
      name: "Injectable review lines",
      category: "injectables",
      productType: "Injectable vial",
      reviewLevel: "restricted_review",
      availability: "restricted_review",
      notes: "Injectable/oil products are displayed as sales-review request lines only. Sales desk confirms buyer eligibility, destination rules, and final terms.",
      options: [
        option("C250", "Test Cypionate 250mg, 10ML vial", 15, null, { unitLabel: "vial" }),
        option("E250", "Test Enanthate 250mg, 10ML vial", 15, null, { unitLabel: "vial" }),
        option("P100", "Test P 100mg, 10ML vial", 10, null, { unitLabel: "vial" }),
        option("R100", "Tren A 100mg, 10ML vial", 20, null, { unitLabel: "vial" }),
        option("M100", "Primobolan E 100mg, 10ML vial", 45, null, { unitLabel: "vial" }),
        option("N200", "DECA 200mg, 10ML vial", 16, null, { unitLabel: "vial" }),
        option("LC120", "Lipo-C 120mg blend, 10ML vial", null, 55, { unitLabel: "vial" }),
        option("LC500", "L-Carnitine 500mg, 10ML vial", null, 60, { unitLabel: "vial" }),
      ],
    }),
  ];

  const rawRows = [
    ["TE10", "Teriparatide", 205],
    ["AB10", "Abaloparatide", 288],
    ["TT20", "Testagen", 175, "20mg * 10 vials"],
    ["KY19", "KY19382", 102],
    ["BG39", "Infigratinib (BGJ-398)", 126],
    ["ED01", "Erdafitinib", 156],
    ["TYR3", "TYRA-300 (Dabogratinib)", 612],
    ["AS58", "ASP5878", 186],
    ["DE13", "Debio 1347", 192],
    ["AZ45", "AZD4547", 126],
    ["PE01", "Pemigatinib", 204],
    ["FU01", "Futibatinib", 234],
    ["RO01", "Rogaratinib", 216],
    ["VO11", "Vosoritide", 714],
    ["NV22", "Navepegritide", 672],
    ["KG10", "Kartogenin", 57],
    ["LV90", "Lorecivivint", 288],
    ["SF18", "Sprifermin", 960],
    ["TX10", "TPX-100", 312],
    ["LN43", "LNA043", 540],
    ["BM02", "BMP-2", 1680],
    ["BM07", "BMP-7", 1860],
    ["RM85", "Romosozumab", 1320],
    ["WY66", "WAY-316606", 114],
    ["RC77", "Recifercept", 588],
    ["CH21", "CHIR99021", 51],
    ["SB42", "SB431542", 39],
    ["PM55", "Purmorphamine", 72],
    ["BI06", "BIO (6-BIO)", 87],
    ["CB37", "CBL0137", 186],
    ["DY34", "Dynasore", 105],
    ["PT02", "Pitstop 2", 168],
    ["DN42", "Dynole 34-2", 192],
    ["CP25", "Chlorpromazine", 21],
    ["MZ10", "Meclozine", 20],
  ].map(([sku, name, price, label]) =>
    family({
      id: `raw-${slug(sku)}-${slug(name)}`,
      name,
      category: "raws",
      productType: "Raw powder",
      sourceList: sourcePartner,
      warehouse: partnershipWarehouse,
      reviewLevel: "raw_review",
      options: [
        option(sku, label || "1g raw powder", price, null, {
          unitLabel: label ? "kit" : "g",
          bulkMinimum: null,
          warehouse: partnershipWarehouse,
          sourceList: sourcePartner,
        }),
      ],
      tags: ["raw powder", "partnership pricelist"],
      addedAt: "2026-05-20",
      notes: "Raw powder request line. Documentation, export review, and buyer credentials are required before quote confirmation.",
    })
  );

  const allProducts = [...products, ...rawRows];

  window.WWBData = {
    products: allProducts,
    categoryProfiles,
    reviewLabels,
    optionSets: {
      buyerTypes: ["Clinic", "Pharmacy", "Lab", "Distributor", "Reseller", "Other"],
      documents: ["COA", "Batch docs", "MSDS", "Invoice", "Export docs"],
      shipping: ["Standard", "Cold-chain review", "Discreet packaging", "Courier quote"],
      statuses: ["quote_available", "restricted_review"],
      priceTypes: ["fixed", "quote", "restricted"],
      sources: Array.from(new Set(allProducts.map((product) => product.warehouse))).sort(),
      formats: Array.from(new Set(allProducts.flatMap((product) => product.options.map((entry) => entry.unitLabel)))).sort(),
      productTypes: Array.from(new Set(allProducts.map((product) => product.productType))).sort(),
      reviewLevels: Object.keys(reviewLabels),
    },
  };
})();
