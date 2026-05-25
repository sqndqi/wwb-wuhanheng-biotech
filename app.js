const products = [
  {
    name: "Research peptide programs",
    category: "peptide",
    summary: "Lyophilized research-material programs with batch documentation review.",
    tags: ["COA", "Restricted"],
    code: "RP",
  },
  {
    name: "Metabolic research controls",
    category: "standards",
    summary: "Reference materials for analytical teams and method-development workflows.",
    tags: ["Verification", "QC"],
    code: "MC",
  },
  {
    name: "Custom vialing service",
    category: "vialing",
    summary: "Configurable vialing, labeling, and packaging programs for qualified buyers.",
    tags: ["Custom", "Batch"],
    code: "CV",
  },
  {
    name: "Raw material sourcing",
    category: "partner",
    summary: "Partner-sourced research compounds with documentation before quotation.",
    tags: ["Partner", "Screened"],
    code: "RM",
  },
  {
    name: "Analytical paperwork pack",
    category: "standards",
    summary: "COA, test method, traceability, and packaging details assembled on request.",
    tags: ["Docs", "QA"],
    code: "AP",
  },
  {
    name: "Distribution onboarding",
    category: "partner",
    summary: "Recurring supply conversations for verified distributors and institutions.",
    tags: ["B2B", "Review"],
    code: "DO",
  },
];

const productGrid = document.querySelector("#productGrid");
const searchInput = document.querySelector("#searchInput");
const quoteCount = document.querySelector("#quoteCount");
const filters = document.querySelectorAll(".category-filter");
const form = document.querySelector(".contact-form");
const formNote = document.querySelector("#formNote");

let activeCategory = "all";
let quoteItems = new Set();

function renderProducts() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = products.filter((product) => {
    const inCategory = activeCategory === "all" || product.category === activeCategory;
    const inSearch = [product.name, product.summary, product.category, product.code]
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

renderProducts();
