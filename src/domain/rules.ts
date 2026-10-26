import type { CaseEvent, ComplaintStatus, Condition, HousingCase } from '../types';

const conditionImpliedByEvent: Partial<Record<CaseEvent['type'], Condition>> = {
  condition_observed: 'ongoing',
  condition_still_unresolved: 'ongoing',
  condition_improved: 'improved',
  condition_resolved: 'resolved',
  condition_returned: 'ongoing',
};

export function conditionOf(caseEvent: CaseEvent): Condition | undefined {
  return caseEvent.condition ?? conditionImpliedByEvent[caseEvent.type];
}

export function sortEvents(caseEvents: CaseEvent[]): CaseEvent[] {
  return [...caseEvents].sort((leftEvent, rightEvent) => {
    const leftDate = (leftEvent.occurredAt || leftEvent.recordedAt).slice(0, 10);
    const rightDate = (rightEvent.occurredAt || rightEvent.recordedAt).slice(0, 10);
    return leftDate.localeCompare(rightDate) || leftEvent.recordedAt.localeCompare(rightEvent.recordedAt);
  });
}

export function deriveCaseFacts(housingCase: HousingCase) {
  // A reply or a closed 311 ticket says nothing about whether the radiator actually works.
  const eventsByRecordingTime = [...housingCase.events].sort((leftEvent, rightEvent) =>
    leftEvent.recordedAt.localeCompare(rightEvent.recordedAt),
  );
  const conditionReports = eventsByRecordingTime.filter(caseEvent => conditionOf(caseEvent) !== undefined);
  const latestConditionReport = conditionReports.at(-1);
  const condition: Condition = latestConditionReport ? conditionOf(latestConditionReport)! : 'ongoing';

  const contacts = eventsByRecordingTime.filter(caseEvent => caseEvent.type === 'management_contacted');
  const lastContact = contacts.at(-1);
  const complaints = eventsByRecordingTime.filter(caseEvent => caseEvent.type === 'complaint_filed');
  const lastComplaint = complaints.at(-1);

  // An unlinked status report belongs to the most recent complaint, not every older one.
  const complaintStatusUpdates = eventsByRecordingTime.filter(caseEvent =>
    caseEvent.type === 'complaint_status_reported',
  );
  const latestStatus = lastComplaint && complaintStatusUpdates.filter(statusUpdate =>
    statusUpdate.relatedEventId === lastComplaint.id ||
    (!statusUpdate.relatedEventId && statusUpdate.recordedAt >= lastComplaint.recordedAt),
  ).at(-1);
  const complaintStatus: ComplaintStatus =
    latestStatus?.complaintStatus ?? lastComplaint?.complaintStatus ?? 'unknown';

  const outcomeEventTypes = new Set<CaseEvent['type']>([
    'response_received', 'no_response_reported', 'condition_still_unresolved',
    'condition_improved', 'condition_resolved', 'repair_attempted',
  ]);
  const hasOutcome = Boolean(lastContact && eventsByRecordingTime.some(caseEvent =>
    caseEvent.id !== lastContact.id &&
    caseEvent.recordedAt > lastContact.recordedAt &&
    (caseEvent.relatedEventId === lastContact.id || outcomeEventTypes.has(caseEvent.type)),
  ));

  const persists = condition !== 'resolved';
  return {
    condition,
    persists,
    contacts,
    lastContact,
    complaints,
    lastComplaint,
    complaintStatus,
    closedButPersists: persists && Boolean(lastComplaint) && complaintStatus === 'closed',
    hasOutcome,
    returned: latestConditionReport?.type === 'condition_returned',
    repairAttempted: eventsByRecordingTime.some(caseEvent => caseEvent.type === 'repair_attempted'),
    everResolved: conditionReports.some(caseEvent => conditionOf(caseEvent) === 'resolved'),
  };
}

export type ActionId =
  | 'first' | 'outcome' | 'report' | 'track' | 'discrepancy' | 'remaining'
  | 'nycha' | 'nychaFollow' | 'clarify' | 'resolved' | 'help' | 'court' | 'justfix';
export type PrepId = 'photo' | 'start' | 'temps' | 'manager' | 'copies' | 'ref' | 'remaining' | 'access' | 'route';

export interface Action {
  id: ActionId;
  prep: PrepId[];
  resources: string[];
  template?: 'initial' | 'follow_up' | 'assistance';
}

const actions: Record<ActionId, Action> = {
  first: { id: 'first', prep: ['start', 'photo', 'manager'], resources: [], template: 'initial' },
  outcome: { id: 'outcome', prep: ['copies', 'start'], resources: [] },
  report: { id: 'report', prep: ['photo', 'start', 'copies', 'temps'], resources: ['311', 'hpd'] },
  track: { id: 'track', prep: ['ref', 'copies', 'access'], resources: ['hpdonline', 'hpd'], template: 'follow_up' },
  discrepancy: { id: 'discrepancy', prep: ['ref', 'photo', 'remaining'], resources: ['hpdonline', 'hpd'], template: 'follow_up' },
  remaining: { id: 'remaining', prep: ['remaining', 'photo', 'start'], resources: ['hpd'], template: 'follow_up' },
  nycha: { id: 'nycha', prep: ['route', 'photo', 'start'], resources: ['mynycha', 'nycharepair'], template: 'initial' },
  nychaFollow: { id: 'nychaFollow', prep: ['route', 'ref', 'remaining'], resources: ['mynycha', 'nycharepair'], template: 'follow_up' },
  clarify: { id: 'clarify', prep: ['route', 'manager'], resources: ['mynycha', 'hpd'] },
  resolved: { id: 'resolved', prep: [], resources: [] },
  help: { id: 'help', prep: ['copies', 'ref', 'start'], resources: ['nmic'], template: 'assistance' },
  court: { id: 'court', prep: ['copies', 'ref', 'photo'], resources: ['court'] },
  justfix: { id: 'justfix', prep: [], resources: ['justfix'] },
};

export function buildPlan(housingCase: HousingCase) {
  const facts = deriveCaseFacts(housingCase);
  let recommendedAction: ActionId;

  if (!facts.persists) recommendedAction = 'resolved';
  else if (housingCase.housingType === 'unknown') recommendedAction = 'clarify';
  else if (housingCase.housingType === 'nycha_related') {
    if (!facts.lastContact && !facts.lastComplaint) recommendedAction = 'nycha';
    else if (facts.lastContact && !facts.hasOutcome && !facts.lastComplaint) recommendedAction = 'outcome';
    else recommendedAction = 'nychaFollow';
  } else if (facts.closedButPersists) recommendedAction = 'discrepancy';
  else if (facts.lastComplaint) recommendedAction = 'track';
  else if (facts.repairAttempted) recommendedAction = 'remaining';
  else if (facts.lastContact && !facts.hasOutcome) recommendedAction = 'outcome';
  else if (facts.lastContact) recommendedAction = 'report';
  else recommendedAction = 'first';

  const otherActionIds: ActionId[] = facts.persists
    ? housingCase.housingType === 'private'
      ? ['report', 'help', 'court', 'justfix']
      : ['help', 'court', 'justfix']
    : [];

  return {
    facts,
    primary: actions[recommendedAction],
    secondary: [...new Set(otherActionIds.filter(actionId => actionId !== recommendedAction))]
      .map(actionId => actions[actionId]),
    actions,
  };
}

export const RESOURCE_LINKS: Record<string, string> = {
  '311': 'https://portal.311.nyc.gov/article/?kanumber=KA-01036',
  hpd: 'https://www.nyc.gov/site/hpd/services-and-information/report-a-maintenance-issue.page',
  hpdonline: 'https://hpdonline.nyc.gov/',
  mynycha: 'https://www.nyc.gov/site/nycha/residents/mynycha.page',
  nycharepair: 'https://www.nyc.gov/site/nycha/residents/in-unit-repair-process.page',
  court: 'https://www.nycourts.gov/new-york-city-housing-court/starting-hp-proceeding-obtain-repairs',
  nmic: 'https://www.nmic.org/en/housing/',
  justfix: 'https://www.justfix.org/en/tools/',
};
