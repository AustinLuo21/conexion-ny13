import { createContext, useContext, useEffect, useReducer, type ReactNode } from 'react';
import type { CaseEvent, Draft, HousingCase, Lang } from '../types';
import { editEvent, insertEvent, patchCase, removeEvent, sampleCases } from '../domain/case';

const CASE_STORAGE_KEY = 'conexion-ny13:data:v1';
const SAVE_PREFERENCE_KEY = 'conexion-ny13:opt-in';

export interface State {
  cases: HousingCase[];
  lang: Lang;
  saveEnabled: boolean;
  saveError: string;
}

export type Action =
  | { type: 'add'; c: HousingCase }
  | { type: 'remove'; id: string }
  | { type: 'patch'; id: string; patch: Partial<HousingCase> }
  | { type: 'eventAdd'; id: string; event: CaseEvent }
  | { type: 'eventEdit'; id: string; event: CaseEvent }
  | { type: 'eventRemove'; id: string; eventId: string }
  | { type: 'draft'; id: string; draft: Draft }
  | { type: 'prep'; id: string; prep: string }
  | { type: 'lang'; lang: Lang }
  | { type: 'saveToggle'; enabled: boolean }
  | { type: 'saveError'; error: string }
  | { type: 'clear' }
  | { type: 'demo' }
  | { type: 'removeDemo' };

const emptySession: State = { cases: [], lang: 'en', saveEnabled: false, saveError: '' };

function isStoredCase(candidate: unknown): candidate is HousingCase {
  if (!candidate || typeof candidate !== 'object') return false;
  const caseRecord = candidate as Partial<HousingCase>;
  return typeof caseRecord.id === 'string' &&
    typeof caseRecord.issue === 'string' &&
    typeof caseRecord.housingType === 'string' &&
    Array.isArray(caseRecord.events) &&
    caseRecord.events.every(event => event && typeof event.id === 'string' && typeof event.type === 'string') &&
    Array.isArray(caseRecord.drafts) &&
    Array.isArray(caseRecord.completedPreparationIds);
}

function loadLocalSession(): State {
  try {
    if (localStorage.getItem(SAVE_PREFERENCE_KEY) !== 'yes') return emptySession;

    const savedText = localStorage.getItem(CASE_STORAGE_KEY);
    if (!savedText) return { ...emptySession, saveEnabled: true };
    const savedPayload: unknown = JSON.parse(savedText);
    if (!savedPayload || typeof savedPayload !== 'object') throw new Error('Invalid saved case format');

    const savedCaseBatch = (savedPayload as { cases?: unknown }).cases;
    if (!Array.isArray(savedCaseBatch)) throw new Error('Saved cases are not a list');
    const validCases = savedCaseBatch.filter(isStoredCase);
    const skippedCases = savedCaseBatch.length - validCases.length;

    return {
      ...emptySession,
      cases: validCases,
      lang: (savedPayload as { lang?: string }).lang === 'es' ? 'es' : 'en',
      saveEnabled: skippedCases === 0,
      // Don't overwrite damaged saved records with an incomplete list.
      saveError: skippedCases ? `${skippedCases} saved case(s) could not be read. The stored copy was left untouched.` : '',
    };
  } catch (storageFailure) {
    const explanation = storageFailure instanceof SyntaxError
      ? 'Saved case history is not valid JSON. No stored records were changed.'
      : storageFailure instanceof DOMException && storageFailure.name === 'SecurityError'
        ? 'This browser blocks local storage. Your cases will not persist after a refresh.'
        : 'Could not read saved cases. No stored records were changed.';
    return { ...emptySession, saveError: explanation };
  }
}

function changeCase(state: State, caseId: string, change: (housingCase: HousingCase) => HousingCase): State {
  return {
    ...state,
    cases: state.cases.map(housingCase => housingCase.id === caseId ? change(housingCase) : housingCase),
  };
}

export function reduce(state: State, action: Action): State {
  switch (action.type) {
    case 'add':
      return { ...state, cases: [action.c, ...state.cases] };
    case 'remove':
      return { ...state, cases: state.cases.filter(housingCase => housingCase.id !== action.id) };
    case 'patch':
      return changeCase(state, action.id, housingCase => patchCase(housingCase, action.patch));
    case 'eventAdd':
      return changeCase(state, action.id, housingCase => insertEvent(housingCase, action.event));
    case 'eventEdit':
      return changeCase(state, action.id, housingCase => editEvent(housingCase, action.event));
    case 'eventRemove':
      return changeCase(state, action.id, housingCase => removeEvent(housingCase, action.eventId));
    case 'draft':
      return changeCase(state, action.id, housingCase => ({
        ...housingCase,
        drafts: [
          ...housingCase.drafts.filter(existingDraft =>
            existingDraft.template !== action.draft.template || existingDraft.language !== action.draft.language,
          ),
          action.draft,
        ],
        updatedAt: action.draft.updatedAt,
      }));
    case 'prep':
      return changeCase(state, action.id, housingCase => ({
        ...housingCase,
        completedPreparationIds: housingCase.completedPreparationIds.includes(action.prep)
          ? housingCase.completedPreparationIds.filter(preparationId => preparationId !== action.prep)
          : [...housingCase.completedPreparationIds, action.prep],
      }));
    case 'lang':
      return { ...state, lang: action.lang };
    case 'saveToggle':
      return { ...state, saveEnabled: action.enabled, saveError: '' };
    case 'saveError':
      return { ...state, saveError: action.error };
    case 'clear':
      return { ...state, cases: [] };
    case 'demo':
      return { ...state, cases: [...state.cases.filter(housingCase => !housingCase.demo), ...sampleCases()] };
    case 'removeDemo':
      return { ...state, cases: state.cases.filter(housingCase => !housingCase.demo) };
  }
}

const CaseStore = createContext<{ s: State; dispatch: React.Dispatch<Action> } | null>(null);

export function Provider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduce, emptySession, loadLocalSession);

  useEffect(() => {
    try {
      if (state.saveEnabled) {
        localStorage.setItem(CASE_STORAGE_KEY, JSON.stringify({ cases: state.cases, lang: state.lang }));
        localStorage.setItem(SAVE_PREFERENCE_KEY, 'yes');
      } else {
        localStorage.removeItem(SAVE_PREFERENCE_KEY);
        // Disabling persistence should also remove an old saved copy.
        if (!state.saveError) localStorage.removeItem(CASE_STORAGE_KEY);
      }
    } catch (storageFailure) {
      const explanation = storageFailure instanceof DOMException && storageFailure.name === 'QuotaExceededError'
        ? 'Browser storage is full. Your latest changes are only available in this tab.'
        : storageFailure instanceof DOMException && storageFailure.name === 'SecurityError'
          ? 'Your browser blocked device saving.'
          : 'Device saving failed. Copy your records before refreshing.';
      if (state.saveError !== explanation) dispatch({ type: 'saveError', error: explanation });
    }
  }, [state.cases, state.lang, state.saveEnabled, state.saveError]);

  useEffect(() => {
    document.documentElement.lang = state.lang;
  }, [state.lang]);

  return <CaseStore.Provider value={{ s: state, dispatch }}>{children}</CaseStore.Provider>;
}

export function useStore() {
  const caseStore = useContext(CaseStore);
  if (!caseStore) throw new Error('CaseStore.Provider is missing');
  return caseStore;
}
