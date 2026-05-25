const products = [
  {
    name: "Prescription pharmaceutical supply",
    category: "pharma",
    summary: "Credential-gated pharmaceutical supply line for verified clinics, pharmacies, and wholesale buyers.",
    tags: ["License required", "Prescription review", "No open checkout"],
    code: "RX",
    format: "Product list after approval",
    price: "Released after verification",
  },
  {
    name: "GLP-class metabolic products",
    category: "metabolic",
    summary: "Metabolic product family handled through account approval, paperwork review, and lane screening.",
    tags: ["Verification", "Prescription review", "Cold-chain review"],
    code: "GLP",
    format: "Lyophilized vial sets",
    price: "Released after verification",
  },
  {
    name: "Peptide supply line",
    category: "peptide",
    summary: "Peptide catalog access for verified accounts with batch identity and packaging documentation.",
    tags: ["License required", "Batch docs", "COA"],
    code: "PEP",
    format: "Multiple vial configurations",
    price: "Released after verification",
  },
  {
    name: "Regenerative peptide line",
    category: "regenerative",
    summary: "Regenerative and tissue-support peptide categories reviewed for authorized buyers only.",
    tags: ["Credential review", "Blend review", "COA"],
    code: "REG",
    format: "Single and blend vial sets",
    price: "Released after verification",
  },
  {
    name: "Specialty peptide line",
    category: "peptide",
    summary: "Specialty peptide categories with document review before availability and pricing are released.",
    tags: ["Screened", "Restricted", "Account approval"],
    code: "SPC",
    format: "Vial programs",
    price: "Released after verification",
  },
  {
    name: "Endocrine and hormone line",
    category: "endocrine",
    summary: "Endocrine and hormone-related products handled through stricter prescription and destination screening.",
    tags: ["Extra review", "Prescription required", "Export screen"],
    code: "END",
    format: "Controlled account access",
    price: "Restricted release",
  },
  {
    name: "Aesthetic and cosmetic peptide line",
    category: "regenerative",
    summary: "Aesthetic, cosmetic, and dermatology peptide categories with lot-level documentation requests.",
    tags: ["Lot docs", "Packaging review", "QC"],
    code: "AEX",
    format: "Vial and bulk review",
    price: "Released after verification",
  },
  {
    name: "Custom vialing service",
    category: "vialing",
    summary: "Configurable vialing, labeling, and packaging programs for approved buyer accounts.",
    tags: ["Custom", "Batch", "Labeling"],
    code: "CV",
    format: "Private-label packaging",
    price: "Project quote",
  },
  {
    name: "Wholesale raw-material sourcing",
    category: "partner",
    summary: "Partner-sourced raw materials with identity, destination, and documentation screening.",
    tags: ["Partner", "Screened", "Raw material"],
    code: "RM",
    format: "Gram-scale review",
    price: "Partner quote",
  },
  {
    name: "Analytical paperwork pack",
    category: "partner",
    summary: "COA, test method, traceability, prescription, and packaging details assembled on request.",
    tags: ["Docs", "QA"],
    code: "AP",
    format: "PDF documentation bundle",
    price: "Included by request",
  },
  {
    name: "Bulk recurring supply program",
    category: "partner",
    summary: "Recurring supply conversations based on buyer verification and lawful destination lanes.",
    tags: ["B2B", "Recurring", "Screened"],
    code: "BSP",
    format: "Monthly or project-based",
    price: "Partner quote",
  },
  {
    name: "Licensed distribution onboarding",
    category: "partner",
    summary: "Qualification flow for distributors, pharmacies, clinics, institutions, and procurement teams.",
    tags: ["B2B", "Review", "Compliance"],
    code: "DO",
    format: "Buyer profile review",
    price: "No public pricing",
  },
  {
    name: "Shipping and export lane review",
    category: "vialing",
    summary: "Packaging, lane availability, paperwork, and cold-chain constraints reviewed before quotation.",
    tags: ["Shipping", "Export", "Cold chain"],
    code: "SLR",
    format: "Destination-specific",
    price: "Quoted after review",
  },
];

const productGrid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const quoteCount = document.querySelector("#quoteCount");
const filters = document.querySelectorAll(".category-filter");
const form = document.querySelector(".contact-form");
const formNote = document.querySelector("#formNote");
const requestField = document.querySelector("#requestField");

let activeCategory = "all";
let quoteItems = new Set();

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

  productGrid.innerHTML = filtered
    .map(
      (product) => `
        <article class="product-card">
          <div class="product-visual"><span>${product.code}</span></div>
          <div class="product-body">
            <h3>${product.name}</h3>
            <p>${product.summary}</p>
            <dl class="product-specs">
              <div>
                <dt>Format</dt>
                <dd>${product.format}</dd>
              </div>
              <div>
                <dt>Price</dt>
                <dd>${product.price}</dd>
              </div>
            </dl>
            <div class="product-meta">
              ${product.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
            </div>
            <button class="button secondary" type="button" data-quote="${product.name}">
              Add to verification file
            </button>
          </div>
        </article>
      `
    )
    .join("");

  if (!filtered.length) {
    productGrid.innerHTML = `<p>No matching restricted catalog programs.</p>`;
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

productGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-quote]");
  if (!button) return;

  quoteItems.add(button.dataset.quote);
  quoteCount.textContent = quoteItems.size;
  button.textContent = "Added for review";
  updateRequestField();
});

document.querySelector("#quoteButton").addEventListener("click", () => {
  const target = document.querySelector("#contact");
  target.scrollIntoView({ behavior: "smooth" });
  formNote.textContent = quoteItems.size
    ? `${quoteItems.size} supply line(s) selected. Add license, prescription, or buyer details before sending.`
    : "Select supply lines, then add your verification details.";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formNote.textContent =
    "Verification request prepared locally. Connect this form to email or a secure backend before accepting documents.";
});

function updateRequestField() {
  const selected = Array.from(quoteItems);
  const currentValue = requestField.value.trim();
  if (!selected.length || (currentValue && !currentValue.startsWith("Selected supply lines:"))) return;

  requestField.value = `Selected supply lines:\n${selected.map((item) => `- ${item}`).join("\n")}\n\nCompany:\nDestination country:\nAccount type:\nLicense or prescription details:`;
}

renderProducts();
