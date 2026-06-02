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

    static float filteredADC = -1;
    const float alpha = 0.3;

    if (filteredADC < 0)
        filteredADC = rawADC;

    filteredADC = alpha * rawADC + (1 - alpha) * filteredADC;

    float sensorOutputVoltage = (filteredADC / (float)ADC_MAX) * ADC_REFERENCE_VOLTAGE;

    static int debugCounter = 0;
    if (++debugCounter >= 10)
    {
        debugCounter = 0;
        Serial.print("DEBUG: rawADC = ");
        Serial.print(rawADC);
        Serial.print(" | filteredADC = ");
        Serial.print(filteredADC, 0);
        Serial.print(" | sensorOutputVoltage = ");
        Serial.print(sensorOutputVoltage, 3);
        Serial.println(" V");
    }

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

    if (airQualityRaw < 500)
        airQualityStatus = "good";
    else if (airQualityRaw < 800)
        airQualityStatus = "moderate";
    else if (airQualityRaw < 1200)
        airQualityStatus = "poor";
    else
        airQualityStatus = "hazardous";
}

void applyAutomaticPowerDecision()
{
    if (deviceMode != "automatic")
        return;

    if (powerSource == "grid" || powerSource == "generator")
    {
        if (loadState != "normal")
            setLoadState("normal");

        return;
    }

    if (powerSource == "ups")
    {
        float runtime = estimateRuntimeMinutes();

        if (runtime > 0 && runtime <= 10.0)
        {
            if (loadState != "critical_runtime")
            {
                Serial.println("[Decision] Critical UPS runtime detected");
                setLoadState("critical_runtime");
            }
        }
        else if (runtime > 0 && runtime <= 20.0)
        {
            if (loadState != "low_runtime")
            {
                Serial.println("[Decision] Low UPS runtime detected");
                setLoadState("low_runtime");
            }
        }
    }
}

void updateBatterySimulation()
{
    batteryVoltage = readBatteryVoltage();
    batteryPercent = voltageToBatteryPercent(batteryVoltage);

    if (batteryPercent < 0)
        batteryPercent = 0;
    if (batteryPercent > 100)
        batteryPercent = 100;

    updateLoadPercent();
    applyAutomaticPowerDecision();
}