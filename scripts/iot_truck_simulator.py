import os
import time
import random
import requests
from pathlib import Path
from dotenv import load_dotenv


# Load .env from the project root
PROJECT_ROOT = Path(__file__).resolve().parents[1]
load_dotenv(PROJECT_ROOT / ".env")

BASE_URL = "http://localhost:8000"

UPDATE_INTERVAL = 30

def login():
    session = requests.Session()

    username = os.getenv("TRANSPORTER_USERNAME")
    password = os.getenv("TRANSPORTER_PASSWORD")

    if not username or not password:
        raise RuntimeError(
            "TRANSPORTER_USERNAME or TRANSPORTER_PASSWORD is missing."
        )

    response = session.post(
        f"{BASE_URL}/api/auth/login/transporter",
        json={
            "username": username,
            "password": password,
        },
    )

    response.raise_for_status()

    data = response.json()

    print(f"Logged in as transporter: {data['userID']}")

    return session, data["userID"]


def get_active_runs(session, transporter_id):
    response = session.get(
        f"{BASE_URL}/api/transporter/{transporter_id}/runs"
    )

    response.raise_for_status()

    data = response.json()

    return data.get("runs", [])

def update_step(session, transporter_id, shipment_id, step, hazard_report=None):
    payload = {
        "shipmentID": shipment_id,
        "step": step,
    }

    if hazard_report:
        payload["hazard_report"] = hazard_report

    response = session.post(
        f"{BASE_URL}/api/transporter/{transporter_id}/update-step",
        json=payload,
    )

    response.raise_for_status()

    return response.json()

def generate_telemetry():
    is_anomaly = random.random() < 0.2

    if is_anomaly:
        anomaly_type = random.choice([
            "temperature",
            "vibration",
            "speed",
            "weather",
        ])

        if anomaly_type == "temperature":
            temperature = round(random.uniform(41, 50), 2)
            axle_vibration = round(random.uniform(0.1, 1.5), 2)
            speed = round(random.uniform(20, 70), 2)
            weather = random.choice(["clear", "cloudy", "rain"])

        elif anomaly_type == "vibration":
            temperature = round(random.uniform(20, 40), 2)
            axle_vibration = round(random.uniform(1.8, 3.0), 2)
            speed = round(random.uniform(20, 70), 2)
            weather = random.choice(["clear", "cloudy", "rain"])

        elif anomaly_type == "speed":
            temperature = round(random.uniform(20, 40), 2)
            axle_vibration = round(random.uniform(0.1, 1.5), 2)
            speed = round(random.uniform(76, 100), 2)
            weather = random.choice(["clear", "cloudy", "rain"])

        else:
            temperature = round(random.uniform(20, 40), 2)
            axle_vibration = round(random.uniform(0.1, 1.5), 2)
            speed = round(random.uniform(20, 70), 2)
            weather = "heavy_rain"

    else:
        temperature = round(random.uniform(20, 40), 2)
        axle_vibration = round(random.uniform(0.1, 1.7), 2)
        speed = round(random.uniform(20, 75), 2)
        weather = random.choice([
            "clear",
            "cloudy",
            "rain",
        ])

    return {
        "temperature": temperature,
        "axle_vibration": axle_vibration,
        "weather": weather,
        "gps": {
            "latitude": round(random.uniform(8.0, 13.0), 6),
            "longitude": round(random.uniform(76.0, 80.0), 6),
        },
        "speed": speed,
    }

def detect_hazard(telemetry):
    hazards = []

    if telemetry["temperature"] > 40:
        hazards.append(
            f"High temperature detected: {telemetry['temperature']}°C"
        )

    if telemetry["axle_vibration"] > 1.7:
        hazards.append(
            f"High axle vibration detected: {telemetry['axle_vibration']}"
        )

    if telemetry["speed"] > 75:
        hazards.append(
            f"High speed detected: {telemetry['speed']} km/h"
        )

    if telemetry["weather"] == "heavy_rain":
        hazards.append("Heavy rain reported")

    if hazards:
        return "; ".join(hazards)

    return None

def main():
    print("IoT Truck Simulator starting...")

    session, transporter_id = login()

    print(f"Transporter ID: {transporter_id}")

    while True:
        runs = get_active_runs(session, transporter_id)

        active_runs = [
            run for run in runs
            if 0 <= run.get("transit_step", 10) < 10
        ]

        print(f"\nActive shipments: {len(active_runs)}")

        for run in active_runs:
            shipment_id = run["id"]
            current_step = run.get("transit_step", 0)

            telemetry = generate_telemetry()
            hazard_report = detect_hazard(telemetry)

            print(
                f"Shipment {shipment_id} | "
                f"Step {current_step} | "
                f"Telemetry: {telemetry}"
            )

            if hazard_report:
                print(f"⚠️ Hazard detected: {hazard_report}")

            new_step = current_step + 1

            result = update_step(
                session,
                transporter_id,
                shipment_id,
                new_step,
                hazard_report,
            )


            
            print(f"Backend response: {result}")

            print(
                f"Shipment {shipment_id} advanced "
                f"from {current_step} to {new_step}"
            )

        time.sleep(UPDATE_INTERVAL)

if __name__ == "__main__":
    main()