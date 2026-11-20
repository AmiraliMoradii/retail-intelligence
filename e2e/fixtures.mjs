export const demoPort = 4173;
export const storePort = 4180;
export const demoBase = process.env.PAGES_BASE_PATH ?? "/retail-intelligence/";
export const password = "synthetic-browser-test-password";

export const stores = {
  desktop: { email: "manager@desktop.example", storeId: "desktop", storeName: "Desktop Evaluation" },
  mobile: { email: "manager@mobile.example", storeId: "mobile", storeName: "Mobile Evaluation" },
};
