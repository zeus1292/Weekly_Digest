import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchRequestSchema, type SearchRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Sparkles, Clock } from "lucide-react";

interface SearchFormProps {
  onSearch: (params: SearchRequest) => void;
}

export function SearchForm({ onSearch }: SearchFormProps) {
  const form = useForm<SearchRequest>({
    resolver: zodResolver(searchRequestSchema),
    defaultValues: {
      topic: "",
      keywords: "",
      timeframeDays: 7,
    },
  });

  const handleSubmit = (data: SearchRequest) => {
    onSearch(data);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg border border-gray-200 p-8 hover:shadow-xl transition-shadow duration-300">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Research Topic
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Agentic AI, Transformer Architecture, Computer Vision"
                    className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-gray-300"
                    {...field}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        form.handleSubmit(handleSubmit)();
                      }
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="grid md:grid-cols-2 gap-6">
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Keywords (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="neural networks, attention mechanism"
                      className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition-all duration-200 hover:border-gray-300"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="timeframeDays"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Time Period (Days)
                  </FormLabel>
                  <Select onValueChange={(value) => field.onChange(Number(value))} defaultValue={field.value?.toString()}>
                    <FormControl>
                      <SelectTrigger className="px-4 py-3 border-2 border-gray-200 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary bg-white transition-all duration-200 hover:border-gray-300">
                        <SelectValue placeholder="7 days" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="1">1 day</SelectItem>
                      <SelectItem value="3">3 days</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="21">21 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-secondary flex items-center">
              <Clock className="w-4 h-4 mr-1" />
              Papers & articles from selected time period
            </div>
            <Button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transition-all duration-200 transform hover:scale-105 focus:ring-2 focus:ring-primary focus:ring-offset-2 shadow-lg"
            >
              <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
              Research Now
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}
