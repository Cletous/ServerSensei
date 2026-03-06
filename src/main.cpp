#include <Arduino.h>
#include <WiFi.h>
#include <WebServer.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

const char *WIFI_SSID = "Mjao";
const char *WIFI_PASSWORD = "123123124";

DHT dht(DHTPIN, DHTTYPE);
WebServer server(80);

void connectToWiFi()
{
  Serial.print("Connecting to Wi-Fi");

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 20)
  {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED)
  {
    Serial.println("Wi-Fi connected successfully");
    Serial.print("ESP32 IP Address: ");
    Serial.println(WiFi.localIP());
  }
  else
  {
    Serial.println("Failed to connect to Wi-Fi");
  }
}

void handleRoot()
{
  server.send(200, "text/plain", "ServerSensei ESP32 is running");
}

void handleSensorData()
{
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature))
  {
    server.send(500, "application/json",
                "{\"error\":\"Failed to read from DHT22 sensor\"}");
    return;
  }

  String json = "{";
  json += "\"temperature\":" + String(temperature, 1) + ",";
  json += "\"humidity\":" + String(humidity, 1) + ",";
  json += "\"wifi\":\"" + String(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected") + "\"";
  json += "}";

  server.send(200, "application/json", json);
}

void setup()
{
  Serial.begin(115200);
  delay(2000);

  Serial.println("==================================");
  Serial.println("ServerSensei Environmental Monitor");
  Serial.println("ESP32 + DHT22 + Wi-Fi + Web Server");
  Serial.println("==================================");

  dht.begin();
  connectToWiFi();

  server.on("/", handleRoot);
  server.on("/sensor", handleSensorData);

  server.begin();
  Serial.println("Web server started");
  Serial.println("Available endpoints:");
  Serial.println("/");
  Serial.println("/sensor");
}

void loop()
{
  server.handleClient();

  static unsigned long lastPrint = 0;
  unsigned long now = millis();

  if (now - lastPrint >= 3000)
  {
    lastPrint = now;

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature))
    {
      Serial.println("Error: Failed to read from DHT22 sensor");
    }
    else
    {
      Serial.print("Temperature: ");
      Serial.print(temperature, 1);
      Serial.print(" C | Humidity: ");
      Serial.print(humidity, 1);
      Serial.print(" % | Wi-Fi: ");
      Serial.println(WiFi.status() == WL_CONNECTED ? "Connected" : "Disconnected");
    }
  }
}