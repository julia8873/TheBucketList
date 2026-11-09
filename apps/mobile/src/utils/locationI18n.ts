/**
 * Utilidades para unificación e internacionalización de ubicaciones (ES <-> EN).
 * Permite que los sitios emblemáticos, ciudades y países se muestren en el idioma
 * activo del usuario y que las búsquedas reconozcan términos en cualquier idioma
 * (ej: buscar "Torre Eiffel" encuentra "Eiffel Tower" y viceversa).
 */

interface TranslationPair {
  es: string;
  en: string;
}

// Diccionario de equivalencias para monumentos y sitios emblemáticos globales
const LANDMARK_TRANSLATIONS: TranslationPair[] = [
  { es: 'Torre Eiffel', en: 'Eiffel Tower' },
  { es: 'Coliseo', en: 'Colosseum' },
  { es: 'Museo del Louvre', en: 'Louvre Museum' },
  { es: 'Estatua de la Libertad', en: 'Statue of Liberty' },
  { es: 'Gran Muralla China', en: 'Great Wall of China' },
  { es: 'Pirámides de Guiza', en: 'Giza Pyramids' },
  { es: 'Catedral de Notre Dame', en: 'Notre-Dame Cathedral' },
  { es: 'Puente de la Torre', en: 'Tower Bridge' },
  { es: 'Puente Golden Gate', en: 'Golden Gate Bridge' },
  { es: 'Edificio Empire State', en: 'Empire State Building' },
  { es: 'Museos Vaticanos', en: 'Vatican Museums' },
  { es: 'Basílica de San Pedro', en: 'St. Peter\'s Basilica' },
  { es: 'Fuente de Trevi', en: 'Trevi Fountain' },
  { es: 'Catedral de Milán', en: 'Milan Cathedral' },
  { es: 'Parque Nacional de Yellowstone', en: 'Yellowstone National Park' },
  { es: 'Gran Cañón', en: 'Grand Canyon' },
  { es: 'Ópera de Sídney', en: 'Sydney Opera House' },
];

// Diccionario de equivalencias para países y ciudades principales
const PLACE_TRANSLATIONS: TranslationPair[] = [
  // Países
  { es: 'España', en: 'Spain' },
  { es: 'Francia', en: 'France' },
  { es: 'Italia', en: 'Italy' },
  { es: 'Alemania', en: 'Germany' },
  { es: 'Reino Unido', en: 'United Kingdom' },
  { es: 'Estados Unidos', en: 'United States' },
  { es: 'Japón', en: 'Japan' },
  { es: 'Grecia', en: 'Greece' },
  { es: 'Portugal', en: 'Portugal' },
  { es: 'Países Bajos', en: 'Netherlands' },
  { es: 'Bélgica', en: 'Belgium' },
  { es: 'Suiza', en: 'Switzerland' },
  { es: 'Austria', en: 'Austria' },
  { es: 'Irlanda', en: 'Ireland' },
  { es: 'México', en: 'Mexico' },
  { es: 'Brasil', en: 'Brazil' },
  { es: 'Egipto', en: 'Egypt' },
  { es: 'Marruecos', en: 'Morocco' },
  { es: 'Canadá', en: 'Canada' },
  { es: 'China', en: 'China' },
  { es: 'India', en: 'India' },

  // Ciudades
  { es: 'París', en: 'Paris' },
  { es: 'Londres', en: 'London' },
  { es: 'Roma', en: 'Rome' },
  { es: 'Florencia', en: 'Florence' },
  { es: 'Venecia', en: 'Venice' },
  { es: 'Milán', en: 'Milan' },
  { es: 'Nueva York', en: 'New York' },
  { es: 'Tokio', en: 'Tokyo' },
  { es: 'Atenas', en: 'Athens' },
  { es: 'Berlín', en: 'Berlin' },
  { es: 'Múnich', en: 'Munich' },
  { es: 'Viena', en: 'Vienna' },
  { es: 'Varsovia', en: 'Warsaw' },
  { es: 'Praga', en: 'Prague' },
  { es: 'Bruselas', en: 'Brussels' },
  { es: 'Ginebra', en: 'Geneva' },
  { es: 'Lisboa', en: 'Lisbon' },
];

const ALL_TRANSLATIONS = [...LANDMARK_TRANSLATIONS, ...PLACE_TRANSLATIONS];

/**
 * Traduce y unifica el texto de ubicación al idioma activo del usuario ('es' o 'en').
 * Mantiene intactos nombres locales propios pero unifica monumentos y territorios.
 */
export function formatLocalizedLocation(
  locationText?: string | null,
  lang: string = 'es'
): string {
  if (!locationText) return '';
  const isEn = lang.startsWith('en');
  let result = locationText;

  for (const item of ALL_TRANSLATIONS) {
    const from = isEn ? item.es : item.en;
    const to = isEn ? item.en : item.es;
    if (from.toLowerCase() === to.toLowerCase()) continue;

    // Reemplazo exacto insensible a mayúsculas
    const regex = new RegExp(`\\b${escapeRegExp(from)}\\b`, 'gi');
    if (regex.test(result)) {
      result = result.replace(regex, to);
    }
  }

  return result;
}

/**
 * Devuelve sinónimos y variantes multilingües de un término de búsqueda de ubicación.
 * Por ejemplo: "Torre Eiffel" -> ["torre eiffel", "eiffel tower", "tour eiffel"]
 */
export function getLocationSynonyms(query: string): string[] {
  const clean = query.trim().toLowerCase();
  if (clean.length < 2) return [clean];

  const synonyms = new Set<string>([clean]);

  for (const item of ALL_TRANSLATIONS) {
    const esLow = item.es.toLowerCase();
    const enLow = item.en.toLowerCase();

    if (clean.includes(esLow)) {
      synonyms.add(enLow);
      synonyms.add(clean.replace(esLow, enLow));
    }
    if (clean.includes(enLow)) {
      synonyms.add(esLow);
      synonyms.add(clean.replace(enLow, esLow));
    }
  }

  return Array.from(synonyms);
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

