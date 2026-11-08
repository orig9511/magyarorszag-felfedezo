# MOMAP SHARING-010 — Guest map sharing

Source changes:
- Published guest guide: Web Share API where available; clipboard link fallback.
- Partner Access: share/copy controls only on published guides.
- URL generated from the current origin and public /g/:slug route; no hard-coded production domain.
- No analytics or tracking, no external share services, no database changes.
- No QR code in this package. QR generation requires a separate reviewed implementation and print UX.

Limitations:
- Clipboard API needs a secure context and user permission; errors are surfaced.
- Web Share API depends on browser/device support.
- A public guide link is usable only when backend publication and database integration work.
- No build, test, debugging, migration, deployment or PR merge performed.
