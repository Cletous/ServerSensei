#pragma once

#define DHTPIN 4
#define DHTTYPE DHT22

#define GREEN_LED_PIN 23

#define OLED_SDA_PIN 21
#define OLED_SCL_PIN 22

#define OLED_SCREEN_WIDTH 128
#define OLED_SCREEN_HEIGHT 64
#define OLED_RESET_PIN -1
#define OLED_I2C_ADDRESS 0x3C

#define FAN_RELAY_PIN 25
#define NON_CRITICAL_RELAY_A_PIN 26
#define NON_CRITICAL_RELAY_B_PIN 27
#define CRITICAL_RELAY_A_PIN 14
#define CRITICAL_RELAY_B_PIN 13
#define SPARE_RELAY_PIN 15

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
inline constexpr float DEMO_UPS_FULL_DRAIN_SECONDS_AT_100_LOAD = 120.0;
inline constexpr float DEMO_BATTERY_RECOVERY_PERCENT_PER_SECOND = 2.0;
inline constexpr float DEMO_RESTART_BATTERY_PERCENT = 10.0;

// Load shedding thresholds for demo mode
inline constexpr float LOW_RUNTIME_THRESHOLD_MINUTES = 0.75;      // about 45 seconds
inline constexpr float CRITICAL_RUNTIME_THRESHOLD_MINUTES = 0.35; // about 21 seconds

// Relay logic contants
inline constexpr bool RELAY_ACTIVE_LOW = true;

// Temperature thresholds
inline constexpr float FAN_ON_TEMPERATURE = 28.0;
inline constexpr float FAN_OFF_TEMPERATURE = 24.0;