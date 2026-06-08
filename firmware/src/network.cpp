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

void handleGetLocalConfig()
{
    JsonDocument doc;

    doc["device_id"] = DEVICE_ID;
    doc["wifi_ssid"] = runtimeWifiSsid;
    doc["backend_url"] = runtimeBackendUrl;

    doc["fan_on_temperature"] = fanOnTemperature;
    doc["fan_off_temperature"] = fanOffTemperature;
    doc["low_runtime_threshold_minutes"] = lowRuntimeThresholdMinutes;
    doc["critical_runtime_threshold_minutes"] = criticalRuntimeThresholdMinutes;
    doc["settings_version"] = runtimeSettingsVersion;

    String response;
    serializeJson(doc, response);

    server.send(200, "application/json", response);
}

void handleUpdateLocalConfig()
{
    if (!server.hasArg("plain"))
    {
        server.send(400, "application/json", "{\"error\":\"Missing JSON body\"}");
        return;
    }

    String body = server.arg("plain");

    JsonDocument doc;
    DeserializationError error = deserializeJson(doc, body);

    if (error)
    {
        server.send(400, "application/json", "{\"error\":\"Invalid JSON\"}");
        return;
    }

    if (!doc["wifi_ssid"].isNull() && !doc["wifi_password"].isNull())
    {
        String ssid = doc["wifi_ssid"].as<String>();
        String password = doc["wifi_password"].as<String>();

        saveWiFiRuntimeConfig(ssid, password);
    }

    if (!doc["backend_url"].isNull())
    {
        String backendUrl = doc["backend_url"].as<String>();
        saveBackendUrlRuntimeConfig(backendUrl);
    }

    JsonDocument responseDoc;

    responseDoc["message"] = "Local runtime config saved. Restart ESP32 to reconnect with new Wi-Fi/backend settings.";
    responseDoc["wifi_ssid"] = runtimeWifiSsid;
    responseDoc["backend_url"] = runtimeBackendUrl;

    String response;
    serializeJson(responseDoc, response);

    server.send(200, "application/json", response);
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