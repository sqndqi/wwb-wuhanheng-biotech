(function () {
  // Local development uses localhost. For GitHub Pages production, set this to
  // the deployed backend URL, for example: "https://wwb-api.example.com".
  const deployedBackendUrl = "";
  const localBackendUrl = "http://localhost:3000";

  window.WWB_API_BASE_URL = window.WWB_API_BASE_URL || deployedBackendUrl || localBackendUrl;
  window.WWB_MAX_QTY_PER_LINE = window.WWB_MAX_QTY_PER_LINE || 999;
  window.WWB_MAX_CART_LINES = window.WWB_MAX_CART_LINES || 50;
})();
