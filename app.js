(function () {
  const products = window.WWBData.products;
  const optionSets = window.WWBData.optionSets;
  const api = window.WWBApi;
  const state = window.WWBState;
  const validation = window.WWBValidation;

  const els = {
    search: document.querySelector("#searchInput"),
    category: document.querySelector("#categoryFilter"),
    review: document.querySelector("#reviewFilter"),
    doc: document.querySelector("#docFilter"),
    format: document.querySelector("#formatFilter"),
    type: document.querySelector("#typeFilter"),
    priceType: document.querySelector("#priceTypeFilter"),
    source: document.querySelector("#sourceFilter"),
    status: document.querySelector("#statusFilter"),
    sort: document.querySelector("#sortSelect"),
    resetFilters: document.querySelector("#resetFilters"),
    activeFilters: document.querySelector("#activeFilters"),
    catalogCount: document.querySelector("#catalogCount"),
    productGrid: document.querySelector("#productGrid"),
    categoryGrid: document.querySelector("#categoryGrid"),
    featuredGrid: document.querySelector("#featuredGrid"),
    quoteBag: document.querySelector("#quoteBag"),
    quoteCount: document.querySelector("#quoteCount"),
    mobileQuoteCount: document.querySelector("#mobileQuoteCount"),
    quoteButton: document.querySelector("#quoteButton"),
    mobileQuoteButton: document.querySelector("#mobileQuoteButton"),
    quoteForm: document.querySelector("#quoteForm"),
    copyQuoteButton: document.querySelector("#copyQuoteButton"),
    clearQuoteButton: document.querySelector("#clearQuoteButton"),
    submitQuoteButton: document.querySelector("#submitQuoteButton"),
    quoteStatus: document.querySelector("#quoteStatus"),
    accountRequestForm: document.querySelector("#accountRequestForm"),
    submitAccountButton: document.querySelector("#submitAccountButton"),
    accountStatus: document.querySelector("#accountStatus"),
    requestAccountTab: document.querySelector("#requestAccountTab"),
    signInTab: document.querySelector("#signInTab"),
    requestAccountPanel: document.querySelector("#accountRequestForm"),
    signInPanel: document.querySelector("#signInForm"),
    dialog: document.querySelector("#productDialog"),
    dialogContent: document.querySelector("#dialogContent"),
    dialogClose: document.querySelector("#dialogClose"),
  };

  const filterState = {
    category: "all",
    review: "all",
    doc: "all",
    format: "all",
    type: "all",
    priceType: "all",
    source: "all",
    status: "all",
    search: "",
    sort: "recent",
  };

  let currentProducts = products;
  let lastQuoteText = "";

  function text(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function dollars(value) {
    return `$${Number(value || 0).toLocaleString()}`;
  }

  function productById(id) {
    return products.find((product) => product.id === id);
  }

  function optionBySku(product, sku) {
    return product?.options.find((entry) => entry.sku === sku) || product?.options[0];
  }

  function minProductPrice(product) {
    const prices = product.options.map((entry) => entry.basePrice).filter(Number);
    return prices.length ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
  }

  function formatPrice(option) {
    if (Number(option?.basePrice)) return `${dollars(option.basePrice)} / ${option.unitLabel || "unit"}`;
    if (Number(option?.bulkPrice)) return `Bulk quote from ${dollars(option.bulkPrice)}`;
    return "Quote required";
  }

  function formatBulk(option) {
    if (!option?.bulkMinimum) return "Bulk pricing by quote";
    if (Number(option.bulkPrice)) return `${option.bulkMinimum}+ ${option.unitLabel || "units"}: ${dollars(option.bulkPrice)} each`;
    return `${option.bulkMinimum}+ ${option.unitLabel || "units"}: Bulk quote`;
  }

  function linePricing(item) {
    const option = item.selectedOption;
    const quantity = Math.max(1, Number(item.quantity) || 1);
    let appliedPrice = Number(option?.basePrice) || null;
    let priceNote = appliedPrice ? `${dollars(appliedPrice)} / ${option.unitLabel || "unit"}` : "Quote required";
    let quoteRequired = !appliedPrice;

    if (option?.bulkMinimum && quantity >= option.bulkMinimum) {
      if (Number(option.bulkPrice)) {
        appliedPrice = Number(option.bulkPrice);
        priceNote = `${dollars(appliedPrice)} bulk / ${option.unitLabel || "unit"}`;
        quoteRequired = false;
      } else {
        appliedPrice = null;
        priceNote = "Bulk quote required";
        quoteRequired = true;
      }
    }

    return {
      appliedPrice,
      subtotal: appliedPrice ? appliedPrice * quantity : null,
      quoteRequired,
      priceNote,
      quantity,
    };
  }

  function discountFor(code, subtotal) {
    if (String(code || "").trim().toUpperCase() !== "SUMMER" || !subtotal) {
      return { amount: 0, label: "" };
    }
    return {
      amount: Math.round(subtotal * 0.1),
      label: "SUMMER discount applied: 10% off priced items",
    };
  }

  function populateSelect(select, values, formatter = (value) => value) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = formatter(value);
      select.appendChild(option);
    });
  }

  function initFilters() {
    const categories = Object.entries(window.WWBData.categoryProfiles).map(([value, profile]) => ({
      value,
      label: profile.label,
    }));
    populateSelect(els.category, categories.map((item) => item.value), (value) => categories.find((item) => item.value === value).label);
    populateSelect(els.review, optionSets.reviewLevels, (value) => window.WWBData.reviewLabels[value]);
    populateSelect(els.doc, optionSets.documents);
    populateSelect(els.format, optionSets.formats);
    populateSelect(els.type, optionSets.productTypes);
    populateSelect(els.priceType, optionSets.priceTypes, (value) => (value === "fixed" ? "Priced" : value === "restricted" ? "Restricted" : "Quote required"));
    populateSelect(els.source, optionSets.sources);
    populateSelect(els.status, optionSets.statuses, (value) => value.replace(/_/g, " "));
  }

  function filteredProducts() {
    const query = filterState.search.trim().toLowerCase();
    return currentProducts
      .filter((product) => {
        const searchable = [
          product.name,
          product.code,
          product.categoryLabel,
          product.productType,
          product.sourceList,
          product.warehouse,
          ...product.tags,
          ...product.options.flatMap((option) => [option.sku, option.label]),
        ]
          .join(" ")
          .toLowerCase();

        return (
          (!query || searchable.includes(query)) &&
          (filterState.category === "all" || product.category === filterState.category) &&
          (filterState.review === "all" || product.reviewLevel === filterState.review) &&
          (filterState.doc === "all" || product.documentation.includes(filterState.doc)) &&
          (filterState.format === "all" || product.options.some((option) => option.unitLabel === filterState.format)) &&
          (filterState.type === "all" || product.productType === filterState.type) &&
          (filterState.priceType === "all" || product.priceType === filterState.priceType) &&
          (filterState.source === "all" || product.warehouse === filterState.source) &&
          (filterState.status === "all" || product.availability === filterState.status)
        );
      })
      .sort((a, b) => {
        if (filterState.sort === "name") return a.name.localeCompare(b.name);
        if (filterState.sort === "category") return a.categoryLabel.localeCompare(b.categoryLabel) || a.name.localeCompare(b.name);
        if (filterState.sort === "priceLow") return minProductPrice(a) - minProductPrice(b) || a.name.localeCompare(b.name);
        if (filterState.sort === "priceHigh") return minProductPrice(b) - minProductPrice(a) || a.name.localeCompare(b.name);
        if (filterState.sort === "review") return a.reviewLabel.localeCompare(b.reviewLabel) || a.name.localeCompare(b.name);
        return b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name);
      });
  }

  function renderActiveFilters() {
    const labels = {
      category: "Category",
      review: "Review",
      doc: "Docs",
      format: "Unit",
      type: "Type",
      priceType: "Price",
      source: "Source",
      status: "Status",
    };
    const active = Object.entries(filterState)
      .filter(([key, value]) => !["search", "sort"].includes(key) && value !== "all")
      .map(([key, value]) => `${labels[key]}: ${key === "review" ? window.WWBData.reviewLabels[value] : value}`);
    if (filterState.search) active.push(`Search: ${filterState.search}`);
    els.activeFilters.innerHTML = active.length ? active.map((entry) => `<span>${text(entry)}</span>`).join("") : "<span>All source-list products</span>";
  }

  function renderCategoryCards() {
    els.categoryGrid.innerHTML = Object.entries(window.WWBData.categoryProfiles)
      .map(([category, profile]) => {
        const count = products.filter((product) => product.category === category).length;
        return `
          <button class="category-card" type="button" data-category-card="${text(category)}">
            <strong>${text(profile.label)}</strong>
            <span>${count} product families</span>
            <p>${text(profile.description)}</p>
          </button>
        `;
      })
      .join("");
  }

  function renderFeaturedProducts() {
    const featured = products
      .filter((product) => product.options.some((option) => Number(option.basePrice)) && product.reviewLevel !== "restricted_review")
      .slice(0, 8);
    els.featuredGrid.innerHTML = featured
      .map((product) => {
        const option = product.options[0];
        return `
          <article class="featured-card">
            <span>${text(product.code)}</span>
            <h3>${text(product.name)}</h3>
            <p>${text(option.label)}</p>
            <div class="mini-price">${text(formatPrice(option))}</div>
            <small>${text(formatBulk(option))}</small>
            <button class="button primary" type="button" data-featured-add="${text(product.id)}">Add to request</button>
          </article>
        `;
      })
      .join("");
  }

  function optionMarkup(product, selectedSku = product.options[0].sku) {
    return product.options
      .map((option) => `<option value="${text(option.sku)}" ${option.sku === selectedSku ? "selected" : ""}>${text(option.sku)} - ${text(option.label)}</option>`)
      .join("");
  }

  function updateCardPreview(productId) {
    const product = productById(productId);
    const card = els.productGrid.querySelector(`[data-product-card="${CSS.escape(productId)}"]`);
    if (!product || !card) return;
    const option = optionBySku(product, card.querySelector("[data-card-option]")?.value);
    card.querySelector("[data-card-code]").textContent = option.sku;
    card.querySelector("[data-card-price]").textContent = formatPrice(option);
    card.querySelector("[data-card-bulk]").textContent = formatBulk(option);
    card.querySelector("[data-card-package]").textContent = option.label;
  }

  function renderProducts() {
    const list = filteredProducts();
    renderActiveFilters();
    els.catalogCount.textContent = `${list.length} product families / ${products.reduce((count, product) => count + product.options.length, 0)} priced variants loaded from source lists`;

    if (!list.length) {
      els.productGrid.classList.remove("loading");
      els.productGrid.innerHTML = `
        <div class="empty-state">
          <h3>No matching products</h3>
          <p>Clear filters or search by product code, family, category, or source.</p>
          <button class="button secondary" type="button" data-reset-empty>Reset filters</button>
        </div>
      `;
      return;
    }

    els.productGrid.classList.remove("loading");
    els.productGrid.innerHTML = list
      .map((product) => {
        const option = product.options[0];
        const restricted = product.reviewLevel !== "sales_review";
        return `
          <article class="product-card" data-product-card="${text(product.id)}">
            <div class="product-topline">
              <span class="product-code" data-card-code>${text(option.sku)}</span>
              <span class="source-chip">${text(product.warehouse)}</span>
            </div>
            <h3>${text(product.name)}</h3>
            <p>${text(product.notes)}</p>
            <div class="meta-row">
              <span>${text(product.categoryLabel)}</span>
              <span>${text(product.productType)}</span>
            </div>
            <label class="compact-field">
              Package / dosage
              <select data-card-option="${text(product.id)}">${optionMarkup(product)}</select>
            </label>
            <div class="package-line" data-card-package>${text(option.label)}</div>
            <div class="product-price">
              <span data-card-price>${text(formatPrice(option))}</span>
              <small data-card-bulk>${text(formatBulk(option))}</small>
            </div>
            <div class="badge-row">
              <span class="badge ${restricted ? "warning" : ""}">${text(product.reviewLabel)}</span>
              ${product.documentation.slice(0, 3).map((doc) => `<span class="badge">${text(doc)}</span>`).join("")}
            </div>
            <div class="card-actions">
              <label class="quantity-mini">
                Qty
                <input data-card-qty="${text(product.id)}" type="number" min="1" value="1" inputmode="numeric" />
              </label>
              <button class="button primary" type="button" data-add="${text(product.id)}">Add to request</button>
              <button class="button secondary" type="button" data-detail="${text(product.id)}">View details</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function selectedDocsFromNode(node) {
    return [...node.querySelectorAll("[data-doc]:checked")].map((input) => input.value);
  }

  function renderQuoteBag() {
    const items = state.getQuoteItems();
    const pricedSubtotal = items.reduce((sum, item) => sum + (linePricing(item).subtotal || 0), 0);
    const savedQuote = state.getForm("quoteForm");
    const discount = discountFor(savedQuote.discountCode, pricedSubtotal);
    const totalAfterDiscount = Math.max(0, pricedSubtotal - discount.amount);
    const hasReviewItems = items.some((item) => item.reviewLevel !== "sales_review" || linePricing(item).quoteRequired);

    els.quoteCount.textContent = items.length;
    els.mobileQuoteCount.textContent = items.length;

    if (!items.length) {
      els.quoteBag.innerHTML = `
        <div class="empty-bag">
          <h3>No products selected</h3>
          <p>Add products from the catalog to build a sales review request.</p>
        </div>
      `;
      return;
    }

    els.quoteBag.innerHTML = `
      <div class="quote-list">
        ${items
          .map((item) => {
            const product = productById(item.productId);
            const price = linePricing(item);
            const docs = optionSets.documents;
            return `
              <article class="quote-item" data-line-id="${text(item.lineId)}">
                <div class="quote-item-head">
                  <strong>${text(item.code)} | ${text(item.name)}</strong>
                  <span>${text(item.warehouse)} | ${text(item.reviewLabel)}</span>
                </div>
                <label>
                  Package / dosage
                  <select data-bag-option="${text(item.lineId)}">
                    ${optionMarkup(product, item.selectedOption.sku)}
                  </select>
                </label>
                <div class="quote-line-grid">
                  <label>
                    Quantity
                    <input type="number" min="1" value="${text(item.quantity)}" data-quantity="${text(item.lineId)}" inputmode="numeric" />
                  </label>
                  <label>
                    Shipping
                    <select data-shipping="${text(item.lineId)}">
                      ${optionSets.shipping.map((entry) => `<option ${entry === item.shippingPreference ? "selected" : ""}>${text(entry)}</option>`).join("")}
                    </select>
                  </label>
                </div>
                <fieldset class="line-docs">
                  <legend>Docs for this item</legend>
                  ${docs
                    .map((doc) => `<label><input type="checkbox" data-doc="${text(item.lineId)}" value="${text(doc)}" ${(item.documentationNeeded || []).includes(doc) ? "checked" : ""} /> ${text(doc)}</label>`)
                    .join("")}
                </fieldset>
                <label>
                  Item notes
                  <input type="text" data-line-notes="${text(item.lineId)}" value="${text(item.notes || "")}" placeholder="Variant, batch, packaging, or timing notes" />
                </label>
                <div class="quote-money">
                  <span>${text(price.priceNote)}</span>
                  <strong>${price.subtotal ? dollars(price.subtotal) : "TBD"}</strong>
                </div>
                <button class="link-button danger" type="button" data-remove="${text(item.lineId)}">Remove</button>
              </article>
            `;
          })
          .join("")}
        <div class="quote-total">
          <span>Estimated priced-item subtotal</span>
          <strong>${dollars(pricedSubtotal)}</strong>
          ${discount.amount ? `<span>${text(discount.label)}</span><strong>-${dollars(discount.amount)}</strong>` : ""}
          ${discount.amount ? `<span>Estimated total after discount</span><strong>${dollars(totalAfterDiscount)}</strong>` : ""}
          ${hasReviewItems ? `<p>Restricted, quote-only, and bulk-quote lines need sales confirmation before a final total is issued.</p>` : ""}
        </div>
      </div>
    `;
  }

  function addToQuote(product, patch = {}) {
    const selectedOption = patch.selectedOption || product.options[0];
    state.upsertQuoteItem(product, selectedOption, {
      quantity: Math.max(1, Number(patch.quantity) || 1),
      documentationNeeded: patch.documentationNeeded || [],
      shippingPreference: patch.shippingPreference || "Standard",
      notes: patch.notes || "",
    });
    renderQuoteBag();
    els.quoteStatus.textContent = `${selectedOption.sku} added to order request.`;
  }

  function relatedProducts(product) {
    return products
      .filter((entry) => entry.id !== product.id && entry.category === product.category)
      .slice(0, 4)
      .map((entry) => `<button type="button" data-related="${text(entry.id)}">${text(entry.name)}</button>`)
      .join("");
  }

  function dialogEstimate(product) {
    const form = els.dialog.querySelector("#dialogQuoteForm");
    if (!form) return;
    const option = optionBySku(product, form.elements.option.value);
    const quantity = Math.max(1, Number(form.elements.quantity.value) || 1);
    const price = linePricing({ selectedOption: option, quantity, reviewLevel: product.reviewLevel });
    const node = els.dialog.querySelector("#dialogEstimate");
    node.innerHTML = `
      <span>${text(formatPrice(option))}</span>
      <span>${text(formatBulk(option))}</span>
      <strong>${price.subtotal ? `Estimated subtotal ${dollars(price.subtotal)}` : price.priceNote}</strong>
    `;
  }

  function openProductDialog(product) {
    const option = product.options[0];
    const restricted = product.reviewLevel !== "sales_review";
    els.dialogContent.innerHTML = `
      <div class="dialog-header">
        <span class="product-code">${text(product.code)}</span>
        <p class="eyebrow">${text(product.categoryLabel)} | ${text(product.warehouse)}</p>
        <h2 id="dialogTitle">${text(product.name)}</h2>
        <p>${text(product.notes)}</p>
      </div>
      ${restricted ? `<div class="restricted-warning"><strong>Review required:</strong> ${text(product.reviewLabel)} before quote confirmation.</div>` : ""}
      <div class="detail-grid">
        <div>
          <h3>Price-list source</h3>
          <p>${text(product.sourceList)}</p>
        </div>
        <div>
          <h3>Documentation</h3>
          <p>${product.documentation.map(text).join(", ")}</p>
        </div>
        <div>
          <h3>Shipping notes</h3>
          <p>${text(product.shippingNotes)}</p>
        </div>
        <div>
          <h3>Review level</h3>
          <p>${text(product.reviewLabel)}</p>
        </div>
      </div>
      <form class="dialog-quote-form" id="dialogQuoteForm" data-product-id="${text(product.id)}">
        <label>
          Variant / package
          <select name="option">${optionMarkup(product)}</select>
        </label>
        <label>
          Quantity
          <input name="quantity" type="number" min="1" value="1" inputmode="numeric" />
        </label>
        <fieldset class="line-docs">
          <legend>Documentation needed</legend>
          ${optionSets.documents.map((doc) => `<label><input type="checkbox" name="documents" value="${text(doc)}" /> ${text(doc)}</label>`).join("")}
        </fieldset>
        <label>
          Shipping preference
          <select name="shippingPreference">
            ${optionSets.shipping.map((entry) => `<option>${text(entry)}</option>`).join("")}
          </select>
        </label>
        <label>
          Item notes
          <input name="notes" placeholder="Batch, documents, packaging, or timing notes" />
        </label>
        <div class="dialog-estimate" id="dialogEstimate">
          <span>${text(formatPrice(option))}</span>
          <span>${text(formatBulk(option))}</span>
        </div>
        <button class="button primary" type="submit">Add selected variant to request</button>
      </form>
      <section class="related-products">
        <h3>Related products</h3>
        <div>${relatedProducts(product)}</div>
      </section>
    `;
    els.dialog.showModal();
    dialogEstimate(product);
    els.dialog.querySelector("select, button, input")?.focus();
  }

  function closeDialog() {
    if (els.dialog.open) els.dialog.close();
  }

  function formDataForStorage(form) {
    return validation.formObject(form);
  }

  function restoreForm(form, key) {
    const saved = state.getForm(key);
    Object.entries(saved).forEach(([name, value]) => {
      const fields = [...form.querySelectorAll(`[name="${CSS.escape(name)}"]`)];
      fields.forEach((field) => {
        if (field.type === "checkbox") {
          field.checked = Array.isArray(value) ? value.includes(field.value) : value === field.value;
        } else {
          field.value = value;
        }
      });
    });
  }

  function clearErrors(form, prefix = "") {
    form.querySelectorAll(".field-error").forEach((node) => {
      node.textContent = "";
    });
    form.querySelectorAll("[aria-invalid='true']").forEach((node) => {
      node.removeAttribute("aria-invalid");
    });
    if (!prefix) els.quoteStatus.textContent = "";
  }

  function showErrors(form, errors, prefix = "") {
    clearErrors(form, prefix);
    Object.entries(errors).forEach(([name, message]) => {
      const errorNode = form.querySelector(`[data-error-for="${prefix}${name}"]`);
      if (errorNode) errorNode.textContent = message;
      const field = form.elements[name];
      if (field) field.setAttribute("aria-invalid", "true");
    });
  }

  function quoteText(reference = "Pending") {
    const items = state.getQuoteItems();
    const data = validation.formObject(els.quoteForm);
    const subtotal = items.reduce((sum, item) => sum + (linePricing(item).subtotal || 0), 0);
    const discount = discountFor(data.discountCode, subtotal);
    return [
      `WWB order request: ${reference}`,
      "",
      "Selected products:",
      ...items.map((item) => {
        const price = linePricing(item);
        return `- ${item.code} | ${item.name} | ${item.selectedOption.label} | Qty: ${item.quantity} | Unit: ${price.priceNote} | Subtotal: ${price.subtotal ? dollars(price.subtotal) : "TBD"} | Review: ${item.reviewLabel} | Docs: ${(item.documentationNeeded || []).join(", ") || "None"} | Shipping: ${item.shippingPreference || "Standard"} | Notes: ${item.notes || ""}`;
      }),
      "",
      `Estimated priced subtotal: ${dollars(subtotal)}`,
      discount.amount ? `Discount: SUMMER -${dollars(discount.amount)}` : "Discount: None",
      discount.amount ? `Estimated total after discount: ${dollars(Math.max(0, subtotal - discount.amount))}` : "",
      "",
      `Company: ${data.company || ""}`,
      `Contact: ${data.contactName || ""}`,
      `Email: ${data.email || ""}`,
      `Phone / WhatsApp / Telegram: ${data.messaging || ""}`,
      `Destination country: ${data.destination || ""}`,
      `Buyer type: ${data.buyerType || ""}`,
      `Requested shipping: ${data.requestedShipping || ""}`,
      `Documentation needed: ${(data.documents || []).join(", ") || "Not specified"}`,
      `Shipping requirements: ${(data.shipping || []).join(", ") || "Not specified"}`,
      `Notes: ${data.notes || ""}`,
    ]
      .filter(Boolean)
      .join("\n");
  }

  async function copyText(value, statusNode) {
    try {
      await navigator.clipboard.writeText(value);
      statusNode.textContent = "Copied to clipboard.";
    } catch {
      statusNode.textContent = "Copy blocked by browser. Select the generated request text and copy it manually.";
    }
  }

  function setAccountTab(tabName) {
    const requestActive = tabName === "request";
    els.requestAccountTab.classList.toggle("active", requestActive);
    els.signInTab.classList.toggle("active", !requestActive);
    els.requestAccountTab.setAttribute("aria-selected", String(requestActive));
    els.signInTab.setAttribute("aria-selected", String(!requestActive));
    els.requestAccountPanel.hidden = !requestActive;
    els.signInPanel.hidden = requestActive;
    els.requestAccountPanel.classList.toggle("active", requestActive);
    els.signInPanel.classList.toggle("active", !requestActive);
  }

  function wireEvents() {
    [els.category, els.review, els.doc, els.format, els.type, els.priceType, els.source, els.status].forEach((select) => {
      select.addEventListener("change", () => {
        filterState[select.id.replace("Filter", "")] = select.value;
        renderProducts();
      });
    });

    els.sort.addEventListener("change", () => {
      filterState.sort = els.sort.value;
      renderProducts();
    });

    els.search.addEventListener("input", () => {
      filterState.search = els.search.value;
      renderProducts();
    });

    els.resetFilters.addEventListener("click", () => {
      Object.assign(filterState, { category: "all", review: "all", doc: "all", format: "all", type: "all", priceType: "all", source: "all", status: "all", search: "", sort: "recent" });
      [els.category, els.review, els.doc, els.format, els.type, els.priceType, els.source, els.status].forEach((select) => (select.value = "all"));
      els.search.value = "";
      els.sort.value = "recent";
      renderProducts();
    });

    els.categoryGrid.addEventListener("click", (event) => {
      const category = event.target.closest("[data-category-card]")?.dataset.categoryCard;
      if (!category) return;
      filterState.category = category;
      els.category.value = category;
      renderProducts();
      document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
    });

    els.featuredGrid.addEventListener("click", (event) => {
      const id = event.target.closest("[data-featured-add]")?.dataset.featuredAdd;
      if (id) addToQuote(productById(id));
    });

    els.productGrid.addEventListener("change", (event) => {
      const id = event.target.dataset.cardOption;
      if (id) updateCardPreview(id);
    });

    els.productGrid.addEventListener("click", (event) => {
      const detailId = event.target.closest("[data-detail]")?.dataset.detail;
      const addId = event.target.closest("[data-add]")?.dataset.add;
      if (event.target.closest("[data-reset-empty]")) els.resetFilters.click();
      if (detailId) openProductDialog(productById(detailId));
      if (addId) {
        const product = productById(addId);
        const card = event.target.closest("[data-product-card]");
        const option = optionBySku(product, card?.querySelector("[data-card-option]")?.value);
        const quantity = Math.max(1, Number(card?.querySelector("[data-card-qty]")?.value) || 1);
        addToQuote(product, { selectedOption: option, quantity });
      }
    });

    els.quoteBag.addEventListener("input", (event) => {
      const quantityId = event.target.dataset.quantity;
      const notesId = event.target.dataset.lineNotes;
      if (quantityId) {
        state.updateQuoteItem(quantityId, { quantity: Math.max(1, Number(event.target.value) || 1) });
        renderQuoteBag();
      }
      if (notesId) {
        state.updateQuoteItem(notesId, { notes: event.target.value });
      }
    });

    els.quoteBag.addEventListener("change", (event) => {
      const optionLineId = event.target.dataset.bagOption;
      const shippingLineId = event.target.dataset.shipping;
      const docsLineId = event.target.dataset.doc;

      if (optionLineId) {
        const item = state.getQuoteItems().find((entry) => entry.lineId === optionLineId);
        const product = productById(item.productId);
        const selectedOption = optionBySku(product, event.target.value);
        state.removeQuoteItem(optionLineId);
        state.upsertQuoteItem(product, selectedOption, { quantity: item.quantity, documentationNeeded: item.documentationNeeded || [], shippingPreference: item.shippingPreference, notes: item.notes || "" });
        renderQuoteBag();
      }
      if (shippingLineId) {
        state.updateQuoteItem(shippingLineId, { shippingPreference: event.target.value });
      }
      if (docsLineId) {
        const node = event.target.closest(".quote-item");
        state.updateQuoteItem(docsLineId, { documentationNeeded: selectedDocsFromNode(node) });
      }
    });

    els.quoteBag.addEventListener("click", (event) => {
      const id = event.target.closest("[data-remove]")?.dataset.remove;
      if (id) {
        state.removeQuoteItem(id);
        renderQuoteBag();
      }
    });

    [els.quoteButton, els.mobileQuoteButton].forEach((button) => {
      button.addEventListener("click", () => document.querySelector("#quote").scrollIntoView({ behavior: "smooth" }));
    });

    els.quoteForm.addEventListener("input", () => {
      state.setForm("quoteForm", formDataForStorage(els.quoteForm));
      renderQuoteBag();
    });
    els.quoteForm.addEventListener("change", () => {
      state.setForm("quoteForm", formDataForStorage(els.quoteForm));
      renderQuoteBag();
    });

    els.copyQuoteButton.addEventListener("click", () => copyText(lastQuoteText || quoteText(), els.quoteStatus));
    els.clearQuoteButton.addEventListener("click", () => {
      state.clearQuoteItems();
      renderQuoteBag();
      els.quoteStatus.textContent = "Quote bag cleared.";
    });

    els.quoteForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const items = state.getQuoteItems();
      const data = validation.formObject(els.quoteForm);
      const errors = validation.validateQuote(data, items);
      if (Object.keys(errors).length) {
        showErrors(els.quoteForm, errors);
        els.quoteStatus.textContent = errors.items || "Fix the highlighted fields before submitting.";
        return;
      }

      clearErrors(els.quoteForm);
      els.submitQuoteButton.disabled = true;
      els.quoteStatus.textContent = "Submitting order request...";
      try {
        const result = await api.submitQuoteRequest({ items, request: data, summary: quoteText() });
        state.savePendingQuote(result);
        lastQuoteText = quoteText(result.reference);
        els.quoteStatus.textContent = `Order request ${result.reference} saved locally for sales review. Use Copy request to send the summary.`;
      } catch (error) {
        els.quoteStatus.textContent = error.message;
      } finally {
        els.submitQuoteButton.disabled = false;
      }
    });

    els.requestAccountTab.addEventListener("click", () => setAccountTab("request"));
    els.signInTab.addEventListener("click", () => setAccountTab("signin"));

    els.accountRequestForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = validation.formObject(els.accountRequestForm);
      const errors = validation.validateAccountRequest(data);
      if (Object.keys(errors).length) {
        showErrors(els.accountRequestForm, errors, "account-");
        els.accountStatus.textContent = "Fix the highlighted fields before submitting.";
        return;
      }

      clearErrors(els.accountRequestForm, "account-");
      els.submitAccountButton.disabled = true;
      els.accountStatus.textContent = "Submitting account access request...";
      try {
        const result = await api.requestAccountAccess(data);
        state.saveAccessRequest(result);
        els.accountRequestForm.reset();
        els.accountStatus.textContent = `Account request ${result.reference} saved locally. Backend login is not connected yet; this MVP stores requests locally.`;
      } catch (error) {
        els.accountStatus.textContent = error.message;
      } finally {
        els.submitAccountButton.disabled = false;
      }
    });

    els.dialogClose.addEventListener("click", closeDialog);
    els.dialog.addEventListener("click", (event) => {
      if (event.target === els.dialog) closeDialog();
      const relatedId = event.target.closest("[data-related]")?.dataset.related;
      if (relatedId) openProductDialog(productById(relatedId));
    });
    els.dialog.addEventListener("input", (event) => {
      const form = event.target.closest("#dialogQuoteForm");
      if (form) dialogEstimate(productById(form.dataset.productId));
    });
    els.dialog.addEventListener("change", (event) => {
      const form = event.target.closest("#dialogQuoteForm");
      if (form) dialogEstimate(productById(form.dataset.productId));
    });
    els.dialog.addEventListener("submit", (event) => {
      if (event.target.id !== "dialogQuoteForm") return;
      event.preventDefault();
      const product = productById(event.target.dataset.productId);
      const data = new FormData(event.target);
      addToQuote(product, {
        selectedOption: optionBySku(product, data.get("option")),
        quantity: Number(data.get("quantity")) || 1,
        documentationNeeded: data.getAll("documents"),
        shippingPreference: data.get("shippingPreference") || "Standard",
        notes: data.get("notes") || "",
      });
      closeDialog();
    });
    els.dialog.addEventListener("keydown", trapDialogFocus);
  }

  function trapDialogFocus(event) {
    if (event.key === "Escape") closeDialog();
    if (event.key !== "Tab") return;
    const focusables = [...els.dialog.querySelectorAll("button, input, select, textarea, a[href]")].filter((node) => !node.disabled);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  async function init() {
    initFilters();
    renderCategoryCards();
    renderFeaturedProducts();
    restoreForm(els.quoteForm, "quoteForm");
    renderQuoteBag();
    wireEvents();
    currentProducts = await api.fetchCatalog();
    renderProducts();
  }

  init();
})();
