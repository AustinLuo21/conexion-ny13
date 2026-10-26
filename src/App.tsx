import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, CheckCircle2, ChevronRight, ClipboardList, Copy, FileText, Globe2, HeartHandshake, Home, Info, MessageSquarePlus, MoreHorizontal, Plus, Printer, RefreshCcw, ShieldAlert, Trash2, Wrench } from 'lucide-react';
import type { CaseEvent, ComplaintStatus, Condition, Draft, EventType, HousingCase, Housing, Issue, Template } from './types';
import { TYPES, now } from './types';
import { buildPlan, deriveCaseFacts, RESOURCE_LINKS, sortEvents, type Action } from './domain/rules';
import { blankPrior, caseSummary, createCase, eventEntry, generateDraft, makeDraft, priorTypes, validateDate, type IntakeCondition, type Previous } from './domain/case';
import { prettyDate, t as translate } from './content/text';
import { useStore } from './state/Store';
type Route = {
    page: 'home' | 'new' | 'resources' | 'case' | 'docs';
    id?: string;
};
function readRoute(): Route { const hash = window.location.hash.split('?')[0].replace(/^#\/?/, ''); const [page, id] = hash.split('/'); if (page === 'new' || page === 'resources' || page === 'docs' || page === 'case')
    return { page, id }; return { page: 'home' }; }
function navigateTo(page: string) { window.location.hash = '#/' + page; window.scrollTo({ top: 0, behavior: 'smooth' }); }
function Button({ children, onClick, kind = 'primary', type = 'button', disabled = false, className = '' }: {
    children: ReactNode;
    onClick?: () => void;
    kind?: 'primary' | 'secondary' | 'ghost' | 'danger';
    type?: 'button' | 'submit';
    disabled?: boolean;
    className?: string;
}) { return <button className={`btn btn-${kind} ${className}`} type={type} onClick={onClick} disabled={disabled}>{children}</button>; }
function Field({ label, children, hint }: {
    label: string;
    children: ReactNode;
    hint?: string;
}) { return <label className="field"><span className="field-title">{label}</span>{children}{hint && <small className="muted">{hint}</small>}</label>; }
function Input({ value, onChange, type = 'text', placeholder = '', maxLength }: {
    value: string;
    onChange: (v: string) => void;
    type?: string;
    placeholder?: string;
    maxLength?: number;
}) { return <input type={type} value={value} maxLength={maxLength} placeholder={placeholder} onChange={changeEvent => onChange(changeEvent.target.value)}/>; }
function TextArea({ value, onChange, rows = 3, placeholder = '' }: {
    value: string;
    onChange: (v: string) => void;
    rows?: number;
    placeholder?: string;
}) { return <textarea value={value} onChange={changeEvent => onChange(changeEvent.target.value)} rows={rows} placeholder={placeholder}/>; }
function Select({ value, onChange, options }: {
    value: string;
    onChange: (v: string) => void;
    options: {
        value: string;
        label: string;
    }[];
}) { return <select value={value} onChange={changeEvent => onChange(changeEvent.target.value)}>{options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}</select>; }
function choiceOptions(lang: 'en' | 'es', prefix: string, values: string[]) { return values.map(value => ({ value, label: translate(lang, `${prefix}.${value}`) })); }
function Status({ status }: {
    status: Condition;
}) { const { s: appState } = useStore(); return <span className={`status status-${status}`}>{translate(appState.lang, 'status.' + status)}</span>; }
function ResourceLink({ id }: {
    id: string;
}) { const { s: appState } = useStore(); return <a className="resource-link" href={RESOURCE_LINKS[id]} target="_blank" rel="noopener noreferrer"><Globe2 size={16} aria-hidden="true"/>{translate(appState.lang, 'resource.' + id)}<ArrowRight size={14} aria-hidden="true"/></a>; }
function AppHeader() { const { s: appState, dispatch } = useStore(); return <header className="header"><div className="container header-inner"><a className="brand" href="#/" aria-label="Conexión NY13 home"><span className="brand-icon"><Home size={20}/></span><span>Conexión <b>NY13</b><small>HOUSING REPAIR NAVIGATOR</small></span></a><nav className="navigation" aria-label="Primary"><a href="#/">{translate(appState.lang, 'cases')}</a><a href="#/resources">{translate(appState.lang, 'resources')}</a><button className="language" onClick={() => dispatch({ type: 'lang', lang: appState.lang === 'en' ? 'es' : 'en' })} aria-label="Switch between English and Spanish"><Globe2 size={16}/> {appState.lang === 'en' ? 'ES' : 'EN'}</button></nav></div></header>; }
function AppFooter() { const { s: appState } = useStore(); return <footer className="footer"><div className="container"><p><ShieldAlert size={16}/>{translate(appState.lang, 'privacy')}</p><p className="muted"><Info size={15}/>{translate(appState.lang, 'emergency')}</p><span className="footer-copyright">© 2026 Conexión NY13 · Independent student project</span></div></footer>; }
function SaveControl() { const { s: appState, dispatch } = useStore(); return <section className="card save-card"><div className="save-top"><span className="save-icon"><CheckCircle2 size={20}/></span><div><strong>{translate(appState.lang, 'saveTitle')}</strong><p className="muted small">{translate(appState.lang, 'saveDesc')}</p></div><label className="switch" aria-label={translate(appState.lang, 'saveTitle')}><input type="checkbox" checked={appState.saveEnabled} onChange={changeEvent => dispatch({ type: 'saveToggle', enabled: changeEvent.target.checked })}/><span className="switch-track"/></label></div><div className="save-status">{appState.saveEnabled ? <span className="save-green"><Check size={14}/>{translate(appState.lang, 'saveOn')}</span> : <span>{translate(appState.lang, 'saveOff')}</span>}{appState.saveError && <span className="error">{translate(appState.lang, 'saveError')}</span>}</div></section>; }
function HomePage() { const { s: appState, dispatch } = useStore(); return <><section className="hero"><div className="eyebrow">WASHINGTON HEIGHTS · INWOOD · NY-13</div><h1>{translate(appState.lang, 'tag')}</h1><p>{translate(appState.lang, 'subtag')}</p><Button onClick={() => navigateTo('new')}><Plus size={18}/>{translate(appState.lang, 'new')}<ArrowRight size={17}/></Button><div className="hero-pattern" aria-hidden="true"/></section><div className="content-layout"><div className="main-stack"><div className="section-header"><div><div className="eyebrow">{translate(appState.lang, 'eyebrow.records')}</div><h2>{translate(appState.lang, 'cases')}</h2></div><span className="count-pill">{appState.cases.length}</span></div>{appState.cases.length === 0 ? <section className="card empty"><ClipboardList size={38} strokeWidth={1.4}/><h3>{translate(appState.lang, 'noCases')}</h3><Button onClick={() => navigateTo('new')}><Plus size={18}/>{translate(appState.lang, 'new')}</Button></section> : <div className="cases-list">{appState.cases.map(housingCase => <button key={housingCase.id} className="case-list-item" onClick={() => navigateTo(`case/${housingCase.id}`)}><div className="case-issue-icon">{housingCase.issue === 'repair' ? <Wrench size={20}/> : <Home size={20}/>}</div><div className="case-item-middle"><strong>{housingCase.title}</strong><p className="muted">{translate(appState.lang, 'issue.' + housingCase.issue)} · {translate(appState.lang, 'housing.' + housingCase.housingType)}</p>{housingCase.demo && <span className="demo-label">{translate(appState.lang, 'example')}</span>}</div><Status status={deriveCaseFacts(housingCase).condition}/><ChevronRight size={19} className="arrow-right"/></button>)}</div>}<div className="row gap wrap"><Button kind="secondary" onClick={() => dispatch({ type: 'demo' })}><BookOpen size={17}/>{translate(appState.lang, 'demo')}</Button>{appState.cases.some(housingCase => housingCase.demo) && <Button kind="ghost" onClick={() => dispatch({ type: 'removeDemo' })}>{translate(appState.lang, 'removeDemo')}</Button>}</div></div><aside className="side-stack"><SaveControl /><section className="card about-card"><h3>{translate(appState.lang, 'workflow')}</h3><div className="steps">{[1, 2, 3].map(stepNumber => <div className="step" key={stepNumber}><span>{stepNumber}</span><p>{translate(appState.lang, 'step' + stepNumber)}</p></div>)}</div><a href="#/resources" className="inline-link">{translate(appState.lang, 'resources')} <ArrowRight size={15}/></a></section>{appState.cases.length > 0 && <Button kind="ghost" onClick={() => { if (window.confirm(translate(appState.lang, 'clearConfirm')))
    dispatch({ type: 'clear' }); }}><Trash2 size={16}/>{translate(appState.lang, 'clear')}</Button>}</aside></div></>; }
function NewPage() {
    const { s: appState, dispatch } = useStore();
    const lang = appState.lang;
    const [input, setInput] = useState(() => ({ title: '', issue: 'heat' as Issue, housingType: 'private' as Housing, condition: 'ongoing' as IntakeCondition, startedAt: '', description: '', prior: blankPrior() }));
    const [error, setError] = useState('');
    const updateIntakeField = (fieldName: string, enteredValue: string) => setInput(previousIntake => ({
        ...previousIntake,
        [fieldName]: enteredValue,
    }));
    const updatePriorAction = (actionType: Previous, fieldName: string, enteredValue: string | boolean) => setInput(previousIntake => ({
        ...previousIntake,
        prior: {
            ...previousIntake.prior,
            [actionType]: { ...previousIntake.prior[actionType], [fieldName]: enteredValue },
        },
    }));
    function submit(formEvent: FormEvent) { formEvent.preventDefault(); if (input.title.length > 120) {
        setError(translate(lang, 'errorsTitle'));
        return;
    } if (!validateDate(input.startedAt) || priorTypes.some(actionType => input.prior[actionType].selected && !validateDate(input.prior[actionType].occurredAt))) {
        setError(translate(lang, 'errorsDate'));
        return;
    } const housingCase = createCase(input); dispatch({ type: 'add', c: housingCase }); navigateTo(`case/${housingCase.id}`); }
    return <div className="narrow-page"><button className="back-button" onClick={() => navigateTo('')}><ArrowLeft size={17}/>{translate(lang, 'back')}</button><div className="eyebrow">{translate(lang, 'eyebrow.new')}</div><h1>{translate(lang, 'new')}</h1><p className="muted lead">{translate(lang, 'homeIntro')}</p><form onSubmit={submit} className="form-stack"><section className="card form-card"><div className="form-section-heading"><span>01</span><h2>{translate(lang, 'details')}</h2></div><div className="form-grid"><Field label={translate(lang, 'issue')}><Select value={input.issue} onChange={v => updateIntakeField('issue', v)} options={choiceOptions(lang, 'issue', ['heat', 'hot_water', 'repair'])}/></Field><Field label={translate(lang, 'housing')}><Select value={input.housingType} onChange={v => updateIntakeField('housingType', v)} options={choiceOptions(lang, 'housing', ['private', 'nycha_related', 'unknown'])}/></Field><Field label={translate(lang, 'status')}><Select value={input.condition} onChange={v => updateIntakeField('condition', v)} options={choiceOptions(lang, 'status', ['ongoing', 'improved', 'resolved', 'returned'])}/></Field><Field label={translate(lang, 'started')}><Input type="date" value={input.startedAt} onChange={v => updateIntakeField('startedAt', v)}/></Field></div><Field label={translate(lang, 'title')}><Input value={input.title} onChange={v => updateIntakeField('title', v)} placeholder={lang === 'es' ? 'Ej. Radiador no funciona' : 'e.g. Bedroom radiator not working'} maxLength={120}/></Field><Field label={translate(lang, 'desc')}><TextArea value={input.description} onChange={v => updateIntakeField('description', v)} placeholder={lang === 'es' ? '¿Qué está ocurriendo?' : 'What is happening?'}/></Field></section><section className="card form-card"><div className="form-section-heading"><span>02</span><h2>{translate(lang, 'previous')}</h2></div><p className="muted small">{translate(lang, 'previousNote')}</p><div className="previous-list">{priorTypes.map(actionType => <div key={actionType} className="prior-item"><label className="checkbox-line"><input type="checkbox" checked={input.prior[actionType].selected} onChange={changeEvent => updatePriorAction(actionType, 'selected', changeEvent.target.checked)}/><b>{translate(lang, 'event.' + actionType)}</b></label>{input.prior[actionType].selected && <div className="prior-details"><div className="form-grid"><Field label={translate(lang, 'date')}><Input type="date" value={input.prior[actionType].occurredAt} onChange={v => updatePriorAction(actionType, 'occurredAt', v)}/></Field><Field label={translate(lang, 'reference')}><Input value={input.prior[actionType].referenceNumber} onChange={v => updatePriorAction(actionType, 'referenceNumber', v)}/></Field>{actionType === 'complaint_filed' && <Field label={translate(lang, 'complaintStatus')}><Select value={input.prior[actionType].complaintStatus} onChange={v => updatePriorAction(actionType, 'complaintStatus', v)} options={choiceOptions(lang, 'complaintStatus', ['unknown', 'open', 'closed'])}/></Field>}{actionType === 'management_contacted' && <Field label={translate(lang, 'method')}><Select value={input.prior[actionType].method} onChange={v => updatePriorAction(actionType, 'method', v)} options={[{ value: '', label: translate(lang, 'none') }, ...['phone', 'text', 'email', 'in person', 'other'].map(v => ({ value: v, label: translate(lang, 'method.' + v) }))]}/></Field>}{(actionType === 'management_contacted' || actionType === 'assistance_contacted') && <Field label={translate(lang, 'contact')}><Input value={input.prior[actionType].contact} onChange={v => updatePriorAction(actionType, 'contact', v)}/></Field>}</div><Field label={translate(lang, 'notes')}><TextArea rows={2} value={input.prior[actionType].notes} onChange={v => updatePriorAction(actionType, 'notes', v)}/></Field></div>}</div>)}</div></section>{error && <p role="alert" className="error">{error}</p>}<div className="row"><Button type="submit"><Check size={18}/>{translate(lang, 'make')}<ArrowRight size={18}/></Button><Button kind="ghost" onClick={() => navigateTo('')}>{translate(lang, 'cancel')}</Button></div></form></div>;
}
const RECORDABLE_ACTIONS: EventType[] = TYPES.filter(eventType => !['condition_observed', 'condition_still_unresolved', 'condition_improved', 'condition_resolved', 'condition_returned', 'no_response_reported', 'response_received'].includes(eventType));
const OUTCOMES: {
    value: string;
    event: EventType;
}[] = [{ value: 'noUpdate', event: 'no_response_reported' }, { value: 'replied', event: 'response_received' }, { value: 'unresolved', event: 'condition_still_unresolved' }, { value: 'improved', event: 'condition_improved' }, { value: 'resolved', event: 'condition_resolved' }, { value: 'returned', event: 'condition_returned' }];
function EventEditor({ c: housingCase, mode, edit, onClose }: {
    c: HousingCase;
    mode: 'action' | 'outcome' | 'condition' | 'edit';
    edit?: CaseEvent;
    onClose: () => void;
}) {
    const { s: appState, dispatch } = useStore();
    const lang = appState.lang;
    const defaultType: EventType = edit?.type || (mode === 'action' ? (buildPlan(housingCase).primary.id === 'report' ? 'complaint_filed' : 'management_contacted') : mode === 'condition' ? (deriveCaseFacts(housingCase).condition === 'resolved' ? 'condition_returned' : 'condition_still_unresolved') : 'no_response_reported');
    const [type, setType] = useState<EventType>(defaultType);
    const [occurredAt, setOccurredAt] = useState(edit?.occurredAt || '');
    const [notes, setNotes] = useState(edit?.notes || '');
    const [referenceNumber, setRef] = useState(edit?.referenceNumber || '');
    const [method, setMethod] = useState(edit?.method || '');
    const [contact, setContact] = useState(edit?.contact || '');
    const [complaintStatus, setComplaintStatus] = useState<ComplaintStatus>(edit?.complaintStatus || 'unknown');
    const [relatedEventId, setRelated] = useState(edit?.relatedEventId || '');
    const [condition, setCondition] = useState<Condition>(edit?.condition || 'ongoing');
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');
    const isUnresolved = type === 'condition_still_unresolved';
    const isComplaint = type === 'complaint_filed' || type === 'complaint_status_reported';
    function saveEntry(formEvent: FormEvent) {
        formEvent.preventDefault();
        if (!validateDate(occurredAt)) {
            setError(translate(lang, 'errorsDate'));
            return;
        }
        const combined = isUnresolved && reason ? `${translate(lang, 'unresolved.' + reason)}${notes ? ' — ' + notes : ''}` : notes;
        const event: CaseEvent = { id: edit?.id || '', type, recordedAt: edit?.recordedAt || now(), occurredAt: occurredAt || undefined, notes: combined || undefined, referenceNumber: referenceNumber || undefined, method: method || undefined, contact: contact || undefined, relatedEventId: relatedEventId || undefined, complaintStatus: isComplaint ? complaintStatus : undefined, condition: isUnresolved ? condition : undefined };
        if (edit)
            dispatch({ type: 'eventEdit', id: housingCase.id, event });
        else
            dispatch({ type: 'eventAdd', id: housingCase.id, event: eventEntry(type, event) });
        onClose();
    }
    const selectTypes = mode === 'outcome' ? OUTCOMES.map(outcomeOption => ({ value: outcomeOption.event, label: translate(lang, outcomeOption.value) })) : mode === 'condition' ? ['condition_still_unresolved', 'condition_improved', 'condition_resolved', 'condition_returned'].map(value => ({ value, label: translate(lang, 'event.' + value) })) : RECORDABLE_ACTIONS.map(value => ({ value, label: translate(lang, 'event.' + value) }));
    const earlier = housingCase.events.filter(changeEvent => changeEvent.type === 'management_contacted' || changeEvent.type === 'complaint_filed' || changeEvent.type === 'repair_attempted' || changeEvent.type === 'inspection_reported');
    return <form onSubmit={saveEntry} className="editor-panel"><div className="editor-top"><h3>{mode === 'edit' ? translate(lang, 'editEntry') : mode === 'action' ? translate(lang, 'actions') : mode === 'condition' ? translate(lang, 'change') : translate(lang, 'outcome')}</h3><button type="button" className="close" onClick={onClose} aria-label={translate(lang, 'cancel')}>×</button></div><Field label={mode === 'outcome' ? translate(lang, 'outcomeType') : translate(lang, 'actionType')}><Select value={type} onChange={v => { setType(v as EventType); setReason(''); }} options={mode === 'edit' ? [...choiceOptions(lang, 'event', TYPES)] : selectTypes}/></Field><div className="form-grid"><Field label={translate(lang, 'when')}><Input type="date" value={occurredAt} onChange={setOccurredAt}/></Field>{(type === 'management_contacted' || type === 'assistance_contacted') && <Field label={translate(lang, 'method')}><Select value={method} onChange={setMethod} options={[{ value: '', label: translate(lang, 'optional') }, ...['phone', 'text', 'email', 'in person', 'web', 'other'].map(x => ({ value: x, label: translate(lang, 'method.' + x) }))]}/></Field>}{type === 'management_contacted' && <Field label={translate(lang, 'contact')}><Input value={contact} onChange={setContact}/></Field>}{isComplaint && <Field label={translate(lang, 'complaintStatus')}><Select value={complaintStatus} onChange={v => setComplaintStatus(v as ComplaintStatus)} options={choiceOptions(lang, 'complaintStatus', ['unknown', 'open', 'closed'])}/></Field>}</div>{(type !== 'condition_observed') && <Field label={translate(lang, 'related')}><Select value={relatedEventId} onChange={setRelated} options={[{ value: '', label: translate(lang, 'none') }, ...earlier.filter(x => x.id !== edit?.id).map(x => ({ value: x.id, label: `${translate(lang, 'event.' + x.type)} · ${prettyDate(x.occurredAt, lang)}` }))]}/></Field>}{isUnresolved && <><Field label={translate(lang, 'unresolvedWhy')}><Select value={reason} onChange={setReason} options={[{ value: '', label: translate(lang, 'select') }, ...choiceOptions(lang, 'unresolved', ['no_response', 'reply_no_repair', 'failed', 'partial', 'other'])]}/></Field><Field label={translate(lang, 'currentNow')}><Select value={condition} onChange={v => setCondition(v as Condition)} options={choiceOptions(lang, 'status', ['ongoing', 'improved'])}/></Field></>}{(type === 'complaint_filed' || type === 'complaint_status_reported' || type === 'management_contacted' || type === 'repair_attempted' || type === 'inspection_reported' || type === 'assistance_contacted') && <Field label={translate(lang, 'reference')}><Input value={referenceNumber} onChange={setRef}/></Field>}<Field label={translate(lang, 'notes')}><TextArea value={notes} onChange={setNotes} rows={3}/></Field>{error && <span className="error" role="alert">{error}</span>}<div className="row"><Button type="submit"><Check size={17}/>{translate(lang, 'addEntry')}</Button><Button kind="ghost" onClick={onClose}>{translate(lang, 'cancel')}</Button></div></form>;
}
function ActionCard({ action, c: housingCase, onAction }: {
    action: Action;
    c: HousingCase;
    onAction: (m: 'action' | 'outcome' | 'condition' | 'edit') => void;
}) { const { s: appState } = useStore(); const lang = appState.lang; return <div className="card primary-recommendation"><div className="card-eyebrow"><span className="card-bullet"/>{translate(lang, 'next')}</div><h2>{translate(lang, 'action.' + action.id)}</h2><div className="rationale"><Info size={17}/><p>{translate(lang, 'why.' + action.id)}</p></div><div className="main-ctas">{action.template && <Button onClick={() => navigateTo(`docs/${housingCase.id}?template=${action.template}`)}><FileText size={17}/>{translate(lang, 'draft')}</Button>}{action.id === 'first' && <Button kind="secondary" onClick={() => onAction('action')}><MessageSquarePlus size={17}/>{translate(lang, 'event.management_contacted')}</Button>}{action.id === 'outcome' && <Button kind="secondary" onClick={() => onAction('outcome')}>{translate(lang, 'outcome')}</Button>}{action.id === 'report' && <Button kind="secondary" onClick={() => onAction('action')}>{translate(lang, 'event.complaint_filed')}</Button>}{action.id === 'resolved' && <Button onClick={() => onAction('condition')}><RefreshCcw size={17}/>{translate(lang, 'status.returned')}</Button>}</div>{action.prep.length > 0 && <Preparation c={housingCase} prep={action.prep}/>}<div className="action-links">{action.resources.map(id => <ResourceLink key={id} id={id}/>)}</div></div>; }
function Preparation({ c: housingCase, prep }: {
    c: HousingCase;
    prep: string[];
}) { const { s: appState, dispatch } = useStore(); return <div className="prep"><h3>{translate(appState.lang, 'prepare')}</h3><div>{prep.filter((preparationId, index) => prep.indexOf(preparationId) === index).map(key => <label key={key} className="prep-row"><input type="checkbox" checked={housingCase.completedPreparationIds.includes(key)} onChange={() => dispatch({ type: 'prep', id: housingCase.id, prep: key })}/><span>{translate(appState.lang, 'prep.' + key)}</span></label>)}</div><p className="micro muted">{translate(appState.lang, 'priority')}</p></div>; }
function Timeline({ c: housingCase, onEdit }: {
    c: HousingCase;
    onEdit: (changeEvent: CaseEvent) => void;
}) { const { s: appState, dispatch } = useStore(); const lang = appState.lang; const evs = sortEvents(housingCase.events).reverse(); return <section className="card timeline-card"><div className="section-header"><h3>{translate(lang, 'timeline')}</h3><span className="count-pill">{housingCase.events.length}</span></div><p className="micro muted">{translate(lang, 'sourceNote')}</p><div className="timeline">{evs.map(changeEvent => <div key={changeEvent.id} className="timeline-entry"><span className="timeline-dot"/><div className="entry-header"><strong>{translate(lang, 'event.' + changeEvent.type)}</strong><span className="muted micro">{prettyDate(changeEvent.occurredAt, lang)}</span></div>{changeEvent.notes && <p className="small">{changeEvent.notes}</p>}{changeEvent.referenceNumber && <span className="ref-label">#{changeEvent.referenceNumber}</span>}{changeEvent.complaintStatus && <span className="ref-label">{translate(lang, 'complaintStatus.' + changeEvent.complaintStatus)}</span>}{changeEvent.contact && <p className="muted micro">{changeEvent.contact}</p>}<div className="entry-controls"><button onClick={() => onEdit(changeEvent)}>{translate(lang, 'edit')}</button><button onClick={() => { if (confirm(translate(lang, 'deleteEntry')))
    dispatch({ type: 'eventRemove', id: housingCase.id, eventId: changeEvent.id }); }}>{translate(lang, 'delete')}</button></div></div>)}</div></section>; }
function EditCase({ c: housingCase, onClose }: {
    c: HousingCase;
    onClose: () => void;
}) {
    const { s: appState, dispatch } = useStore();
    const lang = appState.lang;
    const [title, setTitle] = useState(housingCase.title), [description, setDescription] = useState(housingCase.description), [housingType, setHousing] = useState(housingCase.housingType), [issue, setIssue] = useState(housingCase.issue), [startedAt, setStart] = useState(housingCase.startedAt || ''), [error, setError] = useState('');
    function submit(formEvent: FormEvent) { formEvent.preventDefault(); if (!validateDate(startedAt)) {
        setError(translate(lang, 'errorsDate'));
        return;
    } if (title.length > 120) {
        setError(translate(lang, 'errorsTitle'));
        return;
    } dispatch({ type: 'patch', id: housingCase.id, patch: { title, description, housingType, issue, startedAt: startedAt || undefined } }); onClose(); }
    return <form onSubmit={submit} className="editor-panel"><div className="editor-top"><h3>{translate(lang, 'editCase')}</h3><button type="button" className="close" onClick={onClose}>×</button></div><Field label={translate(lang, 'title')}><Input value={title} onChange={setTitle}/></Field><div className="form-grid"><Field label={translate(lang, 'issue')}><Select value={issue} onChange={v => setIssue(v as Issue)} options={choiceOptions(lang, 'issue', ['heat', 'hot_water', 'repair'])}/></Field><Field label={translate(lang, 'housing')}><Select value={housingType} onChange={v => setHousing(v as Housing)} options={choiceOptions(lang, 'housing', ['private', 'nycha_related', 'unknown'])}/></Field><Field label={translate(lang, 'started')}><Input value={startedAt} onChange={setStart} type="date"/></Field></div><Field label={translate(lang, 'desc')}><TextArea value={description} onChange={setDescription}/></Field>{error && <p className="error">{error}</p>}<div className="row"><Button type="submit">{translate(lang, 'save')}</Button><Button kind="ghost" onClick={onClose}>{translate(lang, 'cancel')}</Button></div></form>;
}
function CasePage({ id }: {
    id: string;
}) {
    const { s: appState, dispatch } = useStore();
    const housingCase = appState.cases.find(matchingCase => matchingCase.id === id);
    const [mode, setMode] = useState<'action' | 'outcome' | 'condition' | 'edit' | 'caseedit' | null>(null);
    const [selected, setSelected] = useState<CaseEvent>();
    if (!housingCase)
        return <div className="narrow-page"><h2>{translate(appState.lang, 'notFound')}</h2><Button onClick={() => navigateTo('')}>{translate(appState.lang, 'back')}</Button></div>;
    const plan = buildPlan(housingCase);
    const facts = plan.facts;
    function show(m: 'action' | 'outcome' | 'condition' | 'edit' | 'caseedit', changeEvent?: CaseEvent) { setSelected(changeEvent); setMode(m); setTimeout(() => document.getElementById('case-editor')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 30); }
    return <div><button className="back-button" onClick={() => navigateTo('')}><ArrowLeft size={17}/>{translate(appState.lang, 'cases')}</button><div className="case-heading"><div><div className="eyebrow">{housingCase.demo ? translate(appState.lang, 'example') : translate(appState.lang, 'eyebrow.case')} · {translate(appState.lang, 'issue.' + housingCase.issue)}</div><h1>{housingCase.title}</h1><div className="row gap wrap"><Status status={facts.condition}/><span className="muted small">{translate(appState.lang, 'housing.' + housingCase.housingType)}</span></div></div><div className="row gap wrap no-print"><Button kind="secondary" onClick={() => navigateTo(`docs/${housingCase.id}`)}><FileText size={17}/>{translate(appState.lang, 'docs')}</Button><Button kind="ghost" onClick={() => show('caseedit')}><MoreHorizontal size={17}/>{translate(appState.lang, 'editCase')}</Button></div></div>{facts.closedButPersists && <div className="alert-warning"><ShieldAlert size={18}/>{translate(appState.lang, 'statusClosed')}</div>}{housingCase.housingType === 'nycha_related' && <div className="alert-neutral"><Info size={17}/>{translate(appState.lang, 'why.nycha')}</div>}{housingCase.description && <p className="case-description">{housingCase.description}</p>}
 <div className="case-grid"><div className="main-stack"><section className="condition-strip"><div><span className="micro muted">{translate(appState.lang, 'statusLabel')}</span><div className="condition-large"><Status status={facts.condition}/></div></div><div className="row gap wrap"><Button kind="secondary" onClick={() => show('outcome')}><RefreshCcw size={17}/>{translate(appState.lang, 'outcome')}</Button><Button kind="ghost" onClick={() => show('condition')}>{translate(appState.lang, 'change')}</Button></div></section><ActionCard c={housingCase} action={plan.primary} onAction={show}/><div className="quick-actions no-print"><Button onClick={() => show('action')}><Plus size={17}/>{translate(appState.lang, 'actions')}</Button><Button kind="secondary" onClick={() => show('outcome')}><RefreshCcw size={17}/>{translate(appState.lang, 'outcome')}</Button></div>{mode && <div id="case-editor">{mode === 'caseedit' ? <EditCase c={housingCase} onClose={() => setMode(null)}/> : <EventEditor key={(selected?.id || mode)} c={housingCase} mode={mode} edit={mode === 'edit' ? selected : undefined} onClose={() => setMode(null)}/>}</div>}<section className="card other-options"><div className="section-header"><h2>{translate(appState.lang, 'other')}</h2><span className="muted micro">{translate(appState.lang, 'priority')}</span></div><div className="other-list">{plan.secondary.map(action => <details key={action.id}><summary><span>{translate(appState.lang, 'action.' + action.id)}</span><ChevronRight size={16}/></summary><div className="other-body"><p>{translate(appState.lang, 'why.' + action.id)}</p>{action.template && <Button kind="secondary" onClick={() => navigateTo(`docs/${housingCase.id}?template=${action.template}`)}><FileText size={15}/>{translate(appState.lang, 'draft')}</Button>}{action.resources.map(r => <ResourceLink key={r} id={r}/>)}</div></details>)}</div></section><div className="row gap wrap no-print"><Button kind="secondary" onClick={() => navigateTo(`docs/${housingCase.id}?template=assistance`)}><HeartHandshake size={17}/>{translate(appState.lang, 'copySummary')}</Button><Button kind="danger" onClick={() => { if (confirm(translate(appState.lang, 'deleteAsk'))) {
        dispatch({ type: 'remove', id: housingCase.id });
        navigateTo('');
    } }}><Trash2 size={16}/>{translate(appState.lang, 'deleteCase')}</Button></div></div><aside className="side-stack"><Timeline c={housingCase} onEdit={selectedCaseEvent => show('edit', selectedCaseEvent)}/><div className="card reminder"><h3>{translate(appState.lang, 'sourceNote')}</h3><p className="muted micro">{translate(appState.lang, 'privacy')}</p></div></aside></div></div>;
}
function DocumentsPage({ id }: {
    id: string;
}) {
    const { s: appState, dispatch } = useStore();
    const housingCase = appState.cases.find(matchingCase => matchingCase.id === id);
    const param = new URLSearchParams(window.location.hash.split('?')[1] || '').get('template');
    const [template, setTemplate] = useState<Template>(param === 'follow_up' || param === 'assistance' ? param : 'initial');
    const [copyState, setCopyState] = useState('');
    const draftEditor = useRef<HTMLTextAreaElement>(null);
    if (!housingCase)
        return <div className="narrow-page">{translate(appState.lang, 'notFound')} <Button onClick={() => navigateTo('')}>Back</Button></div>;
    const draft = housingCase.drafts.find(existingDraft => existingDraft.template === template && existingDraft.language === appState.lang);
    const body = draft?.body || '';
    function updateDraft(body: string) { const updatedDraft: Draft = draft ? { ...draft, body, updatedAt: now() } : { ...makeDraft(housingCase!, template, appState.lang), body }; dispatch({ type: 'draft', id: housingCase!.id, draft: updatedDraft }); }
    async function copy() { try {
        await navigator.clipboard.writeText(body);
        setCopyState(translate(appState.lang, 'copied'));
    }
    catch {
        // Clipboard access is blocked in some browsers unless the page is secure or focused.
        draftEditor.current?.focus();
        draftEditor.current?.select();
        setCopyState(translate(appState.lang, 'copyFail'));
    } }
    function print() { const summary = caseSummary(housingCase!, appState.lang); const win = window.open('', '_blank'); if (!win) {
        setCopyState(translate(appState.lang, 'printBlocked'));
        return;
    } win.document.open(); win.document.write('<!doctype html><html><head><title>Conexión NY13 — Case Summary</title><meta charset="utf-8"><style>body{font:15px/1.6 Arial,sans-serif;max-width:800px;margin:45px auto;color:#172333}pre{white-space:pre-wrap;overflow-wrap:anywhere;font:inherit}h1{color:#0f766e}@media print{body{margin:12mm}}</style></head><body><h1>Conexión NY13</h1><pre></pre></body></html>'); win.document.close(); win.document.querySelector('pre')!.textContent = summary; win.focus(); setTimeout(() => win.print(), 250); }
    return <div><button className="back-button" onClick={() => navigateTo(`case/${housingCase!.id}`)}><ArrowLeft size={17}/>{translate(appState.lang, 'back')}</button><div className="eyebrow">{translate(appState.lang, 'eyebrow.docs')}</div><h1>{translate(appState.lang, 'docs')}</h1><p className="muted lead">{housingCase.title}</p><div className="docs-grid"><section className="card doc-workspace"><div className="template-tabs" role="tablist" aria-label="Document template">{(['initial', 'follow_up', 'assistance'] as Template[]).map(tmpl => <button role="tab" aria-selected={template === tmpl} className={template === tmpl ? 'active' : ''} key={tmpl} onClick={() => { setTemplate(tmpl); setCopyState(''); }}>{translate(appState.lang, 'template.' + tmpl)}</button>)}</div><div className="doc-editor-head"><div><h2>{translate(appState.lang, 'template.' + template)}</h2><p className="muted micro">{translate(appState.lang, 'docNote')}</p></div>{draft && draft.generatedFromRevision < housingCase.historyRevision && <span className="warning-label">{translate(appState.lang, 'stale')}</span>}</div>{!draft ? <div className="doc-empty"><FileText size={36}/><p>{appState.lang === 'es' ? 'Genere un borrador basado en su historial.' : 'Generate a draft using your recorded case history.'}</p><Button onClick={() => dispatch({ type: 'draft', id: housingCase.id, draft: makeDraft(housingCase!, template, appState.lang) })}>{translate(appState.lang, 'generate')}</Button></div> : <><textarea ref={draftEditor} className="doc-textarea" value={body} onChange={changeEvent => updateDraft(changeEvent.target.value)} rows={20} aria-label={translate(appState.lang, 'template.' + template)}/><div className="row gap wrap"><Button onClick={copy}><Copy size={17}/>{translate(appState.lang, 'copy')}</Button><Button kind="secondary" onClick={() => { if (confirm(translate(appState.lang, 'regenAsk')))
        dispatch({ type: 'draft', id: housingCase.id, draft: makeDraft(housingCase!, template, appState.lang) }); }}><RefreshCcw size={16}/>{translate(appState.lang, 'regenerate')}</Button></div>{copyState && <p role="status" className="micro">{copyState}</p>}</>}</section><aside className="side-stack"><section className="card"><h3>{translate(appState.lang, 'print')}</h3><p className="muted small">{translate(appState.lang, 'printNote')}</p><Button kind="secondary" onClick={print}><Printer size={17}/>{translate(appState.lang, 'print')}</Button></section><section className="card"><h3>{translate(appState.lang, 'resource.hpd')}</h3><ResourceLink id="hpd"/><ResourceLink id="nmic"/></section></aside></div></div>;
}
function ResourcesPage() { const { s: appState } = useStore(); const ids = Object.keys(RESOURCE_LINKS); return <div><button className="back-button" onClick={() => navigateTo('')}><ArrowLeft size={17}/>{translate(appState.lang, 'back')}</button><div className="eyebrow">{translate(appState.lang, 'eyebrow.resources')}</div><h1>{translate(appState.lang, 'resources')}</h1><p className="lead muted">{translate(appState.lang, 'resourceNote')}</p><div className="resources-grid">{ids.map(id => <section key={id} className="card resource-card"><Globe2 size={22} className="teal"/><h2>{translate(appState.lang, 'resource.' + id)}</h2><p className="muted micro">{id === 'nmic' ? translate(appState.lang, 'why.help') : id === 'court' ? translate(appState.lang, 'why.court') : id === 'justfix' ? translate(appState.lang, 'why.justfix') : id === 'mynycha' || id === 'nycharepair' ? translate(appState.lang, 'why.nycha') : translate(appState.lang, 'why.report')}</p><ResourceLink id={id}/></section>)}</div><p className="muted small" style={{ marginTop: 20 }}>{translate(appState.lang, 'reviewed')}</p></div>; }
export default function App() { const [route, setRoute] = useState<Route>(readRoute); useEffect(() => { const handleRouteChange = () => setRoute(readRoute()); window.addEventListener('hashchange', handleRouteChange); return () => window.removeEventListener('hashchange', handleRouteChange); }, []); return <><AppHeader /><main className="container page">{route.page === 'new' ? <NewPage /> : route.page === 'case' ? <CasePage key={route.id} id={route.id || ''}/> : route.page === 'docs' ? <DocumentsPage key={route.id} id={route.id || ''}/> : route.page === 'resources' ? <ResourcesPage /> : <HomePage />}</main><AppFooter /></>; }
