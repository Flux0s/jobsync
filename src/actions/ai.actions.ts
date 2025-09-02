"use server";

import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/community/chat_models/ollama";
import {
  StringOutputParser,
  StructuredOutputParser,
} from "@langchain/core/output_parsers";
import { ChatPromptTemplate } from "@langchain/core/prompts";
import { Resume } from "@/models/profile.model";
import prisma from "@/lib/db";
import { JobResponse } from "@/models/job.model";
import { convertJobToText, convertResumeToText } from "@/utils/ai.utils";

export const getResumeReviewByOllama = async (
  resume: Resume,
  aImodel?: string
): Promise<ReadableStream | undefined> => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
      You are an expert resume writer and career coach. You must always return JSON object with following structure.
    
        summary: Provide a brief summary of the resume review.
        strengths: List the strengths in the resume.
        weaknesses: List the weaknesses in the resume.
        suggestions: Provide suggestions for improvement in a list of string.
        score: Provide a score for the resume (0-100).
      `,
    ],
    [
      "human",
      `
      Review the resume provided below and and provide feedback in the specified JSON format.
      
      {resume}
      `,
    ],
  ]);

  const resumeText = await convertResumeToText(resume);

  const inputMessage = await prompt.format({ resume: resumeText });

  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: aImodel,
    temperature: 0,
    format: "json",
  });

  const response = await model.stream([{ role: 'user', content: inputMessage }]);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        if (typeof chunk.content === 'string') {
          controller.enqueue(encoder.encode(chunk.content));
        } else if (Array.isArray(chunk.content)) {
          // Handle array content by joining all text elements
          const textContent = chunk.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
          controller.enqueue(encoder.encode(textContent));
        }
      }
      controller.close();
    },
  });
};

export const getResumeReviewByOpenAi = async (
  resume: Resume,
  aImodel?: string
): Promise<ReadableStream | undefined> => {
  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
      You are an expert resume writer and career coach. You must only return JSON object with following property structure.
    
        summary: Provide a brief summary of the resume review.
        strengths: List the strengths in the resume.
        weaknesses: List the weaknesses in the resume.
        suggestions: Provide suggestions for improvement in a list of string.
        score: Provide a score for the resume (0-100), scoring should be strict and criteria should include skills, ATS friendliness, and formatting.
      `,
    ],
    [
      "human",
      `
      Review the resume provided below and and provide feedback in the specified JSON format.
      
      {resume}
      `,
    ],
  ]);

  const resumeText = await convertResumeToText(resume);

  const inputMessage = await prompt.format({ resume: resumeText });

  const model = new ChatOpenAI({
    modelName: aImodel,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    maxConcurrency: 1,
    maxTokens: 3000,
    streaming: true,
  });

  const response = await model.stream([{ role: 'user', content: inputMessage }]);
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        if (typeof chunk.content === 'string') {
          controller.enqueue(encoder.encode(chunk.content));
        } else if (Array.isArray(chunk.content)) {
          // Handle array content by joining all text elements
          const textContent = chunk.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
          controller.enqueue(encoder.encode(textContent));
        }
      }
      controller.close();
    },
  });
};

export const getJobMatchByOllama = async (
  resume: Resume,
  job: JobResponse,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);

  const jobText = await convertJobToText(job);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
    You are an expert assistant tasked with matching job seekers' resumes with job descriptions and providing suggestions to improve their resumes. You will analyze the given resume and job description, provide a matching score between 0 and 100, score will be based on application tracking system (ATS) friendliness and skill and keywords match, and suggest improvements to increase the matching score and make the resume more aligned with the job description. Be verbose and highlight details in your response.
    
    Your response must always return JSON object with following structure:

        "detailed_analysis": an array list of following object structures:
              <<object structure>>
                "category": "suggestion category title with score",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "ATS Friendliness(60/100):",
                "value": ["<ATS friendliness analysis 1>", "<ATS friendliness analysis 2>",...],
              <<example 2>>
                "category": "Skill and Keyword match(65/100):",
                "value": ["<description of analysis in terms of skill match>", "<description of analysis in terms of keyword match>",...],
        "suggestions": an array list with following object structures:
              <<object structure>>
                "category": "suggestion category title",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "Emphasize Keywords and Skills:",
                "value": ["<missing keywords not found in resume>", "<missing skill not found in resume>",...],
              <<example 2>>
                "category": "Format for clarity and ATS optimization:",
                "value": ["<change 1>", "<change 2>",...],
              <<example 3>>
                "category": "Enhancement for relevant experience:",
                "value": ["<change 1>", "<change 2>",...],
        "additional_comments": summary of recommendations as array of strings.
              <<example>>
                ["<comments>"],
        "matching_score": <matching_score with single numeric value, be strict with this score with always room for improvement>,
  `,
    ],
    [
      "human",
      `
      Please analyze the following resume and job description.

      Resume:
      """
      {resume}
      """

      Job Description:
      """
      {job_description}
      """
    `,
    ],
  ]);

  const inputMessage = await prompt.format({
    resume: resumeText || "No resume provided",
    job_description: jobText,
  });
  const model = new ChatOllama({
    baseUrl: process.env.OLLAMA_BASE_URL || "http://127.0.0.1:11434",
    model: aiModel,
    temperature: 0,
    format: "json",
    maxConcurrency: 1,
    numCtx: 3000,
  });

  const response = await model.stream([{ role: 'user', content: inputMessage }]);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        if (typeof chunk.content === 'string') {
          controller.enqueue(encoder.encode(chunk.content));
        } else if (Array.isArray(chunk.content)) {
          // Handle array content by joining all text elements
          const textContent = chunk.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
          controller.enqueue(encoder.encode(textContent));
        }
      }
      controller.close();
    },
  });
};

export const getJobMatchByOpenAi = async (
  resume: Resume,
  job: JobResponse,
  aiModel?: string
): Promise<ReadableStream | undefined> => {
  const resumeText = await convertResumeToText(resume);

  const jobText = await convertJobToText(job);

  const prompt = ChatPromptTemplate.fromMessages([
    [
      "system",
      `
    You are an expert assistant tasked with matching job seekers' resumes with job descriptions and providing suggestions to improve their resumes. You will analyze the given resume and job description, provide a matching score between 0 and 100, score will be based on application tracking system (ATS) friendliness and skill and keywords match, and suggest improvements to increase the matching score and make the resume more aligned with the job description. Be verbose and highlight details in your response.
    
    Your response must always return JSON object with following structure:

        "detailed_analysis": an array list of following object structures:
              <<object structure>>
                "category": "suggestion category title with score",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "ATS Friendliness(60/100):",
                "value": ["<ATS friendliness analysis 1>", "<ATS friendliness analysis 2>",...],
              <<example 2>>
                "category": "Skill and Keyword match(65/100):",
                "value": ["<description of analysis in terms of skill match>", "<description of analysis in terms of keyword match>",...],
        "suggestions": an array list with following object structures:
              <<object structure>>
                "category": "suggestion category title",
                "value": "an array list of suggestion as strings",
              <<example 1>>
                "category": "Emphasize Keywords and Skills:",
                "value": ["<missing keywords not found in resume>", "<missing skill not found in resume>",...],
              <<example 2>>
                "category": "Format for clarity and ATS optimization:",
                "value": ["<change 1>", "<change 2>",...],
              <<example 3>>
                "category": "Enhancement for relevant experience:",
                "value": ["<change 1>", "<change 2>",...],
        "additional_comments": summary of recommendations as array of strings.
              <<example>>
                ["<comments>"],
        "matching_score": <matching_score with single numeric value, be strict with this score with always room for improvement>,
  `,
    ],
    [
      "human",
      `
      Please analyze the following resume and job description.

      Resume:
      """
      {resume}
      """

      Job Description:
      """
      {job_description}
      """
    `,
    ],
  ]);

  const inputMessage = await prompt.format({
    resume: resumeText || "No resume provided",
    job_description: jobText,
  });
  const model = new ChatOpenAI({
    model: aiModel,
    openAIApiKey: process.env.OPENAI_API_KEY,
    temperature: 0,
    maxConcurrency: 1,
    maxTokens: 3000,
    streaming: true,
  });

  const response = await model.stream([{ role: 'user', content: inputMessage }]);
  const encoder = new TextEncoder();

  return new ReadableStream({
    async start(controller) {
      for await (const chunk of response) {
        if (typeof chunk.content === 'string') {
          controller.enqueue(encoder.encode(chunk.content));
        } else if (Array.isArray(chunk.content)) {
          // Handle array content by joining all text elements
          const textContent = chunk.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => item.text)
            .join('');
          controller.enqueue(encoder.encode(textContent));
        }
      }
      controller.close();
    },
  });
};

const getExistingDatabaseValues = async () => {
  try {
    const [jobTitles, companies, locations, jobSources, jobs] = await Promise.all([
      prisma.jobTitle.findMany({ select: { value: true }, take: 50 }),
      prisma.company.findMany({ select: { value: true }, take: 50 }),
      prisma.location.findMany({ select: { value: true }, take: 50 }),
      prisma.jobSource.findMany({ select: { value: true }, take: 20 }),
      prisma.job.findMany({ 
        select: { jobType: true, salaryRange: true }, 
        distinct: ['jobType', 'salaryRange'],
        take: 100 
      })
    ]);

    return {
      jobTitles: jobTitles.map((jt: { value: string }) => jt.value),
      companies: companies.map((c: { value: string }) => c.value),
      locations: locations.map((l: { value: string }) => l.value),
      jobSources: jobSources.map((js: { value: string }) => js.value),
      jobTypes: Array.from(new Set(jobs.map((j: any) => j.jobType).filter(Boolean))),
      salaryRanges: Array.from(new Set(jobs.map((j: any) => j.salaryRange).filter(Boolean)))
    };
  } catch (error) {
    console.log('Failed to fetch existing database values:', error);
    return {
      jobTitles: [],
      companies: [],
      locations: [],
      jobSources: [],
      jobTypes: ['FT', 'PT', 'C'],
      salaryRanges: []
    };
  }
};

export const parseJobWithAnythingLLM = async (
  htmlContent: string,
  url: string
): Promise<{
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  salary?: string;
  jobType?: string;
  confidence: number;
  source: string;
  error?: string;
}> => {
  try {
    const baseUrl = process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001';
    const apiKey = process.env.ANYTHINGLLM_API_KEY;
    
    // Get existing database values to help AI match against existing entries
    const existingValues = await getExistingDatabaseValues();
    
    const prompt = `
You are an expert job data extraction assistant. Extract structured job information from the provided HTML content.

IMPORTANT: When possible, match extracted values against these existing database entries to minimize duplicate entries:

EXISTING JOB TITLES (use exact match if possible):
${existingValues.jobTitles.slice(0, 20).join(', ')}

EXISTING COMPANIES (use exact match if possible):
${existingValues.companies.slice(0, 20).join(', ')}

EXISTING LOCATIONS (use exact match if possible):
${existingValues.locations.slice(0, 20).join(', ')}

EXISTING JOB SOURCES (use exact match if possible):
${existingValues.jobSources.join(', ')}

EXISTING JOB TYPES (use exact match):
${existingValues.jobTypes.join(', ')}

EXISTING SALARY RANGES (use similar format if possible):
${existingValues.salaryRanges.slice(0, 10).join(', ')}

Extract the following information and return it as a JSON object:
{
  "title": "job title (prefer existing match)",
  "company": "company name (prefer existing match)",
  "location": "job location (prefer existing match)",
  "description": "summarized key points: responsibilities, requirements, benefits, company culture - max 500 chars",
  "salary": "salary information if available (prefer existing format)",
  "jobType": "job type (must use existing values or FT/PT/C)"
}

Rules:
1. PRIORITIZE matching existing database values to avoid duplicates
2. For description: summarize key points that matter to job seekers (responsibilities, requirements, benefits, growth opportunities)
3. Clean HTML tags and focus on actionable information
4. For jobType: use existing values (${existingValues.jobTypes.join(', ')}) or default to FT/PT/C
5. If information is not available, use null for that field
6. Return only valid JSON, no additional text

HTML Content:
${htmlContent.substring(0, 8000)}
`;

    const requestBody = {
      message: prompt,
      mode: "chat"
    };

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(`${baseUrl}/api/v1/workspace/myworkspace/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('AnythingLLM request to:', `${baseUrl}/api/v1/workspace/myworkspace/chat`);
    console.log('AnythingLLM request body size:', JSON.stringify(requestBody).length, 'characters');
    console.log('AnythingLLM response status:', response.status);

    if (!response.ok) {
      throw new Error(`AnythingLLM API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    
    console.log('AnythingLLM full response:', JSON.stringify(result, null, 2));
    
    if (!result.textResponse) {
      console.log('AnythingLLM result keys:', Object.keys(result));
      throw new Error('No response from AnythingLLM');
    }
    
    console.log('AnythingLLM textResponse:', result.textResponse);

    // Parse the JSON response from the AI
    let parsedData;
    try {
      // Extract JSON from the response text
      const jsonMatch = result.textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsedData = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in AI response');
      }
    } catch (parseError) {
      console.log('Failed to parse JSON from response:', result.textResponse);
      throw new Error(`Failed to parse AI response: ${parseError}`);
    }

    // Calculate confidence based on extracted fields
    const extractedFields = [
      parsedData.title,
      parsedData.company,
      parsedData.location,
      parsedData.description
    ].filter(field => field && field !== null).length;
    
    const confidence = Math.min(0.95, 0.6 + (extractedFields * 0.08));

    return {
      title: parsedData.title || undefined,
      company: parsedData.company || undefined,
      location: parsedData.location || undefined,
      description: parsedData.description || undefined,
      salary: parsedData.salary || undefined,
      jobType: parsedData.jobType || undefined,
      confidence,
      source: 'anythingllm',
    };

  } catch (error) {
    console.error('AnythingLLM parsing error:', error);
    return {
      confidence: 0,
      source: 'anythingllm-error',
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
};
