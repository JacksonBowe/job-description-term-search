# Privacy Policy

**Job Description Term Search**  
Last updated: April 8, 2026

## Overview

Job Description Term Search is a browser extension that helps you evaluate job postings by matching them against your configured terms. This extension is designed with privacy as a core principle.

## Data Collection

**We do not collect any data.**

- No personal information is collected
- No usage analytics or telemetry
- No data is transmitted to external servers
- No cookies or tracking mechanisms

## Data Storage

All data is stored locally in your browser using Chrome's `storage.local` API:

- Your configured terms (skills, keywords, red flags)
- Term weights and aliases

This data:

- Never leaves your device
- Is not accessible to any external service
- Is only used by the extension to score job listings
- Can be exported/deleted at any time through the extension settings

## Permissions

The extension requires these permissions:

| Permission         | Purpose                                           |
| ------------------ | ------------------------------------------------- |
| `storage`          | Save your term configurations locally             |
| `tabs`             | Detect when you navigate to a job page            |
| `activeTab`        | Read job description content from the current tab |
| `sidePanel`        | Display the extension UI in Chrome's side panel   |
| `host_permissions` | Access LinkedIn and Seek job pages only           |

## Third Parties

This extension does not integrate with any third-party services, analytics platforms, or external APIs.

## Open Source

This extension is open source. You can review the complete source code at:  
https://github.com/JacksonBowe/job-description-term-search

## Contact

For questions or concerns about this privacy policy, please open an issue on GitHub:  
https://github.com/JacksonBowe/job-description-term-search/issues

## Changes

Any changes to this privacy policy will be reflected in this document and the "Last updated" date above.
