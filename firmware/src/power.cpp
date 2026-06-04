#include <Arduino.h>
#include "config.h"
#include "state.h"
#include "loads.h"
#include "power.h"

float estimateRuntimeMinutes()
{
    if (powerSource != "ups")
        return -1;

    if (batteryPercent <= 0 || loadPercent <= 0)
        return -1;

    if (USE_SIMULATED_UPS_BATTERY) // if using a simulated UPS battery
    {
        // In demo mode, 100% battery at 100% load lasts about 2 minutes.
        // Lower loadPercent increases runtime naturally.
        float runtimeSeconds =
            (batteryPercent / 100.0) *
            DEMO_UPS_FULL_DRAIN_SECONDS_AT_100_LOAD *
            (100.0 / loadPercent);

        return runtimeSeconds / 60.0;
    }

    // Original realistic estimate if not using a simulated UPS battery
    return (batteryPercent / loadPercent) * 60.0;
}

void readPowerSwitches()
{
    bool currentGridState = digitalRead(GRID_SWITCH_PIN);
    bool currentGenState = digitalRead(GENERATOR_SWITCH_PIN);

    if (currentGridState != lastGridState)
        lastGridDebounceTime = millis();

    if ((millis() - lastGridDebounceTime) > debounceDelay)
    {
        if (currentGridState != gridAvailable)
        {
            gridAvailable = currentGridState;
            Serial.print("[Power] Grid state changed to: ");
            Serial.println(gridAvailable ? "AVAILABLE" : "UNAVAILABLE");
        }
    }

    if (currentGenState != lastGenState)
        lastGenDebounceTime = millis();

    if ((millis() - lastGenDebounceTime) > debounceDelay)
    {
        if (currentGenState != generatorAvailable)
        {
            generatorAvailable = currentGenState;
            Serial.print("[Power] Generator state changed to: ");
            Serial.println(generatorAvailable ? "AVAILABLE" : "UNAVAILABLE");
        }
    }

    lastGridState = currentGridState;
    lastGenState = currentGenState;

    String previousPowerSource = powerSource;

    if (gridAvailable)
        powerSource = "grid";
    else if (generatorAvailable)
        powerSource = "generator";
    else
        powerSource = "ups";

    if (previousPowerSource != powerSource)
    {
        Serial.print("[Power] Source changed from ");
        Serial.print(previousPowerSource);
        Serial.print(" to ");
        Serial.println(powerSource);
    }
}

float readBatteryVoltage()
{
    const int numSamples = 50;
    long sum = 0;

    for (int i = 0; i < numSamples; i++)
    {
        sum += analogRead(VOLTAGE_SENSOR_PIN);
        delay(2);
    }

    int rawADC = sum / numSamples;

    float sensorOutputVoltage = (rawADC / (float)ADC_MAX) * ADC_REFERENCE_VOLTAGE;

    Serial.print("[Battery Debug] rawADC=");
    Serial.print(rawADC);
    Serial.print(" | GPIO36 voltage=");
    Serial.print(sensorOutputVoltage, 3);
    Serial.print(" V");
    Serial.print(" | multiplier=");
    Serial.print(VOLTAGE_DIVIDER_RATIO, 3);
    Serial.print(" | calculated battery=");
    Serial.print(sensorOutputVoltage * VOLTAGE_DIVIDER_RATIO, 3);
    Serial.println(" V");

    return sensorOutputVoltage * VOLTAGE_DIVIDER_RATIO;
}

float voltageToBatteryPercent(float voltage)
{
    if (voltage >= 4.20)
        return 100.0;
    if (voltage >= 4.10)
        return 90.0 + (voltage - 4.10) * 100.0;
    if (voltage >= 4.00)
        return 80.0 + (voltage - 4.00) * 100.0;
    if (voltage >= 3.90)
        return 60.0 + (voltage - 3.90) * 200.0;
    if (voltage >= 3.80)
        return 40.0 + (voltage - 3.80) * 200.0;
    if (voltage >= 3.70)
        return 20.0 + (voltage - 3.70) * 200.0;
    if (voltage >= 3.60)
        return 10.0 + (voltage - 3.60) * 100.0;
    if (voltage >= 3.50)
        return 5.0 + (voltage - 3.50) * 50.0;
    if (voltage >= 3.30)
        return (voltage - 3.30) * 25.0;
    return 0.0;
}

void readAirQuality()
{
    airQualityRaw = analogRead(MQ135_PIN);
    airQualityVoltage = (airQualityRaw / 4095.0) * 3.3;

    if (airQualityRaw < 2400)
        airQualityStatus = "good";
    else if (airQualityRaw < 2800)
        airQualityStatus = "moderate";
    else if (airQualityRaw < 3300)
        airQualityStatus = "poor";
    else
        airQualityStatus = "hazardous";
}

void applyAutomaticPowerDecision()
{
    if (deviceMode != "automatic")
        return;

    if (simulatedPowerDepleted)
    {
        if (loadState != "all_off")
            setLoadState("all_off");

        return;
    }

    if (powerSource == "grid" || powerSource == "generator")
    {
        if (loadState != "normal")
        {
            Serial.println("[Decision] Stable power restored, returning to normal load");
            setLoadState("normal");
        }

        return;
    }

    if (powerSource == "ups")
    {
        float runtime = estimateRuntimeMinutes();

        if (runtime > 0 && runtime <= CRITICAL_RUNTIME_THRESHOLD_MINUTES)
        {
            if (loadState != "critical_runtime")
            {
                Serial.println("[Decision] Critical UPS runtime detected");
                setLoadState("critical_runtime");
            }
        }
        else if (runtime > 0 && runtime <= LOW_RUNTIME_THRESHOLD_MINUTES)
        {
            if (loadState != "low_runtime" && loadState != "critical_runtime")
            {
                Serial.println("[Decision] Low UPS runtime detected");
                setLoadState("low_runtime");
            }
        }
    }
}

void updateBatterySimulation()
{
    static unsigned long lastBatteryUpdateTime = 0;

    unsigned long now = millis();

    if (lastBatteryUpdateTime == 0)
    {
        lastBatteryUpdateTime = now;
        return;
    }

    float elapsedSeconds = (now - lastBatteryUpdateTime) / 1000.0;
    lastBatteryUpdateTime = now;

    updateLoadPercent();

    if (USE_SIMULATED_UPS_BATTERY)
    {
        batteryVoltage = 0.0; // Not using physical voltage

        if (powerSource == "grid" || powerSource == "generator")
        {
            if (batteryPercent < 100.0)
            {
                batteryPercent += DEMO_BATTERY_RECOVERY_PERCENT_PER_SECOND * elapsedSeconds;

                if (batteryPercent > 100.0)
                    batteryPercent = 100.0;

                Serial.print("[Battery Demo] Charging/recovering: ");
                Serial.print(batteryPercent, 1);
                Serial.println("%");
            }

            if (simulatedPowerDepleted)
            {
                if (batteryPercent >= DEMO_RESTART_BATTERY_PERCENT)
                {
                    simulatedPowerDepleted = false;

                    Serial.println("[Battery Demo] Battery recovered enough. Simulated servers restarting.");

                    if (deviceMode == "automatic")
                    {
                        setLoadState("normal");
                    }
                }
                else
                {
                    Serial.println("[Battery Demo] Power restored, but battery is still too low to restart simulated servers.");
                }
            }
        }
        else if (powerSource == "ups")
        {
            if (loadPercent > 0 && batteryPercent > 0)
            {
                // At 100% load: 100% battery drains in 120 seconds.
                // At 60% load: drains slower.
                // At 35% or 30% load: drains much slower.
                float drainPercentPerSecond =
                    (100.0 / DEMO_UPS_FULL_DRAIN_SECONDS_AT_100_LOAD) *
                    (loadPercent / 100.0);

                batteryPercent -= drainPercentPerSecond * elapsedSeconds;

                if (batteryPercent < 0.0)
                    batteryPercent = 0.0;

                Serial.print("[Battery Demo] UPS drain: ");
                Serial.print(batteryPercent, 1);
                Serial.print("% | Load: ");
                Serial.print(loadPercent, 1);
                Serial.println("%");
            }

            if (batteryPercent <= 0.0 && !simulatedPowerDepleted)
            {
                batteryPercent = 0.0;
                simulatedPowerDepleted = true;

                Serial.println("[Battery Demo] UPS battery depleted. Simulated servers shutting down.");
                setLoadState("all_off");
            }
        }
    }
    else
    {
        // Optional old physical voltage reading path
        batteryVoltage = readBatteryVoltage();
        batteryPercent = voltageToBatteryPercent(batteryVoltage);
    }

    if (batteryPercent < 0)
        batteryPercent = 0;

    if (batteryPercent > 100)
        batteryPercent = 100;

    applyAutomaticPowerDecision();
}