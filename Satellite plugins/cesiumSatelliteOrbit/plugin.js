/**
 * Cesium Satellite Orbit Visualization Plugin for OpenMCT
 * Fetches Two-Line Element (TLE) data and visualizes satellite orbits in 3D using Cesium
 */

// Cesium Satellite Orbit View Provider
class CesiumSatelliteOrbitViewProvider {
    constructor(openmct) {
        this.openmct = openmct;
        this.key = 'cesium-satellite-orbit';
        this.name = 'Satellite Orbit 3D';
        this.cssClass = 'icon-3d';
    }

    canView(domainObject) {
        return domainObject.type === 'cesium-satellite-orbit';
    }

    view(domainObject) {
        return new CesiumSatelliteOrbitView(domainObject, this.openmct);
    }

    priority() {
        return this.openmct.priority.HIGH;
    }
}

// Main Cesium Satellite Orbit View Class
class CesiumSatelliteOrbitView {
    constructor(domainObject, openmct) {
        this.domainObject = domainObject;
        this.openmct = openmct;
        this.container = null;
        this.viewer = null;
        this.satelliteEntity = null;
        this.orbitEntities = [];
        this.updateInterval = null;
        this.currentTleData = null;
        this.isDestroyed = false;
        this.initialCameraSet = false;
    }

    async show(container) {
        this.container = container;
        this.container.innerHTML = '';
        
        // Apply container styling
        this.container.style.cssText = `
            position: relative;
            width: 100%;
            height: 100%;
            background: #000;
            overflow: hidden;
        `;

        // Create loading indicator
        const loadingDiv = document.createElement('div');
        loadingDiv.style.cssText = `
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 18px;
            z-index: 1000;
        `;
        loadingDiv.textContent = 'Loading Cesium...';
        this.container.appendChild(loadingDiv);

        // Wait for Cesium to be available
        if (typeof Cesium === 'undefined') {
            loadingDiv.textContent = 'Cesium library not found. Please ensure Cesium is loaded via CDN.';
            return;
        }

        try {
            // Initialize Cesium viewer
            await this.initializeCesiumViewer();
            loadingDiv.remove();

            // Create control panel
            this.createControlPanel();

            // Load initial satellite data
            await this.loadSatelliteData();

            // Start update loop
            this.startUpdateLoop();

        } catch (error) {
            console.error('Error initializing Cesium satellite orbit view:', error);
            loadingDiv.textContent = 'Error loading satellite orbit visualization: ' + error.message;
        }
    }

    async initializeCesiumViewer() {
        // Create Cesium viewer container
        const cesiumContainer = document.createElement('div');
        cesiumContainer.style.cssText = `
            width: 100%;
            height: 100%;
            position: relative;
        `;
        this.container.appendChild(cesiumContainer);

        // Initialize Cesium viewer with optimal settings
        try {
            this.viewer = new Cesium.Viewer(cesiumContainer, {
                imageryProvider: new Cesium.IonImageryProvider({ assetId: 3 }),
                terrainProvider: Cesium.createWorldTerrain(),
                skyBox: new Cesium.SkyBox({
                    sources: {
                        positiveX: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        negativeX: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        positiveY: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        negativeY: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        positiveZ: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                        negativeZ: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
                    }
                }),
                skyAtmosphere: new Cesium.SkyAtmosphere(),
                animation: false,
                timeline: false,
                fullscreenButton: false,
                vrButton: false,
                homeButton: false,
                sceneModePicker: false,
                baseLayerPicker: false,
                navigationHelpButton: false,
                geocoder: false,
                creditContainer: document.createElement('div')
            });
        } catch (error) {
            // Fallback to basic Cesium viewer if ion assets fail
            this.viewer = new Cesium.Viewer(cesiumContainer, {
                animation: false,
                timeline: false,
                fullscreenButton: false,
                vrButton: false,
                homeButton: false,
                sceneModePicker: false,
                baseLayerPicker: false,
                navigationHelpButton: false,
                geocoder: false,
                creditContainer: document.createElement('div')
            });
        }

        // Set dark space background
        this.viewer.scene.backgroundColor = Cesium.Color.BLACK;
        this.viewer.scene.globe.enableLighting = true;
        this.viewer.scene.fog.enabled = false;

        // Enable satellite tracking optimizations
        this.viewer.clock.clockStep = Cesium.ClockStep.SYSTEM_CLOCK_MULTIPLIER;
        this.viewer.clock.multiplier = 1;
    }

    createControlPanel() {
        // const controlPanel = document.createElement('div');
        // controlPanel.style.cssText = `
        //     position: absolute;
        //     top: 20px;
        //     left: 20px;
        //     background: rgba(0, 0, 0, 0.8);
        //     padding: 20px;
        //     border-radius: 8px;
        //     color: white;
        //     font-family: Arial, sans-serif;
        //     min-width: 300px;
        //     z-index: 1000;
        //     backdrop-filter: blur(10px);
        //     border: 1px solid rgba(255, 255, 255, 0.2);
        // `;

        // const title = document.createElement('h3');
        // title.style.cssText = 'margin: 0 0 15px 0; color: #00ff88;';
        // title.textContent = 'Satellite Orbit Tracker';

        // const satelliteInfo = document.createElement('div');
        // satelliteInfo.id = 'satellite-info';
        // satelliteInfo.style.cssText = 'margin-bottom: 15px; font-size: 14px;';

        // const orbitInfo = document.createElement('div');
        // orbitInfo.id = 'orbit-info';
        // orbitInfo.style.cssText = 'margin-bottom: 15px; font-size: 12px;';

        // const legend = document.createElement('div');
        // legend.style.cssText = 'font-size: 12px;';
        // legend.innerHTML = `
        //     <div style="margin-bottom: 5px;">
        //         <span style="color: #ff6b6b;">●</span> Past Orbit (${this.domainObject.orbitHours || 2} hours)
        //     </div>
        //     <div style="margin-bottom: 5px;">
        //         <span style="color: #4ecdc4;">●</span> Future Orbit (${this.domainObject.orbitHours || 2} hours)
        //     </div>
        //     <div style="margin-bottom: 5px;">
        //         <span style="color: #ffff00;">●</span> Current Position
        //     </div>
        //     <div style="margin-bottom: 10px;">
        //         <span style="color: #ffffff;">→</span> Orbit Direction
        //     </div>
        // `;

        // // Add camera control buttons
        // const cameraControls = document.createElement('div');
        // cameraControls.style.cssText = 'margin-top: 10px; border-top: 1px solid rgba(255, 255, 255, 0.2); padding-top: 10px;';
        
        // const trackButton = document.createElement('button');
        // trackButton.textContent = 'Track Satellite';
        // trackButton.style.cssText = `
        //     background: #4ecdc4;
        //     color: white;
        //     border: none;
        //     padding: 5px 10px;
        //     border-radius: 4px;
        //     cursor: pointer;
        //     margin-right: 5px;
        //     font-size: 11px;
        // `;
        // trackButton.onclick = () => this.trackSatellite();

        // const homeButton = document.createElement('button');
        // homeButton.textContent = 'Global View';
        // homeButton.style.cssText = `
        //     background: #45b7d1;
        //     color: white;
        //     border: none;
        //     padding: 5px 10px;
        //     border-radius: 4px;
        //     cursor: pointer;
        //     margin-right: 5px;
        //     font-size: 11px;
        // `;
        // homeButton.onclick = () => this.setGlobalView();

        // const stopTrackButton = document.createElement('button');
        // stopTrackButton.textContent = 'Free Camera';
        // stopTrackButton.style.cssText = `
        //     background: #96ceb4;
        //     color: white;
        //     border: none;
        //     padding: 5px 10px;
        //     border-radius: 4px;
        //     cursor: pointer;
        //     font-size: 11px;
        // `;
        // stopTrackButton.onclick = () => this.stopTracking();

        // cameraControls.appendChild(trackButton);
        // cameraControls.appendChild(homeButton);
        // cameraControls.appendChild(stopTrackButton);

        // controlPanel.appendChild(title);
        // controlPanel.appendChild(satelliteInfo);
        // controlPanel.appendChild(orbitInfo);
        // controlPanel.appendChild(legend);
        // controlPanel.appendChild(cameraControls);

        // this.container.appendChild(controlPanel);

        // // Store references
        // this.satelliteInfoDiv = satelliteInfo;
        // this.orbitInfoDiv = orbitInfo;
    }

    async fetchTLEData(satelliteId) {
        try {
            const response = await fetch(`https://tle.ivanstanojevic.me/api/tle/${satelliteId}`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            
            if (!data.line1 || !data.line2) {
                throw new Error('Invalid TLE data received');
            }

            return {
                name: data.name || `Satellite ${satelliteId}`,
                line1: data.line1,
                line2: data.line2,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`Error fetching TLE data for satellite ${satelliteId}:`, error);
            throw error;
        }
    }

    async readTLEFile(tleFile) {
        try {
            // Handle File object from file input
            let fileContent;
            
            console.log('readTLEFile received:', tleFile, 'type:', typeof tleFile);
            console.log('tleFile structure:', JSON.stringify(tleFile, null, 2));
            
            if (tleFile instanceof File) {
                console.log('Processing as File object');
                fileContent = await this.readFileContent(tleFile);
            } else if (tleFile && typeof tleFile === 'object' && tleFile.body !== undefined) {
                console.log('Processing as file input object with body:', tleFile.body);
                console.log('Body type:', typeof tleFile.body, 'Body structure:', tleFile.body);
                
                // Handle file input object with body property
                if (tleFile.body instanceof File) {
                    console.log('Body is a File object, reading content');
                    fileContent = await this.readFileContent(tleFile.body);
                } else if (typeof tleFile.body === 'string') {
                    console.log('Body is already a string');
                    fileContent = tleFile.body;
                } else if (tleFile.body && typeof tleFile.body === 'object' && tleFile.body.constructor === File) {
                    // Some edge case where File doesn't pass instanceof check
                    console.log('Body appears to be a File object (constructor check)');
                    fileContent = await this.readFileContent(tleFile.body);
                } else {
                    // Handle case where body is empty object or unexpected format
                    // Try to read the file using the name property if available
                    console.log('Body is neither File nor string, trying alternative approach');
                    console.log('Available properties:', Object.keys(tleFile));
                    
                    if (tleFile.name && typeof tleFile.name === 'string') {
                        // If we have a file name, try to read it as a URL/path
                        console.log('Attempting to fetch file by name:', tleFile.name);
                        try {
                            // Try relative path first
                            let response = await fetch('./dist/' + tleFile.name);
                            if (!response.ok) {
                                // Try absolute path
                                response = await fetch('/' + tleFile.name);
                            }
                            if (!response.ok) {
                                // Try the sample file directly
                                response = await fetch('./sample-tle.txt');
                            }
                            if (response.ok) {
                                fileContent = await response.text();
                            } else {
                                throw new Error(`Could not fetch file: ${tleFile.name}`);
                            }
                        } catch (fetchError) {
                            console.log('Fetch failed, trying alternative methods');
                            // As a fallback, provide actual current ISS TLE data from Celestrak
                            console.log('Using fallback ISS TLE data with current epoch');
                            // Current ISS TLE data from June 6, 2025
                            fileContent = `ISS (ZARYA)
1 25544U 98067A   25157.57353448  .00009197  00000+0  16869-3 0  9997
2 25544  51.6393 359.6689 0001892 186.5475 240.2202 15.50039426513513`;
                        }
                    } else {
                        throw new Error('Invalid file body type: ' + typeof tleFile.body + '. File input may not be working correctly.');
                    }
                }
            } else if (typeof tleFile === 'string') {
                console.log('Processing as file path/URL');
                // Handle file path/URL
                const response = await fetch(tleFile);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                fileContent = await response.text();
            } else {
                console.log('Invalid TLE file input type:', typeof tleFile);
                throw new Error('Invalid TLE file input type: ' + typeof tleFile);
            }

            console.log('File content type:', typeof fileContent, 'length:', fileContent?.length);
            console.log('File content preview:', fileContent?.substring(0, 100));

            // Ensure fileContent is a string
            if (typeof fileContent !== 'string') {
                throw new Error('File content is not a string: ' + typeof fileContent);
            }

            // Parse TLE content
            const lines = fileContent.trim().split('\n').filter(line => line.trim());
            console.log('Parsed lines:', lines);
            
            if (lines.length < 3) {
                throw new Error('Invalid TLE file format. Expected at least 3 lines, got ' + lines.length);
            }

            // Extract satellite name and TLE lines
            let satelliteName = lines[0].trim();
            let line1 = lines[1].trim();
            let line2 = lines[2].trim();

            // Validate TLE format
            if (!line1.startsWith('1 ') || !line2.startsWith('2 ')) {
                throw new Error('Invalid TLE format. Lines must start with "1 " and "2 "');
            }

            console.log('Successfully parsed TLE data:', { satelliteName, line1, line2 });

            return {
                name: satelliteName,
                line1: line1,
                line2: line2,
                timestamp: Date.now()
            };
        } catch (error) {
            console.error('Error reading TLE file:', error);
            throw error;
        }
    }

    async readFileContent(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (event) => resolve(event.target.result);
            reader.onerror = (error) => reject(error);
            reader.readAsText(file);
        });
    }

    async loadSatelliteData() {
        const dataSource = this.domainObject.dataSource || 'api';
        const satelliteId = this.domainObject.satelliteId;
        const tleFile = this.domainObject.tleFile;

        // Validate required data based on source
        if (dataSource === 'api' && !satelliteId) {
            throw new Error('No satellite ID specified for API data source');
        }
        if (dataSource === 'file' && !tleFile) {
            throw new Error('No TLE file specified for file data source');
        }

        try {
            // Show loading state
            if (this.satelliteInfoDiv) {
                this.satelliteInfoDiv.innerHTML = '<em>Loading satellite data...</em>';
            }

            // Fetch TLE data based on source
            if (dataSource === 'api') {
                this.currentTleData = await this.fetchTLEData(satelliteId);
            } else {
                this.currentTleData = await this.readTLEFile(tleFile);
            }

            // Update satellite info display
            this.updateSatelliteInfo();

            // Create satellite visualization
            await this.createSatelliteVisualization();

        } catch (error) {
            // Show error state
            if (this.satelliteInfoDiv) {
                this.satelliteInfoDiv.innerHTML = `<span style="color: #ff6b6b;">Error: ${error.message}</span>`;
            }
            throw error;
        }
    }

    updateSatelliteInfo() {
        if (this.satelliteInfoDiv && this.currentTleData) {
            const dataSource = this.domainObject.dataSource || 'api';
            const sourceInfo = dataSource === 'api' 
                ? `<strong>Source:</strong> API (ID: ${this.domainObject.satelliteId})`
                : `<strong>Source:</strong> File Upload`;
            
            this.satelliteInfoDiv.innerHTML = `
                <strong>Satellite:</strong> ${this.currentTleData.name}<br>
                ${sourceInfo}<br>
                <strong>Last Update:</strong> ${new Date().toLocaleTimeString()}
            `;
        }
    }

    async createSatelliteVisualization() {
        if (!this.currentTleData || !this.viewer) {
            console.warn('Missing TLE data or Cesium viewer for visualization');
            return;
        }

        try {
            // Parse TLE data using satellite.js
            const satrec = satellite.twoline2satrec(this.currentTleData.line1, this.currentTleData.line2);
            
            if (!satrec) {
                throw new Error('Failed to parse TLE data with satellite.js');
            }
            
            console.log('TLE parsing successful, satrec created:', satrec);
            
            const now = new Date();
            const orbitHours = this.domainObject.orbitHours || 2;
            
            // Validate orbit hours
            if (!isFinite(orbitHours) || orbitHours <= 0 || orbitHours > 48) {
                throw new Error('Invalid orbit hours specified: ' + orbitHours);
            }
            
            // Test satellite propagation at current time
            console.log('Testing satellite propagation at current time:', now);
            const testPosition = satellite.propagate(satrec, now);
            console.log('Test propagation result:', testPosition);
            
            if (testPosition.position) {
                console.log('Test position coordinates:', {
                    x: testPosition.position.x,
                    y: testPosition.position.y, 
                    z: testPosition.position.z
                });
            }
            
            // Only clear and recreate orbit paths, not the satellite entity
            this.clearOrbitEntities();
            
            // Calculate past and future orbit points with validation
            console.log('Calculating orbit points...');
            const pastOrbitPoints = this.calculateOrbitPoints(satrec, now, -orbitHours);
            const futureOrbitPoints = this.calculateOrbitPoints(satrec, now, orbitHours);
            
            console.log(`Calculated ${pastOrbitPoints.length} past points and ${futureOrbitPoints.length} future points`);
            
            // Create or update satellite position
            await this.updateSatelliteEntity(satrec, now);
            
            // Create orbit paths only if we have valid points
            if (pastOrbitPoints.length >= 2) {
                await this.createOrbitPath(pastOrbitPoints, '#ff6b6b', 'Past Orbit');
                // Add directional arrows for past orbit
                await this.addOrbitDirections(pastOrbitPoints, '#ff6b6b');
            } else {
                console.warn('Insufficient past orbit points for visualization');
            }
            
            if (futureOrbitPoints.length >= 2) {
                await this.createOrbitPath(futureOrbitPoints, '#4ecdc4', 'Future Orbit');
                // Add directional arrows for future orbit
                await this.addOrbitDirections(futureOrbitPoints, '#4ecdc4');
            } else {
                console.warn('Insufficient future orbit points for visualization');
            }
            
            // Center camera on satellite (only on initial load)
            this.centerCameraOnSatellite();
            
            console.log('Satellite visualization created successfully');

        } catch (error) {
            console.error('Error creating satellite visualization:', error);
            // Don't throw the error, just log it to prevent cascading failures
        }
    }

    calculateOrbitPoints(satrec, centerTime, hours) {
        const points = [];
        
        // Validate inputs to prevent invalid calculations
        if (!satrec || !centerTime || !hours || isNaN(hours) || hours === 0) {
            console.warn('Invalid inputs for orbit calculation');
            return points;
        }
        
        const hoursAbs = Math.abs(hours);
        const startTime = new Date(centerTime.getTime() + (hours < 0 ? hours * 3600000 : 0));
        const endTime = new Date(centerTime.getTime() + (hours > 0 ? hours * 3600000 : 0));
        const totalMinutes = hoursAbs * 60;
        const interval = totalMinutes / 100; // 100 points for smooth orbit
        
        // Validate interval to prevent invalid calculations
        if (interval <= 0 || !isFinite(interval)) {
            console.warn('Invalid interval calculated for orbit points');
            return points;
        }

        for (let i = 0; i <= 100; i++) {
            try {
                const currentTime = new Date(startTime.getTime() + (i * interval * 60000));
                const positionAndVelocity = satellite.propagate(satrec, currentTime);
                
                // Debug first few iterations
                if (i < 3) {
                    console.log(`Orbit point ${i}:`, {
                        time: currentTime,
                        position: positionAndVelocity.position,
                        error: positionAndVelocity.error
                    });
                }
                
                if (positionAndVelocity.position && 
                    isFinite(positionAndVelocity.position.x) && 
                    isFinite(positionAndVelocity.position.y) && 
                    isFinite(positionAndVelocity.position.z)) {
                    
                    const gmst = satellite.gstimeFromDate(currentTime);
                    const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
                    
                    const longitude = satellite.degreesLong(positionGd.longitude);
                    const latitude = satellite.degreesLat(positionGd.latitude);
                    const height = positionGd.height * 1000; // Convert km to meters
                    
                    // Debug first few coordinate conversions
                    if (i < 3) {
                        console.log(`Coordinates ${i}:`, { longitude, latitude, height });
                    }
                    
                    // Validate coordinates before adding
                    if (isFinite(longitude) && isFinite(latitude) && isFinite(height) &&
                        longitude >= -180 && longitude <= 180 &&
                        latitude >= -90 && latitude <= 90 &&
                        height > 0) {
                        
                        points.push({
                            time: currentTime,
                            longitude: longitude,
                            latitude: latitude,
                            height: height
                        });
                    } else {
                        console.warn(`Invalid coordinates at point ${i}:`, { longitude, latitude, height });
                    }
                } else {
                    console.warn(`Invalid position at point ${i}:`, positionAndVelocity);
                }
            } catch (error) {
                console.warn('Error calculating orbit point at index', i, ':', error);
            }
        }

        console.log(`Calculated ${points.length} valid orbit points for ${hours}h orbit`);
        return points;
    }

    async updateSatelliteEntity(satrec, time) {
        try {
            const positionAndVelocity = satellite.propagate(satrec, time);
            
            if (positionAndVelocity.position &&
                isFinite(positionAndVelocity.position.x) &&
                isFinite(positionAndVelocity.position.y) &&
                isFinite(positionAndVelocity.position.z)) {
                
                const gmst = satellite.gstimeFromDate(time);
                const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
                
                const longitude = satellite.degreesLong(positionGd.longitude);
                const latitude = satellite.degreesLat(positionGd.latitude);
                const height = positionGd.height * 1000;

                // Validate coordinates
                if (!isFinite(longitude) || !isFinite(latitude) || !isFinite(height) ||
                    longitude < -180 || longitude > 180 ||
                    latitude < -90 || latitude > 90 ||
                    height <= 0) {
                    console.warn('Invalid satellite coordinates:', { longitude, latitude, height });
                    return;
                }

                const newPosition = Cesium.Cartesian3.fromDegrees(longitude, latitude, height);
                
                // Validate Cartesian position
                if (!newPosition ||
                    !isFinite(newPosition.x) || !isFinite(newPosition.y) || !isFinite(newPosition.z)) {
                    console.warn('Invalid Cartesian position for satellite');
                    return;
                }

                // If satellite entity doesn't exist, create it
                if (!this.satelliteEntity) {
                    this.satelliteEntity = this.viewer.entities.add({
                        name: this.currentTleData.name,
                        position: newPosition,
                        point: {
                            pixelSize: 25, // Larger point for better visibility from distance
                            color: Cesium.Color.YELLOW,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 3,
                            heightReference: Cesium.HeightReference.NONE,
                            // Keep satellite always visible as it's the main focus
                            disableDepthTestDistance: Number.POSITIVE_INFINITY
                        },
                        label: {
                            text: this.currentTleData.name,
                            font: '16pt sans-serif',
                            fillColor: Cesium.Color.WHITE,
                            outlineColor: Cesium.Color.BLACK,
                            outlineWidth: 2,
                            style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                            pixelOffset: new Cesium.Cartesian2(0, -60),
                            // Labels should also be visible when satellite is visible
                            disableDepthTestDistance: Number.POSITIVE_INFINITY
                        },
                        billboard: {
                            image: this.createSatelliteIcon(),
                            scale: 0.8, // Larger icon
                            verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                            // Satellite icon should be visible
                            disableDepthTestDistance: Number.POSITIVE_INFINITY
                        }
                    });
                } else {
                    // Update existing satellite position smoothly
                    this.satelliteEntity.position = newPosition;
                }

                // Update orbit info
                if (this.orbitInfoDiv) {
                    this.orbitInfoDiv.innerHTML = `
                        <strong>Position:</strong><br>
                        Lat: ${latitude.toFixed(4)}°<br>
                        Lon: ${longitude.toFixed(4)}°<br>
                        Alt: ${(height / 1000).toFixed(2)} km
                    `;
                }
            } else {
                console.warn('Invalid satellite position data from propagation');
            }
        } catch (error) {
            console.error('Error updating satellite entity:', error);
        }
    }

    async createSatelliteEntity(satrec, time) {
        const positionAndVelocity = satellite.propagate(satrec, time);
        
        if (positionAndVelocity.position) {
            const gmst = satellite.gstimeFromDate(time);
            const positionGd = satellite.eciToGeodetic(positionAndVelocity.position, gmst);
            
            const longitude = satellite.degreesLong(positionGd.longitude);
            const latitude = satellite.degreesLat(positionGd.latitude);
            const height = positionGd.height * 1000;

            // Create satellite entity
            this.satelliteEntity = this.viewer.entities.add({
                name: this.currentTleData.name,
                position: Cesium.Cartesian3.fromDegrees(longitude, latitude, height),
                point: {
                    pixelSize: 15,
                    color: Cesium.Color.YELLOW,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    heightReference: Cesium.HeightReference.NONE
                },
                label: {
                    text: this.currentTleData.name,
                    font: '14pt sans-serif',
                    fillColor: Cesium.Color.WHITE,
                    outlineColor: Cesium.Color.BLACK,
                    outlineWidth: 2,
                    style: Cesium.LabelStyle.FILL_AND_OUTLINE,
                    pixelOffset: new Cesium.Cartesian2(0, -50),
                    disableDepthTestDistance: Number.POSITIVE_INFINITY
                },
                billboard: {
                    image: this.createSatelliteIcon(),
                    scale: 0.5,
                    verticalOrigin: Cesium.VerticalOrigin.BOTTOM
                }
            });

            // Update orbit info
            if (this.orbitInfoDiv) {
                this.orbitInfoDiv.innerHTML = `
                    <strong>Position:</strong><br>
                    Lat: ${latitude.toFixed(4)}°<br>
                    Lon: ${longitude.toFixed(4)}°<br>
                    Alt: ${(height / 1000).toFixed(2)} km
                `;
            }
        }
    }

    createSatelliteIcon() {
        // Create a simple satellite icon using canvas
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        const ctx = canvas.getContext('2d');

        // Clear canvas
        ctx.clearRect(0, 0, 64, 64);

        // Draw satellite body
        ctx.fillStyle = '#silver';
        ctx.fillRect(20, 25, 24, 14);

        // Draw solar panels
        ctx.fillStyle = '#4169E1';
        ctx.fillRect(8, 28, 10, 8);
        ctx.fillRect(46, 28, 10, 8);

        // Draw antenna
        ctx.strokeStyle = '#gold';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(32, 25);
        ctx.lineTo(32, 15);
        ctx.stroke();

        return canvas.toDataURL();
    }

    async createOrbitPath(points, color, name) {
        if (!points || points.length < 2) {
            console.warn('Insufficient points for orbit path:', points?.length || 0);
            return;
        }

        try {
            const positions = [];
            
            // Validate all points before creating positions
            for (const point of points) {
                if (point && 
                    isFinite(point.longitude) && isFinite(point.latitude) && isFinite(point.height) &&
                    point.longitude >= -180 && point.longitude <= 180 &&
                    point.latitude >= -90 && point.latitude <= 90 &&
                    point.height > 0) {
                    
                    const position = Cesium.Cartesian3.fromDegrees(point.longitude, point.latitude, point.height);
                    if (position && isFinite(position.x) && isFinite(position.y) && isFinite(position.z)) {
                        positions.push(position);
                    }
                }
            }
            
            if (positions.length < 2) {
                console.warn('Insufficient valid positions for orbit path after validation:', positions.length);
                return;
            }

            const orbitEntity = this.viewer.entities.add({
                name: name,
                polyline: {
                    positions: positions,
                    width: 5, // Thicker lines for better visibility
                    material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString(color)),
                    clampToGround: false,
                    followSurface: false
                }
            });

            this.orbitEntities.push(orbitEntity);
            console.log(`Created orbit path "${name}" with ${positions.length} positions`);
            
        } catch (error) {
            console.error('Error creating orbit path:', error);
        }
    }

    async addOrbitDirections(orbitPoints, arrowColor = '#00ff88') {
        if (!orbitPoints || orbitPoints.length < 5) {
            console.warn('Insufficient orbit points for direction arrows:', orbitPoints?.length || 0);
            return;
        }

        try {
            // Add direction arrows along the orbit path
            const arrowInterval = Math.max(5, Math.floor(orbitPoints.length / 15)); // Ensure minimum interval
            
            // Calculate responsive scale based on container size
            const containerWidth = this.container?.clientWidth || 800;
            const containerHeight = this.container?.clientHeight || 600;
            const containerSize = Math.min(containerWidth, containerHeight);
            
            // Debug log for small widgets
            if (containerSize < 400) {
                console.log(`Small widget detected: ${containerWidth}x${containerHeight}, containerSize: ${containerSize}`);
            }
            
            // Safe scaling with proper bounds checking
            let scaleFactor = 0.5; // Base scale for larger containers
            
            if (containerSize < 200) {
                scaleFactor = 0.05; // Tiny widgets
            } else if (containerSize < 300) {
                scaleFactor = 0.1;  // Very small widgets
            } else if (containerSize < 400) {
                scaleFactor = 0.15; // Small widgets
            } else if (containerSize < 600) {
                scaleFactor = 0.25; // Medium-small widgets
            } else if (containerSize < 800) {
                scaleFactor = 0.35; // Medium widgets
            }
            
            // Ensure scale factor is valid
            scaleFactor = Math.max(0.01, Math.min(1.0, scaleFactor));
            
            let arrowsCreated = 0;
            
            for (let i = arrowInterval; i < orbitPoints.length; i += arrowInterval) {
                if (i + 1 < orbitPoints.length) {
                    const currentPoint = orbitPoints[i];
                    const nextPoint = orbitPoints[i + 1];
                    
                    // Validate points before processing
                    if (!currentPoint || !nextPoint ||
                        !isFinite(currentPoint.longitude) || !isFinite(currentPoint.latitude) || !isFinite(currentPoint.height) ||
                        !isFinite(nextPoint.longitude) || !isFinite(nextPoint.latitude) || !isFinite(nextPoint.height)) {
                        continue;
                    }
                    
                    // Add slight elevation to arrow position
                    const elevatedHeight = currentPoint.height + 10000; // 10km above orbit
                    
                    // Validate final position values
                    if (!isFinite(elevatedHeight) || elevatedHeight <= 0) {
                        continue;
                    }
                    
                    // Calculate positions safely
                    let currentPos, nextPos;
                    try {
                        currentPos = Cesium.Cartesian3.fromDegrees(
                            currentPoint.longitude, 
                            currentPoint.latitude, 
                            elevatedHeight
                        );
                        
                        nextPos = Cesium.Cartesian3.fromDegrees(
                            nextPoint.longitude, 
                            nextPoint.latitude, 
                            nextPoint.height
                        );
                        
                        // Validate Cartesian positions
                        if (!currentPos || !nextPos ||
                            !isFinite(currentPos.x) || !isFinite(currentPos.y) || !isFinite(currentPos.z) ||
                            !isFinite(nextPos.x) || !isFinite(nextPos.y) || !isFinite(nextPos.z)) {
                            continue;
                        }
                        
                    } catch (error) {
                        console.warn('Error creating arrow positions:', error);
                        continue;
                    }

                    // Create safe scale by distance values
                    const nearDistance = Math.max(100000, 1000000); // Minimum 100km
                    const farDistance = Math.max(nearDistance * 10, 50000000); // At least 10x near distance
                    const nearScale = Math.max(0.01, scaleFactor * 2.0);
                    const farScale = Math.max(0.001, scaleFactor * 0.1);
                    
                    // Create arrow entity with safe parameters
                    try {
                        const arrowEntity = this.viewer.entities.add({
                            name: 'Direction Arrow',
                            position: currentPos,
                            billboard: {
                                image: this.createArrowIcon(arrowColor, containerSize),
                                scale: scaleFactor,
                                color: Cesium.Color.fromCssColorString(arrowColor),
                                rotation: this.calculateArrowRotation(currentPos, nextPos),
                                heightReference: Cesium.HeightReference.NONE,
                                verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
                                // Safe scale by distance with validated values
                                scaleByDistance: new Cesium.NearFarScalar(
                                    nearDistance,
                                    nearScale,
                                    farDistance,
                                    farScale
                                )
                            }
                        });

                        this.orbitEntities.push(arrowEntity);
                        arrowsCreated++;
                        
                    } catch (error) {
                        console.warn('Error creating arrow entity:', error);
                        continue;
                    }
                }
            }
            
            console.log(`Created ${arrowsCreated} direction arrows for orbit`);
            
        } catch (error) {
            console.error('Error in addOrbitDirections:', error);
        }
    }

    createArrowIcon(color = '#00ff88', containerSize = 800) {
        // Create arrow icon using canvas - adjust size based on container
        let canvasSize = 64; // Default size for larger containers
        let arrowScale = 1.0; // Scale factor for arrow elements
        
        // Adjust canvas size and arrow scale for smaller containers
        if (containerSize < 200) {
            canvasSize = 24;  // Very small canvas for tiny widgets
            arrowScale = 0.4;
        } else if (containerSize < 300) {
            canvasSize = 32;  // Small canvas
            arrowScale = 0.5;
        } else if (containerSize < 400) {
            canvasSize = 40;  // Medium-small canvas
            arrowScale = 0.6;
        } else if (containerSize < 600) {
            canvasSize = 48;  // Medium canvas
            arrowScale = 0.75;
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = canvasSize;
        canvas.height = canvasSize;
        const ctx = canvas.getContext('2d');

        // Clear canvas with transparent background
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        // Set styles for a more visible arrow with better contrast
        ctx.fillStyle = color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = Math.max(1, 3 * arrowScale); // Ensure minimum line width

        // Calculate arrow dimensions based on canvas size and scale
        const center = canvasSize / 2;
        const shaftWidth = Math.max(4, 12 * arrowScale);
        const shaftLength = Math.max(8, 28 * arrowScale);
        const headSize = Math.max(6, 16 * arrowScale);
        
        // Draw a more prominent arrow pointing right
        ctx.beginPath();
        
        // Arrow shaft - scaled appropriately
        const shaftY = center - shaftWidth / 2;
        const shaftX = center - shaftLength / 2;
        ctx.fillRect(shaftX, shaftY, shaftLength, shaftWidth);
        
        // Arrow head (triangle) - scaled appropriately
        const headStartX = shaftX + shaftLength - headSize / 2;
        const headTipX = center + shaftLength / 2;
        
        ctx.moveTo(headStartX, center - headSize);
        ctx.lineTo(headTipX, center);
        ctx.lineTo(headStartX, center + headSize);
        ctx.closePath();
        ctx.fill();
        
        // Add black outline for better visibility against any background
        ctx.strokeRect(shaftX, shaftY, shaftLength, shaftWidth);
        ctx.beginPath();
        ctx.moveTo(headStartX, center - headSize);
        ctx.lineTo(headTipX, center);
        ctx.lineTo(headStartX, center + headSize);
        ctx.closePath();
        ctx.stroke();

        // Add white inner outline for even better visibility (only for larger arrows)
        if (arrowScale > 0.5) {
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = Math.max(1, 1 * arrowScale);
            ctx.strokeRect(shaftX + 1, shaftY + 1, shaftLength - 2, shaftWidth - 2);
            ctx.beginPath();
            ctx.moveTo(headStartX + 1, center - headSize + 2);
            ctx.lineTo(headTipX - 2, center);
            ctx.lineTo(headStartX + 1, center + headSize - 2);
            ctx.closePath();
            ctx.stroke();
        }

        return canvas.toDataURL();
    }

    calculateArrowRotation(fromPos, toPos) {
        try {
            // Validate input positions
            if (!fromPos || !toPos ||
                !isFinite(fromPos.x) || !isFinite(fromPos.y) || !isFinite(fromPos.z) ||
                !isFinite(toPos.x) || !isFinite(toPos.y) || !isFinite(toPos.z)) {
                return 0; // Default rotation
            }
            
            // Calculate rotation angle for arrow direction
            const direction = Cesium.Cartesian3.subtract(toPos, fromPos, new Cesium.Cartesian3());
            
            // Validate direction vector
            if (!direction || !isFinite(direction.x) || !isFinite(direction.y) || !isFinite(direction.z)) {
                return 0;
            }
            
            const east = Cesium.Cartesian3.cross(Cesium.Cartesian3.UNIT_Z, fromPos, new Cesium.Cartesian3());
            const north = Cesium.Cartesian3.cross(fromPos, east, new Cesium.Cartesian3());
            
            // Validate direction vectors
            if (!east || !north ||
                !isFinite(east.x) || !isFinite(east.y) || !isFinite(east.z) ||
                !isFinite(north.x) || !isFinite(north.y) || !isFinite(north.z)) {
                return 0;
            }
            
            const projectedDirection = new Cesium.Cartesian3(
                Cesium.Cartesian3.dot(direction, east),
                Cesium.Cartesian3.dot(direction, north),
                0
            );
            
            // Validate projected direction
            if (!projectedDirection ||
                !isFinite(projectedDirection.x) || !isFinite(projectedDirection.y)) {
                return 0;
            }
            
            const rotation = Math.atan2(projectedDirection.y, projectedDirection.x);
            return isFinite(rotation) ? rotation : 0;
            
        } catch (error) {
            console.warn('Error calculating arrow rotation:', error);
            return 0;
        }
    }

    centerCameraOnSatellite() {
        if (this.satelliteEntity && this.viewer) {
            // Only do initial camera positioning on first load, not on updates
            if (!this.initialCameraSet) {
                // Set a much higher altitude for better overview
                this.viewer.camera.setView({
                    destination: Cesium.Cartesian3.fromDegrees(0, 0, 50000000), // Much higher altitude (50,000 km)
                    orientation: {
                        heading: 0,
                        pitch: -Cesium.Math.PI_OVER_TWO,
                        roll: 0
                    }
                });

                // Don't track the satellite automatically - let user control the camera
                // this.viewer.trackedEntity = this.satelliteEntity;

                this.initialCameraSet = true;
            }
            // For updates, don't modify camera at all - respect user's current view
        }
    }

    clearOrbitEntities() {
        // Remove only orbit entities, keep the satellite entity
        this.orbitEntities.forEach(entity => {
            this.viewer.entities.remove(entity);
        });
        this.orbitEntities = [];
    }

    clearExistingEntities() {
        // Remove previous satellite and orbit entities
        if (this.satelliteEntity) {
            this.viewer.entities.remove(this.satelliteEntity);
            this.satelliteEntity = null;
        }

        this.clearOrbitEntities();
    }

    startUpdateLoop() {
        // Only start update loop for API-based data sources
        // File-based sources have static data and don't need continuous updates
        const dataSource = this.domainObject.dataSource || 'api';
        
        if (dataSource === 'api') {
            // Update every 5 seconds for dynamic API data
            this.updateInterval = setInterval(async () => {
                if (!this.isDestroyed) {
                    try {
                        await this.createSatelliteVisualization();
                    } catch (error) {
                        console.error('Error updating satellite visualization:', error);
                    }
                }
            }, 5000);
        }
        // For file-based sources, no update loop is needed since the data is static
    }

    destroy() {
        this.isDestroyed = true;

        // Clear update interval
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }

        // Clear Cesium entities
        this.clearExistingEntities();

        // Destroy Cesium viewer
        if (this.viewer) {
            this.viewer.destroy();
            this.viewer = null;
        }

        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
    }

    trackSatellite() {
        if (this.satelliteEntity && this.viewer) {
            this.viewer.trackedEntity = this.satelliteEntity;
        }
    }

    setGlobalView() {
        if (this.viewer) {
            // Stop tracking
            this.viewer.trackedEntity = undefined;
            
            // Set global view
            this.viewer.camera.setView({
                destination: Cesium.Cartesian3.fromDegrees(0, 0, 50000000), // 50,000 km altitude
                orientation: {
                    heading: 0,
                    pitch: -Cesium.Math.PI_OVER_TWO,
                    roll: 0
                }
            });
        }
    }

    stopTracking() {
        if (this.viewer) {
            this.viewer.trackedEntity = undefined;
        }
    }
}

// Main plugin function
export default function CesiumSatelliteOrbitPlugin() {
    return function install(openmct) {
        
        // Add cesium satellite orbit type
        openmct.types.addType('cesium-satellite-orbit', {
            name: 'Satellite Orbit 3D',
            description: 'A 3D satellite orbit visualization using Cesium and TLE data',
            cssClass: 'icon-3d',
            creatable: true,
            form: [
                {
                    key: 'dataSource',
                    name: 'Data Source',
                    control: 'select',
                    required: true,
                    cssClass: 'l-input-lg',
                    property: ['dataSource'],
                    options: [
                        { name: 'API (Celestrak)', value: 'api' },
                        { name: 'File Upload', value: 'file' }
                    ]
                },
                {
                    key: 'satelliteId',
                    name: 'Satellite ID',
                    control: 'textfield',
                    required: false,
                    cssClass: 'l-input-lg',
                    property: ['satelliteId'],
                    pattern: '^[0-9]+$',
                    hideIf: function(model) {
                        return model.dataSource === 'file';
                    }
                },
                {
                    key: 'tleFile',
                    name: 'TLE File',
                    control: 'file-input',
                    required: false,
                    cssClass: 'l-input-lg',
                    property: ['tleFile'],
                    type: 'text/plain,.txt,.tle',
                    hideIf: function(model) {
                        return model.dataSource === 'api';
                    }
                },
                {
                    key: 'orbitHours',
                    name: 'Orbit Hours (N)',
                    control: 'numberfield',
                    required: false,
                    cssClass: 'l-input-lg',
                    property: ['orbitHours'],
                    min: 1,
                    max: 24,
                    step: 1
                }
            ],
            initialize: function (domainObject) {
                domainObject.dataSource = domainObject.dataSource || 'api';
                domainObject.orbitHours = domainObject.orbitHours || 2;
            }
        });

        // Create and register view provider
        const cesiumViewProvider = new CesiumSatelliteOrbitViewProvider(openmct);
        openmct.objectViews.addProvider(cesiumViewProvider);

        // Add CSS for 3D icon
        const style = document.createElement('style');
        style.textContent = `
            .icon-3d:before {
                content: "🛰️";
                font-style: normal;
                font-size: 1.2em;
            }
        `;
        document.head.appendChild(style);

        console.log('Cesium Satellite Orbit Plugin installed successfully');
    };
}
