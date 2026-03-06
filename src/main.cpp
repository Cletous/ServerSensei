#include <Arduino.h>
#include <DHT.h>

#define DHTPIN 4
#define DHTTYPE DHT22

DHT dht(DHTPIN, DHTTYPE);

void setup()
{
  Serial.begin(115200);
  delay(2000);

  Serial.println("==================================");
  Serial.println("ServerSensei Environmental Monitor");
  Serial.println("ESP32 + DHT22 started");
  Serial.println("==================================");

  dht.begin();
}

void loop()
{
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
    Serial.print(" °C");

    Serial.print(" | Humidity: ");
    Serial.print(humidity, 1);
    Serial.println(" %");
  }

  delay(2000);
}