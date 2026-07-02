import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Briefcase,
  MapPin,
  Building2,
  Calendar,
  Search,
  Loader2,
} from "lucide-react";
import { useLocation } from "wouter";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

type SearchInput = {
  query: string;
  location?: string;
  jobTypes?: string[];
  workMode?: Array<"Presencial" | "Híbrido" | "Remoto">;
  company?: string;
  dateRange?: "1h" | "24h" | "72h";
};

const JOB_TYPES = [
  { value: "Full-time", label: "Tempo integral" },
  { value: "Part-time", label: "Meio período" },
  { value: "Contractor", label: "Contrato (PJ)" },
  { value: "Internship", label: "Estágio" },
  { value: "Temp work", label: "Temporário" },
  { value: "Volunteer", label: "Voluntário" },
];

const WORK_MODES = [
  { value: "Presencial", label: "Presencial" },
  { value: "Híbrido", label: "Híbrida" },
  { value: "Remoto", label: "Remota" },
] as const;

const DATE_RANGES = [
  { value: "1h", label: "Última hora" },
  { value: "24h", label: "Últimas 24h" },
  { value: "72h", label: "Últimas 72h" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("developer");
  const [location, setLocation] = useState("");
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [selectedWorkModes, setSelectedWorkModes] = useState<
    Array<"Presencial" | "Híbrido" | "Remoto">
  >([]);
  const [company, setCompany] = useState("");
  const [dateRange, setDateRange] = useState<"" | "1h" | "24h" | "72h">("");
  const [hasSearched, setHasSearched] = useState(true);
  const [submittedSearch, setSubmittedSearch] = useState<SearchInput>({
    query: "developer",
  });

  const jobsQuery = trpc.jobs.search.useQuery(submittedSearch, {
    enabled: hasSearched,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  const handleSearch = () => {
    setSubmittedSearch({
      query: query.trim() || "developer",
      location: location.trim() || undefined,
      jobTypes: selectedJobTypes.length > 0 ? selectedJobTypes : undefined,
      workMode: selectedWorkModes.length > 0 ? selectedWorkModes : undefined,
      company: company.trim() || undefined,
      dateRange: dateRange || undefined,
    });
    setHasSearched(true);
  };

  const handleJobTypeChange = (type: string, checked: boolean) => {
    setSelectedJobTypes(prev =>
      checked ? [...prev, type] : prev.filter(t => t !== type)
    );
  };

  const handleWorkModeChange = (
    mode: "Presencial" | "Híbrido" | "Remoto",
    checked: boolean
  ) => {
    setSelectedWorkModes(prev =>
      checked ? [...prev, mode] : prev.filter(m => m !== mode)
    );
  };

  const handleJobClick = (jobId: string) => {
    const searchContext = {
      query,
      location,
      selectedJobTypes,
      selectedWorkModes,
      company,
      dateRange,
    };
    localStorage.setItem("searchContext", JSON.stringify(searchContext));
    navigate(`/job/${jobId}`);
  };

  const formatPostedAt = (postedAt: unknown): string => {
    if (!postedAt) return "Data de publicação não informada";
    const date =
      postedAt instanceof Date ? postedAt : new Date(postedAt as string);
    if (Number.isNaN(date.getTime())) return "Data de publicação não informada";
    return `Publicada ${formatDistanceToNow(date, { addSuffix: true, locale: ptBR })}`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">
              Google Jobs Finder
            </h1>
          </div>
          <p className="text-slate-600">
            Encontre as melhores oportunidades de emprego do Google Vagas,
            agregadas de diversos sites como LinkedIn, Indeed e outros
          </p>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar - Filtros */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              {/* Search Input */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                  Palavra-chave
                </Label>
                <div className="relative">
                  <Input
                    placeholder="ex: Python Developer"
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    onKeyPress={e => e.key === "Enter" && handleSearch()}
                    className="pl-10 pr-4 py-2 border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                </div>
              </div>

              {/* Location */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                  Localização
                </Label>
                <Input
                  placeholder="ex: São Paulo, Brasil"
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Company */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                  Empresa
                </Label>
                <Input
                  placeholder="ex: Google"
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Job Types */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-3 block">
                  Tipo de Vaga
                </Label>
                <div className="space-y-2">
                  {JOB_TYPES.map(type => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={type.value}
                        checked={selectedJobTypes.includes(type.value)}
                        onCheckedChange={checked =>
                          handleJobTypeChange(type.value, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={type.value}
                        className="text-sm text-slate-700 cursor-pointer font-normal"
                      >
                        {type.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Work Mode */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-3 block">
                  Modalidade
                </Label>
                <div className="space-y-2">
                  {WORK_MODES.map(mode => (
                    <div key={mode.value} className="flex items-center gap-2">
                      <Checkbox
                        id={`workmode-${mode.value}`}
                        checked={selectedWorkModes.includes(mode.value)}
                        onCheckedChange={checked =>
                          handleWorkModeChange(mode.value, checked as boolean)
                        }
                      />
                      <Label
                        htmlFor={`workmode-${mode.value}`}
                        className="text-sm text-slate-700 cursor-pointer font-normal"
                      >
                        {mode.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                  Data de Publicação
                </Label>
                <Select
                  value={dateRange}
                  onValueChange={(value: "" | "1h" | "24h" | "72h") =>
                    setDateRange(value)
                  }
                >
                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map(range => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Search Button */}
              <Button
                onClick={handleSearch}
                disabled={jobsQuery.isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg transition-colors"
              >
                {jobsQuery.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar Vagas
                  </>
                )}
              </Button>

              {/* Clear Filters */}
              {(query ||
                location ||
                company ||
                selectedJobTypes.length > 0 ||
                selectedWorkModes.length > 0 ||
                dateRange) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("developer");
                    setLocation("");
                    setCompany("");
                    setSelectedJobTypes([]);
                    setSelectedWorkModes([]);
                    setDateRange("");
                    setSubmittedSearch({ query: "developer" });
                    setHasSearched(true);
                  }}
                  className="w-full"
                >
                  Limpar Filtros
                </Button>
              )}
            </div>
          </aside>

          {/* Main Content - Job Listings */}
          <section className="lg:col-span-3">
            {!hasSearched ? (
              <div className="text-center py-16">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Comece sua busca
                </h2>
                <p className="text-slate-600">
                  Digite uma palavra-chave e clique em "Buscar Vagas" para
                  encontrar oportunidades
                </p>
              </div>
            ) : jobsQuery.isLoading ? (
              <div className="text-center py-16">
                <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
                <p className="text-slate-600">Buscando vagas...</p>
              </div>
            ) : jobsQuery.data?.success && jobsQuery.data.jobs.length > 0 ? (
              <div className="space-y-4">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-slate-900">
                    {jobsQuery.data.total} vaga
                    {jobsQuery.data.total !== 1 ? "s" : ""} encontrada
                    {jobsQuery.data.total !== 1 ? "s" : ""}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    Fonte:{" "}
                    {jobsQuery.data.source === "cache"
                      ? "cache local"
                      : "API externa"}
                    {jobsQuery.data.cache.lastRefreshAt
                      ? ` · Atualizado em ${new Date(jobsQuery.data.cache.lastRefreshAt).toLocaleString("pt-BR")}`
                      : ""}
                    {jobsQuery.data.cache.stale ? " · cache antigo" : ""}
                  </p>
                </div>

                {jobsQuery.data.jobs.map(job => (
                  <Card
                    key={job.jobId}
                    className="hover:shadow-lg transition-shadow cursor-pointer border-slate-200"
                    onClick={() => handleJobClick(job.jobId)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-lg text-slate-900 mb-1">
                            {job.title}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-slate-600 text-sm">
                            <Building2 className="w-4 h-4" />
                            <span className="font-medium">
                              {job.companyName}
                            </span>
                          </div>
                        </div>
                        {job.thumbnail && (
                          <img
                            src={job.thumbnail}
                            alt={job.companyName}
                            className="w-12 h-12 rounded object-cover"
                          />
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {job.location && (
                          <Badge variant="secondary" className="gap-1">
                            <MapPin className="w-3 h-3" />
                            {job.location}
                          </Badge>
                        )}
                        {job.jobType && (
                          <Badge variant="secondary" className="gap-1">
                            <Briefcase className="w-3 h-3" />
                            {job.jobType}
                          </Badge>
                        )}
                        {job.workMode && (
                          <Badge variant="secondary" className="gap-1">
                            {job.workMode}
                          </Badge>
                        )}
                        {job.salary && (
                          <Badge variant="secondary" className="gap-1">
                            {job.salary}
                          </Badge>
                        )}
                        {job.via && (
                          <Badge variant="outline" className="text-xs">
                            via {job.via}
                          </Badge>
                        )}
                      </div>

                      {job.description && (
                        <p className="text-sm text-slate-600 line-clamp-2">
                          {job.description}
                        </p>
                      )}

                      <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {formatPostedAt(job.postedAt)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={e => {
                            e.stopPropagation();
                            if (job.shareLink) {
                              window.open(job.shareLink, "_blank");
                            }
                          }}
                        >
                          {job.via ? `Ver vaga em ${job.via} →` : "Ver vaga →"}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <Briefcase className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-2xl font-semibold text-slate-900 mb-2">
                  Nenhuma vaga encontrada
                </h2>
                <p className="text-slate-600">
                  Tente ajustar seus filtros ou usar diferentes palavras-chave
                </p>
                {jobsQuery.data?.error && (
                  <p className="text-sm text-amber-700 mt-3">
                    Detalhe: {jobsQuery.data.error}
                  </p>
                )}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
