import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  message: string;
  onRetry: () => void;
}

export function ErrorState({ message, onRetry }: ErrorStateProps) {
  // Convert technical errors to user-friendly messages
  const getUserFriendlyMessage = (errorMessage: string) => {
    if (errorMessage.includes('Topic is required') || errorMessage.includes('Invalid request data')) {
      return "Please enter a research topic to search for papers.";
    }
    if (errorMessage.includes('429') || errorMessage.includes('quota')) {
      return "The AI service is temporarily at capacity. You can still browse papers without summaries.";
    }
    if (errorMessage.includes('401') || errorMessage.includes('API key')) {
      return "There's an issue with the AI service configuration. Paper discovery still works normally.";
    }
    if (errorMessage.includes('ArXiv') || errorMessage.includes('arxiv')) {
      return "Unable to connect to the research paper database. Please check your internet connection.";
    }
    return "We encountered a temporary issue. Please try again in a moment.";
  };

  const friendlyMessage = getUserFriendlyMessage(message);

  return (
    <section className="max-w-2xl mx-auto text-center py-12">
      <div className="bg-red-50 rounded-lg p-6 border border-red-200">
        <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <h3 className="text-lg font-medium text-red-900 mb-2">Something Went Wrong</h3>
        <p className="text-red-700 mb-4">
          {friendlyMessage}
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
