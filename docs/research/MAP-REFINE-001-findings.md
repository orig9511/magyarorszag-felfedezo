# MAP-REFINE-001 – Dátumfüggetlen helyek, kategóriapinek és országmaszk

Dátum: 2026-10-15. Branch: feature/initial-implementation. Kiinduló HEAD: 6fa83bbdd538f5589dfca2cd4642a43b63ec0fee. Kezdetben tiszta munkafa. Hatókör: frontend, teszt, szükséges frontendfüggőség és dokumentáció; backend, DB és ingestion változatlan.

## 1. Dátumszűrés: mit igazoltunk és mit nem

**VERIFIED forrásellenőrzés:** a POI API-hívásban és a poiToCard útvonalon nem szerepelt dátumparaméter vagy dátumszűrés. A Places-only mód dátumkontrolljának meglévő *ngIf/showEventDateFilters kapuja helyes volt; ezt megőriztük és regressziós teszttel védjük.

**VERIFIED frontend reprodukció, javítás előtti tesztek:**

- A két API közös combineLatest összefésülése miatt egy még nem válaszoló event kérés a már megérkezett POI-k megjelenítését is visszatartotta (várt 1, tényleges 0 POI).
- A dátumváltás ugyanazt a reload pipeline-t indította, ezért a változatlan POI-keresés is újra lefutott (várt 1, tényleges 2 kérés), Places-only módban is.
- A korábbi 19 teszt PASS volt; az öt új regressziós eset közül négy FAIL: három dátum/lekérés és egy valós belső poligonlyuk kezelése. Az átfedési teszt geometriai érvényességi feltételét külön erősítettük a gyűrűk tényleges feloldásának ellenőrzésével.

**VERIFIED élő, csak olvasási HTTP-próba:**

| Végpont | Válasz |
|---|---|
| /api/pois/viewport Magyarország bboxszal, dátum nélkül | 200, 202 POI, kb. 246 ms egyetlen próbamérésben |
| /api/events/viewport ugyanazzal a bboxszal, days=7 | 400, a számszerű query paraméterek IsNumber validációja hibás |
| Ugyanez days=1 (Today API-ablak) | Ugyanaz a 400-as hiba, kb. 3 ms |

**INFERRED:** az összekötött válaszvárakozás és újrapróbálás kelthette a „csak a Ma után jelenik meg” benyomást. A jelenlegi élő event kérés gyorsan 400-zal válaszol, tehát nem állítjuk bizonyíték nélkül, hogy a felhasználó konkrét látványának kizárólag ez volt az oka. **UNVERIFIED:** az eredeti browser interakció pixelszintű reprodukciója.

**Javítás:** külön POI- és event stream, külön cache és loading/error állapot. Dátumváltás csak az eventReload$-t érinti. A POI a saját válaszakor publikál, nem vár eventre. A viewport/szűrőváltás és mozgatás mindkét érintett kérést azonnal megszakítja, az új kérés előtt 400 ms nyugalmi idő marad. Minden publikálás ugyanazt a közös kártyahalmazt adja a térképnek és a listának. In-flight POI dátumváltáskor sem szakad meg. A meglévő 60 s / 20 elem cache és országos fallback hiánya megmarad.

**Backendkapu:** az event viewport validáció és a korábban talált SRID/dátumhibák nem lettek módosítva. Külön backendjóváhagyás szükséges; nem próbáljuk országos eventlistával kikerülni őket.

## 2. Sötét poligonok és topológia

**VERIFIED:** a korábbi maszk a világ külső gyűrűjéhez minden county külső gyűrűt külön lyukként adta hozzá. Nem végzett uniót, eldobta a belső gyűrűket és nem normalizálta a windingot. Egymást érintő/átfedő vagy egymásba ágyazott adminisztratív poligonok így nem adnak érvényes maszklyuk-rendszert; a trianguláció hibás sötét részeket rajzolhat. A vizuális hibához vezető pontos GPU-háromszögek nem lettek browserben megfigyelve, ez **INFERRED** a hibás topológiából.

**VERIFIED jelenlegi /api/counties adatok:** 21 sor; a már korábban azonosított HU-BP legacy Budapest rekord meglévő frontendkivétele után 20 megjelenített poligon, összesen 21 gyűrű és 1 belső gyűrű. A gyűrűk zártak, véges pozíciókat tartalmaznak. Nem tettünk földrajzi rekordot láthatatlanná a maszk javítása érdekében, a meglévő legacy-szűrést nem bővítettük.

**Javítás:** country-mask.ts validálja és klónozza a Polygon/MultiPolygon koordinátákat, megtartja a teljes shell+hole struktúrát, a hiányzó zárópontot csak a másolathoz adja. A teljes országfedettséget polygon-union képezi, majd world-minus-coverage különbség adja a maszkot. A kimenet rendezett windingú, egymással nem átfedő MultiPolygon. Feldolgozhatatlan adatnál az opcionális sötétítő réteg üres marad és hibaállapot keletkezik; érvényes megyehatárok eltüntetésével nem takarjuk el a hibát.

**VERIFIED tesztek:** átfedő shell-ek uniója, valódi hole megőrzése, a hole-t ténylegesen lefedő másik county visszaadása, eltérő winding, szigetpoligonok, bemenet változatlansága és másolt nyílt gyűrű zárása.

**VERIFIED jelenlegi adatú számítás:** az új maszk 2 poligonból áll; Budapest [19.04,47.5] pontja nincs maszkolva, Bécs [16.37,48.2] maszkolva van. Egyetlen Node-mérésben az egyszeri előállítás kb. 436 ms volt. Ez nem browser/GPU benchmark: kis teljesítményű mobilon külön mérendő. A számítás a county-adat betöltésekor történik, nem pan/zoom frame-enként.

## 3. Markerek, popup és hozzáférhetőség

- category-visuals.ts egyetlen szín/ikon/név táblája: látnivaló, étterem, szállás, természet, esemény, egyéb. A meglévő Lucide ikonokat használja; új képgenerálás, külső kép vagy kitalált tartalom nincs.
- MapLibre GeoJSON clustering megmarad, 45 px radius, clusterMaxZoom 20. A számozott klaszterek középponti gombok, a kategóriapinek alsó csúccsal vannak a ponthoz horgonyozva.
- map-pins.ts csak a látható forrás-feature-ökhöz ad natív HTML button markert. A tile-duplikátumokat kulccsal kiszűri, a gombokat újrahasználja, sourcedata/moveend/idle eseményekből rAF-fal összevonva frissít. Nincs per-frame teljes marker-újraépítés. A régi látható körpontok helyett a forrásnak csak láthatatlan adat-layerje marad a MapLibre worker/tile betöltéséhez.
- A gombok aria-label, aria-pressed, aria-describedby és aria-haspopup értékeket kapnak. 44 px célterület, ikonos pin, hover/focus belső skálázás és tooltip, eltérő selected állapot; a szín nem egyedüli megkülönböztetés. A kategóriapiktogram-kontrasztot a központi palettán 4.5:1 minimumra teszteljük.
- Egy kattintás/tap választ, natív billentyűzet-aktiváláskor a popup bezárógombjára kerül a fókusz. A popup pontkoordinátához és pinmérethez kötött; MapLibre auto-anchor választ a széleken. A popup role=dialog, címe és kategóriája textContent útján kerül be, API-cím nem értelmezhető HTML-ként.
- A teljes részletek a sidebarba kerültek, így nem versenyeznek egy második, sarokhoz kötött térképi panellel. A popup Részletek gombja mobilon a listára vált és a részletekre fókuszál. Egy pin koppintása önmagában nem rejti el a mobil térképet.
- A sidebar asztalon 20–27 rem közé szorított; mobilon marad a map/list váltás. A jelmagyarázat olvashatóbb és összecsukható, kategóriaikonokat és neveket is mutat. Az intro üres állapotai megkülönböztetik a módot, loadingot, API-hibát és a jelenlegi szűrt viewportot; nem állítják, hogy az egész countyban nincs adat.

**VERIFIED hálózat nélküli tesztek:** natív button/ARIA és handler szerkezet, fókuszhoz kötött highlight, selected állapot, koordináta és auto-anchor konfiguráció, egyetlen click aktiválás, popupbezárás és kiválasztás szinkronja, HTML-injekció elkerülése, régi cluster expansion válasz kizárása; 200 látható rekord ismételt sync esetén nincs új Marker allokáció. A DOM/MapLibre adapter mockolt. **UNVERIFIED:** natív Enter/Space/touch generálás valódi browserben, képernyőolvasó, CSS-pixelkép, popup szélső helyzet és GPU/FPS.

## 4. Új geometriai függőség és licencek

Indok: teljes poligonunió és -különbség szükséges; saját geometriai heurisztika nem kezeli biztonságosan a közös éleket és belső gyűrűket.

- polygon-clipping 0.15.7, pontosan rögzítve a frontend manifestben/lockban. A tényleges node_modules/polygon-clipping/LICENSE.md teljes MIT szövege ellenőrizve, Mike Fogel és Alexander Milevski notice-szal.
- robust-predicates 3.0.3: a tényleges LICENSE Unlicense szöveg ellenőrizve.
- splaytree 3.2.3: a csomag nem tartalmaz külön LICENSE fájlt; Readme.md License szakaszában teljes MIT szöveg és Alexander Milevski notice, valamint manifest MIT. Ez volt a ténylegesen ellenőrzött szöveg.
- A teljes szövegek a frontend src/assets/licenses/polygon-clipping-notices.txt fájlban megőrizve, a production assetek közé csomagolva. Az install --ignore-scripts --no-audit --no-fund opcióval futott; külön sebezhetőségi audit nem történt.
- Az npm a már eleve eltérő backend manifest/lock miatt mellékesen módosított volna backend-lockbejegyzéseket; ezeket a meglévő eredeti állapotra visszaállítottuk. Kizárólag a frontend dependency és a három új csomag lockbejegyzése marad változás. Backendmanifestet nem szerkesztettünk; a meglévő csv-parse és luxon továbbra is elérhető.

Elsődleges dokumentumok (2026-10-15): [polygon-clipping forrás/API](https://github.com/mfogel/polygon-clipping), [teljes MIT szöveg](https://raw.githubusercontent.com/mfogel/polygon-clipping/main/LICENSE.md). Az API-dokumentáció leírja a windingfüggetlen bemenetet és a normalizált kimenetet; a helyi csomag tényleges viselkedését a regressziós tesztek is vizsgálták. A fenti licencellenőrzés e három új csomagra korlátozott, nem teljes függőségi megfelelőségi garancia.

## Ellenőrzési határ

A korábbi böngészős localhost-hozzáférést a jogosultsági kapu elutasította. A tiltást nem kerültük meg, és nem használtunk más browser/CDP/Playwright felületet. Ebben a körben hálózat nélküli TS/DOM-modelltesztek, lokális GET-próbák és build futnak. Az eredeti vizuális tünet, mobilos viselkedés és a teljes élő eseményfolyam ezért nincs késznek jelölve.
