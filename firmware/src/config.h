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

inline constexpr float VOLTAGE_DIVIDER_RATIO = 1.24;
inline constexpr float ADC_REFERENCE_VOLTAGE = 3.3;
inline constexpr int ADC_MAX = 4095;

inline constexpr const char *WIFI_SSID = "Deld";
inline constexpr const char *WIFI_PASSWORD = "123123124oq";

inline constexpr const char *DEVICE_NAME = "ServerSensei";
inline constexpr const char *DEVICE_ID = "serversensei-esp32-001";
inline constexpr const char *BACKEND_URL = "http://10.52.92.124:8000";

// Simulated UPS runtime engine
inline constexpr bool USE_SIMULATED_UPS_BATTERY = true;
inline constexpr float DEMO_UPS_FULL_DRAIN_SECONDS_AT_100_LOAD = 120.0; // Demo target: full battery drains in about 2 minutes at 100% load
inline constexpr float DEMO_BATTERY_RECOVERY_PERCENT_PER_SECOND = 2.0;  // Battery recovery speed when grid or generator is available

// Load shedding thresholds for demo mode
inline constexpr float LOW_RUNTIME_THRESHOLD_MINUTES = 0.75;      // about 45 seconds
inline constexpr float CRITICAL_RUNTIME_THRESHOLD_MINUTES = 0.35; // about 21 seconds