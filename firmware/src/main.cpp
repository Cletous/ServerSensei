#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#include "config.h"
#include "state.h"
#include "loads.h"
#include "power.h"
#include "network.h"

// Air quality monitoring
int airQualityRaw = 0;
float airQualityVoltage = 0.0;
String airQualityStatus = "unknown";

// Battery Voltage monitoring
float batteryVoltage = 0.0;
float batteryPercent = 100.0;

String deviceMode = "monitor";
String loadState = "normal";
String powerSource = "unknown";

// Simulated servers states
bool greenLedState = false;
bool yellowLed1State = false;
bool yellowLed2State = false;
bool redLed1State = false;
bool redLed2State = false;

// power source states
bool gridAvailable = false;
bool generatorAvailable = false;
bool lastGridState = LOW;
bool lastGenState = LOW;

float loadPercent = 100.0;

unsigned long lastGridDebounceTime = 0;
unsigned long lastGenDebounceTime = 0;
const unsigned long debounceDelay = 50;

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

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

  if (actionValue == "set_battery_percent")
  {
    JsonObject payload = command["payload"];

    if (payload.isNull())
    {
      Serial.println("[Commands] Missing payload for set_battery_percent");
      return false;
    }

    if (!payload.containsKey("battery_percent"))
    {
      Serial.println("[Commands] Missing battery_percent value");
      return false;
    }

    float newBatteryPercent = payload["battery_percent"];

    if (newBatteryPercent < 0 || newBatteryPercent > 100)
    {
      Serial.println("[Commands] battery_percent must be between 0 and 100");
      return false;
    }

    batteryPercent = newBatteryPercent;

    Serial.print("[Commands] Battery percent set to: ");
    Serial.println(batteryPercent);

    return true;
  }

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

  StaticJsonDocument<768> doc;

  doc["device_id"] = DEVICE_ID;
  doc["temperature"] = temperature;
  doc["humidity"] = humidity;
  doc["wifi"] = getWiFiStatus();
  doc["mode"] = deviceMode;
  doc["uptime"] = millis();

  doc["power_source"] = powerSource;
  doc["battery_percent"] = batteryPercent;
  doc["load_percent"] = loadPercent;

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

  // Calibration check for voltage sensor
  Serial.println("\n=== Voltage Sensor Calibration ===");
  float testVoltage = readBatteryVoltage();
  Serial.print("Raw battery voltage: ");
  Serial.print(testVoltage, 3);
  Serial.println(" V");
  Serial.print("Calculated percentage: ");
  Serial.println(voltageToBatteryPercent(testVoltage), 1);
  Serial.println("Compare with multimeter reading at TP4056 B+.");
  Serial.println("If difference >0.1V, adjust VOLTAGE_DIVIDER_RATIO.\n");

  Serial.println("==================================");
  Serial.println("ServerSensei");
  Serial.println("Grid + Generator + UPS Simulation");
  Serial.println("==================================");

  dht.begin();

  pinMode(GREEN_LED_PIN, OUTPUT);
  pinMode(YELLOW_LED_1_PIN, OUTPUT);
  pinMode(YELLOW_LED_2_PIN, OUTPUT);
  pinMode(RED_LED_1_PIN, OUTPUT);
  pinMode(RED_LED_2_PIN, OUTPUT);

  pinMode(GRID_SWITCH_PIN, INPUT);
  pinMode(GENERATOR_SWITCH_PIN, INPUT);

  pinMode(MQ135_PIN, INPUT);

  testAllLEDs();

  setLoadState("normal");
  readPowerSwitches();

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

  // Add this inside loop() for manual testing via Serial Monitor
  static String lastCommand = "";
  if (Serial.available())
  {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toLowerCase();

    if (cmd == "normal")
    {
      setLoadState("normal");
      Serial.println("→ Load state: NORMAL - all LEDs ON");
    }
    else if (cmd == "low")
    {
      setLoadState("low_runtime");
      Serial.println("→ Load state: LOW RUNTIME - only red LEDs ON");
    }
    else if (cmd == "critical")
    {
      setLoadState("critical_runtime");
      Serial.println("→ Load state: CRITICAL RUNTIME - only red LED 1 ON");
    }
    else if (cmd == "safe")
    {
      setLoadState("safe");
      Serial.println("→ Load state: SAFE - only red LED 1 ON");
    }
    else if (cmd == "off")
    {
      setLoadState("all_off");
      Serial.println("→ Load state: ALL OFF - all LEDs OFF");
    }
    else if (cmd == "mode monitor")
    {
      deviceMode = "monitor";
      Serial.println("→ Mode: MONITOR - read-only");
    }
    else if (cmd == "mode manual")
    {
      deviceMode = "manual";
      Serial.println("→ Mode: MANUAL - can manually change load");
    }
    else if (cmd == "mode auto")
    {
      deviceMode = "automatic";
      Serial.println("→ Mode: AUTOMATIC - system controls load");
    }
    else if (cmd == "battery 100")
    {
      batteryPercent = 100;
      Serial.println("→ Battery set to 100%");
    }
    else if (cmd == "battery 50")
    {
      batteryPercent = 50;
      Serial.println("→ Battery set to 50%");
    }
    else if (cmd == "battery 20")
    {
      batteryPercent = 20;
      Serial.println("→ Battery set to 20%");
    }
    else if (cmd == "help")
    {
      Serial.println("\n=== COMMANDS ===");
      Serial.println("normal, low, critical, safe, off - Change load state");
      Serial.println("mode monitor, mode manual, mode auto - Change device mode");
      Serial.println("battery 100, battery 50, battery 20 - Set battery %");
      Serial.println("help - Show this menu");
      Serial.println("================\n");
    }
  }

  static unsigned long lastPrint = 0;
  static unsigned long lastCommandPoll = 0;
  static unsigned long lastTelemetryUpload = 0;
  static unsigned long lastPowerUpdate = 0;

  unsigned long now = millis();

  static unsigned long lastPowerSwitchRead = 0;

  if (now - lastPowerSwitchRead >= 200)
  {
    lastPowerSwitchRead = now;
    readPowerSwitches();
  }

  if (now - lastPowerUpdate >= 5000)
  {
    lastPowerUpdate = now;
    updateBatterySimulation();
    readAirQuality();
  }

  if (now - lastPrint >= 5000)
  {
    lastPrint = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    float runtime = estimateRuntimeMinutes();

    Serial.print("[Heartbeat] Wi-Fi: ");
    Serial.print(getWiFiStatus());
    Serial.print(" | Mode: ");
    Serial.print(deviceMode);
    Serial.print(" | Power: ");
    Serial.print(powerSource);
    Serial.print(" | Grid: ");
    Serial.print(gridAvailable ? "ON" : "OFF");
    Serial.print(" | Generator: ");
    Serial.print(generatorAvailable ? "ON" : "OFF");
    Serial.print(" | Battery: ");
    Serial.print(batteryPercent, 1);
    Serial.print("%");
    Serial.print(" | Load: ");
    Serial.print(loadPercent, 1);
    Serial.print("%");
    Serial.print(" | Load state: ");
    Serial.print(loadState);

    if (runtime > 0)
    {
      Serial.print(" | Runtime: ");
      Serial.print(runtime, 1);
      Serial.print(" min");
    }

    if (isnan(humidity) || isnan(temperature) || isnan(airQualityRaw))
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
      Serial.print(" | Air: ");
      Serial.print(airQualityRaw);
      Serial.print(" ");
      Serial.println(airQualityStatus);
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