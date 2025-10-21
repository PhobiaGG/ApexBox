/**
 * Realistic Racing Telemetry Simulator
 * Generates smooth acceleration/deceleration curves with realistic noise
 */

export interface TelemetryData {
  speed: number;          // km/h (0-200)
  g_force: number;        // g (0-3)
  temperature: number;    // °C (20-95)
  altitude: number;       // meters (0-2000)
  timestamp_ms: number;
}

export class TelemetrySimulator {
  private currentSpeed: number = 0;
  private targetSpeed: number = 0;
  private baseAltitude: number = 350;
  private engineTemp: number = 65;
  private isAccelerating: boolean = false;
  private phaseStartTime: number = Date.now();
  private currentPhase: 'idle' | 'accel' | 'cruise' | 'decel' = 'idle';

  /**
   * Generate next telemetry sample with realistic racing patterns
   */
  generateSample(): TelemetryData {
    const now = Date.now();
    const elapsedMs = now - this.phaseStartTime;

    // Phase transitions for realistic racing simulation
    this.updatePhase(elapsedMs);

    // Update speed with smooth acceleration/deceleration
    this.updateSpeed();

    // Calculate G-force based on speed change (realistic correlation)
    const gForce = this.calculateGForce();

    // Update temperature based on speed and engine load
    this.updateTemperature();

    // Update altitude with minor variations
    this.updateAltitude();

    return {
      speed: this.addNoise(this.currentSpeed, 1.5),
      g_force: this.addNoise(gForce, 0.08),
      temperature: this.addNoise(this.engineTemp, 1.0),
      altitude: this.addNoise(this.baseAltitude, 2.0),
      timestamp_ms: now,
    };
  }

  /**
   * Realistic phase management: idle -> accel -> cruise -> decel -> repeat
   */
  private updatePhase(elapsedMs: number) {
    switch (this.currentPhase) {
      case 'idle':
        if (elapsedMs > 2000) {
          this.currentPhase = 'accel';
          this.targetSpeed = 80 + Math.random() * 120; // 80-200 km/h
          this.phaseStartTime = Date.now();
        } else {
          this.targetSpeed = 0;
        }
        break;

      case 'accel':
        if (elapsedMs > 4000 || this.currentSpeed >= this.targetSpeed - 5) {
          this.currentPhase = 'cruise';
          this.phaseStartTime = Date.now();
        }
        break;

      case 'cruise':
        if (elapsedMs > 3000) {
          this.currentPhase = 'decel';
          this.targetSpeed = 20 + Math.random() * 40; // slow down to 20-60 km/h
          this.phaseStartTime = Date.now();
        }
        break;

      case 'decel':
        if (elapsedMs > 3000 || this.currentSpeed <= this.targetSpeed + 5) {
          this.currentPhase = 'idle';
          this.targetSpeed = 0;
          this.phaseStartTime = Date.now();
        }
        break;
    }
  }

  /**
   * Smooth speed update with realistic acceleration curves
   */
  private updateSpeed() {
    const delta = this.targetSpeed - this.currentSpeed;
    
    if (Math.abs(delta) < 1) {
      this.currentSpeed = this.targetSpeed;
      return;
    }

    // Acceleration/deceleration rate based on phase
    let rate = 0;
    switch (this.currentPhase) {
      case 'accel':
        rate = 2.5; // aggressive acceleration
        break;
      case 'decel':
        rate = 3.0; // braking
        break;
      case 'cruise':
        rate = 0.5; // minor adjustments
        break;
      default:
        rate = 1.5; // coasting to stop
    }

    if (delta > 0) {
      this.currentSpeed += Math.min(rate, delta);
    } else {
      this.currentSpeed += Math.max(-rate, delta);
    }

    // Clamp to realistic range
    this.currentSpeed = Math.max(0, Math.min(200, this.currentSpeed));
  }

  /**
   * Calculate G-force based on acceleration (realistic physics)
   */
  private calculateGForce(): number {
    const speedChangePerSec = (this.targetSpeed - this.currentSpeed) * 0.1;
    
    // Base G-force from acceleration/deceleration
    let gForce = Math.abs(speedChangePerSec) * 0.15;

    // Add lateral G (simulated cornering)
    if (this.currentSpeed > 60 && this.currentPhase === 'cruise') {
      const corneringG = 0.3 + Math.random() * 0.4; // 0.3-0.7 G in corners
      gForce += corneringG;
    }

    // Add bump/vibration G
    if (this.currentSpeed > 40) {
      gForce += Math.random() * 0.15;
    }

    return Math.min(3.0, Math.max(0.0, gForce));
  }

  /**
   * Engine temperature simulation
   */
  private updateTemperature() {
    const targetTemp = this.currentSpeed > 100 ? 85 + Math.random() * 10 : 65 + Math.random() * 15;
    const tempDelta = targetTemp - this.engineTemp;
    
    // Slow temperature changes (thermal inertia)
    this.engineTemp += tempDelta * 0.05;
    this.engineTemp = Math.max(20, Math.min(95, this.engineTemp));
  }

  /**
   * Altitude changes (minor variations + gradual elevation changes)
   */
  private updateAltitude() {
    // Gradual elevation change
    const elevationDrift = (Math.random() - 0.5) * 0.5;
    this.baseAltitude += elevationDrift;
    
    // Keep altitude in realistic range
    this.baseAltitude = Math.max(0, Math.min(2000, this.baseAltitude));
  }

  /**
   * Add mild noise for realism
   */
  private addNoise(value: number, magnitude: number): number {
    const noise = (Math.random() - 0.5) * magnitude;
    return Math.max(0, value + noise);
  }

  /**
   * Reset simulator state
   */
  reset() {
    this.currentSpeed = 0;
    this.targetSpeed = 0;
    this.baseAltitude = 350;
    this.engineTemp = 65;
    this.currentPhase = 'idle';
    this.phaseStartTime = Date.now();
  }
}
