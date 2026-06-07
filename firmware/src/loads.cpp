#include <Arduino.h>
#include "config.h"
#include "state.h"
#include "loads.h"
#include "relays.h"

void applyLEDStates()
{
    digitalWrite(GREEN_LED_PIN, greenLedState ? HIGH : LOW);
    digitalWrite(YELLOW_LED_1_PIN, yellowLed1State ? HIGH : LOW);
    digitalWrite(YELLOW_LED_2_PIN, yellowLed2State ? HIGH : LOW);
    digitalWrite(RED_LED_1_PIN, redLed1State ? HIGH : LOW);
    digitalWrite(RED_LED_2_PIN, redLed2State ? HIGH : LOW);
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
        yellowLed1State = true;
        yellowLed2State = true;
        redLed1State = true;
        redLed2State = true;
        Serial.println("[Load] Normal state: all simulated servers powered");
    }
    else if (newState == "low_runtime")
    {
        greenLedState = false;
        yellowLed1State = false;
        yellowLed2State = false;
        redLed1State = true;
        redLed2State = true;
        Serial.println("[Load] Low runtime: non-critical servers load shed");
    }
    else if (newState == "critical_runtime")
    {
        greenLedState = false;
        yellowLed1State = false;
        yellowLed2State = false;
        redLed1State = true;
        redLed2State = false;
        Serial.println("[Load] Critical runtime: only primary critical server active");
    }
    else if (newState == "safe")
    {
        greenLedState = false;
        yellowLed1State = false;
        yellowLed2State = false;
        redLed1State = true;
        redLed2State = false;
        Serial.println("[Load] Safe mode: emergency critical-only operation");
    }
    else if (newState == "all_off")
    {
        greenLedState = false;
        yellowLed1State = false;
        yellowLed2State = false;
        redLed1State = false;
        redLed2State = false;
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

void testAllLEDs()
{
    digitalWrite(GREEN_LED_PIN, LOW);
    digitalWrite(YELLOW_LED_1_PIN, LOW);
    digitalWrite(YELLOW_LED_2_PIN, LOW);
    digitalWrite(RED_LED_1_PIN, LOW);
    digitalWrite(RED_LED_2_PIN, LOW);
    delay(1000);

    Serial.println("Testing Green LED (GPIO23)");
    digitalWrite(GREEN_LED_PIN, HIGH);
    delay(1000);
    digitalWrite(GREEN_LED_PIN, LOW);

    Serial.println("Testing Yellow LED 1 (GPIO19)");
    digitalWrite(YELLOW_LED_1_PIN, HIGH);
    delay(1000);
    digitalWrite(YELLOW_LED_1_PIN, LOW);

    Serial.println("Testing Yellow LED 2 (GPIO18)");
    digitalWrite(YELLOW_LED_2_PIN, HIGH);
    delay(1000);
    digitalWrite(YELLOW_LED_2_PIN, LOW);

    Serial.println("Testing Red LED 1 (GPIO17)");
    digitalWrite(RED_LED_1_PIN, HIGH);
    delay(1000);
    digitalWrite(RED_LED_1_PIN, LOW);

    Serial.println("Testing Red LED 2 (GPIO16)");
    digitalWrite(RED_LED_2_PIN, HIGH);
    delay(1000);
    digitalWrite(RED_LED_2_PIN, LOW);

    Serial.println("LED test complete!");
}