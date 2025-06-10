(() => {
    const canvas = document.getElementById("orbitCanvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = canvas.width;
    const H = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
  
    const EARTH_RADIUS_KM = 6371;
    const DISPLAY_SCALE = 0.03; // px/km scale
  
    let telemetry = null;
  
    // Fetch telemetry every second
    async function fetchTelemetry() {
      try {
        const res = await fetch("/get-telemetry");
        telemetry = await res.json();
      } catch (err) {
        console.error("Telemetry fetch failed", err);
      }
    }
    fetchTelemetry();
    setInterval(fetchTelemetry, 1000);
  
    // Main render loop
    function draw() {
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, W, H);
  
      // Earth
      const earthPx = EARTH_RADIUS_KM * DISPLAY_SCALE;
      ctx.fillStyle = "#0057a0";
      ctx.beginPath();
      ctx.arc(cx, cy, earthPx, 0, 2 * Math.PI);
      ctx.fill();
  
      if (telemetry) {
        const radius_km = telemetry.radius;
        const angle_rad = telemetry.angle * Math.PI / 180;
  
        const orbitPx = radius_km * DISPLAY_SCALE;
  
        // Draw orbit ring
        ctx.strokeStyle = "#333";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(cx, cy, orbitPx, 0, 2 * Math.PI);
        ctx.stroke();
  
        // Satellite position
        const sx = cx + orbitPx * Math.cos(angle_rad);
        const sy = cy + orbitPx * Math.sin(angle_rad);
  
        // Draw trail
        const trail = window._trail ||= [];
        trail.unshift({ x: sx, y: sy });
        if (trail.length > 80) trail.pop();
        ctx.strokeStyle = "rgba(255,255,255,0.3)";
        ctx.beginPath();
        trail.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();
  
        // Draw satellite
        ctx.fillStyle = "#ffdd57";
        ctx.beginPath();
        ctx.arc(sx, sy, 6, 0, 2 * Math.PI);
        ctx.fill();
  
        // Text
        ctx.fillStyle = "#fff";
        ctx.font = "12px monospace";
        ctx.fillText(`vx: ${telemetry.vx.toFixed(2)} km/s`, 10, 20);
        ctx.fillText(`vy: ${telemetry.vy.toFixed(2)} km/s`, 10, 36);
        ctx.fillText(`alt: ${telemetry.altitude.toFixed(1)} km`, 10, 52);
        ctx.fillText(`status: ${telemetry.status}`, 10, 68);
      }
  
      requestAnimationFrame(draw);
    }
  
    requestAnimationFrame(draw);
  })();
  