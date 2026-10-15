# MOMAP – Munkajelentés

## Feladat

SETUP-001 – Codex Development Workflow

Dátum: 2026-10-15. Státusz: PARTIAL (a dokumentáció elkészült; a záró Git diff ellenőrzése blokkolt).
Branch: `feature/initial-implementation`.

## Eredmény és módosított fájlok

- `AGENTS.md`: feladatindítás, auditkorlát, jóváhagyási pontok, bizonyítékjelölések és jelentési folyamat.
- `To-do.md`: a helyi origin referencia `049c60d` commitjából átvett feladatlista; fázispontosítás, SETUP-001 és auditellentmondások felvétele, történet frissítése.
- `OUTPUT.md`: ez a jelentés, egyben a következő feladatok jelentésszerkezete.

Alkalmazáskód és függőség nem változott. Új commit, push, deploy és adatbázisművelet nem történt.

## Ellenőrzés

A Git-parancsoknál az adott hívásra érvényes `-c safe.directory=D:/Github/momap/magyarorszag-felfedezo` beállítást használtuk; globális Git-beállítás nem változott.

- VERIFIED: `git status --short --branch` – kezdetben tiszta munkafa, a helyi origin referenciához képest egy commit lemaradás.
- VERIFIED: `git remote -v`, `git branch --show-current` – az elvárt repository és feature branch.
- VERIFIED: `git diff --stat HEAD origin/feature/initial-implementation` – az átvétel előtt kizárólag `To-do.md`, 317 új sor.
- VERIFIED: `git show origin/feature/initial-implementation:To-do.md` – a feladatlista olvasható.
- VERIFIED: `git merge --ff-only origin/feature/initial-implementation` – sikeres, `cf2b05e` → `049c60d`; kizárólag dokumentáció.
- VERIFIED: az Angular frontend manifestjében `maplibre-gl` szerepel; a frontend `test` script buildet futtat. Ez nem bizonyítja a térkép vagy tesztcsomag működését.
- Build, alkalmazástesztek, böngészős próba: NOT RUN – dokumentációs hatókör.
- VERIFIED: a záró `git status --short --branch` kizárólag a módosított `To-do.md`, valamint az új `AGENTS.md` és `OUTPUT.md` fájlokat mutatja.
- BLOCKED: a záró `git diff --check` és `git diff --stat` hibája: `fatal: this operation must be run in a work tree`. Explicit `-C`, illetve `--git-dir`/`--work-tree` paraméterekkel is megismétlődött. A végső diffellenőrzés nem tekinthető sikeresnek.

## Korlátok és nyitott kérdések

- UNVERIFIED: élő GitHub-frissesség; hálózati fetch/pull nem történt, helyi origin referenciát használtunk.
- A szülő `D:/Github/momap` mappa nem Git-repozitórium; a tényleges repository a belső mappa. A Codex projekt megnyitásához ezt a belső mappát célszerű használni; az alkalmazás projektbeállítását nem módosítottuk.
- A szülő AGENTS.md auditkövetelményei továbbra is alkalmazandók. A belső AGENTS.md önálló megnyitáskor is rögzíti az auditkorlátot.
- A korábbi auditösszefoglalók licenc-, költség- és megvalósíthatósági állításait ebben a feladatban nem igazoltuk. A történeti dokumentumokból nem következik implementációs engedély.
- A zárolt országos kezdőnézet és az eredeti szabad navigáció viszonyát a redesign terv jóváhagyása előtt tisztázni kell. A redesign teljes specifikációját ebben a feladatban nem másoltuk be a repositoryba.

## Következő javasolt feladat

P0-00/P0-01 – a meglévő kód és auditbizonyítékok áttekintése, az ellentmondások feltárása és az implementációs döntések jóváhagyásra előkészítése. Ez a javaslat önmagában nem indít új fejlesztési feladatot.
