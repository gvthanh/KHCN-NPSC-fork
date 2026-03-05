
export type InitiativeLevel = 'HLH' | 'NPSC' | 'NPC' | 'EVN';
export type InitiativeScope = 'Company' | 'NPC';

export interface PointConfig {
  HLH: number;
  NPSC: number;
  NPC: number;
  EVN: number;
}

export interface Initiative {
  id: string;
  scope?: InitiativeScope;
  phase: string;
  year: number;
  type: string;
  title: string;
  content: string;
  authors: string[];
  unit: string[];
  result: string;
  field: string[];
  reward: string;
  level: InitiativeLevel[];
  isScalable?: boolean;
  driveLink?: string;
  monthsApplied?: number;
  embedding_field?: number[];
  attachmentUrls?: string[];
  imageUrls?: string[];
  imageUrl?: string;
  approvalDocUrls?: string[];
}

export interface ComplianceCheck {
  overallStatus: 'pass' | 'fail' | 'warning';
  score: number;
  items: {
    criteria: string;
    isMet: boolean;
    comment: string;
  }[];
  missingSections: string[];
  suggestion: string;
}

export interface PendingInitiative {
  id: string;
  title: string;
  authors: string[];
  unit: string[];
  year: number;
  content: string;
  field: string[];
  status: 'pending';
  submittedAt: number;
  driveLink?: string;
  contactZalo?: string;
  monthsApplied?: number;

  publicAnalysis?: {
    score: number;
    verdict: string;
    advice: string;
    similarTitle?: string;
    similarId?: string;
    similarScope?: InitiativeScope;
  };

  complianceCheck?: ComplianceCheck;
  attachmentUrls?: string[];
  imageUrls?: string[];
  imageUrl?: string;
}

export type SettlementStatus = 'chua_thanh_toan' | 'dang_thanh_toan' | 'da_quyet_toan';
export type ProjectStatus = 'dang_thuc_hien' | 'da_nghiem_thu' | 'da_huy';

export interface ResearchProject {
  id: string;
  title: string;
  authors: string[];
  mainMembers: string[];
  experts: string[];
  budget: number;
  progress: number;
  settlementStatus: SettlementStatus;
  status?: ProjectStatus;
  content: string;
  level: 'NPSC' | 'NPC' | 'EVN';
  year: number;
  driveLink?: string;
  attachmentUrl?: string;
}

export interface SimilarityInfo {
  score: number;
  status: 'new' | 'similar' | 'duplicate';
  reason: string;
  referenceTitle?: string;
}

export interface BatchItem {
  tempId: string;
  selected: boolean;
  title: string;
  authors: string[];
  unit: string[];
  year: number;
  content: string;
  field: string[];
  level: InitiativeLevel[];
  similarity?: SimilarityInfo;
  scope?: InitiativeScope;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  thinking?: string;
  isRag?: boolean;
}

export interface AnalysisResult {
  score: number;
  isDuplicate: boolean;
  reason: string;
  mostSimilarTitle?: string;
  mostSimilarId?: string;
  fromUser?: boolean;
}

export interface ReferenceDocument {
  id: string;
  title: string;
  description: string;
  driveLink?: string;
  uploadDate: number;
  uploadedBy: string;
}

export type UserRole = 'admin' | 'user';

export interface UserProfile {
  uid: string;
  email: string;
  role: UserRole;
  displayName?: string;
}
