export function formatSpeed(speed: number, isMetric: boolean = true): string {
  if (isMetric) {
    return `${speed.toFixed(1)} km/h`;
  } else {
    return `${(speed * 0.621371).toFixed(1)} mph`;
  }
}

export function formatGForce(g: number): string {
  return `${g.toFixed(2)}g`;
}

export function formatTemp(temp: number, isCelsius: boolean = true): string {
  if (isCelsius) {
    return `${temp.toFixed(1)}°C`;
  } else {
    return `${(temp * 9/5 + 32).toFixed(1)}°F`;
  }
}

export function formatAltitude(altitude: number, isMetric: boolean = true): string {
  if (isMetric) {
    return `${altitude.toFixed(0)}m`;
  } else {
    return `${(altitude * 3.28084).toFixed(0)}ft`;
  }
}

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatHumidity(humidity: number): string {
  return `${humidity.toFixed(1)}%`;
}