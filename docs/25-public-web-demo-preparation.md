# Public Web Demo Preparation

Status: **ENGINEERING READY — OFFICIAL CONTENT REQUIRED**

## Demo scope

The primary public information architecture is:

| Section | Canonical route | CMS content |
| --- | --- | --- |
| About | `/about` | Page with slug `about` |
| Admissions | `/admissions` | Page with slug `admissions` |
| Academics | `/academics` | Page with slug `academics` |
| School life | `/life` | Page with slug `life` |
| Parents | `/parents` | Page with slug `parents` |
| News | `/news` | Published articles |
| Events | `/events` | Published events |
| Gallery | `/gallery` | Published galleries |
| Contact | `/contact` | Page with slug `contact` |

`/admissions` is the approved canonical route. `/admission` is not an approved
alternate route and must not be introduced without a routing decision.

## CMS preparation

The CMS dashboard provides a **Page configuration readiness** workspace. It
shows all nine sections as not configured, in workflow or published. For an
identity with the matching author permission, a missing section can prefill a
new draft with its approved type, canonical route and fixed slug.

Official copy is deliberately not seeded. The school must supply or approve:

- overview, history, mission, vision, values and leadership information;
- admissions requirements, dates, fees, documents and application guidance;
- academic programmes, departments and public curriculum information;
- school-life, club, sport and activity descriptions;
- public parent guidance and resources;
- contact address, telephone, email, office hours and enquiry guidance;
- representative news, event and gallery material suitable for publication;
- image consent, captions and alternative text.

These are content/governance inputs, not engineering defaults.

## Required demonstration roles

Use separate synthetic or approved demonstration identities for the workflow:

1. CMS Editor creates and submits fixed pages.
2. News Journal Club creates and submits news and events.
3. Multimedia Club creates and submits gallery content and authorized media.
4. CMS Reviewer completes independent review.
5. CMS Approver approves independently reviewed content.
6. CMS Publisher publishes and, if demonstrated, unpublishes content.

For the single-administrator demonstration path, CMS Administrator may perform
all six operations itself. The ordered states and audit history remain visible.

CMS System Administrator remains distinct. CMS Administrator now receives the
explicit CMS-only operational override approved in ADR-040. No CMS role gains
S.I.M.S. authority.

## Demonstration sequence

1. Open CMS and show the nine-section readiness workspace.
2. Open or configure one informational page using its fixed slug.
3. Show revision history and the draft-to-submitted transition.
4. Complete review, approval and publication with the appropriate identities.
5. Open the corresponding public route and confirm only the published version
   appears. Allow for the documented public cache window.
6. Show News, Events and Gallery listing routes with representative approved
   content.
7. Demonstrate unpublication and confirm the item leaves the public boundary.
8. Show that the public application has no CMS controls and no S.I.M.S. data.

## Current environment observation

On 2026-09-08, a read-only check of the configured CMS database found no
content records for these public sections. At least representative approved
content must therefore be entered before a content-complete demonstration.
This observation must be rechecked immediately before the demo because the
database can change independently of the repository.

## Pre-demo checks

- Confirm CMS Editor, club author, Reviewer, Approver and Publisher identities
  can authenticate to CMS.
- Confirm each identity receives only its intended CMS permission set.
- Confirm the CMS and Web applications use their distinct runtime database
  credentials.
- Confirm all intended demo records show `published` in CMS.
- Confirm `/about`, `/admissions`, `/academics`, `/life`, `/parents`, `/news`,
  `/events`, `/gallery` and `/contact` load successfully.
- Confirm canonical metadata uses `http://slgs.edu.sl` while the infrastructure
  handover remains pending.
- Do not show real student data, credentials or private R2 object keys.
- Explain that public gallery images remain dependent on the approved public
  media-delivery decision; do not expose the private R2 bucket.
