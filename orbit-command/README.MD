1
python orbit_simulator.py

2
python app.py

3
http://localhost:5000

--------------------------------------------------------------------
ORBIT COMMAND PROJECT DOCUMENTATION
--------------------------------------------------------------------

1. Project Overview

A web-based mission control demo allowing users to:
  - Issue Δv burns (Δvx, Δvy) over a specified duration
  - Simulate orbital dynamics in real time
  - Display live telemetry (velocity, altitude, status)
  - Visualize the satellite’s orbit on a 2D canvas

Key components:
  - Flask backend (app.py) for UI and command handling
  - Simulator loop (orbit_simulator.py) for physics updates
  - Frontend (HTML, CSS, JavaScript) for interaction and plotting
  - Shared JSON (telemetry_data.json) as the state source
  - Command log (command_log.txt) for audit

--------------------------------------------------------------------

2. Folder Structure

orbit-command/
├── app.py                  # Flask routes and command handler
├── orbit_simulator.py      # Background simulation loop
├── telemetry_data.json     # Current orbital state (vx, vy, radius, etc.)
├── command_log.txt         # Burn history log
├── templates/
│   └── index.html          # Dashboard UI (form, telemetry, canvas)
└── static/
    ├── style.css           # Basic styling
    └── orbit_plot.js       # Canvas drawing logic

--------------------------------------------------------------------

3. telemetry_data.json

Stores the current state of the satellite:
  - vx, vy: velocity components (km/s)
  - radius: orbital radius from Earth center (km)
  - altitude: height above Earth surface = radius − 6371 km
  - angle: current angular position (degrees)
  - status: text status (e.g., "Burning: 3s remaining")
  - burn_rate_x, burn_rate_y, burn_remaining: when a burn is active

--------------------------------------------------------------------

4. command_log.txt

Appends a timestamped record of each burn, for example:
2025-05-22T14:12:03 Δvx=1.0, Δvy=0.5, dur=5s

--------------------------------------------------------------------

5. app.py (Flask backend)

Initialization:
  - Ensures telemetry_data.json exists with default state if missing

Route: /send-command
  - Parses dvx, dvy, duration
  - Loads current telemetry JSON
  - Schedules the burn by setting:
      burn_rate_x = dvx / duration
      burn_rate_y = dvy / duration
      burn_remaining = duration
      status = "Burning: …s remaining"
  - Writes updated telemetry back to the file
  - Logs the command in command_log.txt
  - Returns JSON response with status and telemetry

Route: /get-telemetry
  - Reads and returns the entire telemetry JSON

--------------------------------------------------------------------

6. orbit_simulator.py (Simulation loop)

Runs continuously at 1-second intervals:
  1. Read telemetry_data.json
  2. If burn_remaining > 0:
       - vx += burn_rate_x
       - vy += burn_rate_y
       - burn_remaining -= 1
       - status = "Burning: #s remaining"
       - Once burn finishes, remove burn fields and set status = "Stable"
  3. Recompute circular orbit:
       speed = sqrt(vx2 + vy2)
       radius = GM / speed2      (GM = 398600.4418 km3/s2)
       altitude = radius − 6371
  4. Advance angular position:
       Δθ = (speed / radius) * (180/pi) degrees
       angle = (angle + deltaθ) mod 360
  5. Write updated telemetry back to the file

Constants:
  - GM = 398600.4418 km3/s2 (Earth’s gravitational parameter)
  - EarthRadius = 6371 km

--------------------------------------------------------------------

7. Frontend Files

7.1 templates/index.html
  - Form inputs for Δvx, Δvy, Burn Duration; submits JSON to /send-command
  - Live Telemetry panel showing vx, vy, altitude, status
  - Telemetry Details panel listing all JSON fields for debugging
  - Canvas element (<canvas id="orbitCanvas">) for orbit drawing
  - Scripts:
      - /static/orbit_plot.js for plotting logic
      - Inline JS to:
          • Fetch /get-telemetry every second and update UI
          • Call updateOrbitPlot(data) to redraw the canvas
          • Handle form submission

7.2 static/style.css
  - Dark background, styled inputs, canvas border

7.3 static/orbit_plot.js
  - Function updateOrbitPlot(telemetry):
      • Maps telemetry.radius (km) to a pixel radius
      • Converts telemetry.angle to radians
      • Clears canvas
      • Draws Earth at center
      • Draws orbit path circle
      • Draws satellite as a small dot at the current angle

--------------------------------------------------------------------

8. Orbit Calculations Explained

1. Velocity magnitude: v = sqrt(vx² + vy²)
2. Orbital radius (circular): R = GM / v²
3. Altitude: h = R − EarthRadius
4. Angular increment per second: Δθ = (v / R) × (180/π)
5. Canvas position:
     x = x_center + R_px × cos(θ)
     y = y_center + R_px × sin(θ)
   where R_px is the pixel-mapped radius

Burn scheduling applies Δv gradually over the specified duration.

--------------------------------------------------------------------

9. How to Run the Demo

1. In Terminal 1, run:
     python orbit_simulator.py
2. In Terminal 2, run:
     python app.py
3. In your browser, open:
     http://localhost:5000
4. Enter Δvx, Δvy, Duration; click “Send Burn”
5. Observe live telemetry updates and orbit animation

--------------------------------------------------------------------

End of documentation.
