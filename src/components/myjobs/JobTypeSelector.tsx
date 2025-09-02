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
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import { JOB_TYPES } from "@/models/job.model";

interface JobTypeSelectorProps {
  control: Control<any>;
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

export default function JobTypeSelector({
  control,
  autoFilledFields,
}: JobTypeSelectorProps) {
  return (
    <div>
      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem className="flex flex-col">
            <div className="flex items-center justify-between mb-2">
              <FormLabel>Job Type</FormLabel>
              <AutoFilledBadge fieldName="type" autoFilledFields={autoFilledFields} />
            </div>
            <div className={autoFilledFields.has("type") ? "ring-2 ring-blue-200 rounded-md p-2" : ""}>
              <RadioGroup
                name="type"
                onValueChange={field.onChange}
                value={field.value}
                className="flex space-y-1"
              >
                {Object.entries(JOB_TYPES).map(([key, value]) => (
                  <FormItem
                    key={key}
                    className="flex items-center space-x-3 space-y-0"
                  >
                    <FormControl>
                      <RadioGroupItem value={key} />
                    </FormControl>
                    <FormLabel className="font-normal">
                      {value}
                    </FormLabel>
                  </FormItem>
                ))}
              </RadioGroup>
            </div>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );
}
