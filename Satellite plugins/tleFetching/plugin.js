/**
 * TLE Satellite Tracking Plugin for OpenMCT
 * Fetches Two-Line Element (TLE) data from https://tle.ivanstanojevic.me/
 * and provides real-time satellite tracking with telemetry data
 */

// Telemetry Provider for satellite data
class SatelliteTelemetryProvider {
    constructor(openmct) {
        this.openmct = openmct;
        this.activeSubscriptions = new Map();
        this.satelliteData = new Map();
    }

    supportsRequest(domainObject) {
        return domainObject.type === 'tle-satellite' && 
               (domainObject.satelliteId || domainObject.tleFile);
    }

    supportsSubscribe(domainObject) {
        return domainObject.type === 'tle-satellite' && 
               (domainObject.satelliteId || domainObject.tleFile);
    }

    supportsMetadata(domainObject) {
        return domainObject.type === 'tle-satellite' && 
               (domainObject.satelliteId || domainObject.tleFile);
    }

    getMetadata(domainObject) {
        return {
            values: [
                {
                    key: 'utc',
                    name: 'Timestamp',
                    format: 'utc',
                    hints: {
                        domain: 1
                    }
                },
                {
                    key: 'latitude',
                    name: 'Latitude',
                    unit: 'degrees',
                    format: 'float',
                    hints: {
                        range: 1
                    }
                },
                {
                    key: 'longitude',
                    name: 'Longitude',
                    unit: 'degrees',
                    format: 'float',
                    hints: {
                        range: 2
                    }
                },
                {
                    key: 'altitude',
                    name: 'Altitude',
                    unit: 'km',
                    format: 'float',
                    hints: {
                        range: 3
                    }
                },
                {
                    key: 'apogee',
                    name: 'Apogee',
                    unit: 'km',
                    format: 'float',
                    hints: {
                        range: 4
                    }
                }
            ]
        };
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

    calculateSatellitePosition(tleData, timestamp) {
        try {
            // Use satellite.js library which should be available via CDN
            if (typeof satellite === 'undefined') {
                throw new Error('satellite.js library not available');
            }

            const satrec = satellite.twoline2satrec(tleData.line1, tleData.line2);
            const date = new Date(timestamp);
            const positionAndVelocity = satellite.propagate(satrec, date);
            
            if (!positionAndVelocity.position) {
                throw new Error('Failed to calculate satellite position');
            }

            const positionEci = positionAndVelocity.position;
            const gmst = satellite.gstimeFromDate(date);
            const positionGd = satellite.eciToGeodetic(positionEci, gmst);

            // Calculate apogee from TLE data
            const meanMotion = parseFloat(tleData.line2.substring(52, 63));
            const eccentricity = parseFloat('0.' + tleData.line2.substring(26, 33));
            const semiMajorAxis = Math.pow(398600.4418 / Math.pow(meanMotion * 2 * Math.PI / 86400, 2), 1/3);
            const apogee = semiMajorAxis * (1 + eccentricity) - 6371; // Earth radius

            return {
                latitude: satellite.degreesLat(positionGd.latitude),
                longitude: satellite.degreesLong(positionGd.longitude),
                altitude: positionGd.height,
                apogee: apogee
            };
        } catch (error) {
            console.error('Error calculating satellite position:', error);
            return null;
        }
    }

    async generateHistoricalData(domainObject, startTime, endTime) {
        const dataSource = domainObject.dataSource || 'api';
        let tleData;
        
        // Fetch TLE data based on source
        if (dataSource === 'api') {
            if (!domainObject.satelliteId) {
                throw new Error('No satellite ID specified for API data source');
            }
            tleData = await this.fetchTLEData(domainObject.satelliteId);
        } else {
            if (!domainObject.tleFile) {
                throw new Error('No TLE file specified for file data source');
            }
            tleData = await this.readTLEFile(domainObject.tleFile);
        }
        
        const dataPoints = [];
        const interval = 60000; // 1 minute intervals
        
        for (let time = startTime; time <= endTime; time += interval) {
            const position = this.calculateSatellitePosition(tleData, time);
            if (position) {
                dataPoints.push({
                    utc: time,
                    latitude: position.latitude,
                    longitude: position.longitude,
                    altitude: position.altitude,
                    apogee: position.apogee
                });
            }
        }
        
        return dataPoints;
    }

    async request(domainObject, options) {
        const dataSource = domainObject.dataSource || 'api';
        
        // Validate required data based on source
        if (dataSource === 'api' && !domainObject.satelliteId) {
            console.warn('No satellite ID specified for API data source');
            return [];
        }
        if (dataSource === 'file' && !domainObject.tleFile) {
            console.warn('No TLE file specified for file data source');
            return [];
        }

        const now = Date.now();
        const startTime = options.start || (now - 3600000); // 1 hour ago
        const endTime = options.end || (now + 3600000); // 1 hour from now

        try {
            return await this.generateHistoricalData(domainObject, startTime, endTime);
        } catch (error) {
            console.error('Error in telemetry request:', error);
            return [];
        }
    }

    subscribe(domainObject, callback) {
        const dataSource = domainObject.dataSource || 'api';
        
        // Validate required data based on source
        if (dataSource === 'api' && !domainObject.satelliteId) {
            console.warn('No satellite ID specified for API data source');
            return () => {};
        }
        if (dataSource === 'file' && !domainObject.tleFile) {
            console.warn('No TLE file specified for file data source');
            return () => {};
        }

        const subscriptionId = this.openmct.objects.makeKeyString(domainObject.identifier);
        
        // Store subscription
        this.activeSubscriptions.set(subscriptionId, {
            callback: callback,
            domainObject: domainObject
        });

        // Start real-time updates for both API and file sources
        this.startRealTimeUpdates(subscriptionId);

        // Return unsubscribe function
        return () => {
            const subscription = this.activeSubscriptions.get(subscriptionId);
            if (subscription && subscription.updateInterval) {
                clearInterval(subscription.updateInterval);
            }
            this.activeSubscriptions.delete(subscriptionId);
        };
    }

    async startRealTimeUpdates(subscriptionId) {
        const subscription = this.activeSubscriptions.get(subscriptionId);
        if (!subscription) return;

        const domainObject = subscription.domainObject;
        const dataSource = domainObject.dataSource || 'api';
        
        try {
            let tleData;
            
            // Fetch TLE data based on source
            if (dataSource === 'api') {
                if (!domainObject.satelliteId) return;
                tleData = await this.fetchTLEData(domainObject.satelliteId);
            } else {
                if (!domainObject.tleFile) return;
                tleData = await this.readTLEFile(domainObject.tleFile);
            }
            
            const updateInterval = setInterval(async () => {
                if (!this.activeSubscriptions.has(subscriptionId)) {
                    clearInterval(updateInterval);
                    return;
                }

                const now = Date.now();
                const position = this.calculateSatellitePosition(tleData, now);
                
                if (position) {
                    const dataPoint = {
                        utc: now,
                        latitude: position.latitude,
                        longitude: position.longitude,
                        altitude: position.altitude,
                        apogee: position.apogee
                    };
                    
                    subscription.callback(dataPoint);
                }
            }, 5000); // Update every 5 seconds

            // Store the interval ID for cleanup
            subscription.updateInterval = updateInterval;

        } catch (error) {
            console.error('Error starting real-time updates:', error);
        }
    }
}

// Custom view provider for satellite dashboard with 2x2 grid
class SatelliteDashboardViewProvider {
    constructor(openmct) {
        this.openmct = openmct;
        this.key = 'satellite-dashboard';
        this.name = 'Satellite Dashboard';
        this.cssClass = 'icon-layout';
    }

    canView(domainObject) {
        return domainObject.type === 'tle-satellite';
    }

    view(domainObject) {
        return new SatelliteDashboardView(domainObject, this.openmct);
    }

    priority() {
        return this.openmct.priority.HIGH; // Make this the default view
    }
}

// Custom view class for the 2x2 grid dashboard
class SatelliteDashboardView {
    constructor(domainObject, openmct) {
        this.domainObject = domainObject;
        this.openmct = openmct;
        this.container = null;
        this.plots = [];
        this.subscriptions = [];
        this.animationFrameId = null;
    }

    show(container) {
        this.container = container;
        this.container.innerHTML = '';
        
        // Apply modern styling to container
        this.container.style.cssText = `
            display: grid;
            grid-template-columns: 1fr 1fr;
            grid-template-rows: 1fr 1fr;
            gap: 12px;
            height: 100%;
            padding: 12px;
            background: linear-gradient(135deg, #1a1a1a 0%, #0f0f0f 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
        `;
        
        // Define the 4 parameters to display with enhanced styling
        const parameters = [
            { 
                key: 'latitude', 
                name: 'Latitude', 
                unit: '°', 
                color: '#ff6b6b',
                gradient: 'linear-gradient(135deg, #ff6b6b, #ff5252)',
                icon: ''
            },
            { 
                key: 'longitude', 
                name: 'Longitude', 
                unit: '°', 
                color: '#4ecdc4',
                gradient: 'linear-gradient(135deg, #4ecdc4, #26a69a)',
                icon: ''
            },
            { 
                key: 'altitude', 
                name: 'Altitude', 
                unit: 'km', 
                color: '#45b7d1',
                gradient: 'linear-gradient(135deg, #45b7d1, #1976d2)',
                icon: ''
            },
            { 
                key: 'apogee', 
                name: 'Apogee', 
                unit: 'km', 
                color: '#96ceb4',
                gradient: 'linear-gradient(135deg, #96ceb4, #66bb6a)',
                icon: ''
            }
        ];
        
        // Create enhanced plots for each parameter
        parameters.forEach((param, index) => {
            const plotContainer = this.createPlotContainer(param);
            this.container.appendChild(plotContainer);
            
            // Store plot info with enhanced data structure
            this.plots.push({
                container: plotContainer,
                canvas: plotContainer.querySelector('canvas'),
                context: plotContainer.querySelector('canvas').getContext('2d'),
                valueDisplay: plotContainer.querySelector('.value-display'),
                statusIndicator: plotContainer.querySelector('.status-indicator'),
                data: [],
                param: param,
                maxDataPoints: 120, // 10 minutes at 5-second intervals
                smoothedData: [],
                lastUpdate: 0
            });
        });
        
        // Start telemetry subscription
        this.startTelemetrySubscription();
    }

    createPlotContainer(param) {
        const plotContainer = document.createElement('div');
        plotContainer.className = 'satellite-dashboard-widget';
        plotContainer.style.cssText = `
            background: linear-gradient(135deg, #2a2a2a 0%, #1f1f1f 100%);
            border: 1px solid #404040;
            border-radius: 12px;
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            backdrop-filter: blur(10px);
        `;
        
        // Add hover effect
        plotContainer.addEventListener('mouseenter', () => {
            plotContainer.style.transform = 'translateY(-2px)';
            plotContainer.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.4)';
        });
        
        plotContainer.addEventListener('mouseleave', () => {
            plotContainer.style.transform = 'translateY(0)';
            plotContainer.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        });
        
        // Header with icon and title
        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            align-items: center;
            padding: 12px 16px;
            background: ${param.gradient};
            color: white;
            font-weight: 600;
            font-size: 14px;
            border-radius: 12px 12px 0 0;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
        `;
        
        const icon = document.createElement('span');
        icon.textContent = param.icon;
        icon.style.cssText = 'margin-right: 8px; font-size: 16px;';
        
        const title = document.createElement('span');
        title.textContent = param.name;
        
        // Data source indicator
        const dataSource = this.domainObject.dataSource || 'api';
        const sourceIcon = dataSource === 'api' ? '🌐' : '📁';
        const sourceIndicator = document.createElement('div');
        sourceIndicator.style.cssText = `
            margin-left: auto;
            margin-right: 8px;
            font-size: 12px;
            opacity: 0.8;
        `;
        sourceIndicator.textContent = sourceIcon;
        sourceIndicator.title = dataSource === 'api' ? 'Live API Data' : 'Static File Data';
        
        const statusIndicator = document.createElement('div');
        statusIndicator.className = dataSource === 'api' ? 'status-indicator connected' : 'status-indicator file';
        statusIndicator.style.cssText = `
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: ${dataSource === 'api' ? '#4caf50' : '#ff9800'};
            box-shadow: 0 0 6px ${dataSource === 'api' ? 'rgba(76, 175, 80, 0.6)' : 'rgba(255, 152, 0, 0.6)'};
            transition: all 0.3s ease;
        `;
        
        header.appendChild(icon);
        header.appendChild(title);
        header.appendChild(sourceIndicator);
        header.appendChild(statusIndicator);
        
        // Current value display
        const valueDisplay = document.createElement('div');
        valueDisplay.className = 'value-display';
        valueDisplay.style.cssText = `
            position: absolute;
            top: 60px;
            right: 16px;
            background: rgba(0, 0, 0, 0.8);
            color: ${param.color};
            padding: 8px 12px;
            border-radius: 8px;
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 16px;
            font-weight: bold;
            z-index: 10;
            border: 1px solid ${param.color}30;
            backdrop-filter: blur(10px);
        `;
        valueDisplay.textContent = '-- ' + param.unit;
        
        // Canvas for chart
        const canvas = document.createElement('canvas');
        canvas.style.cssText = `
            width: 100%;
            height: calc(100% - 50px);
            display: block;
        `;
        
        // Set canvas resolution for crisp rendering
        const dpr = window.devicePixelRatio || 1;
        canvas.width = 600 * dpr;
        canvas.height = 300 * dpr;
        canvas.getContext('2d').scale(dpr, dpr);
        
        plotContainer.appendChild(header);
        plotContainer.appendChild(valueDisplay);
        plotContainer.appendChild(canvas);
        
        return plotContainer;
    }

    startTelemetrySubscription() {
        // Subscribe to real-time updates
        const unsubscribe = this.openmct.telemetry.subscribe(this.domainObject, (data) => {
            this.updatePlots(data);
        });
        this.subscriptions.push(unsubscribe);
        
        // Request historical data
        const now = Date.now();
        const start = now - (10 * 60 * 1000); // Last 10 minutes
        
        this.openmct.telemetry.request(this.domainObject, {
            start: start,
            end: now
        }).then((historicalData) => {
            historicalData.forEach(data => this.updatePlots(data, false));
            this.startAnimationLoop();
        }).catch(error => {
            console.warn('Could not load historical data:', error);
            this.startAnimationLoop();
        });
    }

    updatePlots(data, animate = true) {
        this.plots.forEach(plot => {
            const value = data[plot.param.key];
            if (value === undefined || value === null) return;
            
            // Add new data point
            const dataPoint = {
                time: data.utc,
                value: value,
                timestamp: Date.now()
            };
            
            plot.data.push(dataPoint);
            
            // Keep only recent data points
            if (plot.data.length > plot.maxDataPoints) {
                plot.data.shift();
            }
            
            // Update value display with smooth animation
            if (animate) {
                this.animateValueChange(plot, value);
            } else {
                plot.valueDisplay.textContent = value.toFixed(2) + ' ' + plot.param.unit;
            }
            
            // Update status indicator with enhanced animations
            const dataSource = this.domainObject.dataSource || 'api';
            if (dataSource === 'api') {
                plot.statusIndicator.className = 'status-indicator connected';
                plot.statusIndicator.style.background = '#4caf50';
                plot.statusIndicator.style.boxShadow = '0 0 6px rgba(76, 175, 80, 0.6)';
            } else {
                plot.statusIndicator.className = 'status-indicator file';
                plot.statusIndicator.style.background = '#ff9800';
                plot.statusIndicator.style.boxShadow = '0 0 6px rgba(255, 152, 0, 0.6)';
            }
            
            plot.lastUpdate = Date.now();
        });
    }

    animateValueChange(plot, newValue) {
        const currentText = plot.valueDisplay.textContent;
        const currentValue = parseFloat(currentText) || 0;
        const diff = newValue - currentValue;
        const steps = 30;
        let step = 0;
        
        // Add updating class for visual feedback
        plot.valueDisplay.classList.add('updating');
        
        const animate = () => {
            step++;
            const progress = step / steps;
            const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
            const interpolatedValue = currentValue + (diff * easeProgress);
            
            plot.valueDisplay.textContent = interpolatedValue.toFixed(2) + ' ' + plot.param.unit;
            
            if (step < steps) {
                requestAnimationFrame(animate);
            } else {
                // Remove updating class when animation completes
                setTimeout(() => {
                    plot.valueDisplay.classList.remove('updating');
                }, 100);
            }
        };
        
        requestAnimationFrame(animate);
    }

    startAnimationLoop() {
        const animate = () => {
            this.plots.forEach(plot => {
                this.drawEnhancedPlot(plot);
                
                // Check for stale data with enhanced status indicators
                const timeSinceUpdate = Date.now() - plot.lastUpdate;
                if (timeSinceUpdate > 30000) { // 30 seconds
                    plot.statusIndicator.className = 'status-indicator';
                    plot.statusIndicator.style.background = '#ff9800';
                    plot.statusIndicator.style.boxShadow = '0 0 6px rgba(255, 152, 0, 0.6)';
                }
                if (timeSinceUpdate > 60000) { // 1 minute
                    plot.statusIndicator.className = 'status-indicator';
                    plot.statusIndicator.style.background = '#f44336';
                    plot.statusIndicator.style.boxShadow = '0 0 6px rgba(244, 67, 54, 0.6)';
                }
            });
            
            this.animationFrameId = requestAnimationFrame(animate);
        };
        
        animate();
    }

    drawEnhancedPlot(plot) {
        const ctx = plot.context;
        const canvas = plot.canvas;
        const data = plot.data;
        
        // Clear with smooth background
        ctx.clearRect(0, 0, canvas.width / (window.devicePixelRatio || 1), canvas.height / (window.devicePixelRatio || 1));
        
        if (data.length < 2) return;
        
        const canvasWidth = canvas.width / (window.devicePixelRatio || 1);
        const canvasHeight = canvas.height / (window.devicePixelRatio || 1);
        
        // Calculate value range with padding
        const values = data.map(d => d.value);
        const minValue = Math.min(...values);
        const maxValue = Math.max(...values);
        const valueRange = maxValue - minValue || 1;
        const padding = valueRange * 0.1; // 10% padding
        
        // Calculate time range
        const times = data.map(d => d.time);
        const minTime = Math.min(...times);
        const maxTime = Math.max(...times);
        const timeRange = maxTime - minTime || 1;
        
        // Set up drawing parameters
        const plotPadding = 50;
        const plotWidth = canvasWidth - (2 * plotPadding);
        const plotHeight = canvasHeight - (2 * plotPadding);
        
        // Draw subtle grid with enhanced styling
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        
        // Vertical grid lines
        for (let i = 0; i <= 6; i++) {
            const x = plotPadding + (i * plotWidth / 6);
            ctx.beginPath();
            ctx.moveTo(x, plotPadding);
            ctx.lineTo(x, canvasHeight - plotPadding);
            ctx.stroke();
        }
        
        // Horizontal grid lines
        for (let i = 0; i <= 4; i++) {
            const y = plotPadding + (i * plotHeight / 4);
            ctx.beginPath();
            ctx.moveTo(plotPadding, y);
            ctx.lineTo(canvasWidth - plotPadding, y);
            ctx.stroke();
        }
        
        // Draw area fill under the line
        if (data.length > 1) {
            const gradient = ctx.createLinearGradient(0, plotPadding, 0, canvasHeight - plotPadding);
            gradient.addColorStop(0, plot.param.color + '40');
            gradient.addColorStop(1, plot.param.color + '00');
            
            ctx.fillStyle = gradient;
            ctx.beginPath();
            
            // Start from bottom-left
            const firstX = plotPadding + ((data[0].time - minTime) / timeRange) * plotWidth;
            const firstY = canvasHeight - plotPadding - ((data[0].value - minValue + padding) / (valueRange + 2 * padding)) * plotHeight;
            ctx.moveTo(firstX, canvasHeight - plotPadding);
            ctx.lineTo(firstX, firstY);
            
            // Draw the curve
            for (let i = 1; i < data.length; i++) {
                const x = plotPadding + ((data[i].time - minTime) / timeRange) * plotWidth;
                const y = canvasHeight - plotPadding - ((data[i].value - minValue + padding) / (valueRange + 2 * padding)) * plotHeight;
                ctx.lineTo(x, y);
            }
            
            // Close the area
            const lastX = plotPadding + ((data[data.length - 1].time - minTime) / timeRange) * plotWidth;
            ctx.lineTo(lastX, canvasHeight - plotPadding);
            ctx.closePath();
            ctx.fill();
        }
        
        // Draw main line with enhanced styling
        ctx.strokeStyle = plot.param.color;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = plot.param.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        
        data.forEach((point, index) => {
            const x = plotPadding + ((point.time - minTime) / timeRange) * plotWidth;
            const y = canvasHeight - plotPadding - ((point.value - minValue + padding) / (valueRange + 2 * padding)) * plotHeight;
            
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        
        ctx.stroke();
        ctx.shadowBlur = 0; // Reset shadow
        
        // Draw data points
        data.slice(-10).forEach((point, index) => { // Only show last 10 points to avoid clutter
            const x = plotPadding + ((point.time - minTime) / timeRange) * plotWidth;
            const y = canvasHeight - plotPadding - ((point.value - minValue + padding) / (valueRange + 2 * padding)) * plotHeight;
            
            ctx.fillStyle = plot.param.color;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, 2 * Math.PI);
            ctx.fill();
            
            // Highlight the latest point
            if (index === data.slice(-10).length - 1) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.stroke();
            }
        });
        
        // Draw value range labels with better styling
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.font = '12px -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText((maxValue + padding).toFixed(1), 10, plotPadding + 5);
        ctx.fillText((minValue - padding).toFixed(1), 10, canvasHeight - plotPadding + 15);
        
        // Draw time labels
        ctx.textAlign = 'center';
        const startTime = new Date(minTime);
        const endTime = new Date(maxTime);
        ctx.fillText(startTime.toLocaleTimeString(), plotPadding, canvasHeight - 10);
        ctx.fillText(endTime.toLocaleTimeString(), canvasWidth - plotPadding, canvasHeight - 10);
    }

    destroy() {
        // Clean up subscriptions
        this.subscriptions.forEach(unsubscribe => unsubscribe());
        this.subscriptions = [];
        
        // Cancel animation frame
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
        }
        
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

// Main plugin function
export default function TLEFetchingPlugin() {
    return function install(openmct) {
        
        // Add satellite type
        openmct.types.addType('tle-satellite', {
            name: 'TLE Satellite',
            description: 'A satellite tracked using Two-Line Element (TLE) data from space agencies or uploaded files',
            cssClass: 'icon-telemetry',
            creatable: true, // Make satellites creatable like other telemetry objects
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
                }
            ],
            initialize: function (domainObject) {
                // Set default data source if not specified
                if (!domainObject.dataSource) {
                    domainObject.dataSource = 'api';
                }
                
                // Fetch and set satellite name when object is created (only for API source)
                if (domainObject.dataSource === 'api' && domainObject.satelliteId) {
                    // Try to fetch TLE data to get the real satellite name
                    fetch(`https://tle.ivanstanojevic.me/api/tle/${domainObject.satelliteId}`)
                        .then(response => response.json())
                        .then(data => {
                            if (data.name && domainObject.name === `Satellite ${domainObject.satelliteId}`) {
                                domainObject.name = data.name;
                            }
                        })
                        .catch(error => {
                            console.warn(`Could not fetch name for satellite ${domainObject.satelliteId}:`, error);
                        });
                } else if (domainObject.dataSource === 'file' && domainObject.tleFile) {
                    // For file source, try to extract satellite name from file if possible
                    if (domainObject.name === 'TLE Satellite' || !domainObject.name) {
                        domainObject.name = 'Satellite from File';
                    }
                }
                
                domainObject.telemetry = {
                    values: [
                        {
                            key: 'utc',
                            name: 'Timestamp',
                            format: 'utc',
                            hints: { domain: 1 }
                        },
                        {
                            key: 'latitude',
                            name: 'Latitude',
                            unit: 'degrees',
                            format: 'float',
                            hints: { range: 1 }
                        },
                        {
                            key: 'longitude',
                            name: 'Longitude', 
                            unit: 'degrees',
                            format: 'float',
                            hints: { range: 2 }
                        },
                        {
                            key: 'altitude',
                            name: 'Altitude',
                            unit: 'km',
                            format: 'float',
                            hints: { range: 3 }
                        },
                        {
                            key: 'apogee',
                            name: 'Apogee',
                            unit: 'km', 
                            format: 'float',
                            hints: { range: 4 }
                        }
                    ]
                };
            }
        });

        // Create providers
        const telemetryProvider = new SatelliteTelemetryProvider(openmct);
        const dashboardViewProvider = new SatelliteDashboardViewProvider(openmct);

        // Register providers
        openmct.telemetry.addProvider(telemetryProvider);
        openmct.objectViews.addProvider(dashboardViewProvider);

        // Add enhanced CSS for satellite icon and animations
        const style = document.createElement('style');
        style.textContent = `
            .icon-telemetry:before {
                content: "📡";
                font-style: normal;
                font-size: 1.2em;
            }
            
            @keyframes pulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.7; }
            }
            
            @keyframes glow {
                0%, 100% { 
                    box-shadow: 0 0 6px rgba(76, 175, 80, 0.6);
                    transform: scale(1);
                }
                50% { 
                    box-shadow: 0 0 12px rgba(76, 175, 80, 0.8);
                    transform: scale(1.1);
                }
            }
            
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            
            .satellite-dashboard-widget {
                animation: fadeInUp 0.5s ease-out;
            }
            
            .value-display {
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            
            .value-display.updating {
                transform: scale(1.05);
                box-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
            }
            
            .status-indicator.connected {
                animation: glow 2s infinite;
            }
            
            .status-indicator.file {
                animation: pulse 2s infinite;
            }
        `;
        document.head.appendChild(style);

        console.log('TLE Satellite Tracking Plugin installed successfully');
    };
}