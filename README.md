#  Satellite Mission Control Project – MIMS Lab Version

This repository hosts the full codebase for a **hybrid satellite mission control system** developed at the **Mixed-Reality Immersive Motion Simulation (MIMS) Lab**.

We integrate **Open MCT** (NASA’s mission control software) with a custom **Immersive C2** platform (built using **Unreal Engine**) to simulate and manage **satellite debris collision scenarios** through both 2D and 3D interfaces.

---

##  Project Objectives

- Visualize satellite orbit and telemetry in **real time**
- Simulate **delta-V (Δv)** maneuvers and debris avoidance
- Develop custom **Open MCT plugins** for mission control UI
- Build an **immersive 3D environment** to enhance spatial awareness
- Create a custom **command terminal** for issuing maneuvers

---

##  Open MCT Plugins

Custom plugins we developed include:

| Plugin Name        | Functionality                                               |
|--------------------|-------------------------------------------------------------|
| `TLEPlugin.js`     | Parses TLE data (from file or API) and creates telemetry    |
| `AngleFeedPlugin.js` | Reads real-time satellite angular position from JSON       |
| `OrbitVisualizer`  | Visualizes orbit path relative to Earth in 2D               |


Open MCT is responsible for:

- Telemetry streaming and plotting
- Dashboard creation and layout editing
- Mission status and health monitoring

---

##  Orbit Simulator

To support testable mission control features, we created a lightweight **Python-based orbit simulator** that:

- Simulates circular orbit motion
- Outputs telemetry to JSON (consumed by both Open MCT and Immersive C2)
- Accepts `burn` commands and simulates orbital changes
- Allows safe testing of maneuver logic outside Unreal

---

## Immersive C2 (Unreal Engine)

Immersive C2 (short for Command & Control) visualizes:

- Satellite orbit in 3D around the Earth
- Δv maneuver animations
- Debris proximity and collision warning zones
- Pilot/operator view with cinematic awareness

It polls telemetry (JSON) at runtime and updates the visualization accordingly.

---

##  Hybrid Architecture

```
[ Open MCT ]
     ↓ (Command + Plot Telemetry)
[ Shared JSON / Flask API ]
     ↔ Real-time Sync ↔
[ Immersive C2 (Unreal Engine) ]
     ↑ (3D Orbit & Debris Visualizer)
```

> All systems share common telemetry feeds (e.g., `angle_feed.json`) and can be synchronized using a simple JSON API or WebSocket backend.

---

## Repository Structure

```bash
/
├── openmct-plugins/         # Custom plugins for MCT (TLE, Angle, Orbit)
│   ├── TLEPlugin.js
│   └── AngleFeedPlugin.js
├── orbit-simulator/         # Python simulation engine for orbital motion
│   ├── orbit_simulator.py
│   └── telemetry/angle_feed.json
├── command-interface/       # Command processor + execution logs
├── immersive-c2/            # Unreal Engine C2 setup (polls telemetry)
├── public_assets/           # Screenshots, UI snapshots, orbit graphics
└── README.md
```

---

##  Demo Snapshots



---

##  Key Achievements

| Module            | Status        | Notes                                        |
|------------------|---------------|----------------------------------------------|
| Open MCT Plugins |  Complete    | Fully integrated with JSON telemetry         |
| Orbit Simulator  |  Complete    | Supports maneuver simulation + logging       |
| Command Terminal |  Custom Dev | Built from scratch to issue live burn cmds   |
| Immersive C2     |  Functional  | Real-time Earth + orbit animation            |
| Integration      |  In Progress| WebSocket backend planned for smoother sync  |

---

##  Future Enhancements

-  Use NASA SPICE toolkit for higher accuracy ephemerides
-  Implement debris proximity alerts in both UIs
-  Add AI-based collision prediction
-  Cloud-deploy for multi-user ops & training
-  Add VR headset support in Immersive C2

---

##  Contributors

- **Babak Tafreshi**  
  Email: `babaknasirtafreshi@gmail.com`

---

##  References

- [Open MCT – NASA GitHub](https://github.com/nasa/openmct)
- [SPICE Toolkit – NASA NAIF](https://naif.jpl.nasa.gov/naif/)
- [TLE Format – Celestrak](https://celestrak.org/)

---

Thanks!!!
