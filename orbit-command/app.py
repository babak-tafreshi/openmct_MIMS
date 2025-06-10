from flask import Flask, render_template, request, jsonify
from datetime import datetime
import json, os

app = Flask(__name__)
FILE     = "telemetry_data.json"
GM       = 398600.4418  # km^3/s^2
EARTH_R  = 6371         # km

# Ensure telemetry file exists
if not os.path.exists(FILE):
    initial = {
        "vx": 7.5,
        "vy": 0.0,
        "radius": EARTH_R + 500,
        "angle": 0.0,
        "status": "Idle"
    }
    initial["altitude"] = initial["radius"] - EARTH_R
    with open(FILE, "w") as f:
        json.dump(initial, f, indent=2)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/send-command', methods=['POST'])
def send_command():
    data = request.get_json(force=True)
    try:
        dvx = float(data.get("dvx", 0))
        dvy = float(data.get("dvy", 0))
        duration = int(data.get("duration", 0))
    except (TypeError, ValueError):
        return jsonify(status="ERROR: Invalid input"), 400

    # Duration check (still important!)
    MAX_DUR = 60
    if duration < 1 or duration > MAX_DUR:
        return jsonify(status=f"ERROR: Duration must be 1–{MAX_DUR} s"), 400

    # Load existing telemetry
    try:
        with open(FILE, "r") as f:
            tm = json.load(f)
    except Exception as e:
        return jsonify(status="ERROR: Could not read telemetry"), 500

    # Schedule burn
    tm["burn_rate_x"]    = dvx / duration
    tm["burn_rate_y"]    = dvy / duration
    tm["burn_remaining"] = duration
    tm["status"]         = f"Burning: {duration}s remaining"

    with open(FILE, "w") as f:
        json.dump(tm, f, indent=2)

    # Log burn command
    with open("command_log.txt", "a") as log:
        log.write(f"{datetime.now().isoformat()} Δvx={dvx}, Δvy={dvy}, dur={duration}s\n")

    return jsonify(status="Burn scheduled", telemetry=tm)

@app.route('/get-telemetry')
def get_telemetry():
    with open(FILE, "r") as f:
        return jsonify(json.load(f))

if __name__ == '__main__':
    app.run(debug=True, port=5000)


