#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22
#define LED_PIN 2

const char *WIFI_SSID = "Deld";
const char *WIFI_PASSWORD = "123123124oq";

const char *DEVICE_NAME = "ServerSensei";

String deviceMode = "monitor";
bool ledState = false;

const char *DEVICE_ID = "serversensei-esp32-001";
const char *BACKEND_URL = "http://172.29.40.124:8000";

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

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
  String json = "{";
  json += "\"device\":\"" + String(DEVICE_NAME) + "\",";
  json += "\"status\":\"ok\"";
  json += "}";

  server.send(200, "application/json", json);
}

void handleSensor()
{
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature))
  {
    String json = "{";
    json += "\"error\":\"Failed to read from DHT22 sensor\"";
    json += "}";

    server.send(500, "application/json", json);
    return;
  }

  String json = "{";
  json += "\"temperature\":" + String(temperature, 1) + ",";
  json += "\"humidity\":" + String(humidity, 1);
  json += "}";

  server.send(200, "application/json", json);
}

void handleStatus()
{
  String json = "{";
  json += "\"wifi\":\"" + getWiFiStatus() + "\",";
  json += "\"mode\":\"" + deviceMode + "\",";
  json += "\"uptime\":" + String(millis()) + ",";
  json += "\"led\":\"" + String(ledState ? "on" : "off") + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

void handleNotFound()
{
  String json = "{";
  json += "\"error\":\"Endpoint not found\"";
  json += "}";

  server.send(404, "application/json", json);
}

void setupRoutes()
{
  server.on("/health", HTTP_GET, handleHealth);
  server.on("/sensor", HTTP_GET, handleSensor);
  server.on("/status", HTTP_GET, handleStatus);
  server.onNotFound(handleNotFound);
}

void reportCommandResult(int commandId, String status, String message)
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[Commands] Wi-Fi disconnected, cannot report command result");
    return;
  }

  HTTPClient http;

  String url = String(BACKEND_URL) + "/commands/" + String(commandId) + "/result";

  StaticJsonDocument<256> doc;
  doc["status"] = status;
  doc["message"] = message;

  String requestBody;
  serializeJson(doc, requestBody);

  Serial.print("[Commands] Reporting result to: ");
  Serial.println(url);

  http.begin(url);
  http.addHeader("Content-Type", "application/json");

  int httpResponseCode = http.POST(requestBody);

  if (httpResponseCode > 0)
  {
    Serial.print("[Commands] Result report HTTP ");
    Serial.println(httpResponseCode);

    Serial.print("[Commands] Result response: ");
    Serial.println(http.getString());
  }
  else
  {
    Serial.print("[Commands] Result report failed: ");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
}

bool executeCommand(JsonObject command)
{
  const char *action = command["action"];

  if (action == nullptr)
  {
    Serial.println("[Commands] Missing action");
    return false;
  }

  if (String(action) == "set_mode")
  {
    JsonObject payload = command["payload"];

    if (payload.isNull())
    {
      Serial.println("[Commands] Missing payload for set_mode");
      return false;
    }

    const char *newMode = payload["mode"];

    if (newMode == nullptr)
    {
      Serial.println("[Commands] Missing mode value");
      return false;
    }

    String modeValue = String(newMode);

    if (
        modeValue != "monitor" &&
        modeValue != "manual" &&
        modeValue != "automatic" &&
        modeValue != "safe")
    {
      Serial.print("[Commands] Invalid mode: ");
      Serial.println(modeValue);
      return false;
    }

    deviceMode = modeValue;

    Serial.print("[Commands] Device mode changed to: ");
    Serial.println(deviceMode);

    return true;
  }

  if (String(action) == "led_on")
  {
    digitalWrite(LED_PIN, HIGH);
    ledState = true;
    Serial.println("[Commands] LED turned ON");
    return true;
  }

  if (String(action) == "led_off")
  {
    digitalWrite(LED_PIN, LOW);
    ledState = false;
    Serial.println("[Commands] LED turned OFF");
    return true;
  }

  Serial.print("[Commands] Unknown action: ");
  Serial.println(action);
  return false;
}

void pollPendingCommands()
{
  if (WiFi.status() != WL_CONNECTED)
  {
    Serial.println("[Commands] Wi-Fi disconnected, skipping command polling");
    return;
  }

  HTTPClient http;

  String url = String(BACKEND_URL) + "/devices/" + String(DEVICE_ID) + "/commands/pending";

  Serial.print("[Commands] Polling: ");
  Serial.println(url);

  http.begin(url);

  int httpResponseCode = http.GET();

  if (httpResponseCode > 0)
  {
    String response = http.getString();

    Serial.print("[Commands] HTTP ");
    Serial.println(httpResponseCode);

    Serial.print("[Commands] Response: ");
    Serial.println(response);

    if (httpResponseCode == 200)
    {
      StaticJsonDocument<2048> doc;

      DeserializationError error = deserializeJson(doc, response);

      if (error)
      {
        Serial.print("[Commands] JSON parse failed: ");
        Serial.println(error.c_str());
        http.end();
        return;
      }

      JsonArray commands = doc.as<JsonArray>();

      if (commands.size() == 0)
      {
        Serial.println("[Commands] No pending commands");
      }
      else
      {
        Serial.print("[Commands] Pending command count: ");
        Serial.println(commands.size());

        for (JsonObject command : commands)
        {
          int commandId = command["id"];
          const char *action = command["action"];
          const char *status = command["status"];

          Serial.println("----- Command -----");
          Serial.print("ID: ");
          Serial.println(commandId);
          Serial.print("Action: ");
          Serial.println(action);
          Serial.print("Status: ");
          Serial.println(status);

          bool success = executeCommand(command);

          if (success)
          {
            reportCommandResult(
                commandId,
                "executed",
                "Command executed successfully");
          }
          else
          {
            reportCommandResult(
                commandId,
                "failed",
                "Command execution failed");
          }
        }
      }
    }
  }
  else
  {
    Serial.print("[Commands] Request failed: ");
    Serial.println(http.errorToString(httpResponseCode));
  }

  http.end();
}

void setup()
{
  Serial.begin(115200);
  delay(2000);

  Serial.println("==================================");
  Serial.println("ServerSensei Telemetry API");
  Serial.println("ESP32 + DHT22 + Wi-Fi");
  Serial.println("==================================");

  dht.begin();

  pinMode(LED_PIN, OUTPUT);
  digitalWrite(LED_PIN, LOW);

  connectToWiFi();
  setupRoutes();

  server.begin();

  Serial.println("HTTP server started");
  Serial.println("Available endpoints:");
  Serial.println("/health");
  Serial.println("/sensor");
  Serial.println("/status");
}

void loop()
{
  server.handleClient();

  static unsigned long lastPrint = 0;
  static unsigned long lastCommandPoll = 0;

  unsigned long now = millis();

  if (now - lastPrint >= 5000)
  {
    lastPrint = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    Serial.print("[Heartbeat] Wi-Fi: ");
    Serial.print(getWiFiStatus());

    if (isnan(humidity) || isnan(temperature))
    {
      Serial.println(" | Sensor read failed");
    }
    else
    {
      Serial.print(" | Temp: ");
      Serial.print(temperature, 1);
      Serial.print(" C | Humidity: ");
      Serial.print(humidity, 1);
      Serial.println(" %");
    }
  }

  if (now - lastCommandPoll >= 10000)
  {
    lastCommandPoll = now;
    pollPendingCommands();
  }
}