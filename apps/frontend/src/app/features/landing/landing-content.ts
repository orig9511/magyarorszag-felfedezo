export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl?: string;
  source: string; // Wikimedia Commons file page
}

export interface Discovery {
  key: string;
  image: string;
  alt: string;
  place: string;
  region: string;
  blurb: string;
  credit: ImageCredit;
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

// Photos are stored locally in src/assets/images (1600 px renditions from Wikimedia Commons).
export const DISCOVERIES: Discovery[] = [
  {
    key: 'debrecen',
    image: 'assets/images/debrecen.jpg',
    alt: 'A debreceni Református Nagytemplom sárga homlokzata két toronnyal',
    place: 'Debrecen',
    region: 'Hajdú-Bihar vármegye',
    blurb: 'A Nagytemplom a város jelképe, a magyar reformáció egyik legfontosabb helyszíne.',
    credit: {
      author: 'Pudelek (Marcin Szala)',
      license: 'CC BY-SA 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0',
      source: commons('Debrecen - Protestant Great Church.JPG'),
    },
  },
  {
    key: 'tokaj',
    image: 'assets/images/tokaj.jpg',
    alt: 'Szőlőültetvények a Tokaji-hegy lábánál',
    place: 'Tokaj',
    region: 'Borsod-Abaúj-Zemplén vármegye',
    blurb: 'Szőlőhegyek és pincék a világörökségi borvidéken.',
    credit: {
      author: 'Kressl',
      license: 'CC BY 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0',
      source: commons('Tokaj, Hungary 03944.JPG'),
    },
  },
  {
    key: 'balaton',
    image: 'assets/images/balaton.jpg',
    alt: 'Naplemente a Balaton fölött, a túlparton hegyek sziluettjével',
    place: 'Balaton',
    region: 'Veszprém és Somogy vármegye',
    blurb: 'Közép-Európa legnagyobb tava, napnyugtákkal és part menti falvakkal.',
    credit: { author: 'Bazsi80', license: 'Közkincs (public domain)', source: commons('BalatonSunset.JPG') },
  },
  {
    key: 'parliament',
    image: 'assets/images/parliament.jpg',
    alt: 'A kivilágított Országház a Duna partján az esti kék órában',
    place: 'Budapest',
    region: 'Főváros',
    blurb: 'Az Országház a Duna-parton, esti fényben.',
    credit: {
      author: 'Pierre Blaché',
      license: 'CC0',
      licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
      source: commons('Hungarian Parliament Building 2023-9.jpg'),
    },
  },
  {
    key: 'hortobagy',
    image: 'assets/images/hortobagy.jpg',
    alt: 'Végtelen zöld puszta a Hortobágyi Nemzeti Parkban',
    place: 'Hortobágy',
    region: 'Hajdú-Bihar vármegye',
    blurb: 'A puszta nyugalma: a Hortobágyi Nemzeti Park nyílt tájai.',
    credit: {
      author: 'Krzysztof Ziarnek, Kenraiz',
      license: 'CC BY-SA 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/',
      source: commons('Hortobágy National Park kz05.jpg'),
    },
  },
];

export const HERO_IMAGE = {
  image: 'assets/images/chainbridge.jpg',
  credit: {
    author: 'Wilfredor',
    license: 'CC0',
    licenseUrl: 'https://creativecommons.org/publicdomain/zero/1.0/',
    source: commons('Széchenyi Chain Bridge in Budapest at night.jpg'),
  } as ImageCredit,
};

export const CATEGORIES = [
  { key: 'attraction', name: 'Látnivalók', text: 'Műemlékek, múzeumok és helyek, amelyekért érdemes útra kelni.' },
  { key: 'restaurant', name: 'Éttermek', text: 'Helyi ízek, borozók és vendéglők a térképen.' },
  { key: 'accommodation', name: 'Szállások', text: 'Hol pihenj meg: szállások egy-egy régió szívében.' },
  { key: 'event', name: 'Események', text: 'Fesztiválok, koncertek és programok dátum szerint szűrve.' },
  { key: 'nature', name: 'Természet', text: 'Nemzeti parkok, tájak és kilátóhelyek.' },
];

export const STEPS = [
  { title: 'Válassz vármegyét', text: 'A térkép Magyarország valódi közigazgatási határait mutatja. Egy kattintással egy régióra közelítesz.' },
  { title: 'Fedezz fel szabadon', text: 'Nagyíts és mozgasd a térképet: a látnivalók és programok az éppen látható területhez igazodnak.' },
  { title: 'Szűrj kategóriára', text: 'Látnivalók, éttermek, szállások vagy események: csak azt látod, amit keresel.' },
];
