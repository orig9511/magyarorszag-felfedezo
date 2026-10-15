# MOMAP – Codex munkafolyamat

## Hatókör és jóváhagyás

A projekt jelenlegi fázisa audit és dokumentáció. Az alkalmazás már létezik; jelenléte nem bizonyítja működését vagy az audit jóváhagyását. Implementációt csak a befejezett audit és a megvalósítási terv kifejezett felhasználói jóváhagyása után kezdj.

A termék magyarországi, térképközpontú turisztikai felfedezőplatform, fokozatosan aktiválható vármegyékkel, szabad felfedezéssel, POI- és eseményszűréssel. A szponzorált tartalom legyen jelölt. Technológiai, licencelési és adatforrás-döntéseket bizonyíték alapján értékelj. A korábbi dokumentumok ajánlásai önmagukban nem jóváhagyások.

## Feladat indítása

1. Ellenőrizd a Git gyökerét, remote-ját, branchét és munkafáját. A várt remote: `https://github.com/orig9511/magyarorszag-felfedezo.git`. Dedikált feature branchen dolgozz; a kiinduló branch `feature/initial-implementation`.
2. Olvasd el a `To-do.md` és a legutóbbi `OUTPUT.md` fájlt. Ezekben a státuszok és ajánlások nem jelentenek automatikus felhatalmazást a következő feladat végrehajtására.
3. Vizsgáld meg a feladathoz tartozó kódot és dokumentációt. Auditnál a `docs/research/` bizonyítékait is ellenőrizd; puszta összefoglaló alapján ne fogadj el műszaki vagy jogi állítást.
4. Mondd el röviden a célt, hatókört, tervet és korlátokat. Jelentős architekturális változtatáshoz kérj jóváhagyást, ha arra a felhasználó még nem adott engedélyt.

## Végrehajtás és ellenőrzés

- Őrizd meg a felhasználói munkát, az adatbázisadatokat és az indokolatlanul nem érintett működő komponenseket.
- Ne commitolj titkot, `.env` fájlt, személyes adatot, függőségkönyvtárat vagy buildterméket.
- Fizetős szolgáltatás, külső fiókváltoztatás, destruktív művelet, deploy, commit és push külön felhasználói jóváhagyást igényel. Ne merge-elj automatikusan `main`-be.
- Implementáció után futtasd a releváns ellenőrzéseket és buildet. Dokumentációs feladatnál a tartalmi ellenőrzés és a diff vizsgálata elegendő. A script tényleges működését ellenőrizd: egy buildet futtató `test` script nem tesztcsomag.
- Jelöld a bizonyítékokat: VERIFIED (közvetlenül ellenőrzött), INFERRED (következtetés), UNVERIFIED (nem ellenőrzött), BLOCKED (pontos hozzáférési vagy környezeti akadály).
- Licenc-, adatimport- és térképszolgáltató-állításokhoz elsődleges forrást, releváns fájlt és lehetőleg revisiont rögzíts. Az adatlicencet és a tile-szolgáltatás feltételeit külön értékeld.

## Feladat lezárása

Frissítsd a `To-do.md` megfelelő feladatát és történetét, majd készíts magyar jelentést az `OUTPUT.md` fájlban: feladatazonosító, státusz, branch, módosított fájlok, eredmény, ellenőrzési parancsok és eredmények, korlátok, következő javasolt feladat. A korábbi jelentést szükség esetén őrizd meg a `docs/outputs/` alatt.

COMPLETED csak a feladat elfogadási feltételeinek ellenőrzése után használható. A nem vizsgált alkalmazásműködés maradjon UNVERIFIED. Commit előtt ellenőrizd a státuszt és a teljes diffet; commitot és push-t csak külön engedéllyel végezz.
