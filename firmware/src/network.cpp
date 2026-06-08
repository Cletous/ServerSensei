#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

#include "config.h"
#include "state.h"
#include "power.h"
#include "network.h"
#include "runtime_config.h"

void connectToWiFi()
{
    Serial.print("Connecting to Wi-Fi");

    WiFi.mode(WIFI_STA);
    WiFi.begin(runtimeWifiSsid.c_str(), runtimeWifiPassword.c_str());

    int attempts = 0;

    while (WiFi.status() != WL_CONNECTED && attempts < 30)
    {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    Serial.println();

    if (WiFi.status() == WL_CONNECTED)
    {
        Serial.println("Wi-Fi connected successfully");
        Serial.print("ESP32 IP Address: ");
        Serial.println(WiFi.localIP());
    }
    else
    {
        Serial.println("Failed to connect to Wi-Fi");
    }
}

String getWiFiStatus()
{
    return WiFi.status() == WL_CONNECTED ? "connected" : "disconnected";
}

void handleHealth()
{
    JsonDocument doc;

    doc["device"] = DEVICE_NAME;
    doc["device_id"] = DEVICE_ID;
    doc["status"] = "ok";

    String response;
    serializeJson(doc, response);

    server.send(200, "application/json", response);
}

void handleSensor()
{
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    JsonDocument doc;

    if (isnan(humidity) || isnan(temperature))
    {
        doc["error"] = "Failed to read from DHT22 sensor";

        String response;
        serializeJson(doc, response);

        server.send(500, "application/json", response);
        return;
    }

    doc["temperature"] = temperature;
    doc["humidity"] = humidity;

    String response;
    serializeJson(doc, response);

    server.send(200, "application/json", response);
}

void handleStatus()
{
    JsonDocument doc;

    doc["device_id"] = DEVICE_ID;
    doc["device_name"] = DEVICE_NAME;
    doc["wifi"] = getWiFiStatus();
    doc["mode"] = deviceMode;
    doc["load_state"] = loadState;
    doc["power_source"] = powerSource;
    doc["grid_available"] = gridAvailable;
    doc["generator_available"] = generatorAvailable;
    doc["battery_percent"] = batteryPercent;
    doc["load_percent"] = loadPercent;
    doc["uptime"] = millis();

    float runtime = estimateRuntimeMinutes();

    if (runtime > 0)
        doc["estimated_runtime_minutes"] = runtime;
    else
        doc["estimated_runtime_minutes"] = nullptr;

    doc["system_status_led"] = greenLedState;

    JsonObject relayLoads = doc["relay_loads"].to<JsonObject>();
    relayLoads["fan"] = fanRelayState;
    relayLoads["non_critical_a"] = loadState == "normal";
    relayLoads["non_critical_b"] = loadState == "normal";
    relayLoads["critical_a"] = (loadState == "normal" ||
                                loadState == "low_runtime" ||
                                loadState == "critical_runtime" ||
                                loadState == "safe");
    relayLoads["critical_b"] = (loadState == "normal" ||
                                loadState == "low_runtime");

    String response;
    serializeJson(doc, response);

    server.send(200, "application/json", response);
}

bool requireConfigLogin()
{
    if (!server.authenticate(CONFIG_PAGE_USERNAME, CONFIG_PAGE_PASSWORD))
    {
        server.requestAuthentication();
        return false;
    }

    return true;
}

void handleGetLocalConfig()
{
    if (!requireConfigLogin())
        return;

    String html = "";

    html += "<!DOCTYPE html>";
    html += "<html>";
    html += "<head>";
    html += "<title>ServerSensei Config</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>";
    html += "body{font-family:Arial;background:#f2f2f2;margin:0;padding:20px;}";
    html += ".card{max-width:480px;margin:auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);}";
    html += "h2{margin-top:0;color:#222;}";
    html += "label{font-weight:bold;display:block;margin-top:14px;}";
    html += "input{width:100%;padding:10px;margin-top:6px;box-sizing:border-box;}";
    html += "button{width:100%;padding:12px;margin-top:20px;background:#222;color:white;border:0;border-radius:6px;font-size:16px;}";
    html += ".note{font-size:13px;color:#555;margin-top:15px;}";
    html += ".value{background:#eee;padding:10px;border-radius:6px;margin-top:6px;}";
    html += "</style>";
    html += "</head>";
    html += "<body>";
    html += "<div class='card'>";
    html += "<h2>ServerSensei ESP32 Config</h2>";

    html += "<p><b>Device ID:</b></p>";
    html += "<div class='value'>";
    html += DEVICE_ID;
    html += "</div>";

    html += "<form method='POST' action='/config'>";

    html += "<label>WiFi SSID</label>";
    html += "<input name='wifi_ssid' value='";
    html += runtimeWifiSsid;
    html += "' required>";

    html += "<label>WiFi Password</label>";
    html += "<input name='wifi_password' type='password' placeholder='Leave blank to keep current password'>";

    html += "<label>Backend URL</label>";
    html += "<input name='backend_url' value='";
    html += runtimeBackendUrl;
    html += "' required>";

    html += "<button type='submit'>Save Configuration</button>";
    html += "</form>";

    html += "<p class='note'>";
    html += "After changing WiFi or Backend URL, restart the ESP32. ";
    html += "Runtime thresholds such as fan temperature and UPS settings are managed from the backend.";
    html += "</p>";

    html += "<hr>";

    html += "<p><b>Current Runtime Settings</b></p>";

    html += "<p>Fan ON Temperature: ";
    html += String(fanOnTemperature);
    html += " C</p>";

    html += "<p>Fan OFF Temperature: ";
    html += String(fanOffTemperature);
    html += " C</p>";

    html += "<p>Low Runtime Threshold: ";
    html += String(lowRuntimeThresholdMinutes);
    html += " min</p>";

    html += "<p>Critical Runtime Threshold: ";
    html += String(criticalRuntimeThresholdMinutes);
    html += " min</p>";

    html += "<p>Settings Version: ";
    html += String(runtimeSettingsVersion);
    html += "</p>";

    html += "</div>";
    html += "</body>";
    html += "</html>";

    server.send(200, "text/html", html);
}

void handleUpdateLocalConfig()
{
    if (!requireConfigLogin())
        return;

    String ssid = server.arg("wifi_ssid");
    String password = server.arg("wifi_password");
    String backendUrl = server.arg("backend_url");

    if (ssid.length() > 0)
    {
        if (password.length() > 0)
        {
            saveWiFiRuntimeConfig(ssid, password);
        }
        else
        {
            saveWiFiRuntimeConfig(ssid, runtimeWifiPassword);
        }
    }

    if (backendUrl.length() > 0)
    {
        saveBackendUrlRuntimeConfig(backendUrl);
    }

    String html = "";

    html += "<!DOCTYPE html>";
    html += "<html>";
    html += "<head>";
    html += "<title>ServerSensei Config Saved</title>";
    html += "<meta name='viewport' content='width=device-width, initial-scale=1'>";
    html += "<style>";
    html += "body{font-family:Arial;background:#f2f2f2;margin:0;padding:20px;}";
    html += ".card{max-width:480px;margin:auto;background:white;padding:20px;border-radius:10px;box-shadow:0 2px 8px rgba(0,0,0,0.2);}";
    html += "a{display:block;margin-top:20px;}";
    html += "</style>";
    html += "</head>";
    html += "<body>";
    html += "<div class='card'>";
    html += "<h2>Configuration Saved</h2>";
    html += "<p>The ESP32 local configuration has been saved to Preferences/NVS.</p>";
    html += "<p><b>Restart the ESP32</b> if you changed WiFi or Backend URL.</p>";
    html += "<p><b>WiFi SSID:</b> ";
    html += runtimeWifiSsid;
    html += "</p>";
    html += "<p><b>Backend URL:</b> ";
    html += runtimeBackendUrl;
    html += "</p>";
    html += "<a href='/config'>Back to Config Page</a>";
    html += "</div>";
    html += "</body>";
    html += "</html>";

    server.send(200, "text/html", html);
}

void handleNotFound()
{
    JsonDocument doc;
    doc["error"] = "Endpoint not found";

    String response;
    serializeJson(doc, response);

    server.send(404, "application/json", response);
}

void setupRoutes()
{
    server.on("/health", HTTP_GET, handleHealth);
    server.on("/sensor", HTTP_GET, handleSensor);
    server.on("/status", HTTP_GET, handleStatus);

    server.on("/config", HTTP_GET, handleGetLocalConfig);
    server.on("/config", HTTP_POST, handleUpdateLocalConfig);

    server.onNotFound(handleNotFound);
}