/**
 * PostGIS Simulation and Spatial Intelligence Engine
 * Simulates ST_Distance, ST_DWithin on WGS-84 / PostGIS geography types
 */

export interface SpatialPoint {
  latitude: number;
  longitude: number;
}

/**
 * Calculates Great-Circle distance between two coordinates in meters (Haversine on WGS-84 ellipsoid approximation)
 * Equates to PostGIS: ST_Distance(point1::geography, point2::geography)
 */
export function calculatePostgisDistanceMeters(p1: SpatialPoint, p2: SpatialPoint): number {
  const R = 6371000; // Earth radius in meters
  const dLat = (p2.latitude - p1.latitude) * (Math.PI / 180);
  const dLon = (p2.longitude - p1.longitude) * (Math.PI / 180);
  const lat1 = p1.latitude * (Math.PI / 180);
  const lat2 = p2.latitude * (Math.PI / 180);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Calculates distance in Kilometers
 */
export function calculatePostgisDistanceKm(p1: SpatialPoint, p2: SpatialPoint): number {
  return calculatePostgisDistanceMeters(p1, p2) / 1000;
}

export interface GeofenceValidationResult {
  allowed: boolean;
  distanceMeters: number;
  maxAllowedRadiusMeters: number;
  accuracyMeters: number;
  isMockLocationDetected: boolean;
  statusCode: 'SUCCESS' | 'OUT_OF_BOUNDS' | 'MOCK_LOCATION_REJECTED' | 'LOW_ACCURACY_REJECTED';
  message: string;
}

/**
 * Simulates NestJS GeofenceService strictly enforcing 50-meter branch geofence boundary
 */
export function validateBranchGeofence(
  technicianLocation: SpatialPoint,
  branchLocation: SpatialPoint,
  accuracyMeters: number = 8.5,
  isMockLocation: boolean = false,
  geofenceRadiusMeters: number = 50.0,
  maxAllowedAccuracy: number = 15.0
): GeofenceValidationResult {
  // 1. Hardware & OS-Level Mock Check
  if (isMockLocation) {
    return {
      allowed: false,
      distanceMeters: calculatePostgisDistanceMeters(technicianLocation, branchLocation),
      maxAllowedRadiusMeters: geofenceRadiusMeters,
      accuracyMeters,
      isMockLocationDetected: true,
      statusCode: 'MOCK_LOCATION_REJECTED',
      message: 'SECURITY VIOLATION: Mock/Fake GPS location software detected on technician device.',
    };
  }

  // 2. Signal Accuracy Verification
  if (accuracyMeters > maxAllowedAccuracy) {
    return {
      allowed: false,
      distanceMeters: calculatePostgisDistanceMeters(technicianLocation, branchLocation),
      maxAllowedRadiusMeters: geofenceRadiusMeters,
      accuracyMeters,
      isMockLocationDetected: false,
      statusCode: 'LOW_ACCURACY_REJECTED',
      message: `GPS signal accuracy too low (${accuracyMeters.toFixed(1)}m). Must be under ${maxAllowedAccuracy}m for bank audit lock.`,
    };
  }

  // 3. PostGIS Distance Boundary Check
  const distance = calculatePostgisDistanceMeters(technicianLocation, branchLocation);
  if (distance > geofenceRadiusMeters) {
    return {
      allowed: false,
      distanceMeters: Math.round(distance * 10) / 10,
      maxAllowedRadiusMeters: geofenceRadiusMeters,
      accuracyMeters,
      isMockLocationDetected: false,
      statusCode: 'OUT_OF_BOUNDS',
      message: `Check-in rejected. Technician is ${Math.round(distance)}m away (max permitted is ${geofenceRadiusMeters}m).`,
    };
  }

  return {
    allowed: true,
    distanceMeters: Math.round(distance * 10) / 10,
    maxAllowedRadiusMeters: geofenceRadiusMeters,
    accuracyMeters,
    isMockLocationDetected: false,
    statusCode: 'SUCCESS',
    message: `Geofence verified (${Math.round(distance)}m from branch core). Attendance locked.`,
  };
}

/**
 * Calculates Candidate Dispatch Score based on PostGIS Spatial Distance + Skill Match + Workload Penalty
 */
export function calculateCandidateScore(
  distanceKm: number,
  skillMatch: boolean,
  activeWorkload: number
): {
  proximityPoints: number;
  skillPoints: number;
  workloadPenalty: number;
  compositeScore: number;
} {
  // Proximity Component: Max 50 points, decays with distance (1 km = 1 pt decay)
  const proximityPoints = Math.max(0, 50.0 - distanceKm * 1.0) * 0.50;

  // Skill Match: 30 points if certified for exact asset type
  const skillPoints = skillMatch ? 30.0 : 0.0;

  // Workload Penalty: -10 points per ongoing ticket
  const workloadPenalty = activeWorkload * 10.0;

  const rawScore = proximityPoints + skillPoints - workloadPenalty;
  const compositeScore = Math.max(0, Math.min(100, Math.round(rawScore * 100) / 100));

  return {
    proximityPoints: Math.round(proximityPoints * 100) / 100,
    skillPoints,
    workloadPenalty,
    compositeScore,
  };
}
