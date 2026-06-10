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
#include "commands.h"
#include "telemetry.h"
#include "oled_dashboard.h"
#include "relays.h"
#include "runtime_config.h"
#include "decision_engine.h"

// Air quality monitoring
int airQualityRaw = 0;
float airQualityVoltage = 0.0;
String airQualityStatus = "unknown";

// Battery Voltage monitoring
float batteryVoltage = 0.0;
float batteryPercent = 100.0;

String deviceMode = "automatic";
String loadState = "normal";
String powerSource = "unknown";

String environmentalRisk = "normal";
String systemRecommendation = "System starting. Waiting for sensor data.";

bool greenLedState = false; // System status LED

// Cooling Fan automation
bool fanRelayState = false;

// Simulated server relay states
bool nonCriticalServerAState = true;
bool nonCriticalServerBState = true;
bool criticalServerAState = true;
bool criticalServerBState = true;

// power source states
bool gridAvailable = false;
bool generatorAvailable = false;
bool lastGridState = LOW;
bool lastGenState = LOW;

bool simulatedPowerDepleted = false;

float loadPercent = 100.0;

unsigned long lastGridDebounceTime = 0;
unsigned long lastGenDebounceTime = 0;
const unsigned long debounceDelay = 50;

String runtimeWifiSsid = "";
String runtimeWifiPassword = "";
String runtimeBackendUrl = "";

float fanOnTemperature = DEFAULT_FAN_ON_TEMPERATURE;
float fanOffTemperature = DEFAULT_FAN_OFF_TEMPERATURE;

float lowRuntimeThresholdMinutes = DEFAULT_LOW_RUNTIME_THRESHOLD_MINUTES;
float criticalRuntimeThresholdMinutes = DEFAULT_CRITICAL_RUNTIME_THRESHOLD_MINUTES;

float demoUpsFullDrainSecondsAt100Load = DEFAULT_DEMO_UPS_FULL_DRAIN_SECONDS_AT_100_LOAD;
float demoBatteryRecoveryPercentPerSecond = DEFAULT_DEMO_BATTERY_RECOVERY_PERCENT_PER_SECOND;
float demoRestartBatteryPercent = DEFAULT_DEMO_RESTART_BATTERY_PERCENT;

int runtimeSettingsVersion = 0;

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

void setup()
{
  Serial.begin(115200);
  delay(2000);

  loadLocalRuntimeConfig();
  printRuntimeConfig();

  // Simulated UPS Runtime Engine
  Serial.println("\n=== Simulated UPS Runtime Engine ===");
  Serial.println("ESP32 remains powered by USB.");
  Serial.println("Grid/Generator GPIO inputs decide power source.");
  Serial.println("UPS battery percentage is simulated in firmware.");
  Serial.println("Physical battery voltage monitoring is optional for this milestone.\n");

  Serial.println("==================================");
  Serial.println("ServerSensei");
  Serial.println("Grid + Generator + UPS Simulation");
  Serial.println("==================================");

  dht.begin();

  setupOLED();

  pinMode(GREEN_LED_PIN, OUTPUT);

  pinMode(GRID_SWITCH_PIN, INPUT);
  pinMode(GENERATOR_SWITCH_PIN, INPUT);

  pinMode(MQ135_PIN, INPUT);

  setupRelays();

  setLoadState("normal");
  readPowerSwitches();

  connectToWiFi();
  pollBackendRuntimeSettings();
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

  // Manual testing via Serial Monitor
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
    else if (cmd == "demo reset")
    {
      batteryPercent = 100;
      simulatedPowerDepleted = false;
      setLoadState("normal");
      Serial.println("Demo reset: battery 100%, load state normal, simulated power restored");
    }
    else if (cmd == "help")
    {
      Serial.println("\n=== COMMANDS ===");
      Serial.println("normal, low, critical, safe, off - Change load state");
      Serial.println("mode monitor, mode manual, mode auto - Change device mode");
      Serial.println("battery 100, battery 50, battery 20 - Set battery %");
      Serial.println("demo reset - Reset battery to 100% and load to normal");
      Serial.println("help - Show this menu");
      Serial.println("================\n");
    }
  }

  static unsigned long lastPrint = 0;
  static unsigned long lastCommandPoll = 0;
  static unsigned long lastTelemetryUpload = 0;
  static unsigned long lastPowerUpdate = 0;
  static unsigned long lastOLEDUpdate = 0;
  static unsigned long lastSettingsPoll = 0;

  unsigned long now = millis();

  static unsigned long lastPowerSwitchRead = 0;

  if (now - lastPowerSwitchRead >= 200)
  {
    lastPowerSwitchRead = now;
    readPowerSwitches();
  }

  // Important: Put the following if statement after the condition if (now - lastPowerSwitchRead >= 200) because even during simulated shutdown, the ESP32 must still keep reading the grid/generator switches
  if (simulatedPowerDepleted && powerSource == "ups")
  {
    if (now - lastOLEDUpdate >= 2000)
    {
      lastOLEDUpdate = now;
      updateOLED();
    }

    return;
  }

  if (now - lastPowerUpdate >= 5000)
  {
    lastPowerUpdate = now;
    updateBatterySimulation();
    readAirQuality();
    updateEnhancedDecisionEngine();
  }

  if (now - lastOLEDUpdate >= 2000)
  {
    lastOLEDUpdate = now;
    updateOLED();
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
    Serial.print(" | Risk: ");
    Serial.print(environmentalRisk);

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
      Serial.print("[Recommendation] ");
      Serial.println(systemRecommendation);
    }
  }

  if (now - lastCommandPoll >= 10000)
  {
    lastCommandPoll = now;
    pollPendingCommands();
  }

  if (now - lastSettingsPoll >= 10000)
  {
    lastSettingsPoll = now;
    pollBackendRuntimeSettings();
  }

  if (now - lastTelemetryUpload >= 10000)
  {
    lastTelemetryUpload = now;
    sendTelemetryToBackend();
  }
}