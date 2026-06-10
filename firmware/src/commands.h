#pragma once

#include <Arduino.h>
#include <ArduinoJson.h>

void reportCommandResult(int commandId, String status, String message);

bool isValidMode(String modeValue);
bool isValidLoadState(String stateValue);
bool commandRequiresManualMode(String actionValue);
bool executeCommand(JsonObject command);

void pollPendingCommands();