#pragma once

void setupRelays();
void applyRelayStates();
void setRelayOutputs(
    bool fanOn,
    bool nonCriticalAOn,
    bool nonCriticalBOn,
    bool criticalAOn,
    bool criticalBOn,
    bool spareOn);
void controlFan(float temperature);