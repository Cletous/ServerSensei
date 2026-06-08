#pragma once

#include <Arduino.h>

void updateEnhancedDecisionEngine();
String classifyEnvironmentalRisk(float temperature, float humidity, String airStatus);
void applyEnhancedDecisionRules(float temperature, float humidity);