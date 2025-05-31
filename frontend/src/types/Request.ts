/**
 * Request status types
 */
export enum RequestStatus {
  GENERATING = "GENERATING",
  CACHED = "CACHED",
  EXPIRED = "EXPIRED",
  EMPTY = "EMPTY",
}

/**
 * Form data structure for request creation
 */
export interface RequestForm {
  variableName?: string;
  pressureLevels?: string[];
  years?: string[];
  months?: string[];
  days?: string[];
  hours?: string[];
  areaCovered?: string[];
  mapTypes?: string[];
  mapLevels?: string[];
  fileFormat?: string;
  noMaps?: boolean;
  noData?: boolean;
  omp?: boolean;
  nThreads?: number;
  mpi?: boolean;
  nProces?: number;
}

export interface UserRequestsReturned {
  requestHash: string;
  requestStatus: RequestStatus;
  timesRequested: number;
  updatedAt: Date;
  variableName: string;
  pressureLevels: string[];
  years: string[];
  months: string[];
  days: string[];
  hours: string[];
  areaCovered: string[];
  mapTypes: string[];
  mapLevels?: string[];
  fileFormat?: string;
  noData?: boolean;
  noMaps?: boolean;
  omp?: boolean;
  mpi?: boolean;
}

/**
 * Data structure for user requests
 */
export interface UserRequest {
  requestHash: string;
  variableName: string;
  pressureLevels: number[];
  date: {
    year: number;
    month: number;
    day: number;
  };
  areaCovered: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
  format?: string;
  status: RequestStatus;
  timesRequested?: number;
  createdAt: string; // ISO date string
}

/**
 * Represents a group of identical requests
 */
export interface RequestGroup {
  request: UserRequest;
  count: number;
}

/**
 * Compare if two requests have the same content (excluding metadata)
 * @param req1 First request
 * @param req2 Second request
 * @returns True if the requests have identical content
 */
export function hasSameContent(req1: UserRequest, req2: UserRequest): boolean {
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

  return true;
}

/**
 * Group requests by content and keep the most recent one in each group
 * @param requests Array of user requests
 * @returns Array of request groups
 */
export function groupRequestsByContent(requests: UserRequest[]): RequestGroup[] {
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

export function fromUserRequestsReturnedToUserRequest(returned: UserRequestsReturned): UserRequest {
  return {
    requestHash: returned.requestHash,
    variableName: returned.variableName,
    pressureLevels: returned.pressureLevels.map(level => parseInt(level)),
    date: {
      year: returned.years.length > 0 ? parseInt(returned.years[0]) : new Date().getFullYear(),
      month: returned.months.length > 0 ? parseInt(returned.months[0]) : new Date().getMonth() + 1,
      day: returned.days.length > 0 ? parseInt(returned.days[0]) : new Date().getDate(),
    },
    areaCovered: {
      north: parseInt(returned.areaCovered[0]),
      south: parseInt(returned.areaCovered[1]),
      east: parseInt(returned.areaCovered[2]),
      west: parseInt(returned.areaCovered[3]),
    },
    format: returned.fileFormat || undefined,
    status: returned.requestStatus,
    timesRequested: returned.timesRequested,
    createdAt: returned.updatedAt instanceof Date ? returned.updatedAt.toISOString() : returned.updatedAt,
  };
}
