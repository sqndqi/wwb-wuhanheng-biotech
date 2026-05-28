(function () {
  function email(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function formObject(form) {
    const data = new FormData(form);
    const output = {};
    for (const [key, value] of data.entries()) output[key] = value;
    return output;
  }

  function validateCheckout(data, items) {
    const errors = {};
    if (!items.length) errors.items = "Add at least one product to the cart.";
    if (!data.fullName?.trim()) errors.fullName = "Full name is required.";
    if (!email(data.email)) errors.email = "Enter a valid email.";
    if (!data.contact?.trim()) errors.contact = "Phone, Telegram, or WhatsApp is required.";
    if (!data.country?.trim()) errors.country = "Country is required.";
    if (!data.city?.trim()) errors.city = "City is required.";
    if (!data.address?.trim()) errors.address = "Shipping address is required.";
    if (!["crypto", "paypal"].includes(data.paymentMethod)) errors.paymentMethod = "Select Crypto or PayPal.";
    if (String(data.discountCode || "").trim().toUpperCase() !== "SUMMER") errors.discountCode = "SUMMER is required for this MVP.";
    for (const item of items) {
      if (!Number(item.quantity) || Number(item.quantity) < 1) errors.items = "Every cart item needs a positive quantity.";
      if (!item.variant?.sku) errors.items = "Every cart item needs a selected variant.";
    }
    return errors;
  }

  window.WWBValidation = {
    email,
    formObject,
    validateCheckout,
  };
})();
