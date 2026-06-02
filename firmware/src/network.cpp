#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <ArduinoJson.h>

#include "config.h"
#include "state.h"
#include "power.h"
#include "network.h"

void connectToWiFi()
{
    Serial.print("Connecting to Wi-Fi");

    WiFi.mode(WIFI_STA);
    WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

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

    JsonObject leds = doc["leds"].to<JsonObject>();
    leds["green_system_healthy"] = greenLedState;
    leds["yellow_non_critical_a"] = yellowLed1State;
    leds["yellow_non_critical_b"] = yellowLed2State;
    leds["red_critical_a"] = redLed1State;
    leds["red_critical_b"] = redLed2State;

    String response;
    serializeJson(doc, response);

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
    server.onNotFound(handleNotFound);
}