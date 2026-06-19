import { SettingsClient } from "@/components/settings/SettingsClient";
import { API_BASE_URL } from "@/lib/api/client";

export default function SettingsPage() {
  return <SettingsClient apiBaseUrl={API_BASE_URL} />;
}
