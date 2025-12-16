
export type ChairsideViewMode = 'DASHBOARD' | 'PERIO' | 'XRAY' | 'NOTES' | 'ATTACHMENTS';

export interface TimelineEvent {
  id: string;
  type: 'CHECK_IN' | 'RADIOGRAPH' | 'EXAM' | 'PROCEDURE' | 'NOTE';
  title: string;
  timestamp: string;
  details?: string;
  provider?: string;
  tooth?: number[];
}

export interface ChartingPatient {
  id: string;
  name: string;
  dob: string;
  lastVisit: string;
  nextVisit: string;
  image?: string;
}

export type QuickActionType = 'Exam' | 'PA' | 'FMX' | 'Composite' | 'Crown' | 'Implant' | 'Extraction' | 'Perio' | 'Notes' | 'Post-Op' | 'Occlusal' | 'Root Canal';
