import json
import math
import time
import os

FILE = "telemetry_data.json"
GM = 398600.4418  # km^3/s^2
EARTH_R = 6371    # km

# Correct folder name and ensure it exists
ANGLE_FEED_FILE = "/Users/babaknasirtafreshi/Desktop/OPENMCT-DATA/angle_feed.json"
os.makedirs(os.path.dirname(ANGLE_FEED_FILE), exist_ok=True)

while True:
    # Load current telemetry
    with open(FILE, "r") as f:
        tm = json.load(f)

    # Apply burn if active
    if tm.get("burn_remaining", 0) > 0:
        tm["vx"] += tm["burn_rate_x"]
        tm["vy"] += tm["burn_rate_y"]
        tm["burn_remaining"] -= 1
        tm["status"] = f"Burning: {tm['burn_remaining']}s remaining"
        if tm["burn_remaining"] <= 0:
            tm.pop("burn_rate_x", None)
            tm.pop("burn_rate_y", None)
            tm.pop("burn_remaining", None)
            tm["status"] = "Stable"

    # Orbital dynamics
    speed = math.hypot(tm["vx"], tm["vy"])
    if speed > 0:
        tm["radius"] = GM / (speed ** 2)
        tm["altitude"] = tm["radius"] - EARTH_R

    # Angular motion
    dtheta = (speed / tm["radius"]) * (180 / math.pi)
    tm["angle"] = (tm.get("angle", 0) + dtheta) % 360

    # Append to Open MCT angle feed
    try:
        with open(ANGLE_FEED_FILE, "r") as f:
            angle_log = json.load(f)
    except:
        angle_log = []

    angle_log.append({
        "timestamp": int(time.time() * 1000),
        "angle": round(tm.get("angle", 0), 4)
    })

    angle_log = angle_log[-1000:]  # Keep last 1000 entries

    # ✅ Correct indentation for the write block
    try:
        with open(ANGLE_FEED_FILE, "w") as f:
            json.dump(angle_log, f, indent=2)
        print(f"[sim] angle_feed.json updated with {angle_log[-1]}")
    except Exception as e:
        print(f"[sim] ERROR writing angle_feed.json: {e}")

    # Save updated telemetry
    with open(FILE, "w") as f:
        json.dump(tm, f, indent=2)

    print(f"[sim] angle={tm['angle']:.2f}°, vx={tm['vx']:.2f}, vy={tm['vy']:.2f}, alt={tm['altitude']:.1f}")
    time.sleep(1)
