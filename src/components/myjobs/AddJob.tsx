"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogOverlay,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { addJob, updateJob, createLocation } from "@/actions/job.actions";
import { addCompany } from "@/actions/company.actions";
import { createJobTitle } from "@/actions/jobtitle.actions";
import { Loader, PlusCircle, Link, Sparkles, Bot } from "lucide-react";
import { Button } from "../ui/button";
import { useForm } from "react-hook-form";
import { useCallback, useEffect, useState, useTransition } from "react";
import { AddJobFormSchema } from "@/models/addJobForm.schema";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Company,
  JOB_TYPES,
  JobLocation,
  JobResponse,
  JobSource,
  JobStatus,
  JobTitle,
} from "@/models/job.model";
import { addDays } from "date-fns";
import { z } from "zod";
import { toast } from "../ui/use-toast";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../ui/form";
import { RadioGroup, RadioGroupItem } from "../ui/radio-group";
import SelectFormCtrl from "../Select";
import { DatePicker } from "../DatePicker";
import { SALARY_RANGES } from "@/lib/data/salaryRangeData";
import TiptapEditor from "../TiptapEditor";
import { Input } from "../ui/input";
import { Switch } from "../ui/switch";
import { redirect } from "next/navigation";
import { Combobox } from "../ComboBox";
import { Resume } from "@/models/profile.model";
import CreateResume from "../profile/CreateResume";
import { getResumeList } from "@/actions/profile.actions";

type AddJobProps = {
  jobStatuses: JobStatus[];
  companies: Company[];
  jobTitles: JobTitle[];
  locations: JobLocation[];
  jobSources: JobSource[];
  editJob?: JobResponse | null;
  resetEditJob: () => void;
};

export function AddJob({
  jobStatuses,
  companies: initialCompanies,
  jobTitles: initialJobTitles,
  locations: initialLocations,
  jobSources,
  editJob,
  resetEditJob,
}: AddJobProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isPending, startTransition] = useTransition();
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  
  // Local state for dynamic data that can be updated
  const [companies, setCompanies] = useState(initialCompanies);
  const [jobTitles, setJobTitles] = useState(initialJobTitles);
  const [locations, setLocations] = useState(initialLocations);

  // Update local state when props change
  useEffect(() => {
    setCompanies(initialCompanies);
  }, [initialCompanies]);

  useEffect(() => {
    setJobTitles(initialJobTitles);
  }, [initialJobTitles]);

  useEffect(() => {
    setLocations(initialLocations);
  }, [initialLocations]);

  const form = useForm<z.infer<typeof AddJobFormSchema>>({
    resolver: zodResolver(AddJobFormSchema),
    defaultValues: {
      type: Object.keys(JOB_TYPES)[0],
      dueDate: addDays(new Date(), 3),
      status: jobStatuses[0].id,
      salaryRange: "1",
    },
  });

  const { setValue, reset, watch, resetField, getValues } = form;

  const appliedValue = watch("applied");
  const jobUrlValue = watch("jobUrl");

  const loadResumes = useCallback(async () => {
    try {
      const resumes = await getResumeList();
      setResumes(resumes.data);
    } catch (error) {
      console.error("Failed to load resumes:", error);
    }
  }, [setResumes]);

  useEffect(() => {
    if (editJob) {
      reset(
        {
          id: editJob.id,
          userId: editJob.userId,
          title: editJob.JobTitle.id,
          company: editJob.Company.id,
          location: editJob.Location.id,
          type: editJob.jobType,
          source: editJob.JobSource.id,
          status: editJob.Status.id,
          dueDate: editJob.dueDate,
          salaryRange: editJob.salaryRange,
          jobDescription: editJob.description,
          applied: editJob.applied,
          jobUrl: editJob.jobUrl ?? undefined,
          dateApplied: editJob.appliedDate ?? undefined,
          resume: editJob.Resume?.id ?? undefined,
        },
        { keepDefaultValues: true }
      );
      setDialogOpen(true);
    }
  }, [editJob, reset]);

  useEffect(() => {
    loadResumes();
  }, [loadResumes]);

  const setNewResumeId = (id: string) => {
    setTimeout(() => {
      setValue("resume", id);
    }, 500);
  };

  function onSubmit(data: z.infer<typeof AddJobFormSchema>) {
    startTransition(async () => {
      const { success, message } = editJob
        ? await updateJob(data)
        : await addJob(data);
      reset();
      setDialogOpen(false);
      if (!success) {
        toast({
          variant: "destructive",
          title: "Error!",
          description: message,
        });
      }
      redirect("/dashboard/myjobs");
    });
    toast({
      variant: "success",
      description: `Job has been ${
        editJob ? "updated" : "created"
      } successfully`,
    });
  }

  const pageTitle = editJob ? "Edit Job" : "Add Job";

  const addJobForm = () => {
    reset();
    resetEditJob();
    setAutoFilledFields(new Set());
    setParsedData(null);
    setDialogOpen(true);
  };

  const jobAppliedChange = (applied: boolean) => {
    if (applied) {
      form.getValues("status") === jobStatuses[0].id &&
        setValue("status", jobStatuses[1].id);
      setValue("dateApplied", new Date());
    } else {
      resetField("dateApplied");
      setValue("status", jobStatuses[0].id);
    }
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setAutoFilledFields(new Set());
    setParsedData(null);
  };

  const createResume = () => {
    setResumeDialogOpen(true);
  };

  // Helper component for auto-filled field indicator
  const AutoFilledBadge = ({ fieldName }: { fieldName: string }) => {
    if (!autoFilledFields.has(fieldName)) return null;
    return (
      <div className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded-md border border-blue-200">
        <Bot className="h-3 w-3" />
        <span>Auto-filled</span>
      </div>
    );
  };

  const parseJobUrl = async () => {
    const url = getValues("jobUrl");
    if (!url) {
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Please enter a job URL first",
      });
      return;
    }

    setIsParsingUrl(true);
    try {
      const response = await fetch("/api/parse-job-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });

      const result = await response.json();
      
      if (result.success && result.data) {
        setParsedData(result.data);
        console.log("AI Parsing Result:", result.data); // Debug log
        const filledFields = new Set<string>();
        
        // Auto-fill form fields if data was parsed successfully
        // We'll create new entries for non-existing values and then set the IDs
        
        if (result.data.title) {
          const existingTitle = jobTitles.find(jt => 
            jt.value.toLowerCase() === result.data.title.toLowerCase() ||
            jt.label.toLowerCase() === result.data.title.toLowerCase()
          );
          if (existingTitle) {
            setValue("title", existingTitle.id);
            filledFields.add("title");
          } else {
            // Create new job title and add it to the list
            try {
              const newTitle = await createJobTitle(result.data.title);
              if (newTitle) {
                setJobTitles(prev => [newTitle, ...prev]);
                setValue("title", newTitle.id);
                filledFields.add("title");
              }
            } catch (error) {
              console.log('Failed to create job title:', error);
            }
          }
        }
        
        if (result.data.company) {
          const existingCompany = companies.find(c => 
            c.value.toLowerCase() === result.data.company.toLowerCase() ||
            c.label.toLowerCase() === result.data.company.toLowerCase()
          );
          if (existingCompany) {
            setValue("company", existingCompany.id);
            filledFields.add("company");
          } else {
            try {
              const res = await addCompany({ company: result.data.company });
              if (res.data) {
                setCompanies(prev => [res.data, ...prev]);
                setValue("company", res.data.id);
                filledFields.add("company");
              }
            } catch (error) {
              console.log('Failed to create company:', error);
            }
          }
        }
        
        if (result.data.location) {
          const existingLocation = locations.find(l => 
            l.value.toLowerCase() === result.data.location.toLowerCase() ||
            l.label.toLowerCase() === result.data.location.toLowerCase()
          );
          if (existingLocation) {
            setValue("location", existingLocation.id);
            filledFields.add("location");
          } else {
            try {
              const { data, success } = await createLocation(result.data.location);
              if (success && data) {
                setLocations(prev => [data, ...prev]);
                setValue("location", data.id);
                filledFields.add("location");
              }
            } catch (error) {
              console.log('Failed to create location:', error);
            }
          }
        }
        
        if (result.data.description) {
          console.log("Setting job description:", result.data.description);
          setValue("jobDescription", result.data.description);
          filledFields.add("jobDescription");
        } else {
          console.log("No description found in result.data");
        }
        
        if (result.data.salary) {
          // Try to map salary to existing ranges or use a default
          const salaryNum = parseInt(result.data.salary.replace(/[^0-9]/g, ''));
          let salaryRangeId = "1"; // Default
          
          if (salaryNum >= 200000) salaryRangeId = "10";
          else if (salaryNum >= 150000) salaryRangeId = "9";
          else if (salaryNum >= 120000) salaryRangeId = "8";
          else if (salaryNum >= 100000) salaryRangeId = "7";
          else if (salaryNum >= 80000) salaryRangeId = "6";
          else if (salaryNum >= 60000) salaryRangeId = "5";
          else if (salaryNum >= 50000) salaryRangeId = "4";
          else if (salaryNum >= 40000) salaryRangeId = "3";
          else if (salaryNum >= 30000) salaryRangeId = "2";
          
          setValue("salaryRange", salaryRangeId);
          filledFields.add("salaryRange");
        }
        
        if (result.data.jobType) {
          const typeMapping: { [key: string]: string } = {
            'fulltime': 'FT',
            'parttime': 'PT', 
            'contract': 'C',
            'temporary': 'C',
            'internship': 'PT',
          };
          const mappedType = typeMapping[result.data.jobType] || 'FT';
          setValue("type", mappedType);
          filledFields.add("type");
        }
        
        setAutoFilledFields(filledFields);
        
        console.log("All filled fields:", Array.from(filledFields));
        console.log("Current form values after parsing:", getValues());
        
        toast({
          title: "Success!",
          description: `Job data parsed successfully! Filled ${filledFields.size} fields.`,
        });
      } else {
        toast({
          variant: "destructive",
          title: "Parsing Failed",
          description: result.error || "Could not extract job information from this URL",
        });
      }
    } catch (error) {
      console.error("URL parsing error:", error);
      toast({
        variant: "destructive",
        title: "Error!",
        description: "Failed to parse job URL. Please try again.",
      });
    } finally {
      setIsParsingUrl(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        className="h-8 gap-1"
        onClick={addJobForm}
        data-testid="add-job-btn"
      >
        <PlusCircle className="h-3.5 w-3.5" />
        <span className="sr-only sm:not-sr-only sm:whitespace-nowrap">
          Add Job
        </span>
      </Button>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogOverlay>
          <DialogContent className="h-full xl:h-[85vh] lg:h-[95vh] lg:max-w-screen-lg lg:max-h-screen overflow-y-scroll">
            <DialogHeader>
              <DialogTitle data-testid="add-job-dialog-title">
                {pageTitle}
              </DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(onSubmit)}
                className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4"
              >
                {/* Job URL */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
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

                {/* Job Title */}
                <div>
                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel>Job Title</FormLabel>
                          <AutoFilledBadge fieldName="title" />
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
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel>Company</FormLabel>
                          <AutoFilledBadge fieldName="company" />
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
                    control={form.control}
                    name="location"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel>Job Location</FormLabel>
                          <AutoFilledBadge fieldName="location" />
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
                {/* Job Type */}
                <div>
                  <FormField
                    control={form.control}
                    name="type"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                          <FormLabel>Job Type</FormLabel>
                          <AutoFilledBadge fieldName="type" />
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
                {/* Job Source */}
                <div>
                  <FormField
                    control={form.control}
                    name="source"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Job Source</FormLabel>
                        <Combobox options={jobSources} field={field} />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Applied */}
                <div
                  className="flex items-center"
                  data-testid="switch-container"
                >
                  <FormField
                    control={form.control}
                    name="applied"
                    render={({ field }) => (
                      <FormItem className="flex flex-row">
                        <Switch
                          id="applied-switch"
                          checked={field.value}
                          onCheckedChange={(a) => {
                            field.onChange(a);
                            jobAppliedChange(a);
                          }}
                        />
                        <FormLabel
                          htmlFor="applied-switch"
                          className="flex items-center ml-4 mb-2"
                        >
                          {field.value ? "Applied" : "Not Applied"}
                        </FormLabel>

                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Status */}
                <div>
                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem className="flex flex-col [&>button]:capitalize">
                        <FormLabel>Status</FormLabel>
                        <SelectFormCtrl
                          label="Job Status"
                          options={jobStatuses}
                          field={field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Date Applied */}
                <div className="flex flex-col">
                  <FormField
                    control={form.control}
                    name="dateApplied"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Date Applied</FormLabel>
                        <DatePicker
                          field={field}
                          presets={false}
                          isEnabled={appliedValue}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Due Date */}
                <div>
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <FormLabel>Due Date</FormLabel>
                        <DatePicker
                          field={field}
                          presets={true}
                          isEnabled={true}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Salary Range */}
                <div>
                  <FormField
                    control={form.control}
                    name="salaryRange"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel>Salary Range</FormLabel>
                          <AutoFilledBadge fieldName="salaryRange" />
                        </div>
                        <FormControl>
                          <div className={autoFilledFields.has("salaryRange") ? "ring-2 ring-blue-200 rounded-md" : ""}>
                            <SelectFormCtrl
                              label="Salary Range"
                              options={SALARY_RANGES}
                              field={field}
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Resume */}
                <div className="flex items-end">
                  <FormField
                    control={form.control}
                    name="resume"
                    render={({ field }) => (
                      <FormItem className="flex flex-col [&>button]:capitalize">
                        <FormLabel>Resume</FormLabel>
                        <SelectFormCtrl
                          label="Resume"
                          options={resumes}
                          field={field}
                        />
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button variant="link" type="button" onClick={createResume} className="w-full">
                    Add New
                  </Button>
                  <CreateResume
                    resumeDialogOpen={resumeDialogOpen}
                    setResumeDialogOpen={setResumeDialogOpen}
                    reloadResumes={loadResumes}
                    setNewResumeId={setNewResumeId}
                  />
                </div>

                {/* Job Description */}
                <div className="md:col-span-2">
                  <FormField
                    control={form.control}
                    name="jobDescription"
                    render={({ field }) => (
                      <FormItem className="flex flex-col">
                        <div className="flex items-center justify-between">
                          <FormLabel id="job-description-label">
                            Job Description
                          </FormLabel>
                          <AutoFilledBadge fieldName="jobDescription" />
                        </div>
                        <FormControl>
                          <div className={autoFilledFields.has("jobDescription") ? "ring-2 ring-blue-200 rounded-md" : ""}>
                            <TiptapEditor field={field} />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <DialogFooter
                  // className="md:col-span
                  >
                    <div>
                      <Button
                        type="reset"
                        variant="outline"
                        className="mt-2 md:mt-0 w-full"
                        onClick={closeDialog}
                      >
                        Cancel
                      </Button>
                    </div>
                    <Button type="submit" data-testid="save-job-btn" className="w-full">
                      Save
                      {isPending && (
                        <Loader className="h-4 w-4 shrink-0 spinner" />
                      )}
                    </Button>
                  </DialogFooter>
                </div>
              </form>
            </Form>
          </DialogContent>
        </DialogOverlay>
      </Dialog>
    </>
  );
}
