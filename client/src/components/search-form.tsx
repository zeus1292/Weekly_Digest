import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { searchRequestSchema, type SearchRequest } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      subdomain: "all",
    },
  });

  const handleSubmit = (data: SearchRequest) => {
    onSearch(data);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="topic"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-sm font-medium text-gray-700">
                  Research Topic *
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="e.g., Agentic AI, Transformer Architecture, Computer Vision"
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent transition-shadow"
                    {...field}
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
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subdomain"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Subdomain
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white">
                        <SelectValue placeholder="All Areas" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">All Areas</SelectItem>
                      <SelectItem value="cs.AI">Artificial Intelligence</SelectItem>
                      <SelectItem value="cs.LG">Machine Learning</SelectItem>
                      <SelectItem value="cs.CL">Natural Language Processing</SelectItem>
                      <SelectItem value="cs.CV">Computer Vision</SelectItem>
                      <SelectItem value="cs.RO">Robotics</SelectItem>
                      <SelectItem value="cs.NE">Neural Networks</SelectItem>
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
              Papers from the last 7 days
            </div>
            <div className="flex space-x-3">
              <Button
                type="button"
                onClick={() => {
                  const data = form.getValues();
                  onSearch({ ...data, demo: true } as any);
                }}
                variant="outline"
                className="px-4 py-3 border-primary text-primary hover:bg-primary hover:text-white transition-colors"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Demo Mode
              </Button>
              <Button
                type="submit"
                className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-blue-700 transition-colors focus:ring-2 focus:ring-primary focus:ring-offset-2"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Weekly Digest
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
