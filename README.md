# Conexión NY13

**Bilingual housing repair case organizer** for NYC NY-13 tenants, with an initial focus on Washington Heights and Inwood.

Conexión NY13 is an **independent student project**. It is not affiliated with NYC, HPD, NYCHA, the courts, or the organizations linked in the app. It provides organizational information, not legal advice, and never actually sends a message, files a complaint, verifies an official status, or guarantees a repair.

## Why this repository exists

This is a standalone **React 19 + TypeScript + Vite** continuation of the Conexión NY13 project originally scaffolded in Lovable. It preserves the core case / timeline data model, the same outcome-driven recommendation architecture, resource categories, English/Spanish approach, and opt-in local saving. The UI has been rebuilt in ordinary React + Vite so it can be hosted directly by Vercel or a static hosting provider without a Lovable subscription. The core case logic was adapted and extended from the Lovable project; it is **not** an identical byte-for-byte export of its incomplete TanStack Start codebase.

## Included workflows

1. **First contact:** Start a new issue without recorded prior action; prepare a factual initial management request, then separately record contact.
2. **Unresolved continuation:** Record no response, reply without repair, failed repair, improved condition, and existing complaint, inspection, or repair attempt. The app recommends relevant HPD / NYC311 or building-specific NYCHA routes, later follow-up, assistance, and court information.
3. **Resolution / recurrence:** Mark a repair as resolved, pause active tasks, and add a recurrence to the same history.
4. **Existing histories:** Enter previous actions during intake with approximate dates, reference numbers, notes, and user-reported complaint status. Edit/delete timeline entries and recalculate recommendations.
5. **Documents:** Initial request, follow-up, and assistance summary in English or Spanish, each editable and independently saved; copying does not mark them sent. Print case summary using the browser's Print > Save as PDF.
6. **Case privacy:** LocalStorage opt-in is OFF initially. No database, authentication, analytics, API calls, or user data transmission. Data may be visible to anyone using the same browser profile once saving is enabled.
7. **Demo:** Three explicitly fictional cases are available without overwriting genuine records.

## Technology

- React, TypeScript, Vite
- CSS; Lucide React icons
- `useReducer` + Context state management
- Pure `src/domain/rules.ts` recommendation logic
- Responsive accessible controls; bilingual `src/content/text.ts`
- Optional browser `localStorage` persistence
- Static deploy configuration `vercel.json`

## Run locally

Install Node 20.19+ or a current Node 22 LTS and run:

```bash
npm install
npm run dev
```

Open the local URL Vite prints. Test the production bundle:

```bash
npm run build
npm run preview
```

Test the core recommendation logic:

```bash
npm test
```

The tests use the TypeScript compiler and built-in Node test runner; they do not require a browser.

## Publish on Vercel with GitHub

1. Extract this ZIP to a folder named `conexion-ny13`.
2. From that folder, create a GitHub repository and push the code:

```bash
git init
git add .
git commit -m "Build Conexión NY13"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/conexion-ny13.git
git push -u origin main
```

Create the **empty** `conexion-ny13` repository on GitHub before running `git remote add origin`; replace `YOUR_USERNAME` and authenticate with your own GitHub account. Don't initialize the remote with another README.

3. Open https://vercel.com/new, sign in, and **Import Git Repository** → select `conexion-ny13`.
4. Choose the **Vite** framework preset; Vercel should detect `npm run build` and output directory `dist`. These values are also specified in `vercel.json`.
5. Choose **Deploy**. Share the resulting `https://...vercel.app` public URL for your demonstration.
6. Push later code changes to GitHub to automatically update your Vercel deployment.

If you prefer using Lovable's *exact* source files instead, open the Lovable project → Project Settings → Git → GitHub and connect/sync to a repository; that repository can be imported directly into Vercel. **However, the Lovable version is unfinished and contains errors**; it cannot be substituted for this project without repair. Do not overwrite this updated repository with the unfinished export.

## Functional tests

Run `npm test`. Also verify these browser journeys in **both English and Spanish**:

- New private heat case → prepare draft → copy (verify **no contact event** was created) → record management contact → mark condition resolved.
- New private case → record management contact → still unresolved → file complaint → record complaint closed while physical issue persists → see discrepancy and follow-up resources.
- Create a case with a pre-existing complaint → record more events → mark resolved → record recurrence; ensure all history remains.
- Edit or delete a timeline event and verify recommendations change.
- Enable saving, refresh, and verify data restores. Disable saving, refresh, and verify stored cases have been cleared.
- Edit a generated message, change case facts, and check the stale warning without losing edits.
- Use browser Print / Save as PDF and check readability.
- Test on mobile-width screen and keyboard navigation.

## Important scope and limitations

- The application **does not integrate with HPD Online, NYC311, NYCHA, Google, or a live property database**. Official status fields are *reported by the resident*, not verified.
- NYCHA PACT properties can have different management arrangements; residents must check their building-specific instructions.
- Source URLs were assembled for this project in October 2026. External services may change their pages or guidance. Always consult the organization directly.
- There is no account sync across devices, no image attachment storage, no guaranteed offline operation, no server backup, and no legal submission workflow.
- Heat/hot water guidance is informational. In immediate danger (gas, fire, carbon monoxide, etc.), call 911.

## Source resources

- NYC311: https://portal.311.nyc.gov/article/?kanumber=KA-01036
- HPD repair guidance: https://www.nyc.gov/site/hpd/services-and-information/report-a-maintenance-issue.page
- HPD Online: https://hpdonline.nyc.gov/
- MyNYCHA: https://www.nyc.gov/site/nycha/residents/mynycha.page
- NYCHA repair process: https://www.nyc.gov/site/nycha/residents/in-unit-repair-process.page
- NYC Housing Court: https://www.nycourts.gov/new-york-city-housing-court/starting-hp-proceeding-obtain-repairs
- NMIC: https://www.nmic.org/en/housing/
- JustFix: https://www.justfix.org/en/tools/

## Attribution and authorship

This package was assembled with ChatGPT assistance, based on a user-provided functional specification and parts of the prior Lovable-generated data-model/rules architecture. The student owner should review, test, and explain the implementation accurately. The included tests only attest to the pure recommendation/domain logic in this environment; full `npm install`, production Vite bundling, deployed-website testing, and accessibility auditing were not verified here because dependencies could not be installed in the execution environment. Do not claim those checks are complete until performed.
