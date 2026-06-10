#pragma once

bool setFanRelayState(bool fanOn);

bool isValidServerId(String serverId);
bool setServerPowerState(String serverId, bool serverOn);
bool restartServer(String serverId);
bool restartAllServers();

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