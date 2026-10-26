export type Lang = 'en' | 'es';
export type Issue = 'heat' | 'hot_water' | 'repair';
export type Housing = 'private' | 'nycha_related' | 'unknown';
export type Condition = 'ongoing' | 'improved' | 'resolved';
export type EventType = 'condition_observed' | 'management_contacted' | 'response_received' | 'no_response_reported' | 'complaint_filed' | 'complaint_status_reported' | 'inspection_reported' | 'repair_attempted' | 'assistance_contacted' | 'condition_still_unresolved' | 'condition_improved' | 'condition_resolved' | 'condition_returned';
export type ComplaintStatus = 'open' | 'closed' | 'unknown';
export type Template = 'initial' | 'follow_up' | 'assistance';
export interface CaseEvent {
    id: string;
    type: EventType;
    recordedAt: string;
    occurredAt?: string;
    relatedEventId?: string;
    notes?: string;
    referenceNumber?: string;
    condition?: Condition;
    complaintStatus?: ComplaintStatus;
    method?: string;
    contact?: string;
}
export interface Draft {
    id: string;
    template: Template;
    language: Lang;
    body: string;
    generatedFromRevision: number;
    updatedAt: string;
}
export interface HousingCase {
    id: string;
    schemaVersion: number;
    title: string;
    issue: Issue;
    housingType: Housing;
    description: string;
    startedAt?: string;
    events: CaseEvent[];
    drafts: Draft[];
    completedPreparationIds: string[];
    createdAt: string;
    updatedAt: string;
    historyRevision: number;
    demo?: boolean;
}
export const TYPES: EventType[] = ['condition_observed', 'management_contacted', 'response_received', 'no_response_reported', 'complaint_filed', 'complaint_status_reported', 'inspection_reported', 'repair_attempted', 'assistance_contacted', 'condition_still_unresolved', 'condition_improved', 'condition_resolved', 'condition_returned'];
export const makeId = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const now = () => new Date().toISOString();
