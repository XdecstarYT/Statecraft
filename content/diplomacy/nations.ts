import type { CommodityType, ForeignCounterpart, IdeologyPosition, MilitaryProfile, TradeProfile } from '../../engine/models/types';

/**
 * The world roster: every real nation the player's chosen country can have
 * diplomatic, trade, or military dealings with. A curated set of ~30 major
 * powers gets hand-authored ideology/military/trade profiles (same
 * gameplay-abstraction spirit as content/countries/*.ts — not a real-world
 * assessment). The remaining ~160-odd UN member states are generated from a
 * fixed id -> profile formula so the roster is complete without pretending
 * false precision about every country's real military or trade posture.
 * Either way this is static content assembled once at module load, never a
 * runtime/LLM call, per CLAUDE.md.
 */

const BASE_PRODUCTION: Record<CommodityType, number> = {
  energy: 40,
  food: 40,
  minerals: 40,
  manufactured: 40,
  technology: 20,
};

const BASE_CONSUMPTION: Record<CommodityType, number> = {
  energy: 45,
  food: 45,
  minerals: 35,
  manufactured: 45,
  technology: 25,
};

function trade(
  productionOverrides: Partial<Record<CommodityType, number>> = {},
  consumptionOverrides: Partial<Record<CommodityType, number>> = {}
): TradeProfile {
  return {
    production: { ...BASE_PRODUCTION, ...productionOverrides },
    consumption: { ...BASE_CONSUMPTION, ...consumptionOverrides },
  };
}

function military(strength: number, personnel: number, techLevel: number): MilitaryProfile {
  return { strength, personnel, techLevel };
}

interface HandAuthoredSeed {
  id: string;
  name: string;
  region: string;
  ideology: IdeologyPosition;
  military: MilitaryProfile;
  trade: TradeProfile;
  location: { lat: number; lng: number };
}

const HAND_AUTHORED: HandAuthoredSeed[] = [
  {
    id: 'united-states',
    name: 'United States',
    region: 'North America',
    ideology: { economic: 30, social: 10 },
    military: military(95, 1330, 92),
    trade: trade({ technology: 150, manufactured: 120 }, { energy: 70, manufactured: 140 }),
    location: { lat: 38.9, lng: -77.0 },
  },
  {
    id: 'china',
    name: "People's Republic of China",
    region: 'Asia',
    ideology: { economic: -20, social: 70 },
    military: military(90, 2035, 78),
    trade: trade({ manufactured: 260, technology: 110 }, { energy: 140, minerals: 130 }),
    location: { lat: 39.9, lng: 116.4 },
  },
  {
    id: 'russia',
    name: 'Russian Federation',
    region: 'Europe/Asia',
    ideology: { economic: -10, social: 55 },
    military: military(85, 1150, 60),
    trade: trade({ energy: 260, minerals: 150 }, { manufactured: 110, technology: 60 }),
    location: { lat: 55.75, lng: 37.6 },
  },
  {
    id: 'india',
    name: 'Republic of India',
    region: 'Asia',
    ideology: { economic: 10, social: 30 },
    military: military(75, 1450, 55),
    trade: trade({ food: 130, manufactured: 90 }, { energy: 150, technology: 80 }),
    location: { lat: 28.6, lng: 77.2 },
  },
  {
    id: 'united-kingdom',
    name: 'United Kingdom',
    region: 'Europe',
    ideology: { economic: 20, social: -5 },
    military: military(65, 150, 85),
    trade: trade({ technology: 80, energy: 60 }, { manufactured: 100, food: 60 }),
    location: { lat: 51.5, lng: -0.13 },
  },
  {
    id: 'france',
    name: 'French Republic',
    region: 'Europe',
    ideology: { economic: -5, social: -10 },
    military: military(65, 205, 82),
    trade: trade({ energy: 80, technology: 70 }, { manufactured: 90, minerals: 60 }),
    location: { lat: 48.85, lng: 2.35 },
  },
  {
    id: 'south-korea',
    name: 'Republic of Korea',
    region: 'Asia',
    ideology: { economic: 25, social: 5 },
    military: military(60, 555, 88),
    trade: trade({ technology: 150, manufactured: 160 }, { energy: 110, minerals: 90 }),
    location: { lat: 37.57, lng: 126.98 },
  },
  {
    id: 'japan',
    name: 'Japan',
    region: 'Asia',
    ideology: { economic: 25, social: 25 },
    military: military(58, 250, 90),
    trade: trade({ technology: 160, manufactured: 150 }, { energy: 130, food: 90 }),
    location: { lat: 35.68, lng: 139.69 },
  },
  {
    id: 'pakistan',
    name: 'Islamic Republic of Pakistan',
    region: 'Asia',
    ideology: { economic: -5, social: 60 },
    military: military(55, 654, 40),
    trade: trade({ food: 80 }, { energy: 90, manufactured: 100 }),
    location: { lat: 33.68, lng: 73.05 },
  },
  {
    id: 'israel',
    name: 'State of Israel',
    region: 'Asia',
    ideology: { economic: 20, social: 30 },
    military: military(55, 170, 92),
    trade: trade({ technology: 170 }, { energy: 80, manufactured: 90 }),
    location: { lat: 31.77, lng: 35.22 },
  },
  {
    id: 'turkey',
    name: 'Republic of Türkiye',
    region: 'Europe/Asia',
    ideology: { economic: 5, social: 45 },
    military: military(55, 425, 55),
    trade: trade({ manufactured: 110 }, { energy: 130, minerals: 70 }),
    location: { lat: 39.93, lng: 32.86 },
  },
  {
    id: 'italy',
    name: 'Italian Republic',
    region: 'Europe',
    ideology: { economic: 5, social: 15 },
    military: military(50, 165, 75),
    trade: trade({ manufactured: 110 }, { energy: 90, minerals: 60 }),
    location: { lat: 41.9, lng: 12.48 },
  },
  {
    id: 'germany',
    name: 'Federal Republic of Germany',
    region: 'Europe',
    ideology: { economic: 5, social: 0 },
    military: military(50, 185, 82),
    trade: trade({ manufactured: 190, technology: 100 }, { energy: 110, minerals: 90 }),
    location: { lat: 52.52, lng: 13.4 },
  },
  {
    id: 'iran',
    name: 'Islamic Republic of Iran',
    region: 'Asia',
    ideology: { economic: -25, social: 80 },
    military: military(50, 610, 45),
    trade: trade({ energy: 190 }, { manufactured: 90, technology: 60 }),
    location: { lat: 35.69, lng: 51.39 },
  },
  {
    id: 'saudi-arabia',
    name: 'Kingdom of Saudi Arabia',
    region: 'Asia',
    ideology: { economic: 30, social: 85 },
    military: military(48, 257, 65),
    trade: trade({ energy: 260 }, { food: 90, manufactured: 100, technology: 70 }),
    location: { lat: 24.71, lng: 46.68 },
  },
  {
    id: 'brazil',
    name: 'Federative Republic of Brazil',
    region: 'South America',
    ideology: { economic: 5, social: 15 },
    military: military(48, 360, 50),
    trade: trade({ food: 190, minerals: 120 }, { manufactured: 110, technology: 70 }),
    location: { lat: -15.79, lng: -47.88 },
  },
  {
    id: 'egypt',
    name: 'Arab Republic of Egypt',
    region: 'Africa',
    ideology: { economic: -10, social: 60 },
    military: military(45, 440, 42),
    trade: trade({ energy: 80 }, { food: 110, manufactured: 90 }),
    location: { lat: 30.04, lng: 31.24 },
  },
  {
    id: 'indonesia',
    name: 'Republic of Indonesia',
    region: 'Asia',
    ideology: { economic: 10, social: 30 },
    military: military(45, 400, 40),
    trade: trade({ energy: 90, minerals: 100 }, { manufactured: 100, technology: 60 }),
    location: { lat: -6.21, lng: 106.85 },
  },
  {
    id: 'vietnam',
    name: 'Socialist Republic of Vietnam',
    region: 'Asia',
    ideology: { economic: -30, social: 50 },
    military: military(42, 480, 40),
    trade: trade({ manufactured: 130, food: 90 }, { energy: 70, technology: 60 }),
    location: { lat: 21.03, lng: 105.85 },
  },
  {
    id: 'poland',
    name: 'Republic of Poland',
    region: 'Europe',
    ideology: { economic: 15, social: 35 },
    military: military(42, 165, 60),
    trade: trade({ manufactured: 90 }, { energy: 80, technology: 50 }),
    location: { lat: 52.23, lng: 21.01 },
  },
  {
    id: 'australia',
    name: 'Commonwealth of Australia',
    region: 'Oceania',
    ideology: { economic: 15, social: 0 },
    military: military(45, 90, 80),
    trade: trade({ minerals: 190, energy: 110 }, { manufactured: 110, technology: 70 }),
    location: { lat: -35.28, lng: 149.13 },
  },
  {
    id: 'spain',
    name: 'Kingdom of Spain',
    region: 'Europe',
    ideology: { economic: -5, social: -5 },
    military: military(42, 135, 65),
    trade: trade({ food: 90 }, { energy: 90, technology: 55 }),
    location: { lat: 40.42, lng: -3.7 },
  },
  {
    id: 'mexico',
    name: 'United Mexican States',
    region: 'North America',
    ideology: { economic: -5, social: 20 },
    military: military(38, 425, 40),
    trade: trade({ energy: 90, food: 90 }, { manufactured: 120, technology: 70 }),
    location: { lat: 19.43, lng: -99.13 },
  },
  {
    id: 'canada',
    name: 'Canada',
    region: 'North America',
    ideology: { economic: 5, social: -15 },
    military: military(38, 100, 78),
    trade: trade({ energy: 150, minerals: 100 }, { manufactured: 110, technology: 60 }),
    location: { lat: 45.42, lng: -75.7 },
  },
  {
    id: 'nigeria',
    name: 'Federal Republic of Nigeria',
    region: 'Africa',
    ideology: { economic: 0, social: 50 },
    military: military(35, 230, 30),
    trade: trade({ energy: 150 }, { manufactured: 100, technology: 50 }),
    location: { lat: 9.08, lng: 7.4 },
  },
  {
    id: 'netherlands',
    name: 'Kingdom of the Netherlands',
    region: 'Europe',
    ideology: { economic: 25, social: -25 },
    military: military(32, 45, 78),
    trade: trade({ food: 120, technology: 80 }, { energy: 90, minerals: 60 }),
    location: { lat: 52.09, lng: 5.12 },
  },
  {
    id: 'south-africa',
    name: 'Republic of South Africa',
    region: 'Africa',
    ideology: { economic: -15, social: 10 },
    military: military(30, 85, 45),
    trade: trade({ minerals: 170 }, { manufactured: 100, technology: 55 }),
    location: { lat: -25.75, lng: 28.19 },
  },
  {
    id: 'sweden',
    name: 'Kingdom of Sweden',
    region: 'Europe',
    ideology: { economic: -15, social: -55 },
    military: military(30, 50, 80),
    trade: trade({ manufactured: 100, minerals: 80 }, { energy: 70 }),
    location: { lat: 59.33, lng: 18.07 },
  },
  {
    id: 'switzerland',
    name: 'Swiss Confederation',
    region: 'Europe',
    ideology: { economic: 30, social: -10 },
    military: military(28, 25, 75),
    trade: trade({ technology: 90, manufactured: 70 }, { energy: 80, food: 70 }),
    location: { lat: 46.95, lng: 7.45 },
  },
  {
    id: 'argentina',
    name: 'Argentine Republic',
    region: 'South America',
    ideology: { economic: -10, social: 5 },
    military: military(30, 105, 42),
    trade: trade({ food: 170 }, { manufactured: 100, technology: 60 }),
    location: { lat: -34.6, lng: -58.38 },
  },
];

/** Deterministic string hash — same string always yields the same number, never Math.random. */
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

interface GeneratedSeed {
  id: string;
  name: string;
  region: string;
  lat: number;
  lng: number;
}

/**
 * Derives a full profile from nothing but the id string, via a fixed hash
 * formula — static content baked once at module load (like the generated
 * bill templates), not a runtime random outcome. Generated nations land in
 * the mid/minor-power band by construction; the ~30 hand-authored entries
 * above cover the major powers.
 */
function generateProfile(id: string): { ideology: IdeologyPosition; military: MilitaryProfile; trade: TradeProfile } {
  const h = hashId(id);
  const economic = (h % 201) - 100;
  const social = ((Math.floor(h / 211)) % 201) - 100;
  const strength = 8 + (h % 32);
  const personnel = 15 + (h % 350);
  const techLevel = 20 + ((h >>> 3) % 55);
  const production: Record<CommodityType, number> = {
    energy: 15 + (h % 55),
    food: 15 + ((h >>> 2) % 55),
    minerals: 15 + ((h >>> 4) % 55),
    manufactured: 15 + ((h >>> 6) % 55),
    technology: 8 + ((h >>> 8) % 25),
  };
  const consumption: Record<CommodityType, number> = {
    energy: 18 + ((h >>> 10) % 45),
    food: 18 + ((h >>> 12) % 45),
    minerals: 12 + ((h >>> 14) % 35),
    manufactured: 18 + ((h >>> 16) % 45),
    technology: 8 + ((h >>> 18) % 22),
  };
  return {
    ideology: { economic, social },
    military: military(strength, personnel, techLevel),
    trade: { production, consumption },
  };
}

// Remaining UN member states not covered above, grouped by region.
// [id, name, region, capital lat, capital lng]
const GENERATED_SEEDS_RAW: [string, string, string, number, number][] = [
  // Africa
  ['algeria', 'Algeria', 'Africa', 36.75, 3.06],
  ['angola', 'Angola', 'Africa', -8.84, 13.23],
  ['benin', 'Benin', 'Africa', 6.5, 2.6],
  ['botswana', 'Botswana', 'Africa', -24.65, 25.91],
  ['burkina-faso', 'Burkina Faso', 'Africa', 12.37, -1.52],
  ['burundi', 'Burundi', 'Africa', -3.36, 29.36],
  ['cabo-verde', 'Cabo Verde', 'Africa', 14.93, -23.51],
  ['cameroon', 'Cameroon', 'Africa', 3.87, 11.52],
  ['central-african-republic', 'Central African Republic', 'Africa', 4.39, 18.56],
  ['chad', 'Chad', 'Africa', 12.13, 15.06],
  ['comoros', 'Comoros', 'Africa', -11.7, 43.26],
  ['congo-republic', 'Republic of the Congo', 'Africa', -4.27, 15.24],
  ['congo-drc', 'Democratic Republic of the Congo', 'Africa', -4.32, 15.31],
  ['djibouti', 'Djibouti', 'Africa', 11.59, 43.15],
  ['equatorial-guinea', 'Equatorial Guinea', 'Africa', 3.75, 8.78],
  ['eritrea', 'Eritrea', 'Africa', 15.32, 38.93],
  ['eswatini', 'Eswatini', 'Africa', -26.32, 31.13],
  ['ethiopia', 'Ethiopia', 'Africa', 9.02, 38.75],
  ['gabon', 'Gabon', 'Africa', 0.42, 9.45],
  ['gambia', 'Gambia', 'Africa', 13.45, -16.58],
  ['ghana', 'Ghana', 'Africa', 5.6, -0.19],
  ['guinea', 'Guinea', 'Africa', 9.51, -13.71],
  ['guinea-bissau', 'Guinea-Bissau', 'Africa', 11.86, -15.6],
  ['ivory-coast', "Côte d'Ivoire", 'Africa', 6.83, -5.29],
  ['kenya', 'Kenya', 'Africa', -1.29, 36.82],
  ['lesotho', 'Lesotho', 'Africa', -29.31, 27.48],
  ['liberia', 'Liberia', 'Africa', 6.31, -10.8],
  ['libya', 'Libya', 'Africa', 32.89, 13.19],
  ['madagascar', 'Madagascar', 'Africa', -18.88, 47.51],
  ['malawi', 'Malawi', 'Africa', -13.96, 33.79],
  ['mali', 'Mali', 'Africa', 12.65, -8.0],
  ['mauritania', 'Mauritania', 'Africa', 18.08, -15.98],
  ['mauritius', 'Mauritius', 'Africa', -20.16, 57.5],
  ['morocco', 'Morocco', 'Africa', 34.02, -6.84],
  ['mozambique', 'Mozambique', 'Africa', -25.97, 32.57],
  ['namibia', 'Namibia', 'Africa', -22.57, 17.08],
  ['niger', 'Niger', 'Africa', 13.51, 2.11],
  ['rwanda', 'Rwanda', 'Africa', -1.94, 30.06],
  ['sao-tome-and-principe', 'São Tomé and Príncipe', 'Africa', 0.33, 6.73],
  ['senegal', 'Senegal', 'Africa', 14.72, -17.47],
  ['seychelles', 'Seychelles', 'Africa', -4.62, 55.45],
  ['sierra-leone', 'Sierra Leone', 'Africa', 8.48, -13.23],
  ['somalia', 'Somalia', 'Africa', 2.05, 45.32],
  ['south-sudan', 'South Sudan', 'Africa', 4.85, 31.58],
  ['sudan', 'Sudan', 'Africa', 15.5, 32.56],
  ['tanzania', 'Tanzania', 'Africa', -6.16, 35.75],
  ['togo', 'Togo', 'Africa', 6.13, 1.22],
  ['tunisia', 'Tunisia', 'Africa', 36.81, 10.18],
  ['uganda', 'Uganda', 'Africa', 0.35, 32.58],
  ['zambia', 'Zambia', 'Africa', -15.39, 28.32],
  ['zimbabwe', 'Zimbabwe', 'Africa', -17.83, 31.05],
  // Asia
  ['afghanistan', 'Afghanistan', 'Asia', 34.56, 69.21],
  ['armenia', 'Armenia', 'Asia', 40.18, 44.51],
  ['azerbaijan', 'Azerbaijan', 'Asia', 40.41, 49.87],
  ['bahrain', 'Bahrain', 'Asia', 26.23, 50.59],
  ['bangladesh', 'Bangladesh', 'Asia', 23.81, 90.41],
  ['bhutan', 'Bhutan', 'Asia', 27.47, 89.64],
  ['brunei', 'Brunei', 'Asia', 4.94, 114.94],
  ['cambodia', 'Cambodia', 'Asia', 11.56, 104.92],
  ['cyprus', 'Cyprus', 'Asia', 35.17, 33.36],
  ['georgia', 'Georgia', 'Asia', 41.72, 44.79],
  ['iraq', 'Iraq', 'Asia', 33.31, 44.36],
  ['jordan', 'Jordan', 'Asia', 31.95, 35.93],
  ['kazakhstan', 'Kazakhstan', 'Asia', 51.18, 71.45],
  ['kuwait', 'Kuwait', 'Asia', 29.38, 47.99],
  ['kyrgyzstan', 'Kyrgyzstan', 'Asia', 42.87, 74.59],
  ['laos', 'Laos', 'Asia', 17.97, 102.6],
  ['lebanon', 'Lebanon', 'Asia', 33.89, 35.5],
  ['malaysia', 'Malaysia', 'Asia', 3.14, 101.69],
  ['maldives', 'Maldives', 'Asia', 4.17, 73.51],
  ['mongolia', 'Mongolia', 'Asia', 47.92, 106.92],
  ['myanmar', 'Myanmar', 'Asia', 19.75, 96.13],
  ['nepal', 'Nepal', 'Asia', 27.72, 85.32],
  ['north-korea', 'North Korea', 'Asia', 39.03, 125.75],
  ['oman', 'Oman', 'Asia', 23.61, 58.59],
  ['philippines', 'Philippines', 'Asia', 14.6, 120.98],
  ['qatar', 'Qatar', 'Asia', 25.29, 51.53],
  ['singapore', 'Singapore', 'Asia', 1.35, 103.82],
  ['sri-lanka', 'Sri Lanka', 'Asia', 6.93, 79.85],
  ['syria', 'Syria', 'Asia', 33.51, 36.29],
  ['tajikistan', 'Tajikistan', 'Asia', 38.56, 68.79],
  ['thailand', 'Thailand', 'Asia', 13.75, 100.5],
  ['timor-leste', 'Timor-Leste', 'Asia', -8.56, 125.57],
  ['turkmenistan', 'Turkmenistan', 'Asia', 37.95, 58.38],
  ['united-arab-emirates', 'United Arab Emirates', 'Asia', 24.47, 54.37],
  ['uzbekistan', 'Uzbekistan', 'Asia', 41.31, 69.28],
  ['yemen', 'Yemen', 'Asia', 15.37, 44.19],
  // Europe
  ['albania', 'Albania', 'Europe', 41.33, 19.82],
  ['andorra', 'Andorra', 'Europe', 42.51, 1.52],
  ['austria', 'Austria', 'Europe', 48.21, 16.37],
  ['belarus', 'Belarus', 'Europe', 53.9, 27.57],
  ['belgium', 'Belgium', 'Europe', 50.85, 4.35],
  ['bosnia-and-herzegovina', 'Bosnia and Herzegovina', 'Europe', 43.86, 18.41],
  ['bulgaria', 'Bulgaria', 'Europe', 42.7, 23.32],
  ['croatia', 'Croatia', 'Europe', 45.81, 15.98],
  ['czech-republic', 'Czech Republic', 'Europe', 50.08, 14.44],
  ['denmark', 'Denmark', 'Europe', 55.68, 12.57],
  ['estonia', 'Estonia', 'Europe', 59.44, 24.75],
  ['finland', 'Finland', 'Europe', 60.17, 24.94],
  ['greece', 'Greece', 'Europe', 37.98, 23.73],
  ['hungary', 'Hungary', 'Europe', 47.5, 19.04],
  ['iceland', 'Iceland', 'Europe', 64.15, -21.94],
  ['ireland', 'Ireland', 'Europe', 53.35, -6.26],
  ['kosovo', 'Kosovo', 'Europe', 42.67, 21.17],
  ['latvia', 'Latvia', 'Europe', 56.95, 24.11],
  ['liechtenstein', 'Liechtenstein', 'Europe', 47.14, 9.52],
  ['lithuania', 'Lithuania', 'Europe', 54.69, 25.28],
  ['luxembourg', 'Luxembourg', 'Europe', 49.61, 6.13],
  ['malta', 'Malta', 'Europe', 35.9, 14.51],
  ['moldova', 'Moldova', 'Europe', 47.01, 28.86],
  ['monaco', 'Monaco', 'Europe', 43.73, 7.42],
  ['montenegro', 'Montenegro', 'Europe', 42.44, 19.26],
  ['north-macedonia', 'North Macedonia', 'Europe', 41.99, 21.43],
  ['norway', 'Norway', 'Europe', 59.91, 10.75],
  ['portugal', 'Portugal', 'Europe', 38.72, -9.14],
  ['romania', 'Romania', 'Europe', 44.43, 26.1],
  ['san-marino', 'San Marino', 'Europe', 43.94, 12.45],
  ['serbia', 'Serbia', 'Europe', 44.79, 20.45],
  ['slovakia', 'Slovakia', 'Europe', 48.15, 17.11],
  ['slovenia', 'Slovenia', 'Europe', 46.06, 14.51],
  ['ukraine', 'Ukraine', 'Europe', 50.45, 30.52],
  // North America / Caribbean
  ['antigua-and-barbuda', 'Antigua and Barbuda', 'North America', 17.13, -61.85],
  ['bahamas', 'Bahamas', 'North America', 25.06, -77.34],
  ['barbados', 'Barbados', 'North America', 13.1, -59.61],
  ['belize', 'Belize', 'North America', 17.25, -88.77],
  ['costa-rica', 'Costa Rica', 'North America', 9.93, -84.08],
  ['cuba', 'Cuba', 'North America', 23.13, -82.38],
  ['dominica', 'Dominica', 'North America', 15.3, -61.39],
  ['dominican-republic', 'Dominican Republic', 'North America', 18.49, -69.94],
  ['el-salvador', 'El Salvador', 'North America', 13.69, -89.19],
  ['grenada', 'Grenada', 'North America', 12.05, -61.75],
  ['guatemala', 'Guatemala', 'North America', 14.63, -90.51],
  ['haiti', 'Haiti', 'North America', 18.59, -72.31],
  ['honduras', 'Honduras', 'North America', 14.1, -87.22],
  ['jamaica', 'Jamaica', 'North America', 18.01, -76.81],
  ['nicaragua', 'Nicaragua', 'North America', 12.11, -86.24],
  ['panama', 'Panama', 'North America', 8.98, -79.52],
  ['saint-kitts-and-nevis', 'Saint Kitts and Nevis', 'North America', 17.3, -62.73],
  ['saint-lucia', 'Saint Lucia', 'North America', 14.01, -60.99],
  ['saint-vincent-and-the-grenadines', 'Saint Vincent and the Grenadines', 'North America', 13.16, -61.22],
  ['trinidad-and-tobago', 'Trinidad and Tobago', 'North America', 10.66, -61.52],
  // South America
  ['bolivia', 'Bolivia', 'South America', -16.5, -68.15],
  ['chile', 'Chile', 'South America', -33.45, -70.67],
  ['colombia', 'Colombia', 'South America', 4.71, -74.07],
  ['ecuador', 'Ecuador', 'South America', -0.19, -78.47],
  ['guyana', 'Guyana', 'South America', 6.8, -58.16],
  ['paraguay', 'Paraguay', 'South America', -25.28, -57.63],
  ['peru', 'Peru', 'South America', -12.05, -77.04],
  ['suriname', 'Suriname', 'South America', 5.87, -55.17],
  ['uruguay', 'Uruguay', 'South America', -34.9, -56.16],
  ['venezuela', 'Venezuela', 'South America', 10.49, -66.9],
  // Oceania
  ['fiji', 'Fiji', 'Oceania', -18.14, 178.44],
  ['kiribati', 'Kiribati', 'Oceania', 1.33, 172.98],
  ['marshall-islands', 'Marshall Islands', 'Oceania', 7.1, 171.38],
  ['micronesia', 'Micronesia', 'Oceania', 6.92, 158.16],
  ['nauru', 'Nauru', 'Oceania', -0.55, 166.92],
  ['new-zealand', 'New Zealand', 'Oceania', -41.29, 174.78],
  ['palau', 'Palau', 'Oceania', 7.34, 134.48],
  ['papua-new-guinea', 'Papua New Guinea', 'Oceania', -9.48, 147.15],
  ['samoa', 'Samoa', 'Oceania', -13.83, -171.76],
  ['solomon-islands', 'Solomon Islands', 'Oceania', -9.43, 159.95],
  ['tonga', 'Tonga', 'Oceania', -21.14, -175.2],
  ['tuvalu', 'Tuvalu', 'Oceania', -8.52, 179.2],
  ['vanuatu', 'Vanuatu', 'Oceania', -17.73, 168.32],
];

const GENERATED_SEEDS: GeneratedSeed[] = GENERATED_SEEDS_RAW.map(([id, name, region, lat, lng]) => ({
  id,
  name,
  region,
  lat,
  lng,
}));

const GENERATED: ForeignCounterpart[] = GENERATED_SEEDS.map((seed) => {
  const profile = generateProfile(seed.id);
  return {
    id: seed.id,
    name: seed.name,
    region: seed.region,
    location: { lat: seed.lat, lng: seed.lng },
    ...profile,
  };
});

export const ALL_NATIONS: ForeignCounterpart[] = [...HAND_AUTHORED, ...GENERATED];

/**
 * Builds the foreign-counterpart roster for a new game: every real nation
 * except whichever one the player is playing as (a real country never
 * appears as its own diplomatic counterpart; a fictional starter country
 * like Kastoria or Vantorra leaves the full roster untouched).
 */
export function nationsExcluding(playerCountryId: string): ForeignCounterpart[] {
  return ALL_NATIONS.filter((n) => n.id !== playerCountryId);
}

/** A modest, generic baseline for a fictional starter country (Kastoria, Vantorra, ...) with no real-world entry. */
const FICTIONAL_DEFAULT_MILITARY: MilitaryProfile = military(45, 120, 55);

/**
 * The player's starting military profile: matches the corresponding real
 * nation's hand-authored numbers if they picked one of those (so playing
 * as France gives you the same military profile France shows as a foreign
 * counterpart elsewhere), or a generic default for a fictional country.
 */
export function startingMilitaryProfile(countryId: string): MilitaryProfile {
  const match = ALL_NATIONS.find((n) => n.id === countryId);
  return match ? match.military : FICTIONAL_DEFAULT_MILITARY;
}
