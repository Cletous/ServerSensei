#pragma once

#include <Arduino.h>

void connectToWiFi();
String getWiFiStatus();

void handleHealth();
void handleSensor();
void handleStatus();
void handleGetLocalConfig();
void handleUpdateLocalConfig();
void handleNotFound();
void setupRoutes();