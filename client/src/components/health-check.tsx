import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Activity, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface HealthResponse {
  status: string;
  services: {
    arxiv: string;
    openai: string;
    openaiError?: string;
  };
  timestamp: string;
}

export function HealthCheck() {
  const [showDetails, setShowDetails] = useState(false);

  const {
    data: health,
    isLoading,
    refetch
  } = useQuery({
    queryKey: ['/api/health'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/health');
      return response.json() as Promise<HealthResponse>;
    },
    refetchInterval: 60000, // Check every minute
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'error':
        return <XCircle className="w-3 h-3 text-red-600" />;
      default:
        return <AlertTriangle className="w-3 h-3 text-yellow-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowDetails(!showDetails)}
        className="text-gray-700 hover:text-primary transition-colors"
      >
        <Activity className="w-4 h-4 mr-1" />
        Status
      </Button>

      {showDetails && (
        <div className="absolute top-full right-0 mt-2 w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">System Health</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
              className="text-xs"
            >
              Refresh
            </Button>
          </div>

          {isLoading ? (
            <div className="text-sm text-gray-500">Checking...</div>
          ) : health ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">ArXiv API</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(health.services.arxiv)}
                  <Badge className={`text-xs ${getStatusColor(health.services.arxiv)}`}>
                    {health.services.arxiv}
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">OpenAI API</span>
                <div className="flex items-center space-x-2">
                  {getStatusIcon(health.services.openai)}
                  <Badge className={`text-xs ${getStatusColor(health.services.openai)}`}>
                    {health.services.openai}
                  </Badge>
                </div>
              </div>

              {health.services.openaiError && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                  <strong>OpenAI Error:</strong> {health.services.openaiError}
                </div>
              )}

              <div className="pt-2 border-t border-gray-200 text-xs text-gray-500">
                Last checked: {new Date(health.timestamp).toLocaleTimeString()}
              </div>

              {health.services.openai === 'error' && (
                <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-700">
                  <strong>Tip:</strong> Check that your OpenAI API key is valid and has sufficient credits.
                </div>
              )}
            </div>
          ) : (
            <div className="text-sm text-red-600">Failed to check health</div>
          )}
        </div>
      )}
    </div>
  );
}