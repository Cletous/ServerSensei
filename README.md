# ServerSensei

**Intelligent Server Room Environmental Monitoring and Power-Aware Load Management System**

ServerSensei is an engineering/research prototype that combines an ESP32 embedded system, a FastAPI backend, a MySQL database, and a React Native/Expo mobile application to monitor server-room environmental and power conditions in real time.

The system monitors temperature, humidity, air quality, power source, simulated UPS battery percentage, load percentage, fan state, and critical/non-critical server-load states. It also predicts UPS runtime and automatically sheds non-critical loads before critical loads during power interruptions.

---

## Table of Contents

- [Project Overview](#project-overview)
- [System Architecture](#system-architecture)
- [Features](#features)
- [Repository Structure](#repository-structure)
- [Hardware Requirements](#hardware-requirements)
- [Software Requirements](#software-requirements)
- [ESP32 Pin Plan](#esp32-pin-plan)
- [Backend Setup](#backend-setup)
- [Firmware Setup](#firmware-setup)
- [Mobile App Setup](#mobile-app-setup)
- [First-Time System Startup](#first-time-system-startup)
- [User Manual](#user-manual)
- [Demo Flow](#demo-flow)
- [API Overview](#api-overview)
- [Roles and Permissions](#roles-and-permissions)
- [Command and Safety Logic](#command-and-safety-logic)
- [Troubleshooting](#troubleshooting)
- [Security Notes](#security-notes)
- [Limitations](#limitations)
- [Future Work](#future-work)

---

## Project Overview

ServerSensei is designed for small and medium server rooms where manual monitoring, incomplete logs, and separate UPS/environmental monitoring systems create operational risk.

The system provides:

- Continuous environmental monitoring
- Air-quality monitoring
- Grid/generator/UPS power-state monitoring
- UPS runtime prediction
- Power-aware load shedding
- Cooling fan automation
- Mobile dashboard and digital twin
- Alerts and historical trends
- Admin command approval
- Audit logging for important actions

The prototype uses simulated server loads through relays or LEDs:

- Green LED: system healthy
- Non-critical server A
- Non-critical server B
- Critical server A
- Critical server B

---

## System Architecture

```text
Sensors / Switches / Relays
          ^
          |
          v
       ESP32
          ^
          |
          | Wi-Fi / HTTP
          |
          v
   FastAPI Backend <--> MySQL Database
          ^
          |
          |
          v
   Mobile Application
```

### Main Layers

1. **ESP32 Embedded Layer**
   - Reads sensors
   - Detects grid/generator/UPS mode
   - Controls fan and server-load relays
   - Sends telemetry to backend
   - Polls backend for pending commands
   - Displays local status on OLED
   - Provides local configuration page

2. **Backend Layer**
   - Receives telemetry
   - Stores readings in MySQL
   - Calculates alerts and decisions
   - Handles UPS runtime prediction
   - Manages commands and approvals
   - Handles users, roles, settings, push tokens, and audit logs

3. **Mobile App Layer**
   - Displays dashboard
   - Shows environment, power, trends, alerts, and digital twin
   - Sends operations commands
   - Allows admin approval and user management
   - Displays audit logs and system state

---

## Features

### Environmental Monitoring

- Temperature using DHT22
- Humidity using DHT22
- Air quality using MQ135
- Environmental risk status
- Fan automation based on temperature/risk

### Power Monitoring

- Grid power detection
- Generator power detection
- UPS mode simulation
- Battery percentage simulation
- Load percentage simulation
- UPS runtime prediction

### Load Management

Supported load states:

```text
normal
low_runtime
critical_runtime
safe
all_off
```

Load behaviour:

| Load State       | Non-Critical A | Non-Critical B | Critical A | Critical B | Load |
| ---------------- | -------------- | -------------- | ---------- | ---------- | ---- |
| normal           | ON             | ON             | ON         | ON         | 100% |
| low_runtime      | OFF            | OFF            | ON         | ON         | 60%  |
| critical_runtime | OFF            | OFF            | ON         | OFF        | 35%  |
| safe             | OFF            | OFF            | ON         | OFF        | 30%  |
| all_off          | OFF            | OFF            | OFF        | OFF        | 0%   |

### Mobile App Features

- Login
- Dashboard
- Monitor screen
- Environment screen
- Power screen
- Trends
- Alerts
- Operations
- Digital Twin
- Runtime Settings
- Admin Console

### Backend Features

- JWT authentication
- User roles
- Device registration
- Telemetry ingestion
- Command queue
- Command approval workflow
- Alerts
- Runtime settings
- Power prediction
- Push token support
- Audit logs

---

## Repository Structure

Expected repository layout:

```text
ServerSensei/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── core/
│   │   ├── dependencies/
│   │   ├── models/
│   │   ├── routers/
│   │   ├── schemas/
│   │   └── services/
│   ├── migrations/
│   ├── requirements.txt
│   ├── alembic.ini
│   ├── .env.example
│   └── start_backend.sh
│
├── firmware/
│   ├── platformio.ini
│   └── src/
│       └── main.cpp
│
├── mobileapp/
│   ├── app/
│   ├── src/
│   ├── assets/
│   ├── app.json
│   ├── eas.json
│   ├── package.json
│   └── package-lock.json
│
└── README.md
```

---

## Hardware Requirements

Required prototype hardware:

- ESP32 DevKit V1
- DHT22 temperature and humidity sensor
- MQ135 air-quality sensor
- OLED display
- Relay module or LED simulation
- Cooling fan
- Grid switch input
- Generator switch input
- Breadboard and jumper wires
- 220 ohm or 330 ohm resistors for LEDs
- External 5V power supply where needed
- Common ground wiring

Optional hardware:

- Voltage sensor
- 18650 battery
- TP4056 charging module
- XL6009 boost converter
- 5V UPS simulation module

---

## Software Requirements

Install these before running the system:

### General

- Git
- VS Code
- MySQL Server
- Python 3.10+
- Node.js LTS
- npm
- PlatformIO extension for VS Code
- Android phone or emulator
- Expo account for EAS APK builds

### Backend

- Python virtual environment
- FastAPI
- Uvicorn
- SQLAlchemy
- PyMySQL
- Alembic
- Pydantic
- JWT / python-jose
- passlib / bcrypt

### Firmware

- PlatformIO
- ESP32 board support
- Arduino framework

PlatformIO libraries:

```ini
adafruit/DHT sensor library
adafruit/Adafruit Unified Sensor
adafruit/Adafruit SSD1306
adafruit/Adafruit GFX Library
bblanchon/ArduinoJson
```

### Mobile App

- Expo SDK 54
- React Native
- Expo Router
- Axios
- Expo Secure Store
- Expo Notifications
- React Native SVG
- Ionicons

---

## ESP32 Pin Plan

Use this pin plan unless you intentionally change the firmware.

| Component            | ESP32 Pin       |
| -------------------- | --------------- |
| DHT22 DATA           | GPIO4           |
| Green System LED     | GPIO23          |
| OLED SDA             | GPIO21          |
| OLED SCL             | GPIO22          |
| Grid Sense           | GPIO33          |
| Generator Sense      | GPIO34          |
| MQ135 AO             | GPIO35          |
| Voltage Sensor       | GPIO36 optional |
| Fan Relay            | GPIO25          |
| Non-Critical Relay A | GPIO26          |
| Non-Critical Relay B | GPIO27          |
| Critical Relay A     | GPIO14          |
| Critical Relay B     | GPIO13          |
| Spare Relay          | GPIO15          |

Relay logic:

```cpp
RELAY_ACTIVE_LOW = true
```

---

## Backend Setup

### 1. Clone the repository

```bash
git clone https://github.com/Cletous/ServerSensei
cd ServerSensei/backend
```

### 2. Create a Python virtual environment

On Windows Git Bash:

```bash
python -m venv venv
source venv/Scripts/activate
```

On Linux/macOS:

```bash
python3 -m venv venv
source venv/bin/activate
```

### 3. Install dependencies

```bash
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### 4. Create the MySQL database

Open MySQL and run:

```sql
CREATE DATABASE serversensei_db;
```

Default local development database URL:

```env
mysql+pymysql://root:@localhost:3306/serversensei_db
```

If your MySQL root user has a password, use:

```env
mysql+pymysql://root:YOUR_PASSWORD@localhost:3306/serversensei_db
```

### 5. Create `.env`

Copy the example file:

```bash
cp .env.example .env
```

Then edit `.env`:

```env
APP_NAME=ServerSensei Backend
APP_VERSION=1.0.0
DEBUG=True
APP_TIMEZONE=Africa/Harare

DATABASE_URL=mysql+pymysql://root:@localhost:3306/serversensei_db

JWT_SECRET_KEY=replace_with_a_long_random_secret
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=60

EMAIL_ALERTS_ENABLED=False
EMAIL_ALERT_MIN_SEVERITY=warning

MAIL_MAILER=smtp
MAIL_HOST=mail.example.com
MAIL_PORT=465
MAIL_USERNAME=no-reply@example.com
MAIL_PASSWORD=replace_with_mail_password
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS=no-reply@example.com
MAIL_FROM_NAME=ServerSensei

ALERT_RECIPIENT_EMAILS=admin@example.com
```

Important: never commit your real `.env` file to GitHub.

### 6. Run database migrations

```bash
alembic upgrade head
```

If migrations are not available, the backend also creates SQLAlchemy tables at startup through `Base.metadata.create_all`.

### 7. Start backend

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Expected backend URL on your laptop:

```text
http://YOUR_LAPTOP_IP:8000
```

For local browser testing:

```text
http://localhost:8000
```

### 8. Test backend health

Open:

```text
http://localhost:8000/health
```

Expected response:

```json
{
  "status": "ok",
  "service": "ServerSensei Backend"
}
```

---

## Finding Your Laptop IP Address

The ESP32 and Android app cannot use `localhost` to reach the backend running on your laptop. Use the laptop's network IP.

On Windows:

```bash
ipconfig
```

Look for Wi-Fi IPv4 address, for example:

```text
10.0.1.23
192.168.43.105
```

Your backend URL becomes:

```text
http://10.0.1.23:8000
```

Make sure your phone, ESP32, and laptop are on the same Wi-Fi/hotspot network.

---

## Firmware Setup

### 1. Open firmware folder

Open VS Code, then open:

```text
ServerSensei/firmware
```

### 2. Check `platformio.ini`

Example:

```ini
[env:esp32dev]
platform = espressif32
board = esp32dev
framework = arduino

upload_port = COM7
monitor_port = COM7
monitor_speed = 115200
upload_speed = 1500000

lib_deps =
  adafruit/DHT sensor library
  adafruit/Adafruit Unified Sensor
  adafruit/Adafruit SSD1306
  adafruit/Adafruit GFX Library
  bblanchon/ArduinoJson
```

Change `COM7` to your ESP32 port if different.

Common examples:

```text
COM3
COM4
COM5
COM7
```

On Linux/macOS:

```text
/dev/ttyUSB0
/dev/tty.SLAB_USBtoUART
```

### 3. Build firmware

In PlatformIO:

```bash
pio run
```

Or click:

```text
PlatformIO -> Build
```

### 4. Upload firmware

```bash
pio run --target upload
```

Or click:

```text
PlatformIO -> Upload
```

If upload fails:

1. Hold the ESP32 `BOOT` button.
2. Start upload again.
3. Release `BOOT` when upload starts connecting/writing.

### 5. Open serial monitor

```bash
pio device monitor
```

Expected baud rate:

```text
115200
```

---

## ESP32 Local Configuration Page

The ESP32 provides a local configuration page.

Open in browser:

```text
http://ESP32_IP/config
```

Use this page to set:

- Wi-Fi SSID
- Wi-Fi password
- Backend URL

Example backend URL:

```text
http://10.0.1.23:8000
```

After saving Wi-Fi or backend URL settings, restart the ESP32.

Local endpoints:

```text
GET /health
GET /sensor
GET /status
GET /config
```

---

## Mobile App Setup

### 1. Open mobile app folder

```bash
cd ServerSensei/mobileapp
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure backend URL

Open the mobile app API config file:

```text
mobileapp/src/config/api.ts
```

Set the backend URL to your laptop IP:

```ts
export const API_BASE_URL = "http://YOUR_LAPTOP_IP:8000";
```

Example:

```ts
export const API_BASE_URL = "http://10.0.1.23:8000";
```

Do not use `localhost` in an APK or on a physical Android phone.

### 4. Start Expo development server

```bash
npx expo start
```

For development build:

```bash
npx expo start --dev-client
```

### 5. Build Android APK using EAS

Login to Expo if needed:

```bash
npx eas-cli@latest login
```

Build preview APK:

```bash
npx eas-cli@latest build -p android --profile preview
```

The app package name is:

```text
com.cletous.serversensei
```

Install the generated APK on your Android phone.

---

## First-Time System Startup

Use this startup order:

1. Start MySQL.
2. Start backend.
3. Confirm backend health.
4. Power ESP32.
5. Configure ESP32 Wi-Fi and backend URL.
6. Open mobile app.
7. Register first user.
8. Login.
9. Check dashboard.

The first registered user becomes admin.

---

## User Manual

### Login

1. Open ServerSensei mobile app.
2. Enter email and password.
3. Tap Login.
4. The app stores the JWT token securely.

### Dashboard

The dashboard provides:

- Device online/offline status
- Latest telemetry
- Environmental risk
- Battery percentage
- Load percentage
- Runtime prediction
- Alerts/recommendations

### Environment Screen

Use this screen to monitor:

- Temperature
- Humidity
- Air quality raw value
- Air quality status
- Environmental risk
- Cooling/fan reason

### Power Screen

Use this screen to monitor:

- Power source: grid, generator, UPS, or offline
- Battery percentage
- Load percentage
- Estimated runtime
- Current load state

### Trends Screen

Shows historical metric graphs:

- Temperature
- Humidity
- Air quality
- Battery percentage
- Load percentage

### Alerts Screen

Shows latest alerts and historical incidents.

### Operations Screen

Used for manual commands such as:

- Turn fan on/off
- Change load state
- Restart server group
- Power server group on/off
- Shutdown all loads

Important: manual commands require device mode to be `manual`.

### Settings Screen

Used to configure runtime thresholds:

- Fan ON temperature
- Fan OFF temperature
- Low runtime threshold
- Critical runtime threshold
- Demo UPS full-drain seconds
- Battery recovery percentage per second
- Restart battery percentage

### Digital Twin

The digital twin visually represents:

- Fan state
- Critical server A
- Critical server B
- Non-critical server A
- Non-critical server B
- Battery level
- Load level
- Power source

Use it to compare mobile state with physical LEDs/relays.

### Admin Console

Admin users can:

- View users
- Change user roles
- Enable/disable users
- Approve or reject commands
- View audit logs

---

## Demo Flow

1. Start MySQL.
2. Start backend.
3. Power ESP32.
4. Open mobile app.
5. Login as admin.
6. Show healthy dashboard under grid power.
7. Open Environment screen.
8. Open Power screen.
9. Turn off grid and generator switches.
10. System enters UPS mode.
11. Battery/runtime decreases.
12. Non-critical loads turn off first.
13. Critical loads remain active longer.
14. Open Digital Twin and compare with physical LEDs/relays.
15. Allow system to reach `all_off`.
16. Show offline/zero-state.
17. Restore grid or generator.
18. Show recovery.
19. Show alerts.
20. Show trends.
21. Show manual mode protection.
22. Show admin approval workflow.
23. Show audit logs.

---

## API Overview

Main backend endpoints:

```text
GET  /
GET  /health

POST /auth/register
POST /auth/login

GET  /devices
GET  /devices/{device_id}
POST /devices

POST /telemetry
GET  /devices/{device_id}/telemetry/history?limit=30

GET  /devices/{device_id}/power

POST /commands
GET  /devices/{device_id}/commands/pending
POST /commands/{command_id}/result

GET  /devices/{device_id}/alerts
GET  /alerts

GET  /devices/{device_id}/settings/runtime
PUT  /devices/{device_id}/settings

GET  /devices/{device_id}/decision/evaluation

POST /push-tokens
POST /push-tokens/test

GET  /admin/users
PATCH /admin/users/{user_id}/role
PATCH /admin/users/{user_id}/status

GET  /admin/commands/approvals
POST /admin/commands/{command_id}/approve
POST /admin/commands/{command_id}/reject

GET  /admin/audit-logs
```

---

## Roles and Permissions

### Admin

- Full system access
- Can create commands directly
- Can approve/reject command requests
- Can manage users
- Can view audit logs
- Can change runtime settings

### Operator

- Can monitor system
- Can request operational commands
- Commands require admin approval

### Viewer

- Can monitor system
- Can request limited actions only if allowed
- Commands require admin approval

First registered user becomes `admin`. Later users default to `viewer`.

---

## Command and Safety Logic

Manual-only commands require the device to be in manual mode.

Manual-only command examples:

```text
fan_on
fan_off
turn_fan_on
turn_fan_off
server_on
server_off
restart_server
power_on_critical_a
power_off_critical_a
power_on_critical_b
power_off_critical_b
power_on_non_critical_a
power_off_non_critical_a
power_on_non_critical_b
power_off_non_critical_b
restart_all_servers
shutdown_all_servers
set_load_state
normal
low_runtime
critical_runtime
safe
all_off
```

If the device is not in manual mode, the backend blocks the command and records an audit log.

Command statuses:

```text
awaiting_approval
pending
executed
failed
rejected
```

Command workflow:

```text
Mobile App -> Backend Command Queue -> Admin Approval -> ESP32 Polling -> Command Execution -> Result Report
```

---

## Air Quality Classification

MQ135 raw ADC classification:

```text
raw < 500       good
raw < 1000      moderate
raw < 1500      poor
raw >= 1500     hazardous
```

Note: MQ135 readings require warm-up and calibration for production accuracy. In this prototype, readings are used for demonstration and relative air-quality changes.

---

## Offline / All-Off Behaviour

When the ESP32 reaches `all_off`, it may stop sending new telemetry. The backend/mobile should not continue showing stale values.

Expected safe offline state:

```text
Device status: OFFLINE
Power source: OFFLINE
Battery: 0%
Load: 0%
Runtime: 0 minutes
Fan: OFF
Critical Server A: OFF
Critical Server B: OFF
Non-Critical Server A: OFF
Non-Critical Server B: OFF
```

---

## Troubleshooting

### Backend does not start

Check that:

- Virtual environment is activated
- Dependencies are installed
- `.env` exists
- MySQL is running
- Database exists
- `DATABASE_URL` is correct

Run:

```bash
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Cannot connect from phone to backend

Check:

- Phone and laptop are on the same Wi-Fi/hotspot
- Mobile app uses laptop IP, not `localhost`
- Backend is started with `--host 0.0.0.0`
- Windows Firewall allows Python/Uvicorn on port `8000`
- Open this on phone browser:

```text
http://YOUR_LAPTOP_IP:8000/health
```

### ESP32 cannot connect to backend

Check:

- ESP32 Wi-Fi SSID/password
- Backend URL on ESP32 config page
- Laptop IP address
- Backend is running
- ESP32 and laptop are on same network
- Backend URL includes `http://` and port `8000`

Correct:

```text
http://10.0.1.23:8000
```

Wrong:

```text
localhost:8000
http://localhost:8000
```

### ESP32 upload fails

Try:

1. Use a USB data cable, not a charging-only cable.
2. Check the correct COM port.
3. Press and hold BOOT while uploading.
4. Release BOOT when writing begins.
5. Lower upload speed if needed:

```ini
upload_speed = 921600
```

or:

```ini
upload_speed = 115200
```

### Mobile APK cannot login

Check:

- Backend URL in `src/config/api.ts`
- Backend is reachable from phone browser
- User exists
- Password is correct
- Backend `/health` works
- MySQL is running

### Commands do not execute

Check:

- ESP32 is online
- ESP32 backend URL is correct
- Device ID in backend matches ESP32 device ID
- Command status is `pending`
- Device mode is `manual` for manual-only commands
- Admin approved command if requested by operator/viewer

### Relay logic is inverted

Check:

```cpp
RELAY_ACTIVE_LOW = true
```

If your relay module is active-high, change relay logic in firmware.

---

## Security Notes

This is a research prototype. Before using in production:

- Replace default JWT secret
- Never commit `.env`
- Use HTTPS
- Use strong passwords
- Restrict CORS origins
- Use production database credentials
- Secure SMTP credentials
- Protect admin accounts
- Validate all hardware wiring
- Use certified electrical isolation for real server loads

Do not connect the prototype directly to real production server power circuits without proper electrical design, isolation, and supervision.

---

## Limitations

- Prototype-level implementation
- Simulated server loads
- MQ135 requires calibration
- UPS/battery runtime is partly simulated
- Single-room deployment assumption
- No production-grade enclosure
- No HTTPS by default
- No enterprise identity provider integration

---

## Future Work

Possible improvements:

- Real UPS API integration
- Real battery voltage/current sensing
- Industrial temperature/humidity sensors
- Calibrated air-quality monitoring
- Web dashboard
- Multi-device deployment
- Multi-room monitoring
- Machine-learning-based runtime prediction
- SMS/email escalation
- Cloud deployment
- Docker support
- HTTPS and production security hardening

---

## Quick Start Summary

```bash
# 1. Backend
cd backend
python -m venv venv
source venv/Scripts/activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# 2. Firmware
cd firmware
pio run
pio run --target upload
pio device monitor

# 3. Mobile app
cd mobileapp
npm install
npx expo start
# or build APK
npx eas-cli@latest build -p android --profile preview
```

---

## Project Status

ServerSensei currently demonstrates:

- ESP32 environmental sensing
- Backend telemetry ingestion
- MySQL storage
- Mobile monitoring
- Alerts
- Trends
- Runtime prediction
- Digital Twin
- Command workflow
- Manual mode protection
- Admin approval
- Audit logs
- UPS/load-shedding simulation

---

## Author

**Cletous Ngoma**  
BSc (Hons) Software Engineering  
Zimbabwe Women’s Microfinance Bank Internship Project

---

## License

This project is for academic and research prototype purposes. Add your preferred open-source license here, for example:

```text
MIT License
Apache License 2.0
Academic / All Rights Reserved
```

---

## Acknowledgements

This project was developed as a final-year engineering/research prototype focused on intelligent server-room environmental monitoring and power-aware load management.
