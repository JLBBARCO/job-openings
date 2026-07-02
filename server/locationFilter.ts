/**
 * Divide um texto de localização digitado pelo usuário (ex: "São Paulo,
 * Brasil") em tokens individuais ("São Paulo", "Brasil") para permitir um
 * casamento tolerante contra o campo `location` das vagas.
 *
 * Isso é necessário porque o campo `location` retornado pela Google Jobs
 * API costuma trazer apenas cidade/estado (ex: "São Paulo, SP"), sem o
 * nome do país. Um filtro de substring exigindo a string inteira (ex:
 * "São Paulo, Brasil") nunca combinaria com esse valor, mesmo que a vaga
 * seja exatamente do local buscado.
 */
/**
 * Nomes de países (em inglês e português) que não agregam valor como
 * filtro local: o direcionamento por país já é feito pelos parâmetros
 * `gl`/`hl` na busca à SerpApi. Se o usuário digitar só o país (ex:
 * "Brasil"), não faz sentido exigir que o campo `location` da vaga (que
 * normalmente só tem cidade/estado) contenha esse texto.
 */
const KNOWN_COUNTRY_NAMES = new Set([
  "brasil",
  "brazil",
  "estados unidos",
  "united states",
  "reino unido",
  "united kingdom",
  "alemanha",
  "germany",
  "espanha",
  "spain",
  "franca",
  "france",
  "italia",
  "italy",
  "mexico",
  "japao",
  "japan",
  "india",
  "portugal",
  "canada",
  "argentina",
]);

function normalizeForComparison(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function tokenizeLocationFilter(location?: string): string[] {
  if (!location) return [];

  return location
    .split(",")
    .map(part => part.trim())
    .filter(Boolean)
    .filter(part => !KNOWN_COUNTRY_NAMES.has(normalizeForComparison(part)));
}

/**
 * Verifica se o `jobLocation` de uma vaga corresponde a pelo menos um dos
 * tokens do filtro de localização digitado pelo usuário.
 */
export function matchesLocationFilter(
  jobLocation: string | null | undefined,
  filterLocation?: string
): boolean {
  const tokens = tokenizeLocationFilter(filterLocation);
  if (tokens.length === 0) return true;
  if (!jobLocation) return false;

  const normalizedJobLocation = normalizeForComparison(jobLocation);

  return tokens.some(token =>
    normalizedJobLocation.includes(normalizeForComparison(token))
  );
}
