#include <Arduino.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

#include "config.h"
#include "state.h"
#include "loads.h"
#include "relays.h"
#include "commands.h"
#include "runtime_config.h"

void reportCommandResult(int commandId, String status, String message)
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[Commands] Wi-Fi disconnected, cannot report command result");
        return;
    }

    HTTPClient http;

    String url = runtimeBackendUrl + "/commands/" + String(commandId) + "/result";

    JsonDocument doc;
    doc["status"] = status;
    doc["message"] = message;

    String requestBody;
    serializeJson(doc, requestBody);

    Serial.print("[Commands] Reporting result to: ");
    Serial.println(url);

    http.begin(url);
    http.addHeader("Content-Type", "application/json");

    int httpResponseCode = http.POST(requestBody);

    if (httpResponseCode > 0)
    {
        Serial.print("[Commands] Result report HTTP ");
        Serial.println(httpResponseCode);

        Serial.print("[Commands] Result response: ");
        Serial.println(http.getString());
    }
    else
    {
        Serial.print("[Commands] Result report failed: ");
        Serial.println(http.errorToString(httpResponseCode));
    }

    http.end();
}

bool isValidMode(String modeValue)
{
    return (
        modeValue == "monitor" ||
        modeValue == "manual" ||
        modeValue == "automatic" ||
        modeValue == "safe");
}

bool isValidLoadState(String stateValue)
{
    return (
        stateValue == "normal" ||
        stateValue == "low_runtime" ||
        stateValue == "critical_runtime" ||
        stateValue == "safe" ||
        stateValue == "all_off");
}

bool commandRequiresManualMode(String action)
{
    return action == "fan_on" ||
           action == "fan_off" ||
           action == "set_fan" ||
           action == "turn_fan_on" ||
           action == "turn_fan_off" ||
           action == "server_on" ||
           action == "server_off" ||
           action == "set_relay" ||
           action == "restart_server" ||
           action == "restart_all_servers" ||
           action == "power_all_servers" ||
           action == "shutdown_all_servers" ||
           action == "set_load_state" ||
           action == "normal" ||
           action == "low_runtime" ||
           action == "critical_runtime" ||
           action == "safe" ||
           action == "all_off";
}

bool executeCommand(JsonObject command)
{
    const char *action = command["action"];

    if (action == nullptr)
    {
        Serial.println("[Commands] Missing action");
        return false;
    }

    String actionValue = String(action);

    if (actionValue == "set_mode")
    {
        JsonObject payload = command["payload"];

        if (payload.isNull())
        {
            Serial.println("[Commands] Missing payload for set_mode");
            return false;
        }

        const char *newMode = payload["mode"];

        if (newMode == nullptr)
        {
            Serial.println("[Commands] Missing mode value");
            return false;
        }

        String modeValue = String(newMode);

        if (!isValidMode(modeValue))
        {
            Serial.print("[Commands] Invalid mode: ");
            Serial.println(modeValue);
            return false;
        }

        deviceMode = modeValue;

        if (deviceMode == "safe")
            setLoadState("safe");

        Serial.print("[Commands] Device mode changed to: ");
        Serial.println(deviceMode);

        return true;
    }

    if (commandRequiresManualMode(actionValue) && deviceMode != "manual")
    {
        Serial.print("[Commands] Manual-only command rejected: ");
        Serial.print(actionValue);
        Serial.print(" | Current mode: ");
        Serial.println(deviceMode);

        return false;
    }

    if (actionValue == "set_load_state")
    {
        JsonObject payload = command["payload"];

        if (payload.isNull())
        {
            Serial.println("[Commands] Missing payload for set_load_state");
            return false;
        }

        const char *newState = payload["state"];

        if (newState == nullptr)
        {
            Serial.println("[Commands] Missing state value");
            return false;
        }

        String stateValue = String(newState);

        if (!isValidLoadState(stateValue))
        {
            Serial.print("[Commands] Invalid load state: ");
            Serial.println(stateValue);
            return false;
        }

        setLoadState(stateValue);

        Serial.print("[Commands] Load state changed to: ");
        Serial.println(loadState);

        return true;
    }

    if (actionValue == "fan_on" || actionValue == "turn_fan_on")
    {
        return setFanRelayState(true);
    }

    if (actionValue == "fan_off" || actionValue == "turn_fan_off")
    {
        return setFanRelayState(false);
    }

    if (actionValue == "set_fan")
    {
        JsonObject payload = command["payload"];

        if (payload.isNull())
        {
            Serial.println("[Commands] Missing payload for set_fan");
            return false;
        }

        if (payload["on"].isNull())
        {
            Serial.println("[Commands] Missing on value for set_fan");
            return false;
        }

        bool fanOn = payload["on"];

        return setFanRelayState(fanOn);
    }

    if (actionValue == "server_on" || actionValue == "server_off")
    {
        JsonObject payload = command["payload"];

        if (payload.isNull())
        {
            Serial.println("[Commands] Missing payload for server command");
            return false;
        }

        const char *server = payload["server"];

        if (server == nullptr)
        {
            Serial.println("[Commands] Missing server value");
            return false;
        }

        bool serverOn = actionValue == "server_on";

        return setServerPowerState(String(server), serverOn);
    }

    if (actionValue == "set_relay")
    {
        JsonObject payload = command["payload"];

        if (payload.isNull())
        {
            Serial.println("[Commands] Missing payload for set_relay");
            return false;
        }

        const char *server = payload["server"];

        if (server == nullptr)
        {
            Serial.println("[Commands] Missing server value for set_relay");
            return false;
        }

        if (payload["on"].isNull())
        {
            Serial.println("[Commands] Missing on value for set_relay");
            return false;
        }

        bool serverOn = payload["on"];

        return setServerPowerState(String(server), serverOn);
    }

    if (actionValue == "restart_server")
    {
        JsonObject payload = command["payload"];

        if (payload.isNull())
        {
            Serial.println("[Commands] Missing payload for restart_server");
            return false;
        }

        const char *server = payload["server"];

        if (server == nullptr)
        {
            Serial.println("[Commands] Missing server value for restart_server");
            return false;
        }

        return restartServer(String(server));
    }

    if (actionValue == "restart_all_servers")
    {
        return restartAllServers();
    }

    if (actionValue == "power_all_servers")
    {
        return powerAllServers();
    }

    if (actionValue == "shutdown_all_servers")
    {
        return shutdownAllServers();
    }

    if (actionValue == "set_battery_percent")
    {
        JsonObject payload = command["payload"];

        if (payload.isNull())
        {
            Serial.println("[Commands] Missing payload for set_battery_percent");
            return false;
        }

        if (payload["battery_percent"].isNull())
        {
            Serial.println("[Commands] Missing battery_percent value");
            return false;
        }

        float newBatteryPercent = payload["battery_percent"];

        if (newBatteryPercent < 0 || newBatteryPercent > 100)
        {
            Serial.println("[Commands] battery_percent must be between 0 and 100");
            return false;
        }

        batteryPercent = newBatteryPercent;

        Serial.print("[Commands] Battery percent set to: ");
        Serial.println(batteryPercent);

        return true;
    }

    if (actionValue == "led_on")
    {
        if (deviceMode != "manual")
        {
            Serial.println("[Commands] LED command rejected: device is not in manual mode");
            return false;
        }

        setLoadState("normal");
        Serial.println("[Commands] Legacy led_on mapped to normal load state");
        return true;
    }

    if (actionValue == "led_off")
    {
        if (deviceMode != "manual")
        {
            Serial.println("[Commands] LED command rejected: device is not in manual mode");
            return false;
        }

        setLoadState("all_off");
        Serial.println("[Commands] Legacy led_off mapped to all_off load state");
        return true;
    }

    Serial.print("[Commands] Unknown action: ");
    Serial.println(actionValue);

    return false;
}

void pollPendingCommands()
{
    if (WiFi.status() != WL_CONNECTED)
    {
        Serial.println("[Commands] Wi-Fi disconnected, skipping command polling");
        return;
    }

    HTTPClient http;

    String url = runtimeBackendUrl + "/devices/" + String(DEVICE_ID) + "/commands/pending";

    Serial.print("[Commands] Polling: ");
    Serial.println(url);

    http.begin(url);

    int httpResponseCode = http.GET();

    if (httpResponseCode > 0)
    {
        String response = http.getString();

        Serial.print("[Commands] HTTP ");
        Serial.println(httpResponseCode);

        Serial.print("[Commands] Response: ");
        Serial.println(response);

        if (httpResponseCode == 200)
        {
            JsonDocument doc;

            DeserializationError error = deserializeJson(doc, response);

            if (error)
            {
                Serial.print("[Commands] JSON parse failed: ");
                Serial.println(error.c_str());

                http.end();
                return;
            }

            JsonArray commands = doc.as<JsonArray>();

            if (commands.size() == 0)
            {
                Serial.println("[Commands] No pending commands");
            }
            else
            {
                Serial.print("[Commands] Pending command count: ");
                Serial.println(commands.size());

                for (JsonObject command : commands)
                {
                    int commandId = command["id"];
                    const char *commandAction = command["action"];
                    const char *commandStatus = command["status"];

                    Serial.println("----- Command -----");
                    Serial.print("ID: ");
                    Serial.println(commandId);
                    Serial.print("Action: ");
                    Serial.println(commandAction);
                    Serial.print("Status: ");
                    Serial.println(commandStatus);

                    bool success = executeCommand(command);

                    if (success)
                    {
                        reportCommandResult(
                            commandId,
                            "executed",
                            "Command executed successfully");
                    }
                    else
                    {
                        reportCommandResult(
                            commandId,
                            "failed",
                            "Command execution failed");
                    }
                }
            }
        }
    }
    else
    {
        Serial.print("[Commands] Request failed: ");
        Serial.println(http.errorToString(httpResponseCode));
    }

    http.end();
}