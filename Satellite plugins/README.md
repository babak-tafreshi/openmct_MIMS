# OpenMCT Satellite Plugins Installation Guide

This guide provides step-by-step instructions for installing and configuring satellite tracking plugins for OpenMCT, including TLE (Two-Line Element) fetching and Cesium-based satellite orbit visualization.

## Prerequisites

- OpenMCT installation
- Access to modify OpenMCT source files

## Installation Steps

### Step 1: Copy Plugin Files
Copy the plugin folders to the OpenMCT plugins directory:
```
openmctRoot/src/plugins/
```

### Step 2: Register Plugins in plugins.js
Open `openmctRoot/src/plugins/plugins.js` and add the following import statements at the end of the imports section:

```javascript
import TLEFetchingPlugin from './tleFetching/plugin.js';
import CesiumSatelliteOrbitPlugin from './cesiumSatelliteOrbit/plugin.js';
```

Then add these lines at the end of the plugin initializations section:

```javascript
plugins.TLEFetching = TLEFetchingPlugin;
plugins.CesiumSatelliteOrbit = CesiumSatelliteOrbitPlugin;
```

### Step 3: Add Required Dependencies
Open `openmctRoot/index.html` and add the following scripts and stylesheets in the `<head>` section:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/satellite.js/1.3.0/satellite.min.js"></script>
<script src="https://cesium.com/downloads/cesiumjs/releases/1.130/Build/Cesium/Cesium.js"></script>
<link
  href="https://cesium.com/downloads/cesiumjs/releases/1.130/Build/Cesium/Widgets/widgets.css"
  rel="stylesheet"
/>
```

### Step 4: Install Plugins
In the same `index.html` file, locate the plugin installation section and add the following lines:

```javascript
openmct.install(openmct.plugins.TLEFetching());
openmct.install(openmct.plugins.CesiumSatelliteOrbit());
```

### Step 5: Launch OpenMCT
Start your OpenMCT application and enjoy the new satellite tracking capabilities!
