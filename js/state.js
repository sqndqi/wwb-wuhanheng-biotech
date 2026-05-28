(function () {
  const keys = {
    cartItems: "wwb.cartItems.v1",
    checkoutForm: "wwb.checkoutForm.v1",
    orders: "wwb.orders.v1",
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

  function lineId(product, variant) {
    return `${product.id}__${variant.sku}`;
  }

  function getCartItems() {
    return read(keys.cartItems, []);
  }

  function setCartItems(items) {
    write(keys.cartItems, items);
  }

  function addCartItem(product, variant, patch = {}) {
    const current = getCartItems();
    const id = lineId(product, variant);
    const existing = current.find((item) => item.lineId === id);
    const base = {
      lineId: id,
      productId: product.id,
      code: variant.sku,
      name: product.name,
      category: product.categoryLabel,
      variant,
      quantity: 1,
    };

    const next = existing
      ? current.map((item) =>
          item.lineId === id
            ? { ...item, variant, code: variant.sku, quantity: Number(item.quantity || 1) + Number(patch.quantity || 1), ...patch }
            : item
        )
      : [...current, { ...base, ...patch }];

    setCartItems(next);
    return next;
  }

  function updateCartItem(lineIdValue, patch) {
    const next = getCartItems().map((item) => (item.lineId === lineIdValue ? { ...item, ...patch } : item));
    setCartItems(next);
    return next;
  }

  function removeCartItem(lineIdValue) {
    const next = getCartItems().filter((item) => item.lineId !== lineIdValue);
    setCartItems(next);
    return next;
  }

  function clearCart() {
    setCartItems([]);
  }

  function getForm(key) {
    return read(keys[key], {});
  }

  function setForm(key, value) {
    write(keys[key], value);
  }

  function saveOrder(result) {
    const current = read(keys.orders, []);
    write(keys.orders, [result, ...current].slice(0, 20));
  }

  window.WWBState = {
    getCartItems,
    setCartItems,
    addCartItem,
    updateCartItem,
    removeCartItem,
    clearCart,
    getForm,
    setForm,
    saveOrder,
  };
})();
