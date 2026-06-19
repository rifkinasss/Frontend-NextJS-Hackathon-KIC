export const API_BASE_URL = getApiBaseUrl();

function getApiBaseUrl() {
  const value = process.env.NEXT_PUBLIC_API_BASE_URL;

  if (!value) {
    throw new Error("NEXT_PUBLIC_API_BASE_URL belum diatur.");
  }

  return value.replace(/\/$/, "");
}
