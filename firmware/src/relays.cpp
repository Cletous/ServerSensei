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
    writeRelay(FAN_RELAY_PIN, fanOn);
    writeRelay(NON_CRITICAL_RELAY_A_PIN, nonCriticalAOn);
    writeRelay(NON_CRITICAL_RELAY_B_PIN, nonCriticalBOn);
    writeRelay(CRITICAL_RELAY_A_PIN, criticalAOn);
    writeRelay(CRITICAL_RELAY_B_PIN, criticalBOn);
    writeRelay(SPARE_RELAY_PIN, spareOn);
}

void applyRelayStates()
{
    if (loadState == "normal")
    {
        setRelayOutputs(
            false, // fan handled later in Milestone 24
            true,
            true,
            true,
            true,
            false);
    }
    else if (loadState == "low_runtime")
    {
        setRelayOutputs(
            false,
            false,
            false,
            true,
            true,
            false);
    }
    else if (loadState == "critical_runtime")
    {
        setRelayOutputs(
            false,
            false,
            false,
            true,
            false,
            false);
    }
    else if (loadState == "safe")
    {
        setRelayOutputs(
            false,
            false,
            false,
            true,
            false,
            false);
    }
    else if (loadState == "all_off")
    {
        setRelayOutputs(
            false,
            false,
            false,
            false,
            false,
            false);
    }
    else
    {
        setRelayOutputs(
            false,
            false,
            false,
            false,
            false,
            false);
    }
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

    Serial.println("[Relays] Relay outputs initialized");
}