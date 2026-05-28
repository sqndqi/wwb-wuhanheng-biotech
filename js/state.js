(function () {
  const keys = {
    quoteItems: "wwb.quoteItems.v3",
    quoteForm: "wwb.quoteForm.v3",
    pendingQuotes: "wwb.pendingQuotes.v3",
    accessRequests: "wwb.accessRequests.v3",
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

  function lineId(product, selectedOption) {
    return `${product.id}__${selectedOption.sku}`;
  }

  function getQuoteItems() {
    return read(keys.quoteItems, []);
  }

  function setQuoteItems(items) {
    write(keys.quoteItems, items);
  }

  function makeQuoteItem(product, selectedOption, patch = {}) {
    return {
      lineId: lineId(product, selectedOption),
      productId: product.id,
      code: selectedOption.sku,
      name: product.name,
      category: product.categoryLabel,
      sourceList: selectedOption.sourceList || product.sourceList,
      warehouse: selectedOption.warehouse || product.warehouse,
      selectedOption,
      quantity: 1,
      unitPrice: selectedOption.basePrice,
      bulkPrice: selectedOption.bulkPrice,
      bulkMinimum: selectedOption.bulkMinimum,
      unitLabel: selectedOption.unitLabel,
      quoteRequired: !Number(selectedOption.basePrice),
      reviewLevel: product.reviewLevel,
      reviewLabel: product.reviewLabel,
      documentationNeeded: [],
      shippingPreference: "Standard",
      notes: "",
      ...patch,
    };
  }

  function upsertQuoteItem(product, selectedOption, patch = {}) {
    const current = getQuoteItems();
    const id = lineId(product, selectedOption);
    const existing = current.find((item) => item.lineId === id);
    const next = existing
      ? current.map((item) =>
          item.lineId === id
            ? {
                ...item,
                selectedOption,
                unitPrice: selectedOption.basePrice,
                bulkPrice: selectedOption.bulkPrice,
                bulkMinimum: selectedOption.bulkMinimum,
                unitLabel: selectedOption.unitLabel,
                quantity: Number(item.quantity || 1) + Number(patch.quantity || 1),
                ...patch,
              }
            : item
        )
      : [...current, makeQuoteItem(product, selectedOption, patch)];

    setQuoteItems(next);
    return next;
  }

  function updateQuoteItem(lineIdValue, patch) {
    const next = getQuoteItems().map((item) => (item.lineId === lineIdValue ? { ...item, ...patch } : item));
    setQuoteItems(next);
    return next;
  }

  function removeQuoteItem(lineIdValue) {
    const next = getQuoteItems().filter((item) => item.lineId !== lineIdValue);
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
    write(keys.pendingQuotes, [result, ...current].slice(0, 30));
  }

  function saveAccessRequest(result) {
    const current = read(keys.accessRequests, []);
    write(keys.accessRequests, [result, ...current].slice(0, 30));
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
