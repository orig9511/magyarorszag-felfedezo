export interface ImageCredit {
  author: string;
  license: string;
  licenseUrl?: string;
  source: string; // Wikimedia Commons file page
}

/** Local responsive image: files are src/assets/images/<key>-<width>.jpg. */
export interface Picture {
  src: string;
  srcset: string;
  alt: string;
  credit: ImageCredit;
}

const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${encodeURIComponent(file.replace(/ /g, '_'))}`;

const pic = (key: string, widths: [number, number], alt: string, credit: ImageCredit): Picture => ({
  src: `assets/images/${key}-${widths[0]}.jpg`,
  srcset: widths.map((w) => `assets/images/${key}-${w}.jpg ${w}w`).join(', '),
  alt,
  credit,
});

const BY_SA_3 = 'https://creativecommons.org/licenses/by-sa/3.0';
const BY_SA_4 = 'https://creativecommons.org/licenses/by-sa/4.0/';
const CC0 = 'https://creativecommons.org/publicdomain/zero/1.0/';

export const HERO: Picture = pic('hero', [1200, 2400], '', {
  author: 'Wilfredor',
  license: 'CC0',
  licenseUrl: CC0,
  source: commons('Széchenyi Chain Bridge in Budapest at night.jpg'),
});

export const CATEGORIES: {
  key: string;
  name: string;
  text: string;
  picture: Picture;
}[] = [
  {
    key: 'attraction',
    name: 'Látnivalók',
    text: 'Kastélyok, múzeumok, városok',
    picture: pic('debrecen', [800, 1600], 'A debreceni Református Nagytemplom két tornyos, sárga homlokzata', {
      author: 'Pudelek (Marcin Szala)',
      license: 'CC BY-SA 3.0',
      licenseUrl: BY_SA_3,
      source: commons('Debrecen - Protestant Great Church.JPG'),
    }),
  },
  {
    key: 'restaurant',
    name: 'Éttermek',
    text: 'Helyi ízek, különleges helyek',
    picture: pic('langos', [800, 1600], 'Sajtos-tejfölös lángos', {
      author: 'sikeri',
      license: 'CC BY-SA 4.0',
      licenseUrl: BY_SA_4,
      source: commons('Langos Eger Hungary.jpg'),
    }),
  },
  {
    key: 'accommodation',
    name: 'Szállások',
    text: 'Hotelek, vendégházak, apartmanok',
    picture: pic('hotel', [800, 1600], 'Kétágyas szállodai szoba egy magyarországi szállodában', {
      author: 'Hotel Makár (Wikimedia Commons)',
      license: 'CC BY-SA 3.0',
      licenseUrl: BY_SA_3,
      source: commons('Hotel Makár, Pécs, Double room -central-superior - panoramio.jpg'),
    }),
  },
  {
    key: 'event',
    name: 'Események',
    text: 'Fesztiválok, koncertek, programok',
    picture: pic('sziget', [800, 1600], 'Fesztiválközönség a színpad előtt a Szigeten', {
      author: 'Derzsi Elekes Andor',
      license: 'CC BY-SA 4.0',
      licenseUrl: BY_SA_4,
      source: commons('Interpol (NYC) Sziget 2011 (1).JPG'),
    }),
  },
  {
    key: 'nature',
    name: 'Természet',
    text: 'Túrázás, vízpartok, szabadtéri élmények',
    picture: pic('hortobagy', [800, 1600], 'Végtelen zöld puszta a Hortobágyi Nemzeti Parkban', {
      author: 'Krzysztof Ziarnek, Kenraiz',
      license: 'CC BY-SA 4.0',
      licenseUrl: BY_SA_4,
      source: commons('Hortobágy National Park kz05.jpg'),
    }),
  },
];

/** Editorial inspiration only: these are NOT database records, offers or bookable experiences. */
export interface Inspiration {
  key: string;
  title: string;
  text: string;
  /** Explorer filter this card opens (existing query parameters only). */
  query: { category?: string; county?: string };
  /** True when the photo is not from Hungary (shown in the caption). */
  illustrative: boolean;
  picture: Picture;
}

export const INSPIRATIONS: Inspiration[] = [
  {
    key: 'balloon',
    title: 'Hőlégballonozás',
    text: 'Reggeli vagy esti repülés: a táj egészen más szemszögből.',
    query: { category: 'nature' },
    illustrative: true,
    picture: pic('balloon', [800, 1600], 'Izzó hőlégballonok éjszakai felfújás közben', {
      author: 'Frank Schulenburg',
      license: 'CC BY-SA 3.0',
      licenseUrl: BY_SA_3,
      source: commons('Dawn Patrol.jpg'),
    }),
  },
  {
    key: 'quad',
    title: 'Quadozás és terepjárás',
    text: 'Terepen töltött aktív nap, vezetett túrákkal.',
    query: { category: 'nature' },
    illustrative: true,
    picture: pic('quad', [800, 1600], 'Piros quadok egy füves tisztáson', {
      author: 'Ossewa',
      license: 'CC BY 4.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
      source: commons('Quad Bikes Groot Marico.jpg'),
    }),
  },
  {
    key: 'hiking',
    title: 'Erdők és túraútvonalak',
    text: 'Zöldellő erdők, ösvények és csendes kilátók.',
    query: { category: 'nature' },
    illustrative: false,
    picture: pic('hiking', [800, 1600], 'Ködös, zöld bükkerdő Perőcsény környékén', {
      author: 'Kaszás Tibor',
      license: 'CC BY-SA 3.0',
      licenseUrl: BY_SA_3,
      source: commons('Perőcsény, Hungary - panoramio (28).jpg'),
    }),
  },
  {
    key: 'visegrad',
    title: 'Várak és a Dunakanyar',
    text: 'Kilátás a visegrádi várból a Duna kanyarjára.',
    query: { category: 'attraction' },
    illustrative: false,
    picture: pic('visegrad', [800, 1600], 'A Duna kanyarja a visegrádi várból nézve', {
      author: 'Bahnfrend',
      license: 'CC BY-SA 4.0',
      licenseUrl: BY_SA_4,
      source: commons('Views from Visegrád Castle, 2006 (01).jpg'),
    }),
  },
  {
    key: 'balaton',
    title: 'Balaton és a vízpart',
    text: 'Naplementék, part menti falvak, vízi programok.',
    query: { county: 'veszprem' },
    illustrative: false,
    picture: pic('balaton', [800, 1600], 'Naplemente a Balaton fölött', {
      author: 'Bazsi80',
      license: 'Közkincs (public domain)',
      source: commons('BalatonSunset.JPG'),
    }),
  },
  {
    key: 'tokaj',
    title: 'Tokaji borvidék',
    text: 'Szőlőhegyek és pincék a világörökségi tájban.',
    query: { county: 'borsod-abauj-zemplen' },
    illustrative: false,
    picture: pic('tokaj', [800, 1600], 'Szőlőültetvények a Tokaji-hegy lábánál', {
      author: 'Kressl',
      license: 'CC BY 3.0',
      licenseUrl: 'https://creativecommons.org/licenses/by/3.0',
      source: commons('Tokaj, Hungary 03944.JPG'),
    }),
  },
];

export const STEPS = [
  { title: 'Válassz vármegyét', text: 'A térkép Magyarország valódi közigazgatási határait mutatja. Egy kattintással egy régióra közelítesz.' },
  { title: 'Fedezz fel szabadon', text: 'Nagyíts és mozgasd a térképet: a találatok az éppen látható területhez igazodnak.' },
  { title: 'Szűrj kategóriára', text: 'Látnivalók, éttermek, szállások, események vagy természet: csak azt látod, amit keresel.' },
];

/** Every credit shown in the footer. */
export const ALL_CREDITS: { label: string; credit: ImageCredit }[] = [
  { label: 'Lánchíd (háttérkép)', credit: HERO.credit },
  ...CATEGORIES.map((c) => ({ label: c.name, credit: c.picture.credit })),
  ...INSPIRATIONS.map((i) => ({ label: i.title, credit: i.picture.credit })),
];
