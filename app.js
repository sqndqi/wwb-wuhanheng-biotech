(function () {
  window.WWB_API_BASE_URL = window.WWB_API_BASE_URL || "http://localhost:3000";

  let products = [];
  const state = window.WWBState;
  const validation = window.WWBValidation;

  const els = {
    search: document.querySelector("#searchInput"),
    category: document.querySelector("#categoryFilter"),
    priceType: document.querySelector("#priceTypeFilter"),
    source: document.querySelector("#sourceFilter"),
    sort: document.querySelector("#sortSelect"),
    resetFilters: document.querySelector("#resetFilters"),
    activeFilters: document.querySelector("#activeFilters"),
    catalogCount: document.querySelector("#catalogCount"),
    productGrid: document.querySelector("#productGrid"),
    cartList: document.querySelector("#cartList"),
    cartCount: document.querySelector("#cartCount"),
    mobileCartCount: document.querySelector("#mobileCartCount"),
    cartButton: document.querySelector("#cartButton"),
    mobileCartButton: document.querySelector("#mobileCartButton"),
    checkoutForm: document.querySelector("#checkoutForm"),
    placeOrderButton: document.querySelector("#placeOrderButton"),
    clearCartButton: document.querySelector("#clearCartButton"),
    orderStatus: document.querySelector("#orderStatus"),
    orderConfirmation: document.querySelector("#orderConfirmation"),
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
  };

  function esc(value) {
    return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  }

  function money(value) {
    return `$${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  }

  function numeric(value) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
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
    const quantity = Math.max(1, Number(item.quantity) || 1);
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
    const afterDiscount = Math.max(0, Math.round((subtotal - discount) * 100) / 100);
    const shipping = subtotal >= 150 || subtotal === 0 ? 0 : 25;
    const total = Math.max(0, Math.round((afterDiscount + shipping) * 100) / 100);
    return { subtotal, discount, afterDiscount, shipping, total };
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
    const categories = Array.from(new Set(products.map((product) => product.category))).sort();
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
    return products
      .filter((product) => {
        const haystack = [product.name, product.category, product.sourceList, ...variants(product).flatMap((variant) => [variant.sku, variant.label, variant.dosage, variant.packageSize])]
          .join(" ")
          .toLowerCase();
        return (
          (!query || haystack.includes(query)) &&
          (filters.category === "all" || product.category === filters.category) &&
          (filters.priceType === "all" || productPriceType(product) === filters.priceType) &&
          (filters.source === "all" || product.sourceList === filters.source)
        );
      })
      .sort((a, b) => {
        if (filters.sort === "name") return a.name.localeCompare(b.name);
        if (filters.sort === "priceLow") return minPrice(a) - minPrice(b) || a.name.localeCompare(b.name);
        if (filters.sort === "priceHigh") return minPrice(b) - minPrice(a) || a.name.localeCompare(b.name);
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
    els.activeFilters.innerHTML = active.length ? active.map((entry) => `<span>${esc(entry)}</span>`).join("") : "<span>All products</span>";
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

    if (!list.length) {
      els.productGrid.classList.remove("loading");
      els.productGrid.innerHTML = `<div class="empty-state"><h3>No products found</h3><p>Try another search or clear filters.</p></div>`;
      return;
    }

    els.productGrid.classList.remove("loading");
    els.productGrid.innerHTML = list
      .map((product) => {
        const variant = variants(product)[0];
        return `
          <article class="product-card" data-product-card="${esc(product.id)}">
            <div class="product-topline">
              <span class="product-code" data-card-code>${esc(variant.sku)}</span>
              <span class="source-chip">${esc(product.category)}</span>
            </div>
            <h3>${esc(product.name)}</h3>
            <p>${esc(product.description)}</p>
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
              <label class="quantity-mini">Qty <input data-card-qty="${esc(product.id)}" type="number" min="1" value="1" inputmode="numeric" /></label>
              <button class="button primary" type="button" data-add="${esc(product.id)}">Add to cart</button>
              <button class="button secondary" type="button" data-detail="${esc(product.id)}">Details</button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function currentCartItems() {
    return state.getCartItems().map((item) => {
      const product = productById(item.productId);
      const variant = variantBySku(product, item.variant?.sku || item.sku || item.code);
      return product && variant ? { ...item, productId: product.id, name: product.name, category: product.category, code: variant.sku, variant } : item;
    });
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
                <small>${esc(bulkLine(item.variant))}</small>
                <button class="link-button danger" type="button" data-remove="${esc(item.lineId)}">Remove</button>
              </article>
            `;
          })
          .join("")}
        <div class="quote-total cart-total">
          <span>Subtotal</span><strong>${money(totals.subtotal)}</strong>
          <span>SUMMER discount 5%</span><strong>-${money(totals.discount)}</strong>
          <span>Shipping ${totals.shipping ? "" : "(free over $150)"}</span><strong>${totals.shipping ? money(totals.shipping) : "Free"}</strong>
          <span>Final total</span><strong>${money(totals.total)}</strong>
        </div>
        <div class="promo-card">SUMMER applied: 5% off products. Shipping is $25 and free above $150 product subtotal.</div>
      </div>
    `;
  }

  function addToCart(product, variant, quantity = 1) {
    state.addCartItem(product, variant, { quantity: Math.max(1, Number(quantity) || 1) });
    renderCart();
    els.orderStatus.textContent = `${variant.sku} added to cart.`;
  }

  function variantRows(product) {
    return variants(product)
      .map(
        (variant) => `
          <tr>
            <td>${esc(variant.sku)}</td>
            <td>${esc(variant.label)}</td>
            <td>${esc(priceLine(variant))}</td>
            <td>${esc(bulkLine(variant))}</td>
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
          <thead><tr><th>SKU</th><th>Package</th><th>Price</th><th>Bulk</th></tr></thead>
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
    const quantity = Math.max(1, Number(form.elements.quantity.value) || 1);
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
        quantity: Number(item.quantity) || 1,
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

  function renderConfirmation(result) {
    const instructions = result.paymentInstructions || {};
    const totals = result.totals || result;
    els.orderConfirmation.hidden = false;
    els.orderConfirmation.innerHTML = `
      <h3>Order created: ${esc(result.orderId)}</h3>
      <p>Payment is not complete yet. Seller will confirm Crypto or PayPal payment instructions using this order reference.</p>
      <div class="quote-total">
        <span>Subtotal</span><strong>${money(totals.subtotal)}</strong>
        <span>SUMMER discount</span><strong>-${money(totals.discount || totals.discountAmount)}</strong>
        <span>Shipping</span><strong>${Number(totals.shipping) ? money(totals.shipping) : "Free"}</strong>
        <span>Final total</span><strong>${money(totals.total)}</strong>
      </div>
      <p><strong>Payment method:</strong> ${esc(instructions.method || result.paymentMethod || "")}</p>
      <p>${esc(instructions.details || "")}</p>
      ${instructions.paypalEmail ? `<p><strong>PayPal:</strong> ${esc(instructions.paypalEmail)}</p>` : ""}
      <p class="support-note">Need help with your order? <a href="https://discord.gg/47pTnCJVXv" target="_blank" rel="noopener">Join the Discord support server</a>.</p>
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
    els.resetFilters.addEventListener("click", () => {
      Object.assign(filters, { category: "all", priceType: "all", source: "all", search: "", sort: "featured" });
      els.category.value = "all";
      els.priceType.value = "all";
      els.source.value = "all";
      els.search.value = "";
      els.sort.value = "featured";
      renderProducts();
    });

    els.productGrid.addEventListener("change", (event) => {
      const id = event.target.dataset.cardVariant;
      if (id) updateCard(id);
    });
    els.productGrid.addEventListener("click", (event) => {
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

    els.cartList.addEventListener("input", (event) => {
      const id = event.target.dataset.cartQty;
      if (id) {
        state.updateCartItem(id, { quantity: Math.max(1, Number(event.target.value) || 1) });
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
      } catch (error) {
        els.orderStatus.textContent = error.message || "Order backend is not online. Please contact seller.";
      } finally {
        els.placeOrderButton.disabled = false;
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
  }

  async function loadProducts() {
    const response = await fetch("data/products.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Could not load product catalog.");
    products = await response.json();
  }

  async function init() {
    try {
      await loadProducts();
      initFilters();
      restoreForm(els.checkoutForm, "checkoutForm");
      renderCart();
      renderProducts();
      wireEvents();
    } catch (error) {
      els.productGrid.classList.remove("loading");
      els.productGrid.innerHTML = `<div class="empty-state"><h3>Catalog failed to load</h3><p>${esc(error.message)}</p></div>`;
    }
  }

  init();
})();
