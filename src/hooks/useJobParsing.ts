import { useState } from "react";
import { UseFormSetValue, UseFormGetValues } from "react-hook-form";
import { toast } from "@/components/ui/use-toast";
import { addCompany } from "@/actions/company.actions";
import { createJobTitle } from "@/actions/jobtitle.actions";
import { createLocation } from "@/actions/job.actions";
import { Company, JobLocation, JobTitle } from "@/models/job.model";

interface UseJobParsingProps {
  setValue: UseFormSetValue<any>;
  getValues: UseFormGetValues<any>;
  jobTitles: JobTitle[];
  companies: Company[];
  locations: JobLocation[];
  setJobTitles: React.Dispatch<React.SetStateAction<JobTitle[]>>;
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  setLocations: React.Dispatch<React.SetStateAction<JobLocation[]>>;
  setAutoFilledFields: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const useJobParsing = ({
  setValue,
  getValues,
  jobTitles,
  companies,
  locations,
  setJobTitles,
  setCompanies,
  setLocations,
  setAutoFilledFields,
}: UseJobParsingProps) => {
  const [isParsingUrl, setIsParsingUrl] = useState(false);
  const [parsedData, setParsedData] = useState<any>(null);

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
            // Create new job title
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
            // Create new company
            try {
              const response = await addCompany({ company: result.data.company });
              if (response.success && response.data) {
                setCompanies(prev => [response.data, ...prev]);
                setValue("company", response.data.id);
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
            // Create new location
            try {
              const data = await createLocation(result.data.location);
              if (data) {
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

  const resetParsedData = () => {
    setParsedData(null);
  };

  return {
    isParsingUrl,
    parsedData,
    parseJobUrl,
    resetParsedData,
  };
};
