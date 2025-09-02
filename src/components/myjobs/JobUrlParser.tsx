"use client";
import { Control } from "react-hook-form";
import { Loader, Sparkles } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Input } from "../ui/input";
import { Button } from "../ui/button";

interface JobUrlParserProps {
  control: Control<any>;
  jobUrlValue: string | undefined;
  isParsingUrl: boolean;
  parsedData: any;
  parseJobUrl: () => Promise<void>;
}

export default function JobUrlParser({
  control,
  jobUrlValue,
  isParsingUrl,
  parsedData,
  parseJobUrl,
}: JobUrlParserProps) {
  return (
    <div className="md:col-span-2">
      <FormField
        control={control}
        name="jobUrl"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <FormLabel>Job URL</FormLabel>
            <div className="flex gap-2">
              <FormControl>
                <Input
                  placeholder="Copy and paste job link here"
                  {...field}
                />
              </FormControl>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={parseJobUrl}
                disabled={!jobUrlValue || isParsingUrl}
                className="shrink-0"
              >
                {isParsingUrl ? (
                  <Loader className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                {isParsingUrl ? "Parsing..." : "Parse"}
              </Button>
            </div>
            <FormMessage />
            {parsedData && (
              <div className="text-xs text-muted-foreground">
                ✓ Parsed with {Math.round(parsedData.confidence * 100)}% confidence from {parsedData.source}
              </div>
            )}
          </FormItem>
        )}
      />
    </div>
  );
}
