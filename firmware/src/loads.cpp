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
    if (loadState == "normal")
        loadPercent = 100.0;
    else if (loadState == "low_runtime")
        loadPercent = 60.0;
    else if (loadState == "critical_runtime")
        loadPercent = 35.0;
    else if (loadState == "safe")
        loadPercent = 30.0;
    else if (loadState == "all_off")
        loadPercent = 0.0;
    else
        loadPercent = 100.0;
}

void setLoadState(String newState)
{
    loadState = newState;

    if (newState == "normal")
    {
        greenLedState = true;
        Serial.println("[Load] Normal state: all simulated servers powered");
    }
    else if (newState == "low_runtime")
    {
        greenLedState = false;
        Serial.println("[Load] Low runtime: non-critical servers load shed");
    }
    else if (newState == "critical_runtime")
    {
        greenLedState = false;
        Serial.println("[Load] Critical runtime: only primary critical server active");
    }
    else if (newState == "safe")
    {
        greenLedState = false;
        Serial.println("[Load] Safe mode: emergency critical-only operation");
    }
    else if (newState == "all_off")
    {
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