"use client";
import { Control, FieldValues } from "react-hook-form";
import { Bot } from "lucide-react";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { Combobox } from "../ComboBox";
import { Company, JobLocation, JobTitle } from "@/models/job.model";

interface JobFormFieldsProps {
  control: Control<any>;
  jobTitles: JobTitle[];
  companies: Company[];
  locations: JobLocation[];
  autoFilledFields: Set<string>;
}

const AutoFilledBadge = ({ fieldName, autoFilledFields }: { fieldName: string; autoFilledFields: Set<string> }) => {
  if (!autoFilledFields.has(fieldName)) return null;
  return (
    <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-200">
      <Bot className="h-3 w-3" />
      <span>Auto-filled</span>
    </div>
  );
};

export default function JobFormFields({
  control,
  jobTitles,
  companies,
  locations,
  autoFilledFields,
}: JobFormFieldsProps) {
  return (
    <>
      {/* Job Title */}
      <div>
        <FormField
          control={control}
          name="title"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between">
                <FormLabel>Job Title</FormLabel>
                <AutoFilledBadge fieldName="title" autoFilledFields={autoFilledFields} />
              </div>
              <FormControl>
                <div className={autoFilledFields.has("title") ? "ring-2 ring-blue-200 rounded-md" : ""}>
                  <Combobox
                    options={jobTitles}
                    field={field}
                    creatable
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Company */}
      <div>
        <FormField
          control={control}
          name="company"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between">
                <FormLabel>Company</FormLabel>
                <AutoFilledBadge fieldName="company" autoFilledFields={autoFilledFields} />
              </div>
              <FormControl>
                <div className={autoFilledFields.has("company") ? "ring-2 ring-blue-200 rounded-md" : ""}>
                  <Combobox
                    options={companies}
                    field={field}
                    creatable
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      {/* Location */}
      <div>
        <FormField
          control={control}
          name="location"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <div className="flex items-center justify-between">
                <FormLabel>Job Location</FormLabel>
                <AutoFilledBadge fieldName="location" autoFilledFields={autoFilledFields} />
              </div>
              <FormControl>
                <div className={autoFilledFields.has("location") ? "ring-2 ring-blue-200 rounded-md" : ""}>
                  <Combobox
                    options={locations}
                    field={field}
                    creatable
                  />
                </div>
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>
    </>
  );
}
