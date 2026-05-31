# Security Policy

## Supported Versions

Security fixes target the `main` branch.

## Reporting A Vulnerability

Please do not open a public issue for a vulnerability.

Report privately through GitHub Security Advisories if available on the repository, or contact the maintainer through a private channel listed on the GitHub profile.

Include:

- Affected route, file, or component.
- Steps to reproduce.
- Expected impact.
- Any proof-of-concept payload, if safe to share.

## Current Security Controls

- Server-side environment variables for AI credentials.
- Zod validation for API payloads.
- Sanitization for user input and AI output.
- Guest ownership checks before record access or mutation.
- Lightweight in-memory rate limiting.
- Local JSON data excluded from Git.

## Known Limitations

- In-memory rate limiting resets when the server restarts and is not shared across instances.
- Serverless local JSON storage is temporary.
- Public demo mode has no account authentication by design.
