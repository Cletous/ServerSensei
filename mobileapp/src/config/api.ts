import { Platform } from "react-native";

const WEB_API_BASE_URL = "http://127.0.0.1:8000";
const MOBILE_API_BASE_URL = "http://10.94.232.124:8000";

export const API_BASE_URL =
  Platform.OS === "web" ? WEB_API_BASE_URL : MOBILE_API_BASE_URL;