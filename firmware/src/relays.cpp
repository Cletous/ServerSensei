#include <Arduino.h>

#include "config.h"
#include "state.h"
#include "relays.h"

void writeRelay(int pin, bool on)
{
    if (RELAY_ACTIVE_LOW)
        digitalWrite(pin, on ? LOW : HIGH);
    else
        digitalWrite(pin, on ? HIGH : LOW);
}

void setRelayOutputs(
    bool fanOn,
    bool nonCriticalAOn,
    bool nonCriticalBOn,
    bool criticalAOn,
    bool criticalBOn,
    bool spareOn)
{
    (void)spareOn; // Spare relay is intentionally disabled for safety.

    writeRelay(FAN_RELAY_PIN, fanOn);
    writeRelay(NON_CRITICAL_RELAY_A_PIN, nonCriticalAOn);
    writeRelay(NON_CRITICAL_RELAY_B_PIN, nonCriticalBOn);
    writeRelay(CRITICAL_RELAY_A_PIN, criticalAOn);
    writeRelay(CRITICAL_RELAY_B_PIN, criticalBOn);

    // Safety rule: spare relay must never energize.
    writeRelay(SPARE_RELAY_PIN, false);
}

void applyRelayStates()
{
    if (simulatedPowerDepleted || loadState == "all_off")
    {
        setRelayOutputs(
            false,
            false,
            false,
            false,
            false,
            false);
        return;
    }

    if (deviceMode == "manual")
    {
        setRelayOutputs(
            fanRelayState,
            nonCriticalServerAState,
            nonCriticalServerBState,
            criticalServerAState,
            criticalServerBState,
            false);
        return;
    }

    setRelayOutputs(
        fanRelayState,
        nonCriticalServerAState,
        nonCriticalServerBState,
        criticalServerAState,
        criticalServerBState,
        false);
}

void setupRelays()
{
    pinMode(FAN_RELAY_PIN, OUTPUT);
    pinMode(NON_CRITICAL_RELAY_A_PIN, OUTPUT);
    pinMode(NON_CRITICAL_RELAY_B_PIN, OUTPUT);
    pinMode(CRITICAL_RELAY_A_PIN, OUTPUT);
    pinMode(CRITICAL_RELAY_B_PIN, OUTPUT);
    pinMode(SPARE_RELAY_PIN, OUTPUT);

    // all relays are off at the beginning
    setRelayOutputs(
        false,
        false,
        false,
        false,
        false,
        false);

    writeRelay(SPARE_RELAY_PIN, false);

    Serial.println("[Relays] Relay outputs initialized");
}

bool setFanRelayState(bool fanOn)
{
    if (fanOn && (loadState == "all_off" || simulatedPowerDepleted))
    {
        Serial.println("[Fan] fan cannot turn ON as power is depleted");
        return false;
    }

    fanRelayState = fanOn;
    applyRelayStates();

    if (fanRelayState)
        Serial.println("[Fan] Manual fan command: ON");
    else
        Serial.println("[Fan] Manual fan command: OFF");

    return true;
}

bool isValidServerId(String serverId)
{
    return (
        serverId == "non_critical_a" ||
        serverId == "non_critical_b" ||
        serverId == "critical_a" ||
        serverId == "critical_b");
}

bool setServerPowerState(String serverId, bool serverOn)
{
    if (!isValidServerId(serverId))
    {
        Serial.print("[Servers] Invalid server id: ");
        Serial.println(serverId);
        return false;
    }

    if (serverOn && simulatedPowerDepleted)
    {
        Serial.println("[Servers] Cannot turn server ON: simulated power is depleted");
        return false;
    }

    if (serverOn && loadState == "all_off")
    {
        loadState = "manual_override";
    }

    if (serverId == "non_critical_a")
        nonCriticalServerAState = serverOn;
    else if (serverId == "non_critical_b")
        nonCriticalServerBState = serverOn;
    else if (serverId == "critical_a")
        criticalServerAState = serverOn;
    else if (serverId == "critical_b")
        criticalServerBState = serverOn;

    loadState = "manual_override";

    applyRelayStates();

    Serial.print("[Servers] ");
    Serial.print(serverId);
    Serial.print(" set to ");
    Serial.println(serverOn ? "ON" : "OFF");

    return true;
}

bool restartServer(String serverId)
{
    if (!isValidServerId(serverId))
    {
        Serial.print("[Servers] Invalid restart server id: ");
        Serial.println(serverId);
        return false;
    }

    if (simulatedPowerDepleted)
    {
        Serial.println("[Servers] Cannot restart server: simulated power is depleted");
        return false;
    }

    Serial.print("[Servers] Restarting ");
    Serial.println(serverId);

    setServerPowerState(serverId, false);
    delay(700);
    setServerPowerState(serverId, true);

    Serial.print("[Servers] Restart complete: ");
    Serial.println(serverId);

    return true;
}

bool restartAllServers()
{
    if (simulatedPowerDepleted)
    {
        Serial.println("[Servers] Cannot restart all servers: simulated power is depleted");
        return false;
    }

    Serial.println("[Servers] Restarting all simulated servers");

    nonCriticalServerAState = false;
    nonCriticalServerBState = false;
    criticalServerAState = false;
    criticalServerBState = false;
    loadState = "manual_override";
    applyRelayStates();

    delay(1000);

    nonCriticalServerAState = true;
    nonCriticalServerBState = true;
    criticalServerAState = true;
    criticalServerBState = true;
    loadState = "manual_override";
    applyRelayStates();

    Serial.println("[Servers] Restart all complete");

    return true;
}

bool powerAllServers()
{
    if (simulatedPowerDepleted)
    {
        Serial.println("[Servers] Cannot power all servers ON: simulated power is depleted");
        return false;
    }

    Serial.println("[Servers] Powering all simulated servers ON");

    nonCriticalServerAState = true;
    nonCriticalServerBState = true;
    criticalServerAState = true;
    criticalServerBState = true;

    loadState = "manual_override";
    applyRelayStates();

    Serial.println("[Servers] All simulated servers are now ON");

    return true;
}

bool shutdownAllServers()
{
    Serial.println("[Servers] Shutting down all simulated servers");

    nonCriticalServerAState = false;
    nonCriticalServerBState = false;
    criticalServerAState = false;
    criticalServerBState = false;

    loadState = "manual_override";
    applyRelayStates();

    Serial.println("[Servers] All simulated servers are now OFF");

    return true;
}

void controlFan(float temperature)
{
    if (isnan(temperature))
        return;

    if (loadState == "all_off" || simulatedPowerDepleted)
    {
        fanRelayState = false;
        applyRelayStates();
        return;
    }

    if (deviceMode == "manual")
    {
        Serial.println("[Fan] Manual mode active, automatic cooling skipped");
        applyRelayStates();
        return;
    }

    bool environmentalRiskRequiresCooling =
        environmentalRisk == "high" ||
        environmentalRisk == "critical";

    if (environmentalRiskRequiresCooling)
    {
        if (!fanRelayState)
        {
            fanRelayState = true;
            Serial.println("[Fan] Environmental risk high/critical, fan ON");
            applyRelayStates();
        }

        return;
    }

    if (temperature >= fanOnTemperature)
    {
        if (!fanRelayState)
        {
            fanRelayState = true;
            Serial.println("[Fan] Temperature high, fan ON");
            applyRelayStates();
        }
    }
    else if (temperature <= fanOffTemperature)
    {
        if (fanRelayState)
        {
            fanRelayState = false;
            Serial.println("[Fan] Temperature normal and risk cleared, fan OFF");
            applyRelayStates();
        }
    }
}