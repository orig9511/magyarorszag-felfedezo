# P0-00/P0-01 – Éles térképszolgáltató és feltételek

Ellenőrzés: 2026-10-15. Helyi HEAD: `7c65f962b4268b0b6f76a8300a568ef3f2509adc`; a munkafa aktuális állapota is vizsgált. Ez döntés-előkészítés, szolgáltatásvásárlás és alkalmazáskód-módosítás nélkül. A VERIFIED jelölés dokumentum- vagy forrásellenőrzést jelent, nem élő szolgáltatói integrációs tesztet.

## Aktuális forrás és dokumentációs eltérés

**VERIFIED:** `apps/frontend/src/app/core/config/map-style.ts` közvetlen OSMF raszterforrást használ: `https://tile.openstreetmap.org/{z}/{x}/{y}.png`, 256 pixel, maxzoom 19; OSM-attribúció szerepel a source-ban. Nem MapLibre-demotiles szolgálja ki az alaptérképet. A fájl fejlesztési célúként jelöli ezt, későbbi Protomaps/PMTiles kiváltást említ. A tényleges mobil/asztali attribúcióláthatóság böngészőben **UNVERIFIED**.

**VERIFIED ellentmondás:** a kódkomment és `docs/research/02-license-and-compliance.md` túl kategorikusan utal az OSMF éles/kereskedelmi tiltására. A [raszterhasználati szabályzat](https://operations.osmfoundation.org/policies/tiles/) nem általános kereskedelmi tiltás: best-effort szolgáltatás, SLA nélkül, visszavonható hozzáféréssel. Látható attribúció, böngészőből érvényes Referer és HTTP-cache-elés kell; ha a kliens nem értelmezi a cache-headereket, legalább hét napos cache szükséges. A bulk/prefetch és offline letöltés tiltott. A [vektoros szolgáltatás](https://operations.osmfoundation.org/policies/vector/) külön policy alá tartozik. **INFERRED:** üzletileg fontos MOMAP induláshoz az OSMF publikus végpontjára támaszkodás túl nagy működési kockázat; ez ajánlás, nem licencbeli általános tilalom.

A [MapLibre demotiles repository](https://github.com/maplibre/demotiles) a World állományt példákhoz és CI-hoz, z0–6 országos bemutatótérképként írja le. **INFERRED:** ez nem megfelelő részletes magyar turisztikai alaptérkép. Nem szükséges visszavezetni a jelenlegi alkalmazásba. **UNVERIFIED:** külön demo-host SLA vagy szerződéses üzemi garancia.

## Adatlicenc és szolgáltatás két külön ellenőrzés

Az [OSM copyright oldal](https://www.openstreetmap.org/copyright) adatlicencét külön kell kezelni a fenti szolgáltatáshasználati szabályoktól. A POI-adatbázis ODbL-kötelezettségeit a tile-szolgáltató kiválasztása nem oldja meg. A szolgáltatói számlázás, hozzáférés, cache/proxy, logo és térképi attribúció ettől független feltételrendszer. Saját vármegyegeometriák forrásmegjelölése is külön marad.

## Értékelhető üzemi lehetőségek

| Jelölt | VERIFIED elsődleges tény | MOMAP-következmény / INFERRED |
|---|---|---|
| MapTiler Cloud | A [Cloud feltételek](https://www.maptiler.com/terms/cloud/) szerint a Free nem kereskedelmi használatra és kereskedelmi termék kutatására/fejlesztésére korlátozott. Átmeneti, egy végfelhasználós eszközcache megengedett; proxy, export és tömeges tile-letöltés egyedi írásos megállapodást igényelhet. A [díjoldal](https://www.maptiler.com/cloud/pricing/) a Flex csomagot 30 USD/hó induló díjjal és többletforgalmi számlázással mutatja. | Üzemi kereskedelmi felhasználáshoz megfelelő fizetős csomag, forgalombecslés és számlázási kontroll szükséges. Saját backend-cache/proxy nem tekinthető automatikusan engedélyezettnek. |
| Stadia Maps | A [FAQ](https://stadiamaps.com/faqs/) a bevételt termelő, illetve for-profit szervezeti használatot kereskedelminek tekinti; fejlesztés/demó kivétel. A [díjoldalon](https://stadiamaps.com/pricing) Free: 200 000 kredit/hó, kereskedelmi használat nélkül; Starter: 20 USD/hó, 1 millió kredit és többlethasználati díj. | A kereskedelmi MOMAP-nak fizetős csomag kell. A kredit nem azonos a felhasználó vagy térképmegnyitás számával; stílusonként és tile-kérésenként kell költségmodellt készíteni. |
| Saját Protomaps/PMTiles | A [letöltési dokumentáció](https://docs.protomaps.com/basemaps/downloads) régiókivágást támogat; a nyilvános build hotlinkelését ellenzi, saját tárolást javasol. Az OSM-attribúció kötelező. A [MapLibre integráció](https://docs.protomaps.com/basemaps/maplibre) szerint stílus, tileset, font és sprite is kell. | Megőrizhető vizsgálati jelölt, még nincs véglegesítve. Saját tárhely, HTTP Range/CORS, cache/CDN, frissítés és monitorozás tervezendő. A szabad barangolás miatt a Magyarország-kivágásnak környező pufferterületet vagy deklarált fedettségi határt kell kapnia. |

Az árak pillanatfelvételek, nem ajánlatok; adók, árfolyam, túlhasználat és SLA külön vizsgálandó. Teljes infrastruktúra havi költségére a korábbi „20–50 EUR” becslés **UNVERIFIED**, mért forgalom és elfogadott szolgáltató nélkül nem költségkeret.

## Böngészős hitelesítés, cache és attribúció

- **VERIFIED:** a [MapTiler API-kulcs útmutató](https://docs.maptiler.com/guides/credentials/api-key/) böngészős használathoz Allowed HTTP origins korlátozást, staginghez külön kulcsot ajánl. A frontend kulcsa a kliens számára látható; domainkorlátozás, elkülönített környezetek, használatfigyelés és rotálhatóság szükséges. Adminisztratív/szerveroldali titkot nem szabad bundle-be tenni.
- **VERIFIED:** a [Stadia hitelesítési útmutató](https://docs.stadiamaps.com/authentication) üzemi webhez domainalapú hitelesítést ajánl Origin/Referer alapján; a `no-referrer` akadályozhatja. A [biztonsági útmutató](https://docs.stadiamaps.com/guides/securing-your-integration/) tiltottként kezeli az általános proxyzást/cache-elést; a [korlátok](https://docs.stadiamaps.com/limits/) kivételeket említenek. Tartós offline/archive funkció csak külön engedély alapján tervezhető.
- **VERIFIED:** a [Stadia saját stílusútmutatója](https://docs.stadiamaps.com/custom-styles/) standard vektoros példája Stadia Maps, OpenMapTiles és OpenStreetMap attribúciót tartalmaz. A végleges stílushoz tartozó konkrét attribúciót kell megőrizni; műholdas/egyéb stílus eltérhet. MapTiler esetén csomag- és stílusspecifikus logó/attribúció ellenőrzés szükséges; az eltávolítási jog **UNVERIFIED**, nincs jóváhagyva.
- **INFERRED:** a jövőbeli mentett helyek/útitervek rekordazonosítók és felhasználói tervek mentését jelenthetik, ez önmagában nem offline térképletöltés. Tile-prefetch-et külön követelményként, külön szerződéses vizsgálattal szabad hozzáadni.

## Indulás előtti elfogadási kapu

1. Jóváhagyott szolgáltató és csomag; commercial-use, forgalommérő, limit/overage, SLA és adatvédelmi adattovábbítás feljegyezve. Szolgáltatóváltás nem igényelhet a map-komponens újraírását.
2. Magyarországi címkék, részletes zoom, hiányzó tile, mobil és lassú kapcsolat kézi próbája; tile/glyph/sprite CORS/CSP és HTTP-cache vizsgálata. Nincs tiltott háttérletöltés.
3. Asztali és mobil nézetben tartósan látható attribúció, a szűrők/ismertető/oldalsáv nem takarja. Megfelelő adat- és szolgáltatói hivatkozások.
4. Staging/production origin-korlát, külön kulcs, használati riasztás és 401/403/429/5xx kezelési próba. A tile-hiba nem törölheti a POI/oldalsáv állapotát.
5. A vármegye utáni szabad barangolás tényleges fedettsége és költsége ismert; a kivágás határán érthető működés. Megtartott viewport-kérésdebounce nem változtatja meg a tile-szolgáltató saját lekéréseit: a POI API és basemap külön forgalom.

**UNVERIFIED:** számlafiók, előfizetés, éles domain, szolgáltatói szerződés, kvóta, konkrét magyar térképi minőség, latency és teljesítmény. A vizsgálat nem hozott létre fiókot, nem vásárolt szolgáltatást, nem használt kulcsot és nem végzett tömeges tile-kérést.
