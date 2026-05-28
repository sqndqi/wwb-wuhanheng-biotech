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
    if (!data.company?.trim()) errors.company = "Company is required.";
    if (!data.contactName?.trim()) errors.contactName = "Contact name is required.";
    if (!email(data.email)) errors.email = "Enter a valid email.";
    if (!data.destination?.trim()) errors.destination = "Destination country is required.";
    if (!data.buyerType?.trim()) errors.buyerType = "Buyer type is required.";

    items.forEach((item) => {
      if (!Number(item.quantity) || Number(item.quantity) < 1) {
        errors.items = "Each selected product needs a quantity of at least 1.";
      }
      if (!item.format) {
        errors.items = "Each selected product needs a format or configuration.";
      }
    });

    return errors;
  }

  function validateAccount(data) {
    const errors = {};
    if (!data.company?.trim()) errors.company = "Company is required.";
    if (!data.contactName?.trim()) errors.contactName = "Contact name is required.";
    if (!email(data.email)) errors.email = "Enter a valid email.";
    if (!data.country?.trim()) errors.country = "Country or region is required.";
    if (!data.buyerType?.trim()) errors.buyerType = "Buyer type is required.";
    if (!data.verificationDocs?.trim()) errors.verificationDocs = "Select available verification documentation.";
    return errors;
  }

  window.WWBValidation = {
    formObject,
    validateQuote,
    validateAccount,
  };
})();
