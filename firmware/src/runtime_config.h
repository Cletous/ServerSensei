#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

void loadLocalRuntimeConfig();
void saveWiFiRuntimeConfig(String ssid, String password);
void saveBackendUrlRuntimeConfig(String backendUrl);
void printRuntimeConfig();

void applyRuntimeSettings(JsonObject settings);
void pollBackendRuntimeSettings();