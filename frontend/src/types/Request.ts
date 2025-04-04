/**
 * Request status types
 */
export enum RequestStatus {
  PENDING = "pending",
  PROCESSING = "processing",
  COMPLETED = "completed",
  FAILED = "failed",
}

/**
 * Data structure for user requests
 */
export interface Request {
  id: string;
  userId: string;
  variableName: string;
  date: {
    year: number;
    month: number;
    day: number;
  };
  pressureLevels: number[];
  areaCovered: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  format?: string;
  interpolation?: string;
  resolution?: string;
  status: RequestStatus;
  createdAt: string; // ISO date string
  updatedAt: string; // ISO date string
}

/**
 * Represents a group of identical requests
 */
export interface RequestGroup {
  request: Request;
  count: number;
}

/**
 * Compare if two requests have the same content (excluding metadata)
 * @param req1 First request
 * @param req2 Second request
 * @returns True if the requests have identical content
 */
export function hasSameContent(req1: Request, req2: Request): boolean {
  // Compare variable names
  if (req1.variableName !== req2.variableName) return false;

  // Compare dates
  if (req1.date.year !== req2.date.year || req1.date.month !== req2.date.month || req1.date.day !== req2.date.day)
    return false;

  // Compare pressure levels
  if (req1.pressureLevels.length !== req2.pressureLevels.length) return false;
  for (let i = 0; i < req1.pressureLevels.length; i++) {
    if (req1.pressureLevels[i] !== req2.pressureLevels[i]) return false;
  }

  // Compare area covered
  if (
    req1.areaCovered.north !== req2.areaCovered.north ||
    req1.areaCovered.south !== req2.areaCovered.south ||
    req1.areaCovered.east !== req2.areaCovered.east ||
    req1.areaCovered.west !== req2.areaCovered.west
  )
    return false;

  // Compare optional fields if present
  if (req1.format !== req2.format) return false;
  if (req1.interpolation !== req2.interpolation) return false;
  if (req1.resolution !== req2.resolution) return false;

  return true;
}

/**
 * Group requests by content and keep the most recent one in each group
 * @param requests Array of user requests
 * @returns Array of request groups
 */
export function groupRequestsByContent(requests: Request[]): RequestGroup[] {
  // Sort requests by creation date (newest first)
  const sortedRequests = [...requests].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const groups: RequestGroup[] = [];
  const processedIndices = new Set<number>();

  for (let i = 0; i < sortedRequests.length; i++) {
    if (processedIndices.has(i)) continue;

    const currentRequest = sortedRequests[i];
    let count = 1;

    // Check remaining requests for matches
    for (let j = i + 1; j < sortedRequests.length; j++) {
      if (hasSameContent(currentRequest, sortedRequests[j])) {
        count++;
        processedIndices.add(j);
      }
    }

    groups.push({
      request: currentRequest,
      count,
    });
  }

  return groups;
}
