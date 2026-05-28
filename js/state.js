(function () {
  const keys = {
    quoteItems: "wwb.quoteItems.v2",
    quoteForm: "wwb.quoteForm.v2",
    accountForm: "wwb.accountForm.v2",
    pendingQuotes: "wwb.pendingQuotes.v2",
    accessRequests: "wwb.accessRequests.v2",
  };

  function read(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function write(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  function getQuoteItems() {
    return read(keys.quoteItems, []);
  }

  function setQuoteItems(items) {
    write(keys.quoteItems, items);
  }

  function upsertQuoteItem(product, patch = {}) {
    const current = getQuoteItems();
    const existing = current.find((item) => item.productId === product.id);
    const base = {
      productId: product.id,
      name: product.name,
      category: product.categoryLabel,
      reviewLevel: product.reviewLevel,
      reviewLabel: product.reviewLabel,
      quantity: 1,
      format: product.availableFormats[0],
      packageSize: product.packageSize,
      priceType: product.priceType,
      unitPrice: product.unitPrice,
      unit: product.unit,
      currency: product.currency,
      quoteRequired: !["fixed", "from"].includes(product.priceType),
      notes: "",
      moq: product.moq,
    };

    const next = existing
      ? current.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: Number(item.quantity || 1) + Number(patch.quantity || 1), ...patch }
            : item
        )
      : [...current, { ...base, ...patch }];

    setQuoteItems(next);
    return next;
  }

  function updateQuoteItem(productId, patch) {
    const next = getQuoteItems().map((item) => (item.productId === productId ? { ...item, ...patch } : item));
    setQuoteItems(next);
    return next;
  }

  function removeQuoteItem(productId) {
    const next = getQuoteItems().filter((item) => item.productId !== productId);
    setQuoteItems(next);
    return next;
  }

  function clearQuoteItems() {
    setQuoteItems([]);
  }

  function getForm(key) {
    return read(keys[key], {});
  }

  function setForm(key, value) {
    write(keys[key], value);
  }

  function savePendingQuote(result) {
    const current = read(keys.pendingQuotes, []);
    write(keys.pendingQuotes, [result, ...current].slice(0, 20));
  }

  function saveAccessRequest(result) {
    const current = read(keys.accessRequests, []);
    write(keys.accessRequests, [result, ...current].slice(0, 20));
  }

  window.WWBState = {
    getQuoteItems,
    setQuoteItems,
    upsertQuoteItem,
    updateQuoteItem,
    removeQuoteItem,
    clearQuoteItems,
    getForm,
    setForm,
    savePendingQuote,
    saveAccessRequest,
  };
})();
