#pragma once

#include <Arduino.h>

void connectToWiFi();
String getWiFiStatus();

void handleHealth();
void handleSensor();
void handleStatus();
void handleNotFound();
void setupRoutes();