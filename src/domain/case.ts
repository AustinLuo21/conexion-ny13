import {
  makeId, now, type CaseEvent, type Condition, type ComplaintStatus,
  type Draft, type HousingCase, type Housing, type Issue, type Lang, type Template,
} from '../types';
import { deriveCaseFacts, sortEvents } from './rules';
import { prettyDate, t } from '../content/text';

export type IntakeCondition = Condition | 'returned';
export type Previous = 'management_contacted' | 'complaint_filed' | 'inspection_reported' | 'repair_attempted' | 'assistance_contacted';
export type PriorData = Record<Previous, {
  selected: boolean;
  occurredAt: string;
  notes: string;
  referenceNumber: string;
  method: string;
  contact: string;
  complaintStatus: ComplaintStatus;
}>;
export const priorTypes: Previous[] = [
  'management_contacted', 'complaint_filed', 'inspection_reported',
  'repair_attempted', 'assistance_contacted',
];

export function blankPrior(): PriorData {
  return Object.fromEntries(priorTypes.map(actionType => [actionType, {
    selected: false,
    occurredAt: '',
    notes: '',
    referenceNumber: '',
    method: '',
    contact: '',
    complaintStatus: 'unknown',
  }])) as PriorData;
}

export interface Intake {
  title: string;
  issue: Issue;
  housingType: Housing;
  condition: IntakeCondition;
  startedAt: string;
  description: string;
  prior: PriorData;
}

export function createCase(intake: Intake): HousingCase {
  const recordedAt = now();
  let recordingSequence = 0;
  const newCaseEvent = (eventType: CaseEvent['type'], details: Partial<CaseEvent> = {}): CaseEvent => ({
    id: makeId(),
    type: eventType,
    recordedAt: new Date(Date.parse(recordedAt) + recordingSequence++).toISOString(),
    ...details,
  });

  const events: CaseEvent[] = [newCaseEvent('condition_observed', {
    occurredAt: intake.startedAt || undefined,
  })];

  for (const priorActionType of priorTypes) {
    const priorAction = intake.prior[priorActionType];
    if (!priorAction.selected) continue;
    events.push(newCaseEvent(priorActionType, {
      occurredAt: priorAction.occurredAt || undefined,
      notes: priorAction.notes || undefined,
      referenceNumber: priorAction.referenceNumber || undefined,
      method: priorAction.method || undefined,
      contact: priorAction.contact || undefined,
      complaintStatus: priorActionType === 'complaint_filed' ? priorAction.complaintStatus : undefined,
    }));
  }

  if (intake.condition !== 'ongoing' || events.length > 1) {
    const conditionEventType: CaseEvent['type'] = intake.condition === 'returned' ? 'condition_returned'
      : intake.condition === 'resolved' ? 'condition_resolved'
      : intake.condition === 'improved' ? 'condition_improved' : 'condition_still_unresolved';
    events.push(newCaseEvent(conditionEventType));
  }

  return {
    id: makeId(),
    schemaVersion: 1,
    title: intake.title.trim() || intake.issue.replace('_', ' '),
    issue: intake.issue,
    housingType: intake.housingType,
    description: intake.description.trim(),
    startedAt: intake.startedAt || undefined,
    events,
    drafts: [],
    completedPreparationIds: [],
    createdAt: recordedAt,
    updatedAt: recordedAt,
    historyRevision: 1,
  };
}

export function validateDate(candidateDate: string): boolean {
  if (!candidateDate) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(candidateDate)) return false;

  const parsedDate = new Date(`${candidateDate}T12:00:00`);
  if (Number.isNaN(parsedDate.getTime())) return false;
  const localDate = [parsedDate.getFullYear(),
    String(parsedDate.getMonth() + 1).padStart(2, '0'),
    String(parsedDate.getDate()).padStart(2, '0'),
  ].join('-');
  const today = new Date();
  const todayLocal = [today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, '0'),
    String(today.getDate()).padStart(2, '0'),
  ].join('-');
  return localDate === candidateDate && candidateDate <= todayLocal;
}

export function patchCase(housingCase: HousingCase, changes: Partial<HousingCase>): HousingCase {
  return {
    ...housingCase,
    ...changes,
    updatedAt: now(),
    historyRevision: housingCase.historyRevision + 1,
  };
}

export function insertEvent(housingCase: HousingCase, caseEvent: CaseEvent): HousingCase {
  return patchCase(housingCase, { events: [...housingCase.events, caseEvent] });
}

export function editEvent(housingCase: HousingCase, correctedEvent: CaseEvent): HousingCase {
  return patchCase(housingCase, {
    events: housingCase.events.map(existingEvent => existingEvent.id === correctedEvent.id
      ? { ...correctedEvent, recordedAt: existingEvent.recordedAt }
      : existingEvent),
  });
}

export function removeEvent(housingCase: HousingCase, removedEventId: string): HousingCase {
  return patchCase(housingCase, {
    events: housingCase.events
      .filter(existingEvent => existingEvent.id !== removedEventId)
      .map(existingEvent => existingEvent.relatedEventId === removedEventId
        ? { ...existingEvent, relatedEventId: undefined }
        : existingEvent),
  });
}

export function eventEntry(eventType: CaseEvent['type'], eventDetails: Partial<CaseEvent>): CaseEvent {
  // Intake and timeline forms can leave dates blank; don't turn blanks into a fake occurrence date.
  return {
    ...eventDetails,
    id: makeId(),
    type: eventType,
    recordedAt: now(),
    occurredAt: eventDetails.occurredAt || undefined,
    notes: eventDetails.notes || undefined,
    referenceNumber: eventDetails.referenceNumber || undefined,
    method: eventDetails.method || undefined,
    contact: eventDetails.contact || undefined,
  };
}

export function sampleCases(): HousingCase[] {
  const firstRepairRequest = createCase({
    title: 'Example: Heat not working', issue: 'heat', housingType: 'private',
    condition: 'ongoing', startedAt: '',
    description: 'The living room radiator is not heating.', prior: blankPrior(),
  });
  firstRepairRequest.demo = true;

  const previousActions = blankPrior();
  previousActions.management_contacted.selected = true;
  previousActions.management_contacted.notes = 'Sent an email requesting heat repair';
  previousActions.complaint_filed.selected = true;
  previousActions.complaint_filed.referenceNumber = 'EXAMPLE-0000';
  previousActions.complaint_filed.complaintStatus = 'closed';
  const unresolvedLeak = createCase({
    title: 'Example: Leak still unresolved', issue: 'repair', housingType: 'private',
    condition: 'ongoing', startedAt: '',
    description: 'Water continues dripping near the kitchen sink.', prior: previousActions,
  });
  unresolvedLeak.demo = true;

  const resolvedHistory = blankPrior();
  resolvedHistory.management_contacted.selected = true;
  resolvedHistory.management_contacted.notes = 'Requested maintenance';
  const repairedHotWater = createCase({
    title: 'Example: Repair completed', issue: 'hot_water', housingType: 'private',
    condition: 'resolved', startedAt: '',
    description: 'Hot water was unavailable, then restored.', prior: resolvedHistory,
  });
  repairedHotWater.demo = true;
  return [firstRepairRequest, unresolvedLeak, repairedHotWater];
}

export function generateDraft(housingCase:HousingCase,template:Template,lang:Lang):string{
 const isSpanish = lang === 'es';
 const caseFacts = deriveCaseFacts(housingCase);
 const issue=t(lang,`issue.${housingCase.issue}`).toLowerCase(); const condition=t(lang,`status.${caseFacts.condition}`).toLowerCase();
 const start=housingCase.startedAt?prettyDate(housingCase.startedAt,lang):null;
 const history=sortEvents(housingCase.events).filter(caseEvent=>caseEvent.type!=='condition_observed').map(caseEvent=>`${caseEvent.occurredAt?prettyDate(caseEvent.occurredAt,lang):t(lang,'noDate')}: ${t(lang,'event.'+caseEvent.type)}${caseEvent.notes?' — '+caseEvent.notes:''}${caseEvent.referenceNumber?' (#'+caseEvent.referenceNumber+')':''}${caseEvent.complaintStatus?' ('+t(lang,'complaintStatus.'+caseEvent.complaintStatus)+')':''}`).join('\n');
 const problem=housingCase.description.trim();
 if(template==='initial')return isSpanish?`Asunto: Solicitud de reparación — ${issue}\n\nEstimado/a administrador/a del edificio:\n\nLe escribo para informar un problema de ${issue}${start?` que comenzó aproximadamente el ${start}`:''}. Estado actual: ${condition}.${problem?`\n\nDescripción: ${problem}`:''}\n\nSolicito una inspección o reparación y una respuesta sobre cómo coordinar el acceso. Por favor, confirme la recepción de este mensaje.\n\n[Dirección / apartamento]\n[Forma preferida de contacto]\n[Nombre]`:`Subject: Repair request — ${issue}\n\nDear building management,\n\nI'm writing to report a problem with ${issue}${start?` that began approximately ${start}`:''}. Current condition: ${condition}.${problem?`\n\nDescription: ${problem}`:''}\n\nPlease arrange an inspection or repair, and let me know how to coordinate access. Please confirm receipt of this message.\n\n[Building address / apartment]\n[Preferred contact information]\n[Name]`;
 if(template==='follow_up')return isSpanish?`Asunto: Seguimiento de solicitud de reparación — ${issue}\n\nEstimado/a administrador/a o agencia:\n\nDoy seguimiento al problema de ${issue}. Estado actual informado: ${condition}.${start?` Comenzó aproximadamente el ${start}.`:''}${problem?`\n\nDescripción: ${problem}`:''}\n\nHistorial registrado:\n${history||'(No hay acciones registradas)'}\n\nPor favor, confirme qué medidas se tomarán para resolverlo y cómo se coordinará el acceso.\n\n[Nombre e información de contacto]`:`Subject: Follow-up on repair — ${issue}\n\nDear building management or agency,\n\nI am following up about the ${issue} problem. Current reported condition: ${condition}.${start?` It began around ${start}.`:''}${problem?`\n\nDescription: ${problem}`:''}\n\nRecorded history:\n${history||'(No actions recorded)'}\n\nPlease confirm what steps are planned to resolve the condition and how access will be arranged.\n\n[Name and preferred contact details]`;
 return isSpanish?`RESUMEN PARA ORGANIZACIÓN DE AYUDA\n\nProblema: ${issue}\nVivienda: ${t(lang,'housing.'+housingCase.housingType)}\nCondición actual (según el inquilino): ${condition}${start?`\nInicio aproximado: ${start}`:''}${problem?`\nDescripción: ${problem}`:''}\n\nHistorial:\n${history||'(Sin acciones registradas)'}\n\nBusco orientación sobre mis opciones y posibles pasos siguientes. Comprendo que debo confirmar la elegibilidad y admisión con la organización.\n\n[Nombre / información de contacto]`:`ASSISTANCE SUMMARY\n\nIssue: ${issue}\nHousing: ${t(lang,'housing.'+housingCase.housingType)}\nCurrent tenant-reported condition: ${condition}${start?`\nApproximate start: ${start}`:''}${problem?`\nDescription: ${problem}`:''}\n\nHistory:\n${history||'(No actions recorded)'}\n\nI am requesting guidance on my options and possible next steps. I understand intake and eligibility must be confirmed with the organization.\n\n[Name / contact information]`;
}
export function caseSummary(housingCase: HousingCase, language: Lang): string {
  const caseFacts = deriveCaseFacts(housingCase);
  const timelineEntries = sortEvents(housingCase.events).map(caseEvent => {
    const eventDate = prettyDate(caseEvent.occurredAt, language);
    const eventName = t(language, `event.${caseEvent.type}`);
    const details = [
      caseEvent.notes,
      caseEvent.referenceNumber ? `#${caseEvent.referenceNumber}` : undefined,
      caseEvent.complaintStatus ? t(language, `complaintStatus.${caseEvent.complaintStatus}`) : undefined,
    ].filter(Boolean);
    return [eventName, eventDate, ...details].join(' | ');
  });

  const sourceAddresses = [
    'https://portal.311.nyc.gov/',
    'https://www.nyc.gov/site/hpd/services-and-information/report-a-maintenance-issue.page',
    'https://www.nycourts.gov/new-york-city-housing-court/starting-hp-proceeding-obtain-repairs',
  ];
  const generatedOn = new Date().toLocaleString(language === 'es' ? 'es-US' : 'en-US');
  return [
    housingCase.title,
    `${t(language, 'issue')}: ${t(language, `issue.${housingCase.issue}`)}`,
    `${t(language, 'housing')}: ${t(language, `housing.${housingCase.housingType}`)}`,
    `${t(language, 'status')}: ${t(language, `status.${caseFacts.condition}`)}`,
    `${t(language, 'started')}: ${prettyDate(housingCase.startedAt, language)}`,
    `${t(language, 'desc')}: ${housingCase.description || t(language, 'nothing')}`,
    '',
    t(language, 'timeline'),
    ...timelineEntries,
    '',
    t(language, 'sourceNote'),
    t(language, 'reviewed'),
    ...sourceAddresses,
    `${language === 'es' ? 'Generado' : 'Generated'}: ${generatedOn}`,
  ].join('\n');
}

export function makeDraft(housingCase: HousingCase, template: Template, language: Lang): Draft {
  return {
    id: makeId(),
    template,
    language,
    body: generateDraft(housingCase, template, language),
    generatedFromRevision: housingCase.historyRevision,
    updatedAt: now(),
  };
}
