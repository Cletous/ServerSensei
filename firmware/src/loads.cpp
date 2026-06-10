#include <Arduino.h>
#include "config.h"
#include "state.h"
#include "loads.h"
#include "relays.h"

void applyLEDStates()
{
    digitalWrite(GREEN_LED_PIN, greenLedState ? HIGH : LOW);
}

void updateLoadPercent()
{
    if (simulatedPowerDepleted || loadState == "all_off")
    {
        loadPercent = 0.0;
        return;
    }

    loadPercent = 0.0;

    if (nonCriticalServerAState)
        loadPercent += 20.0;

    if (nonCriticalServerBState)
        loadPercent += 20.0;

    if (criticalServerAState)
        loadPercent += 30.0;

    if (criticalServerBState)
        loadPercent += 30.0;
}

void setLoadState(String newState)
{
    loadState = newState;

    if (newState == "normal")
    {
        nonCriticalServerAState = true;
        nonCriticalServerBState = true;
        criticalServerAState = true;
        criticalServerBState = true;

        greenLedState = true;
        Serial.println("[Load] Normal state: all simulated servers powered");
    }
    else if (newState == "low_runtime")
    {
        nonCriticalServerAState = false;
        nonCriticalServerBState = false;
        criticalServerAState = true;
        criticalServerBState = true;

        greenLedState = false;
        Serial.println("[Load] Low runtime: non-critical servers load shed");
    }
    else if (newState == "critical_runtime")
    {
        nonCriticalServerAState = false;
        nonCriticalServerBState = false;
        criticalServerAState = true;
        criticalServerBState = false;

        greenLedState = false;
        Serial.println("[Load] Critical runtime: only primary critical server active");
    }
    else if (newState == "safe")
    {
        nonCriticalServerAState = false;
        nonCriticalServerBState = false;
        criticalServerAState = true;
        criticalServerBState = false;

        greenLedState = false;
        Serial.println("[Load] Safe mode: emergency critical-only operation");
    }
    else if (newState == "all_off")
    {
        nonCriticalServerAState = false;
        nonCriticalServerBState = false;
        criticalServerAState = false;
        criticalServerBState = false;

        greenLedState = false;
        Serial.println("[Load] All simulated loads OFF");
    }
    else
    {
        Serial.print("[Load] Unknown load state: ");
        Serial.println(newState);
        return;
    }

    updateLoadPercent();
    applyLEDStates();
    applyRelayStates();
}