(function () {
  // PRODUCTION BACKEND URL: paste your deployed backend URL between the quotes.
  const deployedBackendUrl = "https://wwb-api-crhx.onrender.com";

  // Local development fallback. Do not remove unless you no longer run locally.
  const localBackendUrl = "http://localhost:3000";

  window.WWB_API_BASE_URL = window.WWB_API_BASE_URL || deployedBackendUrl || localBackendUrl;
  window.WWB_MAX_QTY_PER_LINE = window.WWB_MAX_QTY_PER_LINE || 999;
  window.WWB_MAX_CART_LINES = window.WWB_MAX_CART_LINES || 50;
})();
