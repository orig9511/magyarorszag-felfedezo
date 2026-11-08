# MOMAP ADS-009 — unobtrusive landing ad inventory

## Source changes
- Reusable `app-ad-slot` presentation component, with an accessible 'Hirdetés' label.
- Three placements: after categories, after featured content, before footer.
- All placements disabled by default; no empty boxes in the UI.
- No external Google scripts, cookies, requests or ad rendering.
- Activation requires explicit publisher configuration AND a positive consent input.
- No ads in hero, map canvas, map markers, partner access, or guest guides.

## Before activating ads
1. AdSense approval, real publisher ID and slot IDs.
2. Published privacy and cookie policies, appropriate CMP/consent flow and EEA consent requirements.
3. Implement consent-aware script loading, ad initialization and revocation behavior; never load Google scripts before consent where required.
4. Avoid deceptive placement, accidental clicks and unverified claims of Google policy compliance.
5. Test CLS, responsive layouts, ad density and accessibility.
6. Prefer 1–2 slots initially; disable the third unless metrics justify it.

No builds, tests, database operations, deployment or PR merges performed.
