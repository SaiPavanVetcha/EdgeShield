#include <WiFi.h>
#include <HTTPClient.h>
#include <DHT.h>
#include <ArduinoJson.h>

// Include local configuration (gitignored). If absent, fall back to config.h.example
#if __has_include("config.h")
  #include "config.h"
#else
  #include "config.h.example"
  #warning "config.h not found; falling back to config.h.example. Copy config.h.example to config.h to configure your credentials."
#endif

DHT dht(DHTPIN, DHTTYPE);

void connectWiFi() {
  Serial.print("Connecting to Wi-Fi SSID: ");
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
    Serial.println("\n[-] Wi-Fi Connection Failed! Check SSID and password in config.h.");
  }
}

void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n========================================");
  Serial.println("   EdgeShield ESP32 Environmental Node  ");
  Serial.println("========================================");
  Serial.printf("Device ID : %s\n", DEVICE_ID);
  Serial.printf("Hostname  : %s\n", HOSTNAME);
  Serial.printf("Room      : %s\n", ROOM);
  Serial.printf("Server URL: %s\n", SERVER_URL);
  Serial.println("----------------------------------------");

  dht.begin();
  connectWiFi();
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("[!] Wi-Fi connection lost. Reconnecting...");
    connectWiFi();
    delay(2000);
    return;
  }

  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("[!] Failed to read from DHT sensor! Check wiring.");
    delay(3000);
    return;
  }

  Serial.printf("[Sensor] Temp: %.1f °C | Humidity: %.1f %% | Room: %s\n", temperature, humidity, ROOM);

  // Construct JSON telemetry payload consistent with PC client agent
  #if ARDUINOJSON_VERSION_MAJOR >= 7
    JsonDocument doc;
  #else
    StaticJsonDocument<512> doc;
  #endif

  doc["device_id"] = DEVICE_ID;
  doc["hostname"]  = HOSTNAME;
  doc["room"]      = ROOM;
  doc["type"]      = DEV_TYPE;
  doc["platform"]  = PLATFORM;

  JsonObject metrics = doc.createNestedObject("metrics");
  JsonObject dht11 = metrics.createNestedObject("dht11");
  dht11["temperature_c"] = round(temperature * 10.0) / 10.0;
  dht11["humidity_percent"] = round(humidity * 10.0) / 10.0;

  String jsonPayload;
  serializeJson(doc, jsonPayload);

  // Transmit payload over HTTP POST
  HTTPClient http;
  http.begin(SERVER_URL);
  http.addHeader("Content-Type", "application/json");

  int httpCode = http.POST(jsonPayload);

  if (httpCode > 0) {
    Serial.printf("[+] Telemetry sent! HTTP %d (Room: %s)\n", httpCode, ROOM);
  } else {
    Serial.printf("[!] Transmission failed. HTTP error: %s\n", http.errorToString(httpCode).c_str());
  }

  http.end();
  delay(SAMPLING_INTERVAL_MS);
}
