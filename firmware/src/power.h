#pragma once

float estimateRuntimeMinutes();
void readPowerSwitches();
float readBatteryVoltage();
float voltageToBatteryPercent(float voltage);
void readAirQuality();
void applyAutomaticPowerDecision();
void updateBatterySimulation();