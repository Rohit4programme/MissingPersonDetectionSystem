export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'public' | 'officer' | 'admin';
  badgeNumber?: string;
  department?: string;
  jurisdiction?: string;
  avatar?: string;
  phone?: string;
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MissingPerson {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  age?: number;
  gender?: 'male' | 'female' | 'other';
  ethnicity?: string;
  height?: string;
  weight?: string;
  eyeColor?: string;
  hairColor?: string;
  distinguishingMarks?: string;
  lastSeenDate: string;
  lastSeenLocation: string;
  lastSeenLatitude?: number;
  lastSeenLongitude?: number;
  circumstances?: string;
  clothingDescription?: string;
  photoUrl?: string;
  additionalPhotos?: string[];
  status: 'missing' | 'investigating' | 'detected' | 'found' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  caseNumber: string;
  reportedBy?: string;
  assignedOfficer?: User;
  assignedOfficerId?: string;
  jurisdiction?: Jurisdiction;
  jurisdictionId?: string;
  faceEmbeddings?: FaceEmbedding[];
  detections?: Detection[];
  sightings?: Sighting[];
  timeline?: CaseTimeline[];
  notes?: string;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FaceEmbedding {
  id: string;
  missingPersonId: string;
  imageUrl: string;
  embeddingVector?: number[];
  quality: number;
  isPrimary: boolean;
  createdAt: string;
}

export interface Camera {
  id: string;
  name: string;
  location: string;
  latitude: number;
  longitude: number;
  type: 'fixed' | 'ptz' | 'mobile';
  status: 'online' | 'offline' | 'maintenance';
  streamUrl?: string;
  resolution?: string;
  fps?: number;
  jurisdictionId?: string;
  jurisdiction?: Jurisdiction;
  lastPing?: string;
  detectionsCount?: number;
  monitoring?: boolean;
  [key: string]: any;
  createdAt: string;
  updatedAt: string;
}

export interface Detection {
  id: string;
  missingPersonId: string;
  missingPerson?: MissingPerson;
  cameraId: string;
  camera?: Camera;
  timestamp: string;
  confidence: number;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  snapshotUrl: string;
  faceCropUrl?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  status: 'pending' | 'verified' | 'rejected' | 'false_positive';
  verifiedBy?: User;
  verifiedById?: string;
  verifiedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface Sighting {
  id: string;
  missingPersonId: string;
  missingPerson?: MissingPerson;
  reportedBy: string;
  reporterName?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  sightingDate: string;
  description: string;
  photoUrl?: string;
  status: 'pending' | 'investigating' | 'confirmed' | 'dismissed';
  verifiedBy?: User;
  verifiedById?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface EvidenceFile {
  id: string;
  missingPersonId: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  type: 'photo' | 'video' | 'document' | 'audio';
  description?: string;
  uploadedBy: User;
  uploadedById: string;
  createdAt: string;
}

export interface Alert {
  id: string;
  type: 'detection' | 'sighting' | 'status_change' | 'assignment' | 'system';
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  userId: string;
  relatedCaseId?: string;
  relatedDetectionId?: string;
  isRead: boolean;
  readAt?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface CaseTimeline {
  id: string;
  caseId: string;
  action: string;
  description: string;
  userId: string;
  user?: User;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface Jurisdiction {
  id: string;
  name: string;
  code: string;
  type: 'federal' | 'state' | 'county' | 'city';
  parent?: Jurisdiction;
  parentId?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  camerasCount?: number;
  officersCount?: number;
  casesCount?: number;
  createdAt: string;
  updatedAt: string;
}

// API Response Types
export interface ApiResponse<T> {
  data: T;
  message?: string;
  status: 'success' | 'error';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface LoginResponse {
  user: User;
  token: string;
  refreshToken: string;
}

export interface ApiError {
  message: string;
  code?: string;
  details?: Record<string, string[]>;
}

// Filter Types
export interface CaseFilters {
  status?: MissingPerson['status'];
  priority?: MissingPerson['priority'];
  search?: string;
  jurisdictionId?: string;
  assignedOfficerId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DetectionFilters {
  status?: Detection['status'];
  missingPersonId?: string;
  cameraId?: string;
  minConfidence?: number;
  confidenceMin?: number;
  confidenceMax?: number;
  source?: string;
  verified?: boolean;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
  [key: string]: any;
}

export interface SightingFilters {
  status?: Sighting['status'];
  missingPersonId?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}

export interface CameraFilters {
  status?: Camera['status'];
  type?: Camera['type'];
  jurisdictionId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

// Dashboard Stats Types
export interface DashboardStats {
  totalCases: number;
  activeCases: number;
  foundCases: number;
  totalDetections: number;
  verifiedDetections: number;
  pendingVerifications: number;
  totalCameras: number;
  onlineCameras: number;
  totalSightings: number;
  recentAlerts: number;
  casesByStatus: Record<string, number>;
  casesByPriority: Record<string, number>;
  detectionsByDay: Array<{ date: string; count: number }>;
  topLocations: Array<{ location: string; count: number }>;
  averageResolutionDays: number;
  detectionAccuracy: number;
  // Extended properties used by dashboard
  activeCasesTrend?: number;
  detectionsToday?: number;
  detectionsTrend?: number;
  pendingReports?: number;
  pendingTrend?: number;
  successRate?: number;
  successRateTrend?: number;
  [key: string]: any;
}

export interface CaseStats {
  total: number;
  byStatus: Record<string, number>;
  byPriority: Record<string, number>;
  averageResolutionDays: number;
  monthlyTrend: Array<{ month: string; opened: number; resolved: number }>;
}

export interface DetectionStats {
  total: number;
  verified: number;
  rejected: number;
  pending: number;
  averageConfidence: number;
  byDay: Array<{ date: string; count: number }>;
  byCamera: Array<{ cameraId: string; cameraName: string; count: number }>;
}
