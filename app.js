const catalogGroups = [
  {
    category: "metabolic",
    family: "Metabolic peptides",
    format: "Vial, oral, or sales-approved format",
    names: [
      "Tirzepatide",
      "Semaglutide",
      "Retatrutide",
      "Cagrilintide",
      "Liraglutide",
      "Mazdutide",
      "Survodutide",
      "Orforglipron",
      "AOD9604",
      "Tesofensine",
      "BAM15",
      "SLU-PP-332",
      "5-amino-1mq",
      "Mots-C",
      "NAD+",
      "AICAR",
    ],
  },
  {
    category: "peptide",
    family: "Peptide vials",
    format: "Lyophilized vial configurations",
    names: [
      "TB-500",
      "TB-500 Fragment",
      "BPC-157",
      "BPC-157 Arg",
      "CJC-1295 without DAC",
      "CJC-1295 with DAC",
      "Ipamorelin",
      "Tesamorelin",
      "Sermorelin Acetate",
      "GHRP-2 Acetate",
      "GHRP-6 Acetate",
      "Hexarelin",
      "HGH Fragment 176-191",
      "IGF-1 LR3",
      "KissPeptin-10",
      "KPV",
      "LL37",
      "MGF",
      "PEG MGF",
      "PT-141",
      "P21",
      "P21-adamantane",
      "PE 22-28",
      "PNC 27",
      "SS-31",
      "Selank",
      "Semax",
      "NA Selank amidate",
      "NA Semax amidate",
      "Thymalin",
      "Thymosin Alpha-1",
      "VIP",
      "Adamax",
      "Adipotide",
      "ARA-290",
      "ACE-031",
      "Teriparatide",
      "Abaloparatide",
      "Vosoritide",
      "Navepegritide",
      "TPX-100",
      "LNA043",
    ],
  },
  {
    category: "regenerative",
    family: "Regenerative and aesthetic",
    format: "Vial, blend, or aesthetic program",
    names: [
      "GHK Basic",
      "GHK-CU",
      "AHK-CU",
      "GLOW blend",
      "KLOW blend",
      "BPC157 + TB500 blend",
      "BPC157 + TB500 + KPV blend",
      "Tesamorelin + Ipamorelin blend",
      "Cagrilintide + Semaglutide blend",
      "Retatrutide + Cagrilintide blend",
      "Selank + Semax blend",
      "NAD+ + Mots-C + 5-amino-1mq blend",
      "CJC-1295 + Ipamorelin blend",
      "SNAP-8",
      "Matrixyl",
      "Hyaluronic acid",
      "Glutathione",
      "Lipo-C",
      "Lipo-B",
      "Lipo-C Focus",
      "Lipo-C Fat Blaster",
      "Super Shred",
      "Healthy Hair Skin Nails blend",
      "Lipo Mino Mix",
      "Lemon Bottle",
      "Botulinum toxin",
    ],
  },
  {
    category: "endocrine",
    family: "Endocrine and hormone",
    format: "Strictly gated vial, oral, or injectable format",
    names: [
      "HGH 191AA Somatropin",
      "HMG",
      "HCG",
      "Oxytocin Acetate",
      "Gonadorelin",
      "EPO",
      "ANAVAR",
      "ANADROL",
      "DIANABOL",
      "Winstrol",
      "Turinabol",
      "Clenbuterol",
      "Clomid",
      "Letrozole",
      "Fluoxymesterone",
      "Proviron",
      "Methenolone Acetate",
      "Superdrol",
      "T3",
      "T4",
      "Tamoxifen",
      "Aromasin",
      "Arimidex",
      "Cabergoline",
      "Prednisone",
      "Dutasteride",
      "Finasteride",
    ],
  },
  {
    category: "pharma",
    family: "Prescription pharmaceuticals",
    format: "Direct sales access",
    names: [
      "Sildenafil",
      "Tadalafil",
      "Dapoxetine",
      "Isotretinoin",
      "Ivermectin",
      "Minoxidil",
      "Telmisartan",
      "Flibanserin",
      "Methylene Blue",
      "Salbutamol",
      "Alprostadil",
      "DNP",
      "Enclomiphene",
      "Chlorpromazine",
      "Meclozine",
      "Infigratinib",
      "Erdafitinib",
      "TYRA-300",
      "ASP5878",
      "Debio 1347",
      "AZD4547",
      "Pemigatinib",
      "Futibatinib",
      "Rogaratinib",
      "Romosozumab",
      "Recifercept",
    ],
  },
  {
    category: "vialing",
    family: "Injectables and vial programs",
    format: "Oil, water, or compounded vial program",
    names: [
      "Test Cypionate",
      "Test Enanthate",
      "Test Propionate",
      "Test Undecanoate",
      "Test Base",
      "Sustanon",
      "Supertest",
      "Tren A",
      "Tren E",
      "Tren Base",
      "Tren Hex",
      "Trenmix",
      "TriTren",
      "Primobolan E",
      "DECA",
      "NPP",
      "Nandromix",
      "Equipoise",
      "Boldenone Cypionate",
      "Mast P",
      "Mast E",
      "RIPEX blend",
      "MENT",
      "DHT",
      "Metribolone",
      "Estradiol Cypionate",
      "L-Carnitine",
      "B12",
      "D320 vitamins",
    ],
  },
  {
    category: "partner",
    family: "Raw powders and wholesale",
    format: "Raw material, bulk, or distributor review",
    names: [
      "Oxandrolone raw",
      "Mesterolone raw",
      "Trenbolone Acetate raw",
      "Trenbolone Enanthate raw",
      "Turinabol raw",
      "Testosterone Propionate raw",
      "Testosterone Enanthate raw",
      "Testosterone Cypionate raw",
      "Testosterone Decanoate raw",
      "Stanozolol raw",
      "Oxymetholone raw",
      "Methandrostenolone raw",
      "Boldenone Undecylenate raw",
      "Drostanolone Enanthate raw",
      "Drostanolone Propionate raw",
      "Nandrolone Decanoate raw",
      "Nandrolone Phenylpropionate raw",
      "Fluoxymesterone raw",
      "Methasteron raw",
      "1-Testosterone Cypionate raw",
      "Trestolone Acetate raw",
      "Trestolone Enanthate raw",
      "Sildenafil raw",
      "Tadalafil raw",
      "Kartogenin",
      "Lorecivivint",
      "Sprifermin",
      "BMP-2",
      "BMP-7",
      "WAY-316606",
      "CHIR99021",
      "SB431542",
      "Purmorphamine",
      "BIO 6-BIO",
      "CBL0137",
      "Dynasore",
      "Pitstop 2",
      "Dynole 34-2",
    ],
  },
];

const categoryMeta = {
  metabolic: {
    tags: ["Product paperwork", "Cold-chain review", "Sales desk"],
    image: "image-metabolic",
  },
  peptide: {
    tags: ["Product paperwork", "Batch docs", "COA"],
    image: "image-peptide",
  },
  regenerative: {
    tags: ["Credential review", "Lot docs", "QC"],
    image: "image-regenerative",
  },
  endocrine: {
    tags: ["Extra review", "Prescription required", "Export screen"],
    image: "image-endocrine",
  },
  pharma: {
    tags: ["Product paperwork", "Sales desk", "COA"],
    image: "image-pharma",
  },
  vialing: {
    tags: ["Custom", "Batch", "Labeling"],
    image: "image-vialing",
  },
  partner: {
    tags: ["B2B", "Screened", "Raw material"],
    image: "image-partner",
  },
};

const products = catalogGroups.flatMap((group) =>
  group.names.map((name, index) => {
    const meta = categoryMeta[group.category];
    return {
      name,
      category: group.category,
      summary: `${group.family} item. Availability, documentation, shipping review, and order terms are handled through the WWB sales desk.`,
      tags: meta.tags,
      code: makeCode(name, group.category, index),
      format: group.format,
      price: "Request quote",
      image: meta.image,
    };
  })
);

const productGrid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const quoteCount = document.querySelector("#quoteCount");
const catalogCount = document.querySelector("#catalogCount");
const filters = document.querySelectorAll(".category-filter");
const form = document.querySelector(".login-form");
const formNote = document.querySelector("#formNote");
const requestField = document.querySelector("#requestField");
const sortSelect = document.querySelector("#sortSelect");
const prepareOrderButton = document.querySelector("#prepareOrderButton");
const productDialog = document.querySelector("#productDialog");
const dialogClose = document.querySelector("#dialogClose");
const dialogVisual = document.querySelector("#dialogVisual");
const dialogCategory = document.querySelector("#dialogCategory");
const dialogTitle = document.querySelector("#dialogTitle");
const dialogSummary = document.querySelector("#dialogSummary");
const dialogFormat = document.querySelector("#dialogFormat");
const dialogTerms = document.querySelector("#dialogTerms");
const dialogTags = document.querySelector("#dialogTags");
const dialogQuoteButton = document.querySelector("#dialogQuoteButton");

let activeCategory = "all";
let quoteItems = new Set();
let activeProductName = "";

function makeCode(name, category, index) {
  const prefix = category.slice(0, 2).toUpperCase();
  const initials = name
    .replace(/raw$/i, "")
    .split(/[\s+/()-]+/)
    .filter(Boolean)
    .slice(0, 3)
    .map((word) => word[0])
    .join("")
    .toUpperCase();

  return `${prefix}${initials || index + 1}`;
}

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = products.filter((product) => {
    const inCategory = activeCategory === "all" || product.category === activeCategory;
    const inSearch = [
      product.name,
      product.summary,
      product.category,
      product.code,
      product.format,
      product.price,
      ...product.tags,
    ]
      .join(" ")
      .toLowerCase()
      .includes(query);
    return inCategory && inSearch;
  });
  const sorted = [...filtered].sort((a, b) => {
    if (sortSelect.value === "name") return a.name.localeCompare(b.name);
    return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
  });

  catalogCount.textContent = `${sorted.length} supply line${sorted.length === 1 ? "" : "s"} shown`;

  productGrid.innerHTML = sorted
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-visual ${product.image}"><span>${product.code}</span></div>
          <div class="product-body">
            <h3>${product.name}</h3>
            <p>${product.summary}</p>
            <dl class="product-specs">
              <div>
                <dt>Format</dt>
                <dd>${product.format}</dd>
              </div>
              <div>
                <dt>Terms</dt>
                <dd>${product.price}</dd>
              </div>
            </dl>
            <div class="product-meta">
              ${product.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
            </div>
            <div class="product-actions">
              <button class="button secondary" type="button" data-detail="${product.name}">
                View details
              </button>
              <button class="button primary compact" type="button" data-quote="${product.name}">
                Add
              </button>
            </div>
          </div>
        </article>
      `
    )
    .join("");

  if (!sorted.length) {
    productGrid.innerHTML = `<p>No matching catalog items.</p>`;
  }
}

filters.forEach((filter) => {
  filter.addEventListener("click", () => {
    filters.forEach((item) => item.classList.remove("active"));
    filter.classList.add("active");
    activeCategory = filter.dataset.category;
    renderProducts();
  });
});

searchInput.addEventListener("input", renderProducts);
sortSelect.addEventListener("change", renderProducts);

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quote]");
  const detailButton = event.target.closest("[data-detail]");
  if (detailButton) {
    openProductDialog(detailButton.dataset.detail);
    return;
  }
  if (!button) return;

  addProductToQuote(button.dataset.quote);
  button.textContent = "Added";
});

document.querySelector("#quoteButton").addEventListener("click", () => {
  const target = document.querySelector("#login");
  target.scrollIntoView({ behavior: "smooth" });
  formNote.textContent = quoteItems.size
    ? `${quoteItems.size} supply line(s) selected. Log in to continue the order request.`
    : "Select supply lines, then open the client portal.";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formNote.textContent = "Login UI is ready. Connect a secure backend to activate client accounts.";
});

prepareOrderButton.addEventListener("click", () => {
  formNote.textContent = quoteItems.size
    ? "Order request list prepared locally. Connect a secure backend to submit it."
    : "Add products to the quote list before preparing an order request.";
});

dialogClose.addEventListener("click", () => productDialog.close());

dialogQuoteButton.addEventListener("click", () => {
  addProductToQuote(activeProductName);
  dialogQuoteButton.textContent = "Added to quote list";
});

productDialog.addEventListener("click", (event) => {
  if (event.target === productDialog) productDialog.close();
});

function addProductToQuote(productName) {
  quoteItems.add(productName);
  quoteCount.textContent = quoteItems.size;
  updateRequestField();
}

function openProductDialog(productName) {
  const product = products.find((item) => item.name === productName);
  if (!product) return;

  activeProductName = product.name;
  dialogVisual.className = `dialog-visual ${product.image}`;
  dialogCategory.textContent = product.category;
  dialogTitle.textContent = product.name;
  dialogSummary.textContent = product.summary;
  dialogFormat.textContent = product.format;
  dialogTerms.textContent = product.price;
  dialogTags.innerHTML = product.tags.map((tag) => `<span class="pill">${tag}</span>`).join("");
  dialogQuoteButton.textContent = quoteItems.has(product.name) ? "Added to quote list" : "Add to quote list";
  productDialog.showModal();
}

function updateRequestField() {
  const selected = Array.from(quoteItems);
  const currentValue = requestField.value.trim();
  if (!selected.length || (currentValue && !currentValue.startsWith("Selected supply lines:"))) return;

  requestField.value = `Selected products:\n${selected.map((item) => `- ${item}`).join("\n")}\n\nCompany:\nDestination country:\nBuyer type:\nShipping lane or notes:`;
}

renderProducts();
