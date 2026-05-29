(function () {
  let products = [];
  let backendOnline = false;
  const state = window.WWBState;
  const validation = window.WWBValidation;

  const els = {
    search: document.querySelector("#searchInput"),
    category: document.querySelector("#categoryFilter"),
    priceType: document.querySelector("#priceTypeFilter"),
    source: document.querySelector("#sourceFilter"),
    sort: document.querySelector("#sortSelect"),
    resetFilters: document.querySelector("#resetFilters"),
    bulkOnly: document.querySelector("#bulkOnlyFilter"),
    cardViewButton: document.querySelector("#cardViewButton"),
    tableViewButton: document.querySelector("#tableViewButton"),
    activeFilters: document.querySelector("#activeFilters"),
    catalogCount: document.querySelector("#catalogCount"),
    featuredGrid: document.querySelector("#featuredGrid"),
    productGrid: document.querySelector("#productGrid"),
    catalogTableWrap: document.querySelector("#catalogTableWrap"),
    catalogTable: document.querySelector("#catalogTable"),
    cartList: document.querySelector("#cartList"),
    cartCount: document.querySelector("#cartCount"),
    mobileCartCount: document.querySelector("#mobileCartCount"),
    cartButton: document.querySelector("#cartButton"),
    mobileCartButton: document.querySelector("#mobileCartButton"),
    checkoutForm: document.querySelector("#checkoutForm"),
    placeOrderButton: document.querySelector("#placeOrderButton"),
    backendStatus: document.querySelector("#backendStatus"),
    clearCartButton: document.querySelector("#clearCartButton"),
    orderStatus: document.querySelector("#orderStatus"),
    orderConfirmation: document.querySelector("#orderConfirmation"),
    contactForm: document.querySelector("#contactForm"),
    contactStatus: document.querySelector("#contactStatus"),
    dialog: document.querySelector("#productDialog"),
    dialogContent: document.querySelector("#dialogContent"),
    dialogClose: document.querySelector("#dialogClose"),
  };

  const filters = {
    category: "all",
    priceType: "all",
    source: "all",
    search: "",
    sort: "featured",
    bulkOnly: false,
    view: "cards",
  };

  const categoryOrder = [
    "Featured / Popular",
    "GLP-1 / Metabolic",
    "Peptides",
    "Blends",
    "Recovery / Repair",
    "Cosmetic / Skin",
    "Hormones / Fertility",
    "Orals",
    "Accessories / Water",
    "Raw Powders",
    "Other",
  ];

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;",
    })[char]);
  }

  function money(value) {
    return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  function numeric(value) {
    if (value === null || value === undefined || value === "" || value === "*") return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  function quantityLimit() {
    return Number(window.WWB_MAX_QTY_PER_LINE || 999);
  }

  function parseQuantity(value) {
    const raw = String(value ?? "").trim();
    const max = quantityLimit();
    if (!raw) return { ok: false, message: "Quantity is required." };
    if (!/^\d+$/.test(raw)) return { ok: false, message: "Quantity must be a whole number." };
    const parsed = Number(raw);
    if (!Number.isSafeInteger(parsed) || parsed < 1) return { ok: false, value: parsed, message: "Quantity must be at least 1." };
    if (parsed > max) return { ok: false, value: parsed, message: `Quantity cannot exceed ${max}.` };
    return { ok: true, value: parsed };
  }

  function productById(id) {
    return products.find((product) => product.id === id);
  }

  function variants(product) {
    return product?.variants || [];
  }

  function variantBySku(product, sku) {
    return variants(product).find((variant) => variant.sku === sku) || variants(product)[0];
  }

  function minPrice(product) {
    const prices = variants(product).flatMap((variant) => [numeric(variant.price), numeric(variant.bulkPrice)]).filter((value) => value !== null);
    return prices.length ? Math.min(...prices) : Number.MAX_SAFE_INTEGER;
  }

  function productPriceType(product) {
    const hasBase = variants(product).some((variant) => numeric(variant.price) !== null);
    const hasBulk = variants(product).some((variant) => numeric(variant.bulkPrice) !== null);
    if (hasBase) return "fixed";
    if (hasBulk) return "from";
    return "quote";
  }

  function productPriceLabel(product) {
    const price = minPrice(product);
    if (price === Number.MAX_SAFE_INTEGER) return "Quote required";
    return `From ${money(price)}`;
  }

  function priceLine(variant) {
    if (numeric(variant.price) !== null) return `${money(variant.price)} / ${variant.unitLabel || "unit"}`;
    if (numeric(variant.bulkPrice) !== null) return `From ${money(variant.bulkPrice)} / ${variant.unitLabel || "unit"}`;
    return "Quote required";
  }

  function bulkLine(variant) {
    if (!variant.bulkMin) return "Bulk price by order";
    if (numeric(variant.bulkPrice) !== null) return `${variant.bulkMin}+ ${variant.unitLabel || "units"}: ${money(variant.bulkPrice)} each`;
    return `${variant.bulkMin}+ ${variant.unitLabel || "units"}: bulk quote`;
  }

  function lineTotals(item) {
    const parsedQuantity = parseQuantity(item.quantity);
    if (!parsedQuantity.ok) {
      return {
        quantity: item.quantity,
        unitPrice: null,
        bulkApplied: false,
        needsPrice: true,
        invalid: true,
        error: parsedQuantity.message,
        subtotal: null,
      };
    }
    const quantity = parsedQuantity.value;
    const variant = item.variant || {};
    let unitPrice = numeric(variant.price);
    let bulkApplied = false;
    let needsPrice = unitPrice === null;

    if (variant.bulkMin && quantity >= Number(variant.bulkMin)) {
      const bulk = numeric(variant.bulkPrice);
      if (bulk !== null) {
        unitPrice = bulk;
        bulkApplied = true;
        needsPrice = false;
      } else if (unitPrice === null) {
        needsPrice = true;
      }
    }

    return {
      quantity,
      unitPrice,
      bulkApplied,
      needsPrice,
      subtotal: unitPrice !== null ? Math.round(unitPrice * quantity * 100) / 100 : null,
    };
  }

  function cartTotals(items = state.getCartItems()) {
    const subtotal = Math.round(items.reduce((sum, item) => sum + (lineTotals(item).subtotal || 0), 0) * 100) / 100;
    const discount = Math.round(subtotal * 0.05 * 100) / 100;
    const productTotal = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    return {
      subtotal,
      discount,
      productTotal,
      total: productTotal,
      shippingStatus: "Pending seller review",
      shippingLabel: "To be confirmed by seller after address review",
    };
  }

  function cheapestVariant(product) {
    return variants(product).slice().sort((a, b) => {
      const aPrice = numeric(a.price) ?? Number.MAX_SAFE_INTEGER;
      const bPrice = numeric(b.price) ?? Number.MAX_SAFE_INTEGER;
      return aPrice - bPrice || a.sku.localeCompare(b.sku);
    })[0];
  }

  function setBackendStatus(online, message) {
    backendOnline = online;
    if (els.backendStatus) {
      els.backendStatus.textContent = message || (online ? "Ordering system online" : "Ordering system offline");
      els.backendStatus.classList.toggle("online", online);
      els.backendStatus.classList.toggle("offline", !online);
    }
    if (els.placeOrderButton) els.placeOrderButton.disabled = !online;
  }

  function populate(select, values, format = (value) => value) {
    values.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = format(value);
      select.appendChild(option);
    });
  }

  function initFilters() {
    const categories = Array.from(new Set(products.map((product) => product.category))).sort((a, b) => {
      const aIndex = categoryOrder.indexOf(a);
      const bIndex = categoryOrder.indexOf(b);
      if (aIndex !== -1 || bIndex !== -1) return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      return a.localeCompare(b);
    });
    const sources = Array.from(new Set(products.map((product) => product.sourceList))).sort();
    populate(els.category, categories);
    populate(els.priceType, ["fixed", "from", "quote"], (value) => {
      if (value === "fixed") return "Priced";
      if (value === "from") return "From / bulk priced";
      return "Quote required";
    });
    populate(els.source, sources);
  }

  function visibleProducts() {
    const query = filters.search.trim().toLowerCase();
    const exactSkuMode = Boolean(query && products.some((product) => variants(product).some((variant) => variant.sku.toLowerCase() === query)));
    return products
      .filter((product) => {
        const exactSkuMatch = variants(product).some((variant) => variant.sku.toLowerCase() === query);
        const haystack = [product.name, product.category, product.sourceList, ...variants(product).flatMap((variant) => [variant.sku, variant.label, variant.dosage, variant.packageSize])]
          .join(" ")
          .toLowerCase();
        return (
          (!query || (exactSkuMode ? exactSkuMatch : haystack.includes(query))) &&
          (filters.category === "all" || product.category === filters.category) &&
          (filters.priceType === "all" || productPriceType(product) === filters.priceType) &&
          (filters.source === "all" || product.sourceList === filters.source) &&
          (!filters.bulkOnly || variants(product).some((variant) => numeric(variant.bulkPrice) !== null))
        );
      })
      .sort((a, b) => {
        if (filters.sort === "featured") return Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || minPrice(a) - minPrice(b);
        if (filters.sort === "name") return a.name.localeCompare(b.name);
        if (filters.sort === "priceLow") return minPrice(a) - minPrice(b) || a.name.localeCompare(b.name);
        if (filters.sort === "priceHigh") {
          const aPrice = minPrice(a) === Number.MAX_SAFE_INTEGER ? -1 : minPrice(a);
          const bPrice = minPrice(b) === Number.MAX_SAFE_INTEGER ? -1 : minPrice(b);
          return bPrice - aPrice || a.name.localeCompare(b.name);
        }
        if (filters.sort === "category") return a.category.localeCompare(b.category) || a.name.localeCompare(b.name);
        return 0;
      });
  }

  function renderActiveFilters() {
    const active = [];
    if (filters.search) active.push(`Search: ${filters.search}`);
    if (filters.category !== "all") active.push(`Category: ${filters.category}`);
    if (filters.priceType !== "all") active.push(`Price: ${filters.priceType}`);
    if (filters.source !== "all") active.push(`Source: ${filters.source}`);
    if (filters.bulkOnly) active.push("10+ pricing only");
    els.activeFilters.innerHTML = active.length ? active.map((entry) => `<span class="active-filter-chip">${esc(entry)}</span>`).join("") : "<span class=\"active-filter-chip neutral\">All products</span>";
  }

  function selectedSkuForProduct(product) {
    const query = filters.search.trim().toLowerCase();
    if (!query) return cheapestVariant(product)?.sku;
    const exact = variants(product).find((variant) => variant.sku.toLowerCase() === query);
    return (exact || cheapestVariant(product))?.sku;
  }

  function optionMarkup(product, selectedSku = variants(product)[0]?.sku) {
    return variants(product)
      .map((variant) => `<option value="${esc(variant.sku)}" ${variant.sku === selectedSku ? "selected" : ""}>${esc(variant.sku)} - ${esc(variant.label)}</option>`)
      .join("");
  }

  function updateCard(productId) {
    const product = productById(productId);
    const card = els.productGrid.querySelector(`[data-product-card="${CSS.escape(productId)}"]`);
    if (!product || !card) return;
    const variant = variantBySku(product, card.querySelector("[data-card-variant]")?.value);
    card.querySelector("[data-card-code]").textContent = variant.sku;
    card.querySelector("[data-card-package]").textContent = variant.label;
    card.querySelector("[data-card-price]").textContent = priceLine(variant);
    card.querySelector("[data-card-bulk]").textContent = bulkLine(variant);
  }

  function renderProducts() {
    const list = visibleProducts();
    renderActiveFilters();
    els.catalogCount.textContent = `${list.length} product families / ${products.reduce((count, product) => count + variants(product).length, 0)} variants`;
    renderFeaturedProducts();

    if (!list.length) {
      els.productGrid.classList.remove("loading");
      els.productGrid.innerHTML = `<div class="empty-state"><h3>No products found</h3><p>Try another search or clear filters.</p></div>`;
      if (els.catalogTable) els.catalogTable.innerHTML = `<tr><td colspan="7">No products found.</td></tr>`;
      return;
    }

    els.productGrid.classList.remove("loading");
    els.productGrid.hidden = filters.view !== "cards";
    els.catalogTableWrap.hidden = filters.view !== "table";
    els.productGrid.innerHTML = list
      .map((product) => {
        const variant = variantBySku(product, selectedSkuForProduct(product));
        return `
          <article class="product-card" data-product-card="${esc(product.id)}">
            <div class="product-topline">
              <span class="product-code" data-card-code>${esc(variant.sku)}</span>
              <span class="source-chip">${esc(product.category)}</span>
            </div>
            <h3>${esc(product.name)}</h3>
            <div class="meta-row">
              <span>${esc(product.sourceList)}</span>
              <span>${variants(product).length} option${variants(product).length === 1 ? "" : "s"}</span>
            </div>
            <div class="family-price">${esc(productPriceLabel(product))}</div>
            <label class="compact-field">
              Variant / package
              <select data-card-variant="${esc(product.id)}">${optionMarkup(product)}</select>
            </label>
            <div class="package-line" data-card-package>${esc(variant.label)}</div>
            <div class="product-price">
              <span data-card-price>${esc(priceLine(variant))}</span>
              <small data-card-bulk>${esc(bulkLine(variant))}</small>
            </div>
            <div class="card-actions">
              <div class="quantity-mini quantity-stepper" aria-label="Quantity selector for ${esc(product.name)}">
                <span>Qty</span>
                <button type="button" data-card-step="${esc(product.id)}" data-step="-1" aria-label="Decrease quantity">-</button>
                <input data-card-qty="${esc(product.id)}" type="number" min="1" value="1" inputmode="numeric" />
                <button type="button" data-card-step="${esc(product.id)}" data-step="1" aria-label="Increase quantity">+</button>
              </div>
              <button class="button primary" type="button" data-add="${esc(product.id)}">Add to cart</button>
              <button class="button secondary" type="button" data-detail="${esc(product.id)}">View options</button>
            </div>
          </article>
        `;
      })
      .join("");
    renderCatalogTable(list);
  }

  function renderFeaturedProducts() {
    if (!els.featuredGrid) return;
    const featured = products.filter((product) => product.featured).slice(0, 8);
    els.featuredGrid.innerHTML = featured
      .map((product) => {
        const variant = cheapestVariant(product);
        return `
          <article class="featured-product">
            <span>${esc(product.category)}</span>
            <h3>${esc(product.name)}</h3>
            <strong>${esc(productPriceLabel(product))}</strong>
            <small>${esc(variant?.sku || "")} - ${esc(variant?.label || "")}</small>
            <div>
              <button class="button primary" type="button" data-feature-add="${esc(product.id)}">Add</button>
              <button class="button secondary" type="button" data-feature-detail="${esc(product.id)}">Options</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderCatalogTable(list) {
    if (!els.catalogTable) return;
    const rows = list
      .flatMap((product) => variants(product).map((variant) => ({ product, variant })))
      .map(({ product, variant }) => `
        <tr data-table-row="${esc(product.id)}" data-sku="${esc(variant.sku)}">
          <td><strong>${esc(product.name)}</strong></td>
          <td>${esc(product.category)}</td>
          <td><span class="product-code">${esc(variant.sku)}</span><br><small>${esc(variant.label)}</small></td>
          <td>${esc(priceLine(variant))}</td>
          <td>${esc(bulkLine(variant))}</td>
          <td><input data-table-qty type="number" min="1" value="1" inputmode="numeric" aria-label="Quantity for ${esc(variant.sku)}" /></td>
          <td><button class="button primary compact-add" type="button" data-table-add>Add</button></td>
        </tr>
      `)
      .join("");
    els.catalogTable.innerHTML = rows;
  }

  function currentCartItems() {
    return state.getCartItems().map((item) => {
      const product = productById(item.productId);
      const variant = variantBySku(product, item.variant?.sku || item.sku || item.code);
      return product && variant ? { ...item, productId: product.id, name: product.name, category: product.category, code: variant.sku, variant } : item;
    });
  }

  function reconcileCart() {
    const current = state.getCartItems();
    const next = [];
    let removed = 0;

    current.forEach((item) => {
      const product = productById(item.productId);
      const sku = item.variant?.sku || item.sku || item.code;
      const variant = product ? variants(product).find((entry) => entry.sku === sku) : null;
      if (!product || !variant) {
        removed += 1;
        return;
      }
      next.push({
        ...item,
        productId: product.id,
        name: product.name,
        category: product.category,
        code: variant.sku,
        variant,
      });
    });

    if (removed) state.setCartItems(next);
    return removed;
  }

  function renderCart() {
    const items = currentCartItems();
    const totals = cartTotals(items);
    els.cartCount.textContent = items.length;
    els.mobileCartCount.textContent = items.length;

    if (!items.length) {
      els.cartList.innerHTML = `<div class="empty-bag"><h3>Your cart is empty</h3><p>Add products from the catalog to start an order.</p></div>`;
      return;
    }

    els.cartList.innerHTML = `
      <div class="quote-list cart-lines">
        ${items
          .map((item) => {
            const product = productById(item.productId);
            const line = lineTotals(item);
            const unit = line.unitPrice !== null ? `${money(line.unitPrice)} / ${item.variant.unitLabel || "unit"}` : "Price pending";
            return `
              <article class="quote-item cart-item" data-line-id="${esc(item.lineId)}">
                <div class="quote-item-head">
                  <strong>${esc(item.code)} | ${esc(item.name)}</strong>
                  <span>${esc(item.category)}</span>
                </div>
                <label>
                  Variant / package
                  <select data-cart-variant="${esc(item.lineId)}">${optionMarkup(product, item.variant.sku)}</select>
                </label>
                <div class="quote-line-grid">
                  <label>Quantity <input type="number" min="1" value="${esc(item.quantity)}" data-cart-qty="${esc(item.lineId)}" inputmode="numeric" /></label>
                  <div class="quote-money">
                    <span>${esc(unit)}${line.bulkApplied ? " (bulk applied)" : ""}</span>
                    <strong>${line.subtotal !== null ? money(line.subtotal) : "TBD"}</strong>
                  </div>
                </div>
                ${line.invalid ? `<p class="inline-error">${esc(line.error)}</p>` : ""}
                <small>${esc(bulkLine(item.variant))}</small>
                <button class="link-button danger" type="button" data-remove="${esc(item.lineId)}">Remove</button>
              </article>
            `;
          })
          .join("")}
        <div class="quote-total cart-total">
          <span>Subtotal</span><strong>${money(totals.subtotal)}</strong>
          <span>SUMMER discount 5%</span><strong>-${money(totals.discount)}</strong>
          <span>Product total</span><strong>${money(totals.productTotal)}</strong>
          <span>Shipping</span><strong>${esc(totals.shippingLabel)}</strong>
          <span>Due now</span><strong>${money(totals.total)}</strong>
        </div>
        <div class="promo-card"><strong>SUMMER 5% auto-applied.</strong> Shipping is handled by the seller after address review.</div>
      </div>
    `;
  }

  function addToCart(product, variant, quantity = 1) {
    const currentLines = state.getCartItems();
    const lineId = `${product.id}__${variant.sku}`;
    if (!currentLines.some((item) => item.lineId === lineId) && currentLines.length >= Number(window.WWB_MAX_CART_LINES || 50)) {
      els.orderStatus.textContent = `Cart cannot exceed ${window.WWB_MAX_CART_LINES || 50} lines.`;
      return;
    }
    const parsedQuantity = parseQuantity(quantity);
    if (!parsedQuantity.ok) {
      els.orderStatus.textContent = parsedQuantity.message;
      return;
    }
    state.addCartItem(product, variant, { quantity: parsedQuantity.value });
    renderCart();
    els.orderStatus.textContent = `${variant.sku} added to cart.`;
  }

  function variantRows(product) {
    return variants(product)
      .map(
        (variant) => `
          <tr data-modal-row="${esc(product.id)}" data-sku="${esc(variant.sku)}">
            <td>${esc(variant.sku)}</td>
            <td>${esc(variant.label)}</td>
            <td>${esc(priceLine(variant))}</td>
            <td>${esc(bulkLine(variant))}</td>
            <td><input data-modal-qty type="number" min="1" value="1" inputmode="numeric" aria-label="Quantity for ${esc(variant.sku)}" /></td>
            <td><button class="button primary compact-add" type="button" data-modal-add>Add</button></td>
          </tr>
        `
      )
      .join("");
  }

  function openProductDialog(product) {
    const variant = variants(product)[0];
    els.dialogContent.innerHTML = `
      <div class="dialog-header">
        <span class="product-code">${esc(variant.sku)}</span>
        <p class="eyebrow">${esc(product.category)} | ${esc(product.sourceList)}</p>
        <h2 id="dialogTitle">${esc(product.name)}</h2>
        <p>${esc(product.description)}</p>
      </div>
      <div class="variant-table-wrap">
        <table class="variant-table">
          <thead><tr><th>SKU</th><th>Package</th><th>Price</th><th>10+ price</th><th>Qty</th><th>Add</th></tr></thead>
          <tbody>${variantRows(product)}</tbody>
        </table>
      </div>
      <form class="dialog-quote-form" id="dialogCartForm" data-product-id="${esc(product.id)}">
        <label>Variant / package <select name="variant">${optionMarkup(product)}</select></label>
        <label>Quantity <input name="quantity" type="number" min="1" value="1" inputmode="numeric" /></label>
        <div class="dialog-estimate" id="dialogEstimate">
          <span>${esc(priceLine(variant))}</span>
          <span>${esc(bulkLine(variant))}</span>
          <strong>Subtotal ${numeric(variant.price) !== null ? money(variant.price) : "TBD"}</strong>
        </div>
        <button class="button primary" type="submit">Add to cart</button>
      </form>
    `;
    els.dialog.showModal();
    updateDialogEstimate(product);
  }

  function updateDialogEstimate(product) {
    const form = els.dialog.querySelector("#dialogCartForm");
    const node = els.dialog.querySelector("#dialogEstimate");
    if (!form || !node) return;
    const variant = variantBySku(product, form.elements.variant.value);
    const parsedQuantity = parseQuantity(form.elements.quantity.value);
    if (!parsedQuantity.ok) {
      node.innerHTML = `
        <span>${esc(priceLine(variant))}</span>
        <span>${esc(bulkLine(variant))}</span>
        <strong>${esc(parsedQuantity.message)}</strong>
      `;
      return;
    }
    const quantity = parsedQuantity.value;
    const line = lineTotals({ variant, quantity });
    node.innerHTML = `
      <span>${esc(priceLine(variant))}</span>
      <span>${esc(bulkLine(variant))}</span>
      <strong>${line.subtotal !== null ? `Subtotal ${money(line.subtotal)}` : "Subtotal TBD"}</strong>
    `;
  }

  function closeDialog() {
    if (els.dialog.open) els.dialog.close();
  }

  function restoreForm(form, key) {
    const saved = state.getForm(key);
    Object.entries(saved).forEach(([name, value]) => {
      const field = form.elements[name];
      if (field && field.name !== "discountCode") field.value = value;
    });
    form.elements.discountCode.value = "SUMMER";
  }

  function clearErrors(form) {
    form.querySelectorAll(".field-error").forEach((node) => (node.textContent = ""));
    form.querySelectorAll("[aria-invalid='true']").forEach((node) => node.removeAttribute("aria-invalid"));
  }

  function showErrors(form, errors) {
    clearErrors(form);
    Object.entries(errors).forEach(([name, message]) => {
      const errorNode = form.querySelector(`[data-error-for="${name}"]`);
      if (errorNode) errorNode.textContent = message;
      const field = form.elements[name];
      if (field) field.setAttribute("aria-invalid", "true");
    });
  }

  function orderPayload(data) {
    return {
      discountCode: "SUMMER",
      paymentMethod: data.paymentMethod,
      customer: {
        fullName: data.fullName,
        email: data.email,
        contact: data.contact,
        country: data.country,
        city: data.city,
        address: data.address,
        postalCode: data.postalCode || "",
      },
      notes: data.notes || "",
      items: currentCartItems().map((item) => ({
        productId: item.productId,
        sku: item.variant.sku,
        quantity: Number(item.quantity),
      })),
    };
  }

  async function submitOrder(payload) {
    const response = await fetch(`${window.WWB_API_BASE_URL.replace(/\/$/, "")}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.error || "Order backend is not online. Please contact seller.");
    return body;
  }

  function validateContactForm(data) {
    const errors = {};
    if (!data.name?.trim()) errors.name = "Name is required.";
    if (!validation.email(data.email)) errors.email = "Enter a valid email.";
    const message = String(data.message || "").trim();
    if (message.length < 10) errors.message = "Message must be at least 10 characters.";
    if (message.length > 1500) errors.message = "Message cannot exceed 1500 characters.";
    return errors;
  }

  async function submitContact(payload) {
    const response = await fetch(`${window.WWB_API_BASE_URL.replace(/\/$/, "")}/api/contact`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.ok) throw new Error(body.error || "Contact backend is not online. Please use Discord support.");
    return body;
  }

  function renderConfirmation(result) {
    const instructions = result.paymentInstructions || {};
    const totals = result.totals || result;
    els.orderConfirmation.hidden = false;
    els.orderConfirmation.innerHTML = `
      <h3>Order created: ${esc(result.orderId)}</h3>
      <p>Payment is not complete yet. Seller will review your address and confirm shipping after order review.</p>
      <div class="quote-total">
        <span>Subtotal</span><strong>${money(totals.subtotal)}</strong>
        <span>SUMMER discount</span><strong>-${money(totals.discount || totals.discountAmount)}</strong>
        <span>Product total</span><strong>${money(totals.productTotal || totals.total)}</strong>
        <span>Shipping</span><strong>${esc(totals.shippingLabel || "To be confirmed by seller after address review")}</strong>
        <span>Due now</span><strong>${money(totals.total)}</strong>
      </div>
      <p><strong>Payment method:</strong> ${esc(instructions.method || result.paymentMethod || "")}</p>
      <p><strong>Payment status:</strong> Not complete. Seller confirmation is required before the order is final.</p>
      <p>${esc(instructions.details || "Seller will confirm payment instructions using your order reference.")}</p>
      ${instructions.paypalEmail ? `<p><strong>PayPal:</strong> ${esc(instructions.paypalEmail)}</p>` : ""}
      <p class="support-note">Need help with your order? <a href="https://discord.gg/NSc3Vt3MEm" target="_blank" rel="noopener">Join Discord support</a>.</p>
    `;
  }

  function wireEvents() {
    [els.category, els.priceType, els.source].forEach((select) => {
      select.addEventListener("change", () => {
        filters[select.id.replace("Filter", "")] = select.value;
        renderProducts();
      });
    });
    els.sort.addEventListener("change", () => {
      filters.sort = els.sort.value;
      renderProducts();
    });
    els.search.addEventListener("input", () => {
      filters.search = els.search.value;
      renderProducts();
    });
    els.bulkOnly.addEventListener("change", () => {
      filters.bulkOnly = els.bulkOnly.checked;
      renderProducts();
    });
    els.cardViewButton.addEventListener("click", () => {
      filters.view = "cards";
      els.cardViewButton.classList.add("active");
      els.tableViewButton.classList.remove("active");
      els.cardViewButton.setAttribute("aria-pressed", "true");
      els.tableViewButton.setAttribute("aria-pressed", "false");
      renderProducts();
    });
    els.tableViewButton.addEventListener("click", () => {
      filters.view = "table";
      els.tableViewButton.classList.add("active");
      els.cardViewButton.classList.remove("active");
      els.tableViewButton.setAttribute("aria-pressed", "true");
      els.cardViewButton.setAttribute("aria-pressed", "false");
      renderProducts();
    });
    els.resetFilters.addEventListener("click", () => {
      Object.assign(filters, { category: "all", priceType: "all", source: "all", search: "", sort: "featured", bulkOnly: false });
      els.category.value = "all";
      els.priceType.value = "all";
      els.source.value = "all";
      els.search.value = "";
      els.sort.value = "featured";
      els.bulkOnly.checked = false;
      renderProducts();
    });

    els.featuredGrid?.addEventListener("click", (event) => {
      const addId = event.target.closest("[data-feature-add]")?.dataset.featureAdd;
      const detailId = event.target.closest("[data-feature-detail]")?.dataset.featureDetail;
      if (detailId) openProductDialog(productById(detailId));
      if (addId) {
        const product = productById(addId);
        addToCart(product, cheapestVariant(product), 1);
      }
    });

    els.productGrid.addEventListener("change", (event) => {
      const id = event.target.dataset.cardVariant;
      if (id) updateCard(id);
    });
    els.productGrid.addEventListener("click", (event) => {
      const stepId = event.target.closest("[data-card-step]")?.dataset.cardStep;
      if (stepId) {
        const card = event.target.closest("[data-product-card]");
        const input = card?.querySelector("[data-card-qty]");
        const next = Math.min(
          quantityLimit(),
          Math.max(1, (Number(input?.value) || 1) + Number(event.target.closest("[data-card-step]").dataset.step || 0))
        );
        if (input) input.value = next;
        return;
      }
      const addId = event.target.closest("[data-add]")?.dataset.add;
      const detailId = event.target.closest("[data-detail]")?.dataset.detail;
      if (detailId) openProductDialog(productById(detailId));
      if (addId) {
        const product = productById(addId);
        const card = event.target.closest("[data-product-card]");
        const variant = variantBySku(product, card.querySelector("[data-card-variant]").value);
        const quantity = card.querySelector("[data-card-qty]").value;
        addToCart(product, variant, quantity);
      }
    });

    els.catalogTable?.addEventListener("click", (event) => {
      const button = event.target.closest("[data-table-add]");
      if (!button) return;
      const row = event.target.closest("[data-table-row]");
      const product = productById(row.dataset.tableRow);
      const variant = variantBySku(product, row.dataset.sku);
      const quantity = row.querySelector("[data-table-qty]").value;
      addToCart(product, variant, quantity);
    });

    els.cartList.addEventListener("input", (event) => {
      const id = event.target.dataset.cartQty;
      if (id) {
        const parsedQuantity = parseQuantity(event.target.value);
        state.updateCartItem(id, { quantity: parsedQuantity.ok ? parsedQuantity.value : event.target.value });
        if (!parsedQuantity.ok) els.orderStatus.textContent = parsedQuantity.message;
        renderCart();
      }
    });
    els.cartList.addEventListener("change", (event) => {
      const id = event.target.dataset.cartVariant;
      if (!id) return;
      const item = currentCartItems().find((entry) => entry.lineId === id);
      const product = productById(item.productId);
      const variant = variantBySku(product, event.target.value);
      state.removeCartItem(id);
      state.addCartItem(product, variant, { quantity: item.quantity });
      renderCart();
    });
    els.cartList.addEventListener("click", (event) => {
      const id = event.target.closest("[data-remove]")?.dataset.remove;
      if (id) {
        state.removeCartItem(id);
        renderCart();
      }
    });

    [els.cartButton, els.mobileCartButton].forEach((button) => {
      button.addEventListener("click", () => document.querySelector("#checkout").scrollIntoView({ behavior: "smooth" }));
    });

    els.checkoutForm.addEventListener("input", () => {
      els.checkoutForm.elements.discountCode.value = "SUMMER";
      state.setForm("checkoutForm", validation.formObject(els.checkoutForm));
    });
    els.checkoutForm.addEventListener("change", () => {
      els.checkoutForm.elements.discountCode.value = "SUMMER";
      state.setForm("checkoutForm", validation.formObject(els.checkoutForm));
    });
    els.clearCartButton.addEventListener("click", () => {
      state.clearCart();
      renderCart();
      els.orderStatus.textContent = "Cart cleared.";
    });
    els.checkoutForm.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (!backendOnline) {
        els.orderStatus.textContent = "Ordering system offline. Please contact seller.";
        return;
      }
      const items = currentCartItems();
      const data = validation.formObject(els.checkoutForm);
      data.discountCode = "SUMMER";
      const errors = validation.validateCheckout(data, items);
      if (Object.keys(errors).length) {
        showErrors(els.checkoutForm, errors);
        els.orderStatus.textContent = errors.items || "Fix the highlighted fields before placing the order.";
        return;
      }
      clearErrors(els.checkoutForm);
      els.placeOrderButton.disabled = true;
      els.orderStatus.textContent = "Creating order...";
      try {
        const result = await submitOrder(orderPayload(data));
        state.saveOrder(result);
        renderConfirmation(result);
        els.orderStatus.textContent = `Order ${result.orderId} created. Payment instructions are below.`;
        els.orderConfirmation.scrollIntoView({ behavior: "smooth", block: "start" });
      } catch (error) {
        els.orderStatus.textContent = error.message || "Order backend is not online. Please contact seller.";
      } finally {
        els.placeOrderButton.disabled = false;
      }
    });

    els.contactForm?.addEventListener("submit", async (event) => {
      event.preventDefault();
      const data = validation.formObject(els.contactForm);
      const errors = validateContactForm(data);
      if (Object.keys(errors).length) {
        showErrors(els.contactForm, errors);
        els.contactStatus.textContent = "Fix the highlighted fields before sending.";
        return;
      }
      if (!backendOnline) {
        clearErrors(els.contactForm);
        els.contactStatus.innerHTML = 'Contact backend is offline. <a href="https://discord.gg/NSc3Vt3MEm" target="_blank" rel="noopener">Join Discord support</a>.';
        return;
      }
      clearErrors(els.contactForm);
      const button = els.contactForm.querySelector("button[type='submit']");
      button.disabled = true;
      els.contactStatus.textContent = "Sending message...";
      try {
        await submitContact(data);
        els.contactForm.reset();
        els.contactStatus.textContent = "Message sent. The seller will review it.";
      } catch (error) {
        els.contactStatus.innerHTML = `${esc(error.message || "Could not send message.")} <a href="https://discord.gg/NSc3Vt3MEm" target="_blank" rel="noopener">Join Discord support</a>.`;
      } finally {
        button.disabled = false;
      }
    });

    els.dialogClose.addEventListener("click", closeDialog);
    els.dialog.addEventListener("click", (event) => {
      if (event.target === els.dialog) closeDialog();
    });
    els.dialog.addEventListener("input", (event) => {
      const form = event.target.closest("#dialogCartForm");
      if (form) updateDialogEstimate(productById(form.dataset.productId));
    });
    els.dialog.addEventListener("change", (event) => {
      const form = event.target.closest("#dialogCartForm");
      if (form) updateDialogEstimate(productById(form.dataset.productId));
    });
    els.dialog.addEventListener("submit", (event) => {
      if (event.target.id !== "dialogCartForm") return;
      event.preventDefault();
      const product = productById(event.target.dataset.productId);
      const form = new FormData(event.target);
      addToCart(product, variantBySku(product, form.get("variant")), form.get("quantity"));
      closeDialog();
    });
    els.dialog.addEventListener("click", (event) => {
      const button = event.target.closest("[data-modal-add]");
      if (!button) return;
      const row = event.target.closest("[data-modal-row]");
      const product = productById(row.dataset.modalRow);
      const variant = variantBySku(product, row.dataset.sku);
      const quantity = row.querySelector("[data-modal-qty]").value;
      addToCart(product, variant, quantity);
      closeDialog();
    });
  }

  async function loadProducts() {
    const response = await fetch("data/products.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load product catalog.");
    products = await response.json();
  }

  async function checkBackendStatus() {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);
    try {
      const response = await fetch(`${window.WWB_API_BASE_URL.replace(/\/$/, "")}/api/status`, { signal: controller.signal });
      const body = await response.json();
      setBackendStatus(response.ok && body.ok, response.ok && body.ok ? "Ordering system online" : "Ordering system offline");
    } catch {
      setBackendStatus(false, "Ordering system offline");
    } finally {
      clearTimeout(timeout);
    }
  }

  async function init() {
    try {
      await loadProducts();
      initFilters();
      restoreForm(els.checkoutForm, "checkoutForm");
      const removed = reconcileCart();
      renderCart();
      renderProducts();
      wireEvents();
      await checkBackendStatus();
      if (removed) els.orderStatus.textContent = `${removed} stale cart item${removed === 1 ? "" : "s"} removed because the catalog changed.`;
    } catch (error) {
      els.productGrid.classList.remove("loading");
      els.productGrid.innerHTML = `<div class="empty-state"><h3>Catalog failed to load</h3><p>${esc(error.message)}</p></div>`;
    }
  }

  init();
})();
