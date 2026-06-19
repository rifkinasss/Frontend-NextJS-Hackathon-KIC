export const SIDEBAR_STORAGE_KEY = "simosi-dashboard-sidebar";
export const SIDEBAR_EXPANDED_WIDTH = "16.5rem";
export const SIDEBAR_COLLAPSED_WIDTH = "5.25rem";

export const sidebarInitScript = `
(function () {
  try {
    var key = "${SIDEBAR_STORAGE_KEY}";
    var collapsed = localStorage.getItem(key) === "collapsed";
    var root = document.documentElement;
    root.dataset.sidebarState = collapsed ? "collapsed" : "expanded";
    root.style.setProperty("--sidebar-width", collapsed ? "${SIDEBAR_COLLAPSED_WIDTH}" : "${SIDEBAR_EXPANDED_WIDTH}");
  } catch (error) {
    document.documentElement.style.setProperty("--sidebar-width", "${SIDEBAR_EXPANDED_WIDTH}");
  }
})();
`;
