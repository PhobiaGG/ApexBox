export interface TelemetrySample {
  timestamp_ms: number;
  speed: number;
  g_force: number;
  temp: number;
  humidity: number;
  lux: number;
  altitude: number;
  temperature?: number; // Alias for temp
}

export interface SessionStats {
  peakSpeed: number;
  avgSpeed: number;
  peakG: number;
  avgG: number;
  minTemp: number;
  maxTemp: number;
  minAltitude: number;
  maxAltitude: number;
  duration: number;
  sampleCount: number;
  altitudeChange: number;
}

export function parseCSV(csvContent: string): TelemetrySample[] {
  try {
    const lines = csvContent.trim().split('\n');
    if (lines.length < 2) {
      console.warn('[CSV] File has insufficient data');
      return [];
    }

    const samples: TelemetrySample[] = [];
    let validSamples = 0;
    let invalidSamples = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const values = line.split(',');
      if (values.length < 7) {
        invalidSamples++;
        continue;
      }

      try {
        const sample: TelemetrySample = {
          timestamp_ms: parseFloat(values[0]),
          speed: parseFloat(values[1]),
          g_force: parseFloat(values[2]),
          temp: parseFloat(values[3]),
          humidity: parseFloat(values[4]),
          lux: parseFloat(values[5]),
          altitude: parseFloat(values[6]),
        };

        // Validate sample has valid numbers
        if (
          !isNaN(sample.timestamp_ms) &&
          !isNaN(sample.speed) &&
          !isNaN(sample.g_force) &&
          !isNaN(sample.temp) &&
          !isNaN(sample.altitude)
        ) {
          samples.push(sample);
          validSamples++;
        } else {
          invalidSamples++;
        }
      } catch (err) {
        invalidSamples++;
        console.warn(`[CSV] Error parsing line ${i}:`, err);
      }
    }

    console.log(`[CSV] Parsed ${validSamples} valid samples, ${invalidSamples} invalid`);
    return samples;
  } catch (error) {
    console.error('[CSV] Fatal parsing error:', error);
    return [];
  }
}

export function calculateStats(samples: TelemetrySample[]): SessionStats {
  if (samples.length === 0) {
    return {
      peakSpeed: 0,
      avgSpeed: 0,
      peakG: 0,
      avgG: 0,
      minTemp: 0,
      maxTemp: 0,
      minAltitude: 0,
      maxAltitude: 0,
      duration: 0,
      sampleCount: 0,
      altitudeChange: 0,
    };
  }

  const speeds = samples.map(s => s.speed);
  const gForces = samples.map(s => s.g_force);
  const temps = samples.map(s => s.temp);
  const altitudes = samples.map(s => s.altitude);

  const minAltitude = Math.min(...altitudes);
  const maxAltitude = Math.max(...altitudes);

  return {
    peakSpeed: Math.max(...speeds),
    avgSpeed: speeds.reduce((a, b) => a + b, 0) / speeds.length,
    peakG: Math.max(...gForces),
    avgG: gForces.reduce((a, b) => a + b, 0) / gForces.length,
    minTemp: Math.min(...temps),
    maxTemp: Math.max(...temps),
    minAltitude,
    maxAltitude,
    altitudeChange: maxAltitude - minAltitude,
    duration: (samples[samples.length - 1].timestamp_ms - samples[0].timestamp_ms) / 1000,
    sampleCount: samples.length,
  };
}

/**
 * Convert telemetry sample values based on unit settings
 */
export function convertSampleUnits(
  sample: TelemetrySample,
  isMetric: boolean,
  tempCelsius: boolean
): TelemetrySample {
  return {
    ...sample,
    speed: isMetric ? sample.speed : sample.speed * 0.621371, // km/h to mph
    temp: tempCelsius ? sample.temp : (sample.temp * 9 / 5) + 32, // C to F
    altitude: isMetric ? sample.altitude : sample.altitude * 3.28084, // m to ft
  };
}