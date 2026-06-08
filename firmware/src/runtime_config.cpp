#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>

#include "config.h"
#include "state.h"
#include "runtime_config.h"

Preferences runtimePrefs;

void loadLocalRuntimeConfig()
{
    runtimePrefs.begin("serversensei", true);

    runtimeWifiSsid = runtimePrefs.getString("wifi_ssid", DEFAULT_WIFI_SSID);
    runtimeWifiPassword = runtimePrefs.getString("wifi_pass", DEFAULT_WIFI_PASSWORD);
    runtimeBackendUrl = runtimePrefs.getString("backend_url", DEFAULT_BACKEND_URL);

    runtimePrefs.end();

    if (runtimeWifiSsid.length() == 0)
        runtimeWifiSsid = DEFAULT_WIFI_SSID;

    if (runtimeBackendUrl.length() == 0)
        runtimeBackendUrl = DEFAULT_BACKEND_URL;
}

void saveWiFiRuntimeConfig(String ssid, String password)
{
    runtimePrefs.begin("serversensei", false);

    runtimePrefs.putString("wifi_ssid", ssid);
    runtimePrefs.putString("wifi_pass", password);

    runtimePrefs.end();

    runtimeWifiSsid = ssid;
    runtimeWifiPassword = password;

    Serial.println("[Runtime Config] Wi-Fi settings saved to NVS");
}

void saveBackendUrlRuntimeConfig(String backendUrl)
{
    runtimePrefs.begin("serversensei", false);

    runtimePrefs.putString("backend_url", backendUrl);

    runtimePrefs.end();

    runtimeBackendUrl = backendUrl;

    Serial.println("[Runtime Config] Backend URL saved to NVS");
}

void printRuntimeConfig()
{
    Serial.println("\n=== Runtime Configuration ===");

    Serial.print("Wi-Fi SSID: ");
    Serial.println(runtimeWifiSsid);

    Serial.print("Backend URL: ");
    Serial.println(runtimeBackendUrl);

    Serial.print("Fan ON temperature: ");
    Serial.println(fanOnTemperature);

    Serial.print("Fan OFF temperature: ");
    Serial.println(fanOffTemperature);

    Serial.print("Low runtime threshold: ");
    Serial.println(lowRuntimeThresholdMinutes);

    Serial.print("Critical runtime threshold: ");
    Serial.println(criticalRuntimeThresholdMinutes);

    Serial.print("UPS full drain seconds at 100% load: ");
    Serial.println(demoUpsFullDrainSecondsAt100Load);

    Serial.print("Battery recovery percent/sec: ");
    Serial.println(demoBatteryRecoveryPercentPerSecond);

    Serial.print("Restart battery percent: ");
    Serial.println(demoRestartBatteryPercent);

    Serial.print("Settings version: ");
    Serial.println(runtimeSettingsVersion);

    Serial.println("=============================\n");
}

void applyRuntimeSettings(JsonObject settings)
{
    if (!settings["settings_version"].isNull())
    {
        int newVersion = settings["settings_version"];

        if (newVersion == runtimeSettingsVersion)
        {
            Serial.println("[Runtime Config] Settings already up to date");
            return;
        }

        runtimeSettingsVersion = newVersion;
    }

    if (!settings["fan_on_temperature"].isNull())
        fanOnTemperature = settings["fan_on_temperature"];

    if (!settings["fan_off_temperature"].isNull())
        fanOffTemperature = settings["fan_off_temperature"];

    if (!settings["low_runtime_threshold_minutes"].isNull())
        lowRuntimeThresholdMinutes = settings["low_runtime_threshold_minutes"];

    if (!settings["critical_runtime_threshold_minutes"].isNull())
        criticalRuntimeThresholdMinutes = settings["critical_runtime_threshold_minutes"];

    if (!settings["demo_ups_full_drain_seconds_at_100_load"].isNull())
        demoUpsFullDrainSecondsAt100Load = settings["demo_ups_full_drain_seconds_at_100_load"];

    if (!settings["demo_battery_recovery_percent_per_second"].isNull())
        demoBatteryRecoveryPercentPerSecond = settings["demo_battery_recovery_percent_per_second"];

    if (!settings["demo_restart_battery_percent"].isNull())
        demoRestartBatteryPercent = settings["demo_restart_battery_percent"];

    Serial.println("[Runtime Config] Runtime settings updated from backend");
    printRuntimeConfig();
}

void pollBackendRuntimeSettings()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[Runtime Config] Wi-Fi disconnected, skipping settings poll");
        return;
    }

    HTTPClient http;

    String url = runtimeBackendUrl + "/devices/" + String(DEVICE_ID) + "/settings/runtime";

    Serial.print("[Runtime Config] Polling: ");
    Serial.println(url);

    http.begin(url);

    int httpResponseCode = http.GET();

    if (httpResponseCode > 0)
    {
        String response = http.getString();

        Serial.print("[Runtime Config] HTTP ");
        Serial.println(httpResponseCode);

        Serial.print("[Runtime Config] Response: ");
        Serial.println(response);

        if (httpResponseCode == 200)
        {
            JsonDocument doc;

            DeserializationError error = deserializeJson(doc, response);

            if (error)
            {
                Serial.print("[Runtime Config] JSON parse failed: ");
                Serial.println(error.c_str());

                http.end();
                return;
            }

            JsonObject settings = doc.as<JsonObject>();
            applyRuntimeSettings(settings);
        }
    }
    else
    {
        Serial.print("[Runtime Config] Request failed: ");
        Serial.println(http.errorToString(httpResponseCode));
    }

    http.end();
}