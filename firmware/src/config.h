#pragma once

#define DHTPIN 4
#define DHTTYPE DHT22

#define GREEN_LED_PIN 23
#define YELLOW_LED_1_PIN 19
#define YELLOW_LED_2_PIN 18
#define RED_LED_1_PIN 17
#define RED_LED_2_PIN 16

#define GRID_SWITCH_PIN 33
#define GENERATOR_SWITCH_PIN 34

#define MQ135_PIN 35
#define VOLTAGE_SENSOR_PIN 36

inline constexpr float VOLTAGE_DIVIDER_RATIO = 8.21;
inline constexpr float ADC_REFERENCE_VOLTAGE = 3.3;
inline constexpr int ADC_MAX = 4095;

inline constexpr const char *WIFI_SSID = "Deld";
inline constexpr const char *WIFI_PASSWORD = "123123124oq";

inline constexpr const char *DEVICE_NAME = "ServerSensei";
inline constexpr const char *DEVICE_ID = "serversensei-esp32-001";
inline constexpr const char *BACKEND_URL = "http://10.46.77.124:8000";