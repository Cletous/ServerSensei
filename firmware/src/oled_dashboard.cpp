#include <Arduino.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>

#include "config.h"
#include "state.h"
#include "power.h"
#include "network.h"
#include "oled_dashboard.h"

Adafruit_SSD1306 display(
    OLED_SCREEN_WIDTH,
    OLED_SCREEN_HEIGHT,
    &Wire,
    OLED_RESET_PIN);

bool oledReady = false;

// shorten long words on the small OLED displ
String shortLoadState(String value)
{
    if (value == "normal")
        return "normal";
    if (value == "low_runtime")
        return "low";
    if (value == "critical_runtime")
        return "critical";
    if (value == "safe")
        return "safe";
    if (value == "all_off")
        return "off";

    return value;
}

String shortMode(String value)
{
    if (value == "automatic")
        return "auto";
    if (value == "manual")
        return "manual";
    if (value == "monitor")
        return "monitor";
    if (value == "safe")
        return "safe";

    return value;
}

void setupOLED()
{
    Wire.begin(OLED_SDA_PIN, OLED_SCL_PIN);

    if (!display.begin(SSD1306_SWITCHCAPVCC, OLED_I2C_ADDRESS))
    {
        Serial.println("[OLED] SSD1306 allocation/init failed");
        oledReady = false;
        return;
    }

    oledReady = true;

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);

    display.println("ServerSensei");
    display.println("OLED dashboard");
    display.println("starting...");
    display.display();

    Serial.println("[OLED] Dashboard initialized");
}

void updateOLED()
{
    if (!oledReady)
        return;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    float runtime = estimateRuntimeMinutes();

    display.clearDisplay();
    display.setTextSize(1);
    display.setTextColor(SSD1306_WHITE);
    display.setCursor(0, 0);

    display.println("ServerSensei");

    if (simulatedPowerDepleted && powerSource == "ups")
    {
        display.println("SIM POWER OFF");
        display.print("Battery: ");
        display.print(batteryPercent, 0);
        display.println("%");

        display.print("Grid:");
        display.print(gridAvailable ? "ON " : "OFF");

        display.print(" Gen:");
        display.println(generatorAvailable ? "ON" : "OFF");

        display.println("Waiting power...");
        display.display();
        return;
    }

    if (isnan(temperature) || isnan(humidity))
    {
        display.println("DHT22 error");
    }
    else
    {
        display.print("T:");
        display.print(temperature, 1);
        display.print("C ");

        display.print("H:");
        display.print(humidity, 0);
        display.println("%");
    }

    display.print("Air:");
    display.print(airQualityStatus);
    display.print(" ");
    display.println(airQualityRaw);

    display.print("Pwr:");
    display.print(powerSource);

    display.print(" Bat:");
    display.print(batteryPercent, 0);
    display.println("%");

    display.print("Rt:");
    if (runtime > 0)
    {
        display.print(runtime, 1);
        display.println("m");
    }
    else
    {
        display.println("--");
    }

    display.print("Mode:");
    display.println(shortMode(deviceMode));

    display.print("Load:");
    display.println(shortLoadState(loadState));

    display.display();
}