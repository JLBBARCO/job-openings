import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  MapPin,
  Briefcase,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { useEffect, useState } from "react";

interface SearchContext {
  query?: string;
  location?: string;
  selectedJobTypes?: string[];
  company?: string;
  dateRange?: "1h" | "24h" | "72h";
}

export default function JobDetail() {
  const [, params] = useRoute("/job/:jobId");
  const [, navigate] = useLocation();
  const [searchContext, setSearchContext] = useState<SearchContext | null>(null);
  const jobId = params?.jobId;

  // Restaurar contexto de busca do URL ou localStorage
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const contextStr =
      urlParams.get("context") || localStorage.getItem("searchContext");
    if (contextStr) {
      try {
        setSearchContext(JSON.parse(contextStr));
      } catch (e) {
        console.error("Failed to parse search context", e);
      }
    }
  }, []);

  const jobQuery = trpc.jobs.getById.useQuery(
    { jobId: jobId || "" },
    { enabled: !!jobId }
  );

  const handleBackToSearch = () => {
    if (searchContext) {
      const queryParams = new URLSearchParams();
      queryParams.set("context", JSON.stringify(searchContext));
      navigate(`/?${queryParams.toString()}`);
    } else {
      navigate("/");
    }
  };

  if (!jobId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Vaga não encontrada
            </h2>
            <Button onClick={() => navigate("/")} variant="default">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para busca
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={handleBackToSearch}
            className="mb-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar para busca
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {jobQuery.isLoading ? (
          <div className="text-center py-16">
            <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
            <p className="text-slate-600">Carregando detalhes da vaga...</p>
          </div>
        ) : !jobQuery.data?.success || !jobQuery.data.job ? (
          <div className="text-center py-16">
            <h2 className="text-2xl font-semibold text-slate-900 mb-2">
              Vaga não encontrada
            </h2>
            <Button onClick={() => navigate("/")} variant="default">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar para busca
            </Button>
          </div>
        ) : (
          <div className="max-w-3xl mx-auto">
            <Card className="border-slate-200">
              <CardHeader className="border-b border-slate-200 pb-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex-1">
                    <CardTitle className="text-3xl text-slate-900 mb-2">
                      {jobQuery.data.job.title}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-slate-600 mb-4">
                      <Building2 className="w-5 h-5" />
                      <span className="text-lg font-medium">
                        {jobQuery.data.job.companyName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {jobQuery.data.job.location && (
                    <Badge variant="secondary" className="gap-1 text-sm">
                      <MapPin className="w-3 h-3" />
                      {jobQuery.data.job.location}
                    </Badge>
                  )}
                  {jobQuery.data.job.jobType && (
                    <Badge variant="secondary" className="gap-1 text-sm">
                      <Briefcase className="w-3 h-3" />
                      {jobQuery.data.job.jobType}
                    </Badge>
                  )}
                  {jobQuery.data.job.salary && (
                    <Badge variant="secondary" className="text-sm">
                      {jobQuery.data.job.salary}
                    </Badge>
                  )}
                  {jobQuery.data.job.via && (
                    <Badge variant="outline" className="text-xs">
                      via {jobQuery.data.job.via}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                {/* Description */}
                {jobQuery.data.job.description && (
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900 mb-3">
                      Descrição da Vaga
                    </h2>
                    <div className="prose prose-sm max-w-none">
                      <p className="text-slate-700 whitespace-pre-wrap">
                        {jobQuery.data.job.description}
                      </p>
                    </div>
                  </div>
                )}

                {/* CTA Button */}
                <div className="flex gap-3 pt-4">
                  {jobQuery.data.job.shareLink && (
                    <Button
                      onClick={() => {
                        if (jobQuery.data.job?.shareLink) {
                          window.open(jobQuery.data.job.shareLink, "_blank");
                        }
                      }}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition-colors"
                    >
                      <ExternalLink className="w-4 h-4 mr-2" />
                      Ver no LinkedIn
                    </Button>
                  )}
                  <Button
                    onClick={handleBackToSearch}
                    variant="outline"
                    className="flex-1"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Voltar
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Additional Info */}
            <Card className="mt-6 border-slate-200">
              <CardHeader>
                <CardTitle className="text-lg">Informações Adicionais</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Fonte</p>
                    <p className="font-medium text-slate-900">
                      {jobQuery.data.job.via || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Tipo de Vaga</p>
                    <p className="font-medium text-slate-900">
                      {jobQuery.data.job.jobType || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Localização</p>
                    <p className="font-medium text-slate-900">
                      {jobQuery.data.job.location || "Não informado"}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Salário</p>
                    <p className="font-medium text-slate-900">
                      {jobQuery.data.job.salary || "Não informado"}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
