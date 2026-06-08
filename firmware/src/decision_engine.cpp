#include <Arduino.h>

#include "config.h"
#include "state.h"
#include "power.h"
#include "loads.h"
#include "relays.h"
#include "decision_engine.h"

String classifyEnvironmentalRisk(float temperature, float humidity, String airStatus)
{
    if (isnan(temperature) || isnan(humidity))
        return "warning";

    if (
        temperature >= 35.0 ||
        humidity >= 80.0 ||
        airStatus == "hazardous")
    {
        return "critical";
    }

    if (
        temperature >= 30.0 ||
        humidity >= 75.0 ||
        airStatus == "poor")
    {
        return "high";
    }

    if (
        temperature >= fanOnTemperature ||
        humidity >= 65.0 ||
        airStatus == "moderate")
    {
        return "warning";
    }

    return "normal";
}

void applyEnhancedDecisionRules(float temperature, float humidity)
{
    float runtime = estimateRuntimeMinutes();

    environmentalRisk = classifyEnvironmentalRisk(
        temperature,
        humidity,
        airQualityStatus);

    if (simulatedPowerDepleted)
    {
        systemRecommendation = "Simulated UPS battery depleted. Loads are offline until power returns.";
        return;
    }

    if (environmentalRisk == "critical")
    {
        systemRecommendation = "Critical environmental risk. Reduce load and inspect cooling immediately.";

        if (deviceMode == "automatic" && loadState != "safe")
        {
            Serial.println("[Enhanced Decision] Critical environmental risk detected. Switching to safe load state.");
            setLoadState("safe");
        }

        return;
    }

    if (environmentalRisk == "high")
    {
        if (powerSource == "ups")
        {
            systemRecommendation = "High environmental risk while on UPS. Preserve critical services and reduce load.";

            if (deviceMode == "automatic" && loadState != "critical_runtime")
            {
                Serial.println("[Enhanced Decision] High environmental risk during UPS mode. Switching to critical_runtime.");
                setLoadState("critical_runtime");
            }
        }
        else
        {
            systemRecommendation = "High environmental risk. Fan should run and cooling should be checked.";
        }

        return;
    }

    if (environmentalRisk == "warning")
    {
        if (powerSource == "ups")
        {
            systemRecommendation = "UPS mode with environmental warning. Monitor runtime and prepare for load shedding.";
        }
        else
        {
            systemRecommendation = "Environmental warning. Monitor cooling and air quality trend.";
        }

        return;
    }

    if (powerSource == "ups")
    {
        if (runtime > 0)
        {
            systemRecommendation = "Running on UPS. Runtime-based load shedding is active.";
        }
        else
        {
            systemRecommendation = "Running on UPS. Runtime estimate unavailable.";
        }

        return;
    }

    systemRecommendation = "Environment stable. Continue normal monitoring.";
}

void updateEnhancedDecisionEngine()
{
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(temperature) || isnan(humidity))
    {
        environmentalRisk = "warning";
        systemRecommendation = "Sensor read failed. Check DHT22 connection.";
        Serial.println("[Enhanced Decision] Sensor read failed. Cannot fully evaluate environment.");
        return;
    }

    controlFan(temperature);
    applyEnhancedDecisionRules(temperature, humidity);

    Serial.print("[Enhanced Decision] Risk: ");
    Serial.print(environmentalRisk);
    Serial.print(" | Recommendation: ");
    Serial.println(systemRecommendation);
}