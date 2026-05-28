(function () {
  function email(value) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
  }

  function formObject(form) {
    const data = new FormData(form);
    const output = {};

    for (const [key, value] of data.entries()) {
      if (output[key]) {
        output[key] = Array.isArray(output[key]) ? [...output[key], value] : [output[key], value];
      } else {
        output[key] = value;
      }
    }

    for (const key of ["documents", "shipping"]) {
      output[key] = data.getAll(key);
    }

    return output;
  }

  function validateQuote(data, items) {
    const errors = {};
    if (!items.length) errors.items = "Add at least one product to the quote bag.";
    if (!data.company?.trim()) errors.company = "Company name is required.";
    if (!data.contactName?.trim()) errors.contactName = "Contact name is required.";
    if (!email(data.email)) errors.email = "Enter a valid email.";
    if (!data.destination?.trim()) errors.destination = "Destination country is required.";
    if (!data.buyerType?.trim()) errors.buyerType = "Buyer type is required.";
    if (!data.requestedShipping?.trim()) errors.requestedShipping = "Select a requested shipping method.";
    if (data.discountCode?.trim() && data.discountCode.trim().toUpperCase() !== "SUMMER") {
      errors.discountCode = "Use SUMMER or leave the discount code blank.";
    }

    items.forEach((item) => {
      if (!Number(item.quantity) || Number(item.quantity) < 1) {
        errors.items = "Each selected product needs a quantity of at least 1.";
      }
      if (!item.selectedOption?.sku) {
        errors.items = "Each selected product needs a selected package or dosage.";
      }
    });

    return errors;
  }

  function validateAccountRequest(data) {
    const errors = {};
    if (!data.company?.trim()) errors.company = "Company name is required.";
    if (!data.contactName?.trim()) errors.contactName = "Contact name is required.";
    if (!email(data.email)) errors.email = "Enter a valid email.";
    if (!data.messaging?.trim()) errors.messaging = "Phone, WhatsApp, or Telegram is required.";
    if (!data.buyerType?.trim()) errors.buyerType = "Buyer type is required.";
    if (!data.destination?.trim()) errors.destination = "Destination country is required.";
    if (!data.reviewAcknowledgement) errors.reviewAcknowledgement = "Sales review acknowledgement is required.";
    return errors;
  }

  window.WWBValidation = {
    formObject,
    validateQuote,
    validateAccountRequest,
  };
})();
