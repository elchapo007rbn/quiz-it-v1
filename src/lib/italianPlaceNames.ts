/**
 * Italian place names as Italians write them.
 *
 * Every geo-IP provider this funnel calls answers in English exonyms for the
 * cities big enough to have one: a reader in Rome comes back as "Rome", one in
 * Bari as "Apulia". Measured against ipwho.is and ip-api.com, both of which
 * return the English form for an Italian IP, and neither of which honours a
 * language parameter for city names - ip-api localises into seven languages and
 * Italian is not among them.
 *
 * So the translation happens here. The list is short on purpose: only the
 * places these databases actually anglicise. A town they return as `Montanaro`
 * falls through untouched, which is the common case and the correct one.
 */
const EXONYMS: Record<string, string> = {
  // Cities
  rome: 'Roma',
  milan: 'Milano',
  turin: 'Torino',
  naples: 'Napoli',
  florence: 'Firenze',
  venice: 'Venezia',
  genoa: 'Genova',
  padua: 'Padova',
  mantua: 'Mantova',
  syracuse: 'Siracusa',
  leghorn: 'Livorno',
  trent: 'Trento',
  bozen: 'Bolzano',

  // Regions
  lombardy: 'Lombardia',
  piedmont: 'Piemonte',
  tuscany: 'Toscana',
  apulia: 'Puglia',
  sicily: 'Sicilia',
  sardinia: 'Sardegna',
  latium: 'Lazio',
  'the marches': 'Marche',
  'aosta valley': "Valle d'Aosta",
  'trentino-south tyrol': 'Trentino-Alto Adige',
  'trentino-alto adige/south tyrol': 'Trentino-Alto Adige',
};

/** The Italian form of a place name, or the name unchanged when it has none. */
export function inItalian(name: string): string {
  return EXONYMS[name.trim().toLowerCase()] ?? name.trim();
}

/**
 * "Roma, Lazio" from a city and a region, both in Italian.
 *
 * The region is dropped when it repeats the city. Every provider names the
 * metropolitan comuni after their own province, so a reader in Milan was being
 * told her soulmate was near "Milano, Milano" - which reads as a stutter, not
 * as a location.
 */
export function placeLabel(city: string, region: string): string {
  const c = inItalian(city);
  const r = inItalian(region);
  return r && r.toLowerCase() !== c.toLowerCase() ? `${c}, ${r}` : c;
}
