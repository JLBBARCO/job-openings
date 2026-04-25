import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Briefcase, MapPin, Building2, Calendar, Search, Loader2 } from "lucide-react";
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

const JOB_TYPES = [
  { value: "CLT", label: "CLT" },
  { value: "PJ", label: "PJ" },
  { value: "Estágio", label: "Estágio" },
  { value: "Freelance", label: "Freelance" },
  { value: "Tempo integral", label: "Tempo integral" },
  { value: "Meio período", label: "Meio período" },
];

const DATE_RANGES = [
  { value: "1h", label: "Última hora" },
  { value: "24h", label: "Últimas 24h" },
  { value: "72h", label: "Últimas 72h" },
];

export default function Home() {
  const [, navigate] = useLocation();
  const [query, setQuery] = useState("");
  const [location, setLocation] = useState("");
  const [selectedJobTypes, setSelectedJobTypes] = useState<string[]>([]);
  const [company, setCompany] = useState("");
  const [dateRange, setDateRange] = useState<"1h" | "24h" | "72h" | undefined>();
  const [hasSearched, setHasSearched] = useState(false);

  const jobsQuery = trpc.jobs.search.useQuery(
    {
      query: query || "developer",
      location: location || undefined,
      jobTypes: selectedJobTypes.length > 0 ? selectedJobTypes : undefined,
      company: company || undefined,
      dateRange: dateRange,
    },
    {
      enabled: hasSearched,
      staleTime: 5 * 60 * 1000,
    }
  );

  const handleSearch = () => {
    if (query.trim()) {
      setHasSearched(true);
    }
  };

  const handleJobTypeChange = (type: string, checked: boolean) => {
    setSelectedJobTypes((prev) =>
      checked ? [...prev, type] : prev.filter((t) => t !== type)
    );
  };

  const handleJobClick = (jobId: string) => {
    const searchContext = {
      query,
      location,
      selectedJobTypes,
      company,
      dateRange,
    };
    localStorage.setItem("searchContext", JSON.stringify(searchContext));
    navigate(`/job/${jobId}`);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3 mb-2">
            <Briefcase className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-slate-900">
              LinkedIn Jobs Finder
            </h1>
          </div>
          <p className="text-slate-600">
            Encontre as melhores oportunidades de emprego postadas nas últimas 72 horas
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
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearch()}
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
                  onChange={(e) => setLocation(e.target.value)}
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
                  onChange={(e) => setCompany(e.target.value)}
                  className="border-slate-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {/* Job Types */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-3 block">
                  Tipo de Vaga
                </Label>
                <div className="space-y-2">
                  {JOB_TYPES.map((type) => (
                    <div key={type.value} className="flex items-center gap-2">
                      <Checkbox
                        id={type.value}
                        checked={selectedJobTypes.includes(type.value)}
                        onCheckedChange={(checked) =>
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

              {/* Date Range */}
              <div>
                <Label className="text-sm font-semibold text-slate-900 mb-2 block">
                  Data de Publicação
                </Label>
                <Select value={dateRange} onValueChange={(value: any) => setDateRange(value)}>
                  <SelectTrigger className="border-slate-300 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="Selecione um período" />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_RANGES.map((range) => (
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
                disabled={!query.trim() || jobsQuery.isLoading}
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
              {(query || location || company || selectedJobTypes.length > 0 || dateRange) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setQuery("");
                    setLocation("");
                    setCompany("");
                    setSelectedJobTypes([]);
                    setDateRange(undefined);
                    setHasSearched(false);
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
                  Digite uma palavra-chave e clique em "Buscar Vagas" para encontrar oportunidades
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
                    {jobsQuery.data.total} vaga{jobsQuery.data.total !== 1 ? "s" : ""} encontrada
                    {jobsQuery.data.total !== 1 ? "s" : ""}
                  </h2>
                </div>

                {jobsQuery.data.jobs.map((job) => (
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
                            <span className="font-medium">{job.companyName}</span>
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
                          Publicada recentemente
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (job.shareLink) {
                              window.open(job.shareLink, "_blank");
                            }
                          }}
                        >
                          Ver no LinkedIn →
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
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
