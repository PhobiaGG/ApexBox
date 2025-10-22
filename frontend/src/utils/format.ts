export function formatSpeed(speed: number | undefined, isMetric: boolean = true): string {
  if (speed === undefined || speed === null || isNaN(speed)) {
    return '--' + (isMetric ? ' km/h' : ' mph');
  }
  if (isMetric) {
    return `${speed.toFixed(1)} km/h`;
  } else {
    return `${(speed * 0.621371).toFixed(1)} mph`;
  }
}

export function formatGForce(g: number | undefined): string {
  if (g === undefined || g === null || isNaN(g)) {
    return '--g';
  }
  return `${g.toFixed(2)}g`;
}

export function formatTemp(temp: number | undefined, isCelsius: boolean = true): string {
  if (temp === undefined || temp === null) {
    return '--°' + (isCelsius ? 'C' : 'F');
  }
  if (isCelsius) {
    return `${temp.toFixed(1)}°C`;
  } else {
    return `${(temp * 9/5 + 32).toFixed(1)}°F`;
  }
}

export function formatAltitude(altitude: number | undefined, isMetric: boolean = true): string {
  if (altitude === undefined || altitude === null) {
    return '--' + (isMetric ? 'm' : 'ft');
  }
  if (isMetric) {
    return `${altitude.toFixed(0)}m`;
  } else {
    return `${(altitude * 3.28084).toFixed(0)}ft`;
  }
}

export function formatDuration(seconds: number | undefined): string {
  if (seconds === undefined || seconds === null || isNaN(seconds)) {
    return '--:--';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function formatHumidity(humidity: number | undefined): string {
  if (humidity === undefined || humidity === null || isNaN(humidity)) {
    return '--%';
  }
  return `${humidity.toFixed(1)}%`;
}