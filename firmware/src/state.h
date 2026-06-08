#pragma once

#include <Arduino.h>
#include <WebServer.h>
#include <DHT.h>
#include "config.h"

extern String deviceMode;
extern String loadState;
extern String powerSource;

extern bool greenLedState;

extern bool fanRelayState;

extern bool gridAvailable;
extern bool generatorAvailable;
extern bool simulatedPowerDepleted;

extern float loadPercent;
extern float batteryVoltage;
extern float batteryPercent;

extern int airQualityRaw;
extern float airQualityVoltage;
extern String airQualityStatus;

extern unsigned long lastGridDebounceTime;
extern unsigned long lastGenDebounceTime;
extern const unsigned long debounceDelay;

extern bool lastGridState;
extern bool lastGenState;

extern DHT dht;
extern WebServer server;

// Runtime variables
extern String runtimeWifiSsid;
extern String runtimeWifiPassword;
extern String runtimeBackendUrl;

extern float fanOnTemperature;
extern float fanOffTemperature;

extern float lowRuntimeThresholdMinutes;
extern float criticalRuntimeThresholdMinutes;

extern float demoUpsFullDrainSecondsAt100Load;
extern float demoBatteryRecoveryPercentPerSecond;
extern float demoRestartBatteryPercent;

extern int runtimeSettingsVersion;