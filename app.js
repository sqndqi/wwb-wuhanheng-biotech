const products = [
  {
    name: "GLP-class metabolic research controls",
    category: "metabolic",
    summary: "Metabolic assay reference programs sourced from the May 2026 internal price files.",
    tags: ["Verification", "COA", "Cold-chain review"],
    code: "GLP",
    format: "Lyophilized vial sets",
    price: "Verified quote only",
  },
  {
    name: "Growth-factor peptide research line",
    category: "peptide",
    summary: "Restricted research peptide family with batch identity and packaging documentation.",
    tags: ["Restricted", "Batch docs", "Institutional"],
    code: "GFP",
    format: "Multiple vial configurations",
    price: "Verified quote only",
  },
  {
    name: "Regenerative and tissue-repair research line",
    category: "regenerative",
    summary: "Peptide and blend programs for qualified R&D teams and method-development groups.",
    tags: ["Research use", "Blend review", "COA"],
    code: "RTR",
    format: "Single and blend vial sets",
    price: "Verified quote only",
  },
  {
    name: "Neuro and longevity assay materials",
    category: "peptide",
    summary: "Specialty research materials with documentation review before any quotation.",
    tags: ["Assay support", "Screened", "No consumer sales"],
    code: "NLA",
    format: "Research vial programs",
    price: "Verified quote only",
  },
  {
    name: "Endocrine assay controls",
    category: "endocrine",
    summary: "Hormone-related assay controls handled through stricter destination and buyer screening.",
    tags: ["Extra review", "Export screen", "COA"],
    code: "EAC",
    format: "Assay-control sets",
    price: "Restricted",
  },
  {
    name: "Copper peptide and cosmetic research line",
    category: "regenerative",
    summary: "Cosmetic and dermatology research materials with lot-level documentation requests.",
    tags: ["Lot docs", "Packaging review", "QC"],
    code: "CPC",
    format: "Vial and bulk review",
    price: "Verified quote only",
  },
  {
    name: "Custom vialing service",
    category: "vialing",
    summary: "Configurable vialing, labeling, and packaging programs for qualified buyers.",
    tags: ["Custom", "Batch", "Labeling"],
    code: "CV",
    format: "Private-label packaging",
    price: "Project quote",
  },
  {
    name: "Raw powder partnership sourcing",
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
    summary: "COA, test method, traceability, and packaging details assembled on request.",
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
    name: "Distribution onboarding file",
    category: "partner",
    summary: "Qualification flow for distributors, institutions, and procurement teams.",
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
              Add to quote file
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
    ? `${quoteItems.size} catalog program(s) selected. Add your company details before sending.`
    : "Select catalog programs, then add your company details.";
});

form.addEventListener("submit", (event) => {
  event.preventDefault();
  formNote.textContent =
    "Inquiry prepared locally. Connect this form to email or a backend before publishing.";
});

function updateRequestField() {
  const selected = Array.from(quoteItems);
  const currentValue = requestField.value.trim();
  if (!selected.length || (currentValue && !currentValue.startsWith("Selected programs:"))) return;

  requestField.value = `Selected programs:\n${selected.map((item) => `- ${item}`).join("\n")}\n\nCompany:\nDestination country:\nIntended research category:`;
}

renderProducts();
