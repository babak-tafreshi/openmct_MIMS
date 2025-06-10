import json
import time
from random import uniform

telemetry = {
    "vx": 7.5,
    "vy": 0.0,
    "altitude": 500,
    "status": "Idle"
}

while True:
    telemetry["altitude"] += uniform(-0.01, 0.01)
    telemetry["status"] = "Stable"

    with open("telemetry_data.json", "w") as f:
        json.dump(telemetry, f)
    
    time.sleep(1)  # Update every second
