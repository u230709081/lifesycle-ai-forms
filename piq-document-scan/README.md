# PIQ document scan

Prototype for Lifesycle: the seller uploads photos or PDFs of property documents
(EPC, boiler certificate, FENSA certificate, bills…). Claude reads each document,
finds the answers it gives to the Property Information Questionnaire (PIQ) and
says where the document itself should be attached. The seller confirms, changes
or rejects every answer; confirmed answers are output as JSON for the form.

## Quick start

Requires Node.js 18.18 or later.

```bash
npm install
cp .env.example .env      # then put your Claude API key in .env
npm start                 # http://localhost:3000
```

Without `ANTHROPIC_API_KEY` the page still runs: the two sample documents show a
prepared result, and real uploads show a "no API key" message.

## How it works

1. The browser resizes photos (longest side 2000 px) and sends one file at a time
   to `POST /api/scan`. PDFs are sent as they are.
2. The server builds the prompt from the PIQ field model and sends the file to the
   Claude API. The API key never reaches the browser.
3. The browser keeps only valid answers (known field keys, existing options,
   well-formed years, dates and numbers) and shows them grouped by PIQ section,
   with the original question number and the words they were read from.
4. If two documents agree, both are shown as sources. If they disagree, the answer
   is marked "Doesn't match" and both values are shown.
5. Confirmed answers appear under "Ready for the form" as JSON.

## Project structure

```
server.js            Express server: static files + /api/health + /api/scan
shared/
  fields.js          PIQ field model (sections, questions, options, conditions)
  scan.js            Prompt builder, JSON parsing and answer validation
public/
  index.html         Page shell
  css/styles.css     Styles (matches the existing Lifesycle PIQ look)
  js/app.js          Upload, checking answers and JSON output
  js/samples.js      Two sample documents with prepared results
```

`shared/` is used by both the server and the browser, so the prompt and the page
always agree on field keys.

## API

`GET /api/health` → `{ "ok": true, "ai": true, "model": "…" }`

`POST /api/scan`

```json
{ "data": "<base64>", "mediaType": "image/jpeg", "address": "22 East Hanningfield Road, …" }
```

`mediaType` is one of `image/jpeg`, `image/png`, `image/webp`, `image/gif`,
`application/pdf`. Reply: `{ "result": { "doc_type", "summary", "facts", "attach_to", "notes" } }`
or `{ "error": { "code", "message" } }`.

## Output for the form

```json
{
  "property": "22 East Hanningfield Road, Rettendon Common, Chelmsford, Essex, CM3 8EQ",
  "answers": {
    "heating_installed_year": {
      "value": "2016",
      "question": "What year was it installed?",
      "original_question": "A7.4",
      "document": "Boiler certificate.jpg",
      "evidence": "Date of installation: 14 June 2016",
      "changed_by_seller": false
    }
  },
  "attachments": {
    "gas_safe_certificate": { "files": ["Boiler certificate.jpg"], "question": "Upload the Gas Safe installation certificate", "original_question": "A7.4" }
  },
  "notes": []
}
```

Keys match `shared/fields.js`, so another tab can write these values straight into
the questionnaire.

## Settings (.env)

| Variable | Default | |
|---|---|---|
| `ANTHROPIC_API_KEY` | (none) | Required for real reading |
| `ANTHROPIC_MODEL` | `claude-sonnet-5-5` | Any Claude model with vision |
| `PORT` | `3000` | |

The property address is a constant at the top of `public/js/app.js`
(`PROPERTY_ADDRESS`). In Lifesycle it would come from the property record.

## Before using it beyond a demo

- `/api/scan` has no authentication. Put it behind Lifesycle's login before deploying.
- Documents are sent to the Claude API for reading. Nothing is stored on the server;
  answers are kept in the browser's local storage until "Start over".
- Files: images and PDFs up to about 7 MB. Very long PDFs may need splitting.
