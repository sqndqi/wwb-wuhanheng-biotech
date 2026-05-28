(function () {
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  function reference(prefix) {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}`;
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `WWB-${prefix}-${date}-${suffix}`;
  }

  async function fetchCatalog() {
    await delay(120);
    return window.WWBData.products;
  }

  async function submitQuoteRequest(payload) {
    await delay(450);
    if (!payload?.items?.length) {
      throw new Error("A quote request requires at least one product.");
    }

    return {
      reference: reference("QR"),
      submittedAt: new Date().toISOString(),
      status: "Pending sales review",
      payload,
    };
  }

  async function requestAccountAccess(payload) {
    await delay(350);
    if (!payload?.company || !payload?.email) {
      throw new Error("Company and email are required for account access requests.");
    }

    return {
      reference: reference("ACCT"),
      submittedAt: new Date().toISOString(),
      status: "Pending account review",
      payload,
    };
  }

  async function loginClient() {
    await delay(250);
    throw new Error("Client dashboard requires backend authentication.");
  }

  window.WWBApi = {
    fetchCatalog,
    submitQuoteRequest,
    requestAccountAccess,
    loginClient,
  };
})();
