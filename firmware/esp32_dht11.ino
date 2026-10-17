#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

const char* WIFI_SSID = "sai pavan";
const char* WIFI_PASS = "pass";
const char* SERVER_URL = "http://10.188.222.228:5000/metrics";

#define DHTPIN 4          // Pin labeled D4
#define DHTTYPE DHT11     // ← DHT11
DHT dht(DHTPIN, DHTTYPE);

void connectWiFi() {
  Serial.print("Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true, true);
  delay(200);

  WiFi.begin(WIFI_SSID, WIFI_PASS);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 40) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n[+] Wi-Fi Connected!");
    Serial.print("[+] IP Address: ");
    Serial.println(WiFi.localIP());
    Serial.print("[+] RSSI: ");
    Serial.print(WiFi.RSSI());
    Serial.println(" dBm");
  } else {
    Serial.println("\n[-] Wi-Fi Connection Failed!");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n===== ESP32 + DHT11 Telemetry =====");

  dht.begin();
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[!] Wi-Fi lost. Reconnecting...");
    connectWiFi();
    delay(2000);
    return;
  }

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[!] Failed to read from DHT11 sensor!");
    delay(3000);
    return;
  }

  Serial.printf("Temperature: %.1f °C | Humidity: %.1f %%\n", temperature, humidity);

  // Create JSON
  StaticJsonDocument<512> doc;
  doc["device_id"] = "ESP32-ENV-01";
  doc["hostname"]  = "esp32-dht11-node";

  JsonObject metrics = doc.createNestedObject("metrics");
  JsonObject dht11 = metrics.createNestedObject("dht11");
  dht11["temperature_c"] = temperature;
  dht11["humidity_percent"] = humidity;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Send data
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    Serial.printf("[+] Data sent successfully! HTTP Code: %d\n", httpCode);
  } else {
    Serial.printf("[!] Failed to send data. Error: %d\n", httpCode);
  }

  http.end();
  delay(10000);
}