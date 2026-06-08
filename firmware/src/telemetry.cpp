#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"
#include "state.h"
#include "network.h"
#include "telemetry.h"
#include "runtime_config.h"

void sendTelemetryToBackend()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[Telemetry] Wi-Fi disconnected, skipping upload");
        return;
    }

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature))
    {
        Serial.println("[Telemetry] Sensor read failed, skipping upload");
        return;
    }

    HTTPClient http;

    String url = runtimeBackendUrl + "/telemetry";

    JsonDocument doc;

    doc["device_id"] = DEVICE_ID;
    doc["temperature"] = temperature;
    doc["humidity"] = humidity;
    doc["wifi"] = getWiFiStatus();
    doc["mode"] = deviceMode;
    doc["uptime"] = millis();

    doc["power_source"] = powerSource;
    doc["battery_percent"] = batteryPercent;
    doc["load_percent"] = loadPercent;

    // MQ135 air quality values
    doc["air_quality_raw"] = airQualityRaw;
    doc["air_quality_status"] = airQualityStatus;

    // Enhanced decision engine values
    doc["environmental_risk"] = environmentalRisk;
    doc["system_recommendation"] = systemRecommendation;

    String requestBody;
    serializeJson(doc, requestBody);

    Serial.print("[Telemetry] Sending to: ");
    Serial.println(url);
    Serial.print("[Telemetry] Body: ");
    Serial.println(requestBody);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0)
    {
        Serial.print("[Telemetry] HTTP ");
        Serial.println(httpResponseCode);

        Serial.print("[Telemetry] Response: ");
        Serial.println(http.getString());
    }
    else
    {
        Serial.print("[Telemetry] Upload failed: ");
        Serial.println(http.errorToString(httpResponseCode));
    }

    http.end();
}