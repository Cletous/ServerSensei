#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

// Milestone 19 LED Server Simulation Pins
#define GREEN_LED_PIN 23
#define YELLOW_LED_1_PIN 19
#define YELLOW_LED_2_PIN 18
#define RED_LED_1_PIN 17
#define RED_LED_2_PIN 16

const char *WIFI_SSID = "Deld";
const char *WIFI_PASSWORD = "123123124oq";

const char *DEVICE_NAME = "ServerSensei";
const char *DEVICE_ID = "serversensei-esp32-001";
const char *BACKEND_URL = "http://172.29.40.124:8000";

String deviceMode = "monitor";
String loadState = "normal";

bool greenLedState = false;
bool yellowLed1State = false;
bool yellowLed2State = false;
bool redLed1State = false;
bool redLed2State = false;

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

void applyLEDStates()
{
  digitalWrite(GREEN_LED_PIN, greenLedState ? HIGH : LOW);
  digitalWrite(YELLOW_LED_1_PIN, yellowLed1State ? HIGH : LOW);
  digitalWrite(YELLOW_LED_2_PIN, yellowLed2State ? HIGH : LOW);
  digitalWrite(RED_LED_1_PIN, redLed1State ? HIGH : LOW);
  digitalWrite(RED_LED_2_PIN, redLed2State ? HIGH : LOW);
}

void setLoadState(String newState)
{
  loadState = newState;

  if (newState == "normal")
  {
    greenLedState = true;
    yellowLed1State = true;
    yellowLed2State = true;
    redLed1State = true;
    redLed2State = true;

    Serial.println("[Load] Normal state: all simulated servers powered");
  }
  else if (newState == "low_runtime")
  {
    greenLedState = false;
    yellowLed1State = false;
    yellowLed2State = false;
    redLed1State = true;
    redLed2State = true;

    Serial.println("[Load] Low runtime: non-critical servers load shed");
  }
  else if (newState == "critical_runtime")
  {
    greenLedState = false;
    yellowLed1State = false;
    yellowLed2State = false;
    redLed1State = true;
    redLed2State = false;

    Serial.println("[Load] Critical runtime: only primary critical server active");
  }
  else if (newState == "safe")
  {
    greenLedState = false;
    yellowLed1State = false;
    yellowLed2State = false;
    redLed1State = true;
    redLed2State = false;

    Serial.println("[Load] Safe mode: emergency critical-only operation");
  }
  else if (newState == "all_off")
  {
    greenLedState = false;
    yellowLed1State = false;
    yellowLed2State = false;
    redLed1State = false;
    redLed2State = false;

    Serial.println("[Load] All simulated loads OFF");
  }
  else
  {
    Serial.print("[Load] Unknown load state: ");
    Serial.println(newState);
    return;
  }

  applyLEDStates();
}

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
  StaticJsonDocument<256> doc;

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

  StaticJsonDocument<256> doc;

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
  StaticJsonDocument<512> doc;

  doc["device_id"] = DEVICE_ID;
  doc["device_name"] = DEVICE_NAME;
  doc["wifi"] = getWiFiStatus();
  doc["mode"] = deviceMode;
  doc["load_state"] = loadState;
  doc["uptime"] = millis();

  JsonObject leds = doc.createNestedObject("leds");
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
  StaticJsonDocument<128> doc;
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

bool isValidMode(String modeValue)
{
  return (
      modeValue == "monitor" ||
      modeValue == "manual" ||
      modeValue == "automatic" ||
      modeValue == "safe");
}

bool isValidLoadState(String stateValue)
{
  return (
      stateValue == "normal" ||
      stateValue == "low_runtime" ||
      stateValue == "critical_runtime" ||
      stateValue == "safe" ||
      stateValue == "all_off");
}

bool executeCommand(JsonObject command)
{
  const char *action = command["action"];

  if (action == nullptr)
  {
    Serial.println("[Commands] Missing action");
    return false;
  }

  String actionValue = String(action);

  if (actionValue == "set_mode")
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

    if (!isValidMode(modeValue))
    {
      Serial.print("[Commands] Invalid mode: ");
      Serial.println(modeValue);
      return false;
    }

    deviceMode = modeValue;

    if (deviceMode == "safe")
    {
      setLoadState("safe");
    }

    Serial.print("[Commands] Device mode changed to: ");
    Serial.println(deviceMode);

    return true;
  }

  if (actionValue == "set_load_state")
  {
    JsonObject payload = command["payload"];

    if (payload.isNull())
    {
      Serial.println("[Commands] Missing payload for set_load_state");
      return false;
    }

    const char *newState = payload["state"];

    if (newState == nullptr)
    {
      Serial.println("[Commands] Missing state value");
      return false;
    }

    String stateValue = String(newState);

    if (!isValidLoadState(stateValue))
    {
      Serial.print("[Commands] Invalid load state: ");
      Serial.println(stateValue);
      return false;
    }

    if (deviceMode == "monitor")
    {
      Serial.println("[Commands] Load state rejected: device is in monitor mode");
      return false;
    }

    setLoadState(stateValue);

    Serial.print("[Commands] Load state changed to: ");
    Serial.println(loadState);

    return true;
  }

  // Legacy compatibility from the previous milestone.
  // In manual mode, led_on means "normal visual state".
  if (actionValue == "led_on")
  {
    if (deviceMode != "manual")
    {
      Serial.println("[Commands] LED command rejected: device is not in manual mode");
      return false;
    }

    setLoadState("normal");
    Serial.println("[Commands] Legacy led_on mapped to normal load state");
    return true;
  }

  // Legacy compatibility from the previous milestone.
  // In manual mode, led_off means "all simulated loads off".
  if (actionValue == "led_off")
  {
    if (deviceMode != "manual")
    {
      Serial.println("[Commands] LED command rejected: device is not in manual mode");
      return false;
    }

    setLoadState("all_off");
    Serial.println("[Commands] Legacy led_off mapped to all_off load state");
    return true;
  }

  Serial.print("[Commands] Unknown action: ");
  Serial.println(actionValue);

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
          const char *commandAction = command["action"];
          const char *commandStatus = command["status"];

          Serial.println("----- Command -----");
          Serial.print("ID: ");
          Serial.println(commandId);
          Serial.print("Action: ");
          Serial.println(commandAction);
          Serial.print("Status: ");
          Serial.println(commandStatus);

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

  String url = String(BACKEND_URL) + "/telemetry";

  StaticJsonDocument<512> doc;

  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["wifi"] = getWiFiStatus();
  doc["mode"] = deviceMode;
  doc["uptime"] = millis();

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

void setup()
{
  Serial.begin(115200);
  delay(2000);

  Serial.println("==================================");
  Serial.println("ServerSensei Milestone 19");
  Serial.println("LED-Based Server Load Simulation");
  Serial.println("==================================");

  dht.begin();

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_1_PIN, OUTPUT);
  pinMode(YELLOW_LED_2_PIN, OUTPUT);
  pinMode(RED_LED_1_PIN, OUTPUT);
  pinMode(RED_LED_2_PIN, OUTPUT);

  setLoadState("normal");

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
  static unsigned long lastTelemetryUpload = 0;

  unsigned long now = millis();

  if (now - lastPrint >= 5000)
  {
    lastPrint = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    Serial.print("[Heartbeat] Wi-Fi: ");
    Serial.print(getWiFiStatus());
    Serial.print(" | Mode: ");
    Serial.print(deviceMode);
    Serial.print(" | Load state: ");
    Serial.print(loadState);

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

  if (now - lastTelemetryUpload >= 10000)
  {
    lastTelemetryUpload = now;
    sendTelemetryToBackend();
  }
}