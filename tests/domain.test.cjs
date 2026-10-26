const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  createCase, blankPrior, insertEvent, eventEntry, editEvent, removeEvent,
  generateDraft, validateDate,
} = require('../.domain-build/domain/case.js');
const { buildPlan, deriveCaseFacts } = require('../.domain-build/domain/rules.js');

function newHeatCase(previousActions = blankPrior(), condition = 'ongoing', housingType = 'private') {
  return createCase({
    title: 'Cold bedroom radiator', issue: 'heat', housingType, condition,
    startedAt: '', description: 'The bedroom radiator is cold.', prior: previousActions,
  });
}

test('a new private-rental case begins with a first repair request', () => {
  const housingCase = newHeatCase();
  assert.equal(buildPlan(housingCase).primary.id, 'first');
  assert.equal(housingCase.events.length, 1);
});

test('copying a repair request does not falsely record contact with management', () => {
  const housingCase = newHeatCase();
  const repairRequestText = generateDraft(housingCase, 'initial', 'en');
  assert.match(repairRequestText, /Dear building management/);
  assert.equal(buildPlan(housingCase).primary.id, 'first');
});

test('a management response without completed repairs leaves the case open', () => {
  let housingCase = newHeatCase();
  housingCase = insertEvent(housingCase, eventEntry('management_contacted', { method: 'email' }));
  assert.equal(buildPlan(housingCase).primary.id, 'outcome');

  housingCase = insertEvent(housingCase, eventEntry('response_received', {
    notes: 'Building manager promised a repair next week',
  }));
  assert.equal(buildPlan(housingCase).primary.id, 'report');
  assert.equal(deriveCaseFacts(housingCase).condition, 'ongoing');
});

test('closed complaint with an ongoing physical problem is a discrepancy, not a resolution', () => {
  let housingCase = newHeatCase();
  housingCase = insertEvent(housingCase, eventEntry('management_contacted', {}));
  housingCase = insertEvent(housingCase, eventEntry('condition_still_unresolved', { notes: 'Still cold' }));
  const complaintFiled = eventEntry('complaint_filed', {
    referenceNumber: 'EXAMPLE123', complaintStatus: 'open',
  });
  housingCase = insertEvent(housingCase, complaintFiled);
  assert.equal(buildPlan(housingCase).primary.id, 'track');

  housingCase = insertEvent(housingCase, eventEntry('complaint_status_reported', {
    relatedEventId: complaintFiled.id, complaintStatus: 'closed',
  }));
  assert.equal(buildPlan(housingCase).primary.id, 'discrepancy');
  assert.equal(deriveCaseFacts(housingCase).condition, 'ongoing');
});

test('repair completion pauses suggestions; a recurrence preserves the old history', () => {
  let housingCase = newHeatCase();
  housingCase = insertEvent(housingCase, eventEntry('condition_resolved', {}));
  assert.equal(buildPlan(housingCase).primary.id, 'resolved');
  const eventsBeforeRecurrence = housingCase.events.length;

  housingCase = insertEvent(housingCase, eventEntry('condition_returned', {}));
  assert.equal(deriveCaseFacts(housingCase).condition, 'ongoing');
  assert.equal(housingCase.events.length, eventsBeforeRecurrence + 1);
});

test('residents may start with an already filed complaint', () => {
  const previousActions = blankPrior();
  previousActions.complaint_filed.selected = true;
  previousActions.complaint_filed.complaintStatus = 'open';
  assert.equal(buildPlan(newHeatCase(previousActions)).primary.id, 'track');
});

test('unknown housing does not receive private-building or NYCHA-only guidance', () => {
  assert.equal(buildPlan(newHeatCase(blankPrior(), 'ongoing', 'unknown')).primary.id, 'clarify');
  assert.equal(buildPlan(newHeatCase(blankPrior(), 'ongoing', 'nycha_related')).primary.id, 'nycha');
});

test('editing or deleting an incorrect entry recalculates recommendations', () => {
  let housingCase = newHeatCase();
  const managementContact = eventEntry('management_contacted', {});
  housingCase = insertEvent(housingCase, managementContact);
  assert.equal(buildPlan(housingCase).primary.id, 'outcome');

  housingCase = editEvent(housingCase, { ...managementContact, type: 'condition_resolved' });
  assert.equal(buildPlan(housingCase).primary.id, 'resolved');
  housingCase = removeEvent(housingCase, managementContact.id);
  assert.equal(buildPlan(housingCase).primary.id, 'first');
});

test('empty dates stay unknown; impossible and future dates are rejected', () => {
  assert.equal(validateDate(''), true);
  assert.equal(eventEntry('management_contacted', { occurredAt: '' }).occurredAt, undefined);
  assert.equal(validateDate('2026-02-30'), false);
  assert.equal(validateDate('2035-01-01'), false);
});

test('editing a timeline entry preserves its original recording timestamp', () => {
  const originalContact = eventEntry('management_contacted', {
    occurredAt: '2026-10-01', notes: 'Called superintendent',
  });
  const housingCase = insertEvent(newHeatCase(), originalContact);
  const editedCase = editEvent(housingCase, {
    ...originalContact, occurredAt: '2026-10-02', notes: 'Correction: called October 2',
    recordedAt: '2035-01-01T00:00:00.000Z',
  });
  const correctedContact = editedCase.events.find(caseEvent => caseEvent.id === originalContact.id);
  assert.equal(correctedContact.recordedAt, originalContact.recordedAt);
  assert.equal(correctedContact.occurredAt, '2026-10-02');
});

test('deleting an action also unlinks subsequent outcomes from that deleted entry', () => {
  const originalComplaint = eventEntry('complaint_filed', { referenceNumber: 'EXAMPLE-48' });
  let housingCase = insertEvent(newHeatCase(), originalComplaint);
  housingCase = insertEvent(housingCase, eventEntry('complaint_status_reported', {
    relatedEventId: originalComplaint.id, complaintStatus: 'closed',
  }));
  housingCase = removeEvent(housingCase, originalComplaint.id);

  const formerStatusReport = housingCase.events.find(caseEvent =>
    caseEvent.type === 'complaint_status_reported',
  );
  assert.equal(formerStatusReport.relatedEventId, undefined);
  assert.equal(buildPlan(housingCase).primary.id, 'first');
});

test('Spanish draft uses Spanish content without changing case facts', () => {
  const housingCase = newHeatCase();
  const spanishRequest = generateDraft(housingCase, 'initial', 'es');
  assert.match(spanishRequest, /Solicitud de reparación/);
  assert.equal(buildPlan(housingCase).primary.id, 'first');
});
