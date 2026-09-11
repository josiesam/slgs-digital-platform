# CMS Agent Instructions

Scope: `apps/cms/**`

This application manages public website content.

## Users

Primary roles:
- Multimedia Club
- News Journal Club
- CMS Editor
- CMS Administrator

## Rules

- Student club users are not administrators.
- Club users can create/edit only content allowed by their permissions.
- Publishing should normally require an approval step.
- Track author, editor, reviewer, timestamps, and publication state.
- Never expose CMS identity, draft, audit, or private-media data to the public application.
- Validate uploaded files by type, size, extension, and content where practical.
- Store media metadata separately from domain records.
- Preserve an audit trail for content creation, edits, approval, rejection, publication, and deletion.
