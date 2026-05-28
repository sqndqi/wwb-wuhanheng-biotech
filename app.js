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
    status: document.querySelector("#statusFilter"),
    resetFilters: document.querySelector("#resetFilters"),
    sort: document.querySelector("#sortSelect"),
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
    accountForm: document.querySelector("#accountForm"),
    quoteStatus: document.querySelector("#quoteStatus"),
    accountStatus: document.querySelector("#accountStatus"),
    copyQuoteButton: document.querySelector("#copyQuoteButton"),
    submitQuoteButton: document.querySelector("#submitQuoteButton"),
    submitAccountButton: document.querySelector("#submitAccountButton"),
    dialog: document.querySelector("#productDialog"),
    dialogClose: document.querySelector("#dialogClose"),
    dialogContent: document.querySelector("#dialogContent"),
  };

  const filterState = {
    category: "all",
    review: "all",
    doc: "all",
    format: "all",
    type: "all",
    priceType: "all",
    status: "all",
    search: "",
    sort: "recent",
  };

  let currentProducts = [];
  let lastQuoteText = "";
  let lastFocusedElement = null;

  function text(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => {
      const map = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" };
      return map[char];
    });
  }

  function label(value) {
    return String(value || "")
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  function populateSelect(select, values, formatter = label) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = formatter(value);
      select.append(option);
    });
  }

  function formatPrice(product) {
    if (product.priceType === "fixed") return `$${product.unitPrice} / ${product.unit}`;
    if (product.priceType === "from") return `From $${product.unitPrice}`;
    if (product.priceType === "restricted") return "Restricted review";
    return "Quote required";
  }

  function itemSubtotal(item) {
    if (!["fixed", "from"].includes(item.priceType) || !Number(item.unitPrice)) return null;
    return Number(item.unitPrice) * Math.max(1, Number(item.quantity) || 1);
  }

  function initFilters() {
    const categories = Object.entries(window.WWBData.categoryProfiles).map(([value, profile]) => ({
      value,
      label: profile.label,
    }));
    categories.forEach((category) => {
      const option = document.createElement("option");
      option.value = category.value;
      option.textContent = category.label;
      els.category.append(option);
    });

    populateSelect(els.review, optionSets.reviewLevels, (value) => window.WWBData.reviewLabels[value]);
    populateSelect(els.doc, optionSets.documents);
    populateSelect(els.format, optionSets.formats);
    populateSelect(els.type, optionSets.productTypes, (value) => value);
    populateSelect(els.priceType, optionSets.priceTypes);
    populateSelect(els.status, optionSets.statuses);
  }

  function filteredProducts() {
    const query = filterState.search.trim().toLowerCase();
    return currentProducts
      .filter((product) => {
        const searchable = [
          product.name,
          product.code,
          product.categoryLabel,
          product.family,
          product.productType,
          product.reviewLabel,
          product.status,
          product.description,
          ...product.tags,
          ...product.documentationAvailable,
          ...product.availableFormats,
        ]
          .join(" ")
          .toLowerCase();

        return (
          (filterState.category === "all" || product.category === filterState.category) &&
          (filterState.review === "all" || product.reviewLevel === filterState.review) &&
          (filterState.doc === "all" || product.documentationAvailable.includes(filterState.doc)) &&
          (filterState.format === "all" || product.availableFormats.includes(filterState.format)) &&
          (filterState.type === "all" || product.productType === filterState.type) &&
          (filterState.priceType === "all" || product.priceType === filterState.priceType) &&
          (filterState.status === "all" || product.status === filterState.status) &&
          (!query || searchable.includes(query))
        );
      })
      .sort((a, b) => {
        if (filterState.sort === "name") return a.name.localeCompare(b.name);
        if (filterState.sort === "category") return a.categoryLabel.localeCompare(b.categoryLabel) || a.name.localeCompare(b.name);
        if (filterState.sort === "price") return (a.unitPrice || Number.MAX_SAFE_INTEGER) - (b.unitPrice || Number.MAX_SAFE_INTEGER) || a.name.localeCompare(b.name);
        if (filterState.sort === "review") return a.reviewLabel.localeCompare(b.reviewLabel) || a.name.localeCompare(b.name);
        return b.addedAt.localeCompare(a.addedAt) || a.name.localeCompare(b.name);
      });
  }

  function renderActiveFilters() {
    const active = [];
    if (filterState.search) active.push(`Search: ${filterState.search}`);
    ["category", "review", "doc", "format", "type", "priceType", "status"].forEach((key) => {
      if (filterState[key] !== "all") active.push(`${label(key)}: ${key === "review" ? window.WWBData.reviewLabels[filterState[key]] : filterState[key]}`);
    });

    els.activeFilters.innerHTML = active.length
      ? active.map((item) => `<span>${text(item)}</span>`).join("")
      : `<span>No active filters</span>`;
  }

  function renderCategoryCards() {
    els.categoryGrid.innerHTML = Object.entries(window.WWBData.categoryProfiles)
      .map(([category, profile]) => {
        const count = products.filter((product) => product.category === category).length;
        return `
          <article>
            <strong>${text(profile.label)}</strong>
            <span>${count} supply lines</span>
            <p>${text(profile.storageShippingNotes)}</p>
            <button class="button secondary" type="button" data-category-card="${text(category)}">View category</button>
          </article>
        `;
      })
      .join("");
  }

  function renderFeaturedProducts() {
    const featured = products.filter((product) => ["fixed", "from"].includes(product.priceType)).slice(0, 6);
    els.featuredGrid.innerHTML = featured
      .map(
        (product) => `
          <article>
            <span>${text(product.categoryLabel)}</span>
            <strong>${text(product.name)}</strong>
            <p>${text(product.description)}</p>
            <div class="mini-price">${text(formatPrice(product))}</div>
            <button class="button primary" type="button" data-featured-add="${text(product.id)}">Add to quote</button>
          </article>
        `
      )
      .join("");
  }

  function renderProducts() {
    const list = filteredProducts();
    els.catalogCount.textContent = `${list.length} product${list.length === 1 ? "" : "s"} shown`;
    renderActiveFilters();

    if (!list.length) {
      els.productGrid.className = "product-grid empty";
      els.productGrid.innerHTML = `
        <div class="empty-state">
          <h3>No matching products</h3>
          <p>Try clearing filters or searching by category, format, document type, or product name.</p>
          <button class="button secondary" type="button" data-reset-empty>Clear filters</button>
        </div>
      `;
      return;
    }

    els.productGrid.className = "product-grid";
    els.productGrid.innerHTML = list
      .map(
        (product) => `
          <article class="product-card">
            <div class="product-card-head">
              <span>${text(product.code)}</span>
              <strong class="status ${text(product.status)}">${text(label(product.status))}</strong>
            </div>
            <div class="product-body">
              <div class="product-topline">
                <span>${text(product.categoryLabel)}</span>
                <strong>${text(product.reviewLabel)}</strong>
              </div>
              <h3>${text(product.name)}</h3>
              <p>${text(product.description)}</p>
              <dl class="product-specs">
                <div>
                  <dt>Format</dt>
                  <dd>${text(product.availableFormats[0])}</dd>
                </div>
                <div>
                  <dt>MOQ</dt>
                  <dd>${text(product.moq)}</dd>
                </div>
              </dl>
              <div class="product-meta">
                ${product.tags.map((tag) => `<span class="pill">${text(tag)}</span>`).join("")}
              </div>
              <div class="product-buybox">
                <div class="product-price">
                  <span>Pricing</span>
                  <strong>${text(formatPrice(product))}</strong>
                  <small>${text(product.pricingNote)} | ${text(product.leadTime)}</small>
                </div>
                <div class="checkout-route">${text(product.reviewLabel)}</div>
                <div class="card-actions">
                  <button class="button secondary" type="button" data-detail="${text(product.id)}">Details</button>
                  <button class="button primary" type="button" data-add="${text(product.id)}">Request quote</button>
                </div>
              </div>
            </div>
          </article>
        `
      )
      .join("");
  }

  function renderQuoteBag() {
    const items = state.getQuoteItems();
    const estimatedTotal = items.reduce((sum, item) => sum + (itemSubtotal(item) || 0), 0);
    const hasQuoteItems = items.some((item) => item.quoteRequired);
    els.quoteCount.textContent = items.length;
    els.mobileQuoteCount.textContent = items.length;

    if (!items.length) {
      els.quoteBag.innerHTML = `
        <div class="empty-state compact">
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
            const product = products.find((entry) => entry.id === item.productId);
            const formats = product?.availableFormats || [item.format];
            return `
              <article class="quote-item">
                <div>
                  <strong>${text(item.name)}</strong>
                  <span>${text(item.category)} | ${text(item.packageSize)} | ${text(item.reviewLabel)}</span>
                </div>
                <label>
                  Qty
                  <input type="number" min="1" value="${Number(item.quantity) || 1}" data-quantity="${text(item.productId)}" />
                </label>
                <label>
                  Format
                  <select data-format="${text(item.productId)}">
                    ${formats.map((format) => `<option value="${text(format)}" ${format === item.format ? "selected" : ""}>${text(format)}</option>`).join("")}
                  </select>
                </label>
                <div class="quote-money">
                  <span>${text(item.priceType === "restricted" ? "Restricted review" : item.priceType === "quote" ? "Quote required" : `$${item.unitPrice} / ${item.unit || "unit"}`)}</span>
                  <strong>${itemSubtotal(item) ? `$${itemSubtotal(item).toLocaleString()}` : "TBD"}</strong>
                </div>
                <button type="button" class="icon-button" data-remove="${text(item.productId)}" aria-label="Remove ${text(item.name)}">Remove</button>
              </article>
            `;
          })
          .join("")}
        <div class="quote-total">
          <span>Estimated priced-item subtotal</span>
          <strong>$${estimatedTotal.toLocaleString()}</strong>
          ${hasQuoteItems ? `<p>Quote/restricted items need sales confirmation before a final total is issued.</p>` : ""}
        </div>
      </div>
    `;
  }

  function productById(id) {
    return products.find((product) => product.id === id);
  }

  function addToQuote(product, patch = {}) {
    state.upsertQuoteItem(product, patch);
    renderQuoteBag();
    document.querySelector("#quote").scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function relatedProducts(product) {
    return products
      .filter((entry) => entry.id !== product.id && entry.category === product.category)
      .slice(0, 3);
  }

  function openProductDialog(product) {
    if (!product) return;
    lastFocusedElement = document.activeElement;
    const restricted = product.reviewLevel !== "standard";
    els.dialogContent.innerHTML = `
      <div class="dialog-header">
        <p class="eyebrow">${text(product.categoryLabel)}</p>
        <h2 id="dialogTitle">${text(product.name)}</h2>
        <p>${text(product.description)}</p>
      </div>
      ${restricted ? `<div class="restricted-warning"><strong>Review required:</strong> ${text(product.reviewLabel)} before quote confirmation.</div>` : ""}
      <div class="detail-grid">
        <section>
          <h3>Formats and terms</h3>
          <dl>
            <div><dt>Available formats</dt><dd>${product.availableFormats.map(text).join(", ")}</dd></div>
            <div><dt>MOQ</dt><dd>${text(product.moq)}</dd></div>
            <div><dt>Package</dt><dd>${text(product.packageSize)}</dd></div>
            <div><dt>Price/status</dt><dd>${text(formatPrice(product))}</dd></div>
            <div><dt>Lead time</dt><dd>${text(product.leadTime)}</dd></div>
            <div><dt>Status</dt><dd>${text(label(product.status))}</dd></div>
          </dl>
        </section>
        <section>
          <h3>Documentation and shipping</h3>
          <dl>
            <div><dt>Documents</dt><dd>${product.documentationAvailable.map(text).join(", ")}</dd></div>
            <div><dt>Storage / shipping</dt><dd>${text(product.storageShippingNotes)}</dd></div>
            <div><dt>Allowed buyer types</dt><dd>${product.allowedBuyerTypes.map(text).join(", ")}</dd></div>
          </dl>
        </section>
      </div>
      <form class="dialog-quote-form" id="dialogQuoteForm">
        <label>
          Quantity
          <input type="number" name="quantity" min="1" value="1" />
        </label>
        <label>
          Format / configuration
          <select name="format">
            ${product.availableFormats.map((format) => `<option value="${text(format)}">${text(format)}</option>`).join("")}
          </select>
        </label>
        <button class="button primary" type="submit">Request quote for this product</button>
      </form>
      <section class="related-products">
        <h3>Related products</h3>
        <div>
          ${relatedProducts(product)
            .map((related) => `<button type="button" data-related="${text(related.id)}">${text(related.name)}</button>`)
            .join("")}
        </div>
      </section>
    `;
    if (!els.dialog.open) els.dialog.showModal();
    els.dialog.querySelector("input, select, button")?.focus();
  }

  function closeDialog() {
    els.dialog.close();
    lastFocusedElement?.focus();
  }

  function formDataForStorage(form) {
    return validation.formObject(form);
  }

  function restoreForm(form, key) {
    const values = state.getForm(key);
    Object.entries(values).forEach(([name, value]) => {
      const fields = [...form.elements].filter((field) => field.name === name);
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
    return [
      `WWB quote request: ${reference}`,
      "",
      "Selected products:",
      ...items.map((item) => `- ${item.name} | Qty: ${item.quantity} | Format: ${item.format} | Price/status: ${itemSubtotal(item) ? `$${itemSubtotal(item)}` : item.priceType} | Review: ${item.reviewLabel}`),
      "",
      `Company: ${data.company || ""}`,
      `Contact: ${data.contactName || ""}`,
      `Email: ${data.email || ""}`,
      `Phone / WhatsApp / Telegram: ${data.messaging || ""}`,
      `Destination country: ${data.destination || ""}`,
      `Buyer type: ${data.buyerType || ""}`,
      `Documentation needed: ${(data.documents || []).join(", ") || "Not specified"}`,
      `Shipping requirements: ${(data.shipping || []).join(", ") || "Not specified"}`,
      `Notes: ${data.notes || ""}`,
    ].join("\n");
  }

  async function copyText(value, statusNode) {
    try {
      await navigator.clipboard.writeText(value);
      statusNode.textContent = "Copied to clipboard.";
    } catch {
      statusNode.textContent = "Copy blocked by browser. Select the generated request text and copy it manually.";
    }
  }

  function wireEvents() {
    [els.category, els.review, els.doc, els.format, els.type, els.priceType, els.status, els.sort].forEach((select) => {
      select.addEventListener("change", () => {
        filterState[select.id.replace("Filter", "").replace("sortSelect", "sort")] = select.value;
        if (select === els.sort) filterState.sort = select.value;
        renderProducts();
      });
    });

    els.search.addEventListener("input", () => {
      filterState.search = els.search.value;
      renderProducts();
    });

    els.resetFilters.addEventListener("click", () => {
      Object.assign(filterState, { category: "all", review: "all", doc: "all", format: "all", type: "all", priceType: "all", status: "all", search: "", sort: "recent" });
      [els.category, els.review, els.doc, els.format, els.type, els.priceType, els.status].forEach((select) => (select.value = "all"));
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

    els.productGrid.addEventListener("click", (event) => {
      const detailId = event.target.closest("[data-detail]")?.dataset.detail;
      const addId = event.target.closest("[data-add]")?.dataset.add;
      if (event.target.closest("[data-reset-empty]")) els.resetFilters.click();
      if (detailId) openProductDialog(productById(detailId));
      if (addId) addToQuote(productById(addId));
    });

    els.quoteBag.addEventListener("input", (event) => {
      const id = event.target.dataset.quantity;
      if (id) {
        state.updateQuoteItem(id, { quantity: Math.max(1, Number(event.target.value) || 1) });
        renderQuoteBag();
      }
    });

    els.quoteBag.addEventListener("change", (event) => {
      const id = event.target.dataset.format;
      if (id) {
        state.updateQuoteItem(id, { format: event.target.value });
        renderQuoteBag();
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

    els.quoteForm.addEventListener("input", () => state.setForm("quoteForm", formDataForStorage(els.quoteForm)));
    els.quoteForm.addEventListener("change", () => state.setForm("quoteForm", formDataForStorage(els.quoteForm)));
    els.accountForm.addEventListener("input", () => state.setForm("accountForm", formDataForStorage(els.accountForm)));
    els.accountForm.addEventListener("change", () => state.setForm("accountForm", formDataForStorage(els.accountForm)));

    els.copyQuoteButton.addEventListener("click", () => copyText(lastQuoteText || quoteText(), els.quoteStatus));

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
      els.quoteStatus.textContent = "Submitting quote request...";
      try {
        const result = await api.submitQuoteRequest({ items, request: data });
        state.savePendingQuote(result);
        lastQuoteText = quoteText(result.reference);
        els.quoteStatus.textContent = `Quote request ${result.reference} saved locally for sales review.`;
        state.clearQuoteItems();
        state.setForm("quoteForm", {});
        els.quoteForm.reset();
        renderQuoteBag();
      } catch (error) {
        els.quoteStatus.textContent = error.message;
      } finally {
        els.submitQuoteButton.disabled = false;
      }
    });

    els.accountForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = validation.formObject(els.accountForm);
      const errors = validation.validateAccount(data);
      if (Object.keys(errors).length) {
        showErrors(els.accountForm, errors, "account-");
        els.accountStatus.textContent = "Fix the highlighted fields before submitting.";
        return;
      }

      clearErrors(els.accountForm, "account-");
      els.submitAccountButton.disabled = true;
      els.accountStatus.textContent = "Submitting account access request...";
      try {
        const result = await api.requestAccountAccess(data);
        state.saveAccessRequest(result);
        state.setForm("accountForm", {});
        els.accountForm.reset();
        els.accountStatus.textContent = `Account access request ${result.reference} saved locally.`;
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
    els.dialog.addEventListener("submit", (event) => {
      if (event.target.id !== "dialogQuoteForm") return;
      event.preventDefault();
      const title = els.dialog.querySelector("#dialogTitle")?.textContent;
      const product = products.find((entry) => entry.name === title);
      const data = new FormData(event.target);
      addToQuote(product, { quantity: Number(data.get("quantity")) || 1, format: data.get("format") });
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
    restoreForm(els.accountForm, "accountForm");
    renderQuoteBag();
    wireEvents();
    currentProducts = await api.fetchCatalog();
    renderProducts();
  }

  init();
})();
