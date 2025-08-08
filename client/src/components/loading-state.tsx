import { Loader2 } from "lucide-react";

export function LoadingState() {
  return (
    <section className="max-w-4xl mx-auto text-center py-12">
      <div className="flex items-center justify-center mb-4">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Analyzing Recent Papers</h3>
      <p className="text-secondary mb-6">Fetching and summarizing relevant research from arXiv...</p>
      
      <div className="bg-white rounded-lg p-4 border border-gray-200 max-w-md mx-auto">
        <div className="flex items-center justify-between text-sm text-secondary mb-2">
          <span>Progress</span>
          <span>Processing...</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-1000 animate-pulse" 
            style={{ width: '60%' }} 
          />
        </div>
        <p className="text-xs text-secondary mt-2">Generating AI summaries...</p>
      </div>
    </section>
  );
}
