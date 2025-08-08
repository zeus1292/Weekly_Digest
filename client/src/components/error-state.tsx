import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  return (
    <section className="max-w-2xl mx-auto text-center py-12">
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-red-900 mb-2">Unable to Fetch Papers</h3>
        <p className="text-red-700 mb-4">
          {message || "We encountered an issue connecting to arXiv. This might be due to network connectivity or API rate limits."}
        </p>
        <Button 
          onClick={onRetry}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Try Again
        </Button>
      </div>
    </section>
  );
}
