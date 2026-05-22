#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

// LED Server Simulation Pins
#define GREEN_LED_PIN 23
#define YELLOW_LED_1_PIN 19
#define YELLOW_LED_2_PIN 18
#define RED_LED_1_PIN 17
#define RED_LED_2_PIN 16

// Power Source Simulation Pins
#define GRID_SWITCH_PIN 33
#define GENERATOR_SWITCH_PIN 34

// Battery Voltage monitoring
#define VOLTAGE_SENSOR_PIN 36
float batteryVoltage = 0.0;
float batteryPercent = 100.0;

// Voltage sensor calibration
const float VOLTAGE_DIVIDER_RATIO = 8.21; // changed to align with with multimeter reading
const float ADC_REFERENCE_VOLTAGE = 3.3;  // ESP32 ADC reference
const int ADC_MAX = 4095;                 // 12‑bit ADC

const char *WIFI_SSID = "Deld";
const char *WIFI_PASSWORD = "123123124oq";

const char *DEVICE_NAME = "ServerSensei";
const char *DEVICE_ID = "serversensei-esp32-001";
const char *BACKEND_URL = "http://10.215.37.124:8000";

String deviceMode = "monitor";
String loadState = "normal";
String powerSource = "unknown";

bool greenLedState = false;
bool yellowLed1State = false;
bool yellowLed2State = false;
bool redLed1State = false;
bool redLed2State = false;

bool gridAvailable = false;
bool generatorAvailable = false;

float loadPercent = 100.0;

unsigned long lastGridDebounceTime = 0;
unsigned long lastGenDebounceTime = 0;
const unsigned long debounceDelay = 50;

bool lastGridState = LOW;
bool lastGenState = LOW;

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

void updateLoadPercent()
{
  if (loadState == "normal")
  {
    loadPercent = 100.0;
  }
  else if (loadState == "low_runtime")
  {
    loadPercent = 60.0;
  }
  else if (loadState == "critical_runtime")
  {
    loadPercent = 35.0;
  }
  else if (loadState == "safe")
  {
    loadPercent = 30.0;
  }
  else if (loadState == "all_off")
  {
    loadPercent = 0.0;
  }
  else
  {
    loadPercent = 100.0;
  }
}

float estimateRuntimeMinutes()
{
  if (powerSource != "ups")
  {
    return -1;
  }

  if (batteryPercent <= 0 || loadPercent <= 0)
  {
    return -1;
  }

  return (batteryPercent / loadPercent) * 60.0;
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

  updateLoadPercent();
  applyLEDStates();
}

void readPowerSwitches()
{
  bool currentGridState = digitalRead(GRID_SWITCH_PIN);
  bool currentGenState = digitalRead(GENERATOR_SWITCH_PIN);

  // Debounce Grid button
  if (currentGridState != lastGridState)
  {
    lastGridDebounceTime = millis();
  }

  if ((millis() - lastGridDebounceTime) > debounceDelay)
  {
    if (currentGridState != gridAvailable)
    {
      gridAvailable = currentGridState;
      Serial.print("[Power] Grid state changed to: ");
      Serial.println(gridAvailable ? "AVAILABLE" : "UNAVAILABLE");
    }
  }

  // Debounce Generator button
  if (currentGenState != lastGenState)
  {
    lastGenDebounceTime = millis();
  }

  if ((millis() - lastGenDebounceTime) > debounceDelay)
  {
    if (currentGenState != generatorAvailable)
    {
      generatorAvailable = currentGenState;
      Serial.print("[Power] Generator state changed to: ");
      Serial.println(generatorAvailable ? "AVAILABLE" : "UNAVAILABLE");
    }
  }

  lastGridState = currentGridState;
  lastGenState = currentGenState;

  String previousPowerSource = powerSource;

  if (gridAvailable)
  {
    powerSource = "grid";
  }
  else if (generatorAvailable)
  {
    powerSource = "generator";
  }
  else
  {
    powerSource = "ups";
  }

  if (previousPowerSource != powerSource)
  {
    Serial.print("[Power] Source changed from ");
    Serial.print(previousPowerSource);
    Serial.print(" to ");
    Serial.println(powerSource);
  }
}

float readBatteryVoltage()
{
  const int numSamples = 50;
  long sum = 0;
  for (int i = 0; i < numSamples; i++)
  {
    sum += analogRead(VOLTAGE_SENSOR_PIN);
    delay(2); // slightly longer delay
  }
  int rawADC = sum / numSamples;

  // Exponential moving average (smooths sudden changes)
  static float filteredADC = -1;
  const float alpha = 0.3; // 0-1, higher = more filtering
  if (filteredADC < 0)
    filteredADC = rawADC;
  filteredADC = alpha * rawADC + (1 - alpha) * filteredADC;

  float sensorOutputVoltage = (filteredADC / (float)ADC_MAX) * ADC_REFERENCE_VOLTAGE;

  static int debugCounter = 0;
  if (++debugCounter >= 10)
  {
    debugCounter = 0;
    Serial.print("DEBUG: rawADC = ");
    Serial.print(rawADC);
    Serial.print(" | filteredADC = ");
    Serial.print(filteredADC, 0);
    Serial.print(" | sensorOutputVoltage = ");
    Serial.print(sensorOutputVoltage, 3);
    Serial.println(" V");
  }

  float batteryV = sensorOutputVoltage * VOLTAGE_DIVIDER_RATIO;
  return batteryV;
}

float voltageToBatteryPercent(float voltage)
{
  if (voltage >= 4.20)
    return 100.0;
  if (voltage >= 4.10)
    return 90.0 + (voltage - 4.10) * 100.0;
  if (voltage >= 4.00)
    return 80.0 + (voltage - 4.00) * 100.0;
  if (voltage >= 3.90)
    return 60.0 + (voltage - 3.90) * 200.0;
  if (voltage >= 3.80)
    return 40.0 + (voltage - 3.80) * 200.0;
  if (voltage >= 3.70)
    return 20.0 + (voltage - 3.70) * 200.0;
  if (voltage >= 3.60)
    return 10.0 + (voltage - 3.60) * 100.0;
  if (voltage >= 3.50)
    return 5.0 + (voltage - 3.50) * 50.0;
  if (voltage >= 3.30)
    return (voltage - 3.30) * 25.0; // 0‑5% between 3.3V and 3.5V
  return 0.0;
}

void applyAutomaticPowerDecision()
{
  if (deviceMode != "automatic")
  {
    return;
  }

  if (powerSource == "grid" || powerSource == "generator")
  {
    if (loadState != "normal")
    {
      setLoadState("normal");
    }

    return;
  }

  if (powerSource == "ups")
  {
    float runtime = estimateRuntimeMinutes();

    if (runtime > 0 && runtime <= 10.0)
    {
      if (loadState != "critical_runtime")
      {
        Serial.println("[Decision] Critical UPS runtime detected");
        setLoadState("critical_runtime");
      }
    }
    else if (runtime > 0 && runtime <= 20.0)
    {
      if (loadState != "low_runtime")
      {
        Serial.println("[Decision] Low UPS runtime detected");
        setLoadState("low_runtime");
      }
    }
  }
}

void updateBatterySimulation()
{
  // Read actual battery voltage from sensor
  batteryVoltage = readBatteryVoltage();

  // Convert voltage to percentage using the mapping
  batteryPercent = voltageToBatteryPercent(batteryVoltage);

  // Clamp to 0-100% just in case
  if (batteryPercent < 0)
    batteryPercent = 0;
  if (batteryPercent > 100)
    batteryPercent = 100;

  // Update load percent based on current load state
  updateLoadPercent();

  // Re‑evaluate automatic decisions (if in automatic mode)
  applyAutomaticPowerDecision();
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
  StaticJsonDocument<768> doc;

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
  {
    doc["estimated_runtime_minutes"] = runtime;
  }
  else
  {
    doc["estimated_runtime_minutes"] = nullptr;
  }

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

// Test each LED one by one
void testAllLEDs()
{
  // All OFF first
  digitalWrite(GREEN_LED_PIN, LOW);
  digitalWrite(YELLOW_LED_1_PIN, LOW);
  digitalWrite(YELLOW_LED_2_PIN, LOW);
  digitalWrite(RED_LED_1_PIN, LOW);
  digitalWrite(RED_LED_2_PIN, LOW);
  delay(1000);

  // Turn each one ON for 1 second
  Serial.println("Testing Green LED (GPIO23)");
  digitalWrite(GREEN_LED_PIN, HIGH);
  delay(1000);
  digitalWrite(GREEN_LED_PIN, LOW);

  Serial.println("Testing Yellow LED 1 (GPIO19)");
  digitalWrite(YELLOW_LED_1_PIN, HIGH);
  delay(1000);
  digitalWrite(YELLOW_LED_1_PIN, LOW);

  Serial.println("Testing Yellow LED 2 (GPIO18)");
  digitalWrite(YELLOW_LED_2_PIN, HIGH);
  delay(1000);
  digitalWrite(YELLOW_LED_2_PIN, LOW);

  Serial.println("Testing Red LED 1 (GPIO17)");
  digitalWrite(RED_LED_1_PIN, HIGH);
  delay(1000);
  digitalWrite(RED_LED_1_PIN, LOW);

  Serial.println("Testing Red LED 2 (GPIO16)");
  digitalWrite(RED_LED_2_PIN, HIGH);
  delay(1000);
  digitalWrite(RED_LED_2_PIN, LOW);

  Serial.println("LED test complete!");
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

  pinMode(GRID_SWITCH_PIN, INPUT_PULLDOWN);
  pinMode(GENERATOR_SWITCH_PIN, INPUT_PULLDOWN);

  // temporary code block
  Serial.println("=== BUTTON DEBUG ===");
  Serial.print("Grid button initial reading: ");
  Serial.println(digitalRead(GRID_SWITCH_PIN));
  Serial.print("Generator button initial reading: ");
  Serial.println(digitalRead(GENERATOR_SWITCH_PIN));
  Serial.println("===================");

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

  if (now - lastPowerUpdate >= 5000)
  {
    lastPowerUpdate = now;
    updateBatterySimulation();
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