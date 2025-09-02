import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseJobWithAnythingLLM } from '@/actions/ai.actions';

const ParseJobUrlSchema = z.object({
  url: z.string().url('Invalid URL format'),
});

interface ParsedJobData {
  title?: string;
  company?: string;
  location?: string;
  description?: string;
  salary?: string;
  jobType?: string;
  confidence: number;
  source: string;
  error?: string;
}

// Common job board patterns for extraction
const JOB_BOARD_PATTERNS = {
  linkedin: {
    domain: 'linkedin.com',
    selectors: {
      title: 'h1[data-test-id="job-title"], .job-details-jobs-unified-top-card__job-title h1, .jobs-unified-top-card__job-title a',
      company: '.job-details-jobs-unified-top-card__company-name a, .jobs-unified-top-card__company-name a, .job-details-jobs-unified-top-card__primary-description-container .jobs-unified-top-card__subtitle-primary-grouping a',
      location: '.job-details-jobs-unified-top-card__bullet, .jobs-unified-top-card__bullet',
      description: '.jobs-description__content, .jobs-box__html-content',
      salary: '.job-details-jobs-unified-top-card__job-insight--highlight, .jobs-unified-top-card__job-insight--highlight'
    }
  },
  indeed: {
    domain: 'indeed.com',
    selectors: {
      title: '[data-testid="jobsearch-JobInfoHeader-title"], .jobsearch-JobInfoHeader-title',
      company: '[data-testid="inlineHeader-companyName"], .jobsearch-InlineCompanyRating-companyHeader a',
      location: '[data-testid="job-location"], .jobsearch-JobInfoHeader-subtitle > div:first-child',
      description: '#jobDescriptionText, .jobsearch-jobDescriptionText',
      salary: '.jobsearch-JobMetadataHeader-item:contains("$"), [data-testid="job-salary"]'
    }
  },
  glassdoor: {
    domain: 'glassdoor.com',
    selectors: {
      title: '[data-test="job-title"], .job-title',
      company: '[data-test="employer-name"], .employer-name',
      location: '[data-test="job-location"], .job-location',
      description: '.job-description, [data-test="job-description"]',
      salary: '.salary, [data-test="salary"]'
    }
  }
};

async function fetchJobPageContent(url: string): Promise<string> {
  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    return await response.text();
  } catch (error) {
    throw new Error(`Failed to fetch job page: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function extractTextFromHtml(html: string, selector: string): string | null {
  // Simple HTML parsing without external dependencies
  // This is a basic implementation - in production, consider using a proper HTML parser
  const regex = new RegExp(`<[^>]*class[^>]*${selector.replace('.', '')}[^>]*>([^<]*)</[^>]*>`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

function detectJobBoard(url: string): keyof typeof JOB_BOARD_PATTERNS | null {
  const hostname = new URL(url).hostname.toLowerCase();
  
  for (const [board, config] of Object.entries(JOB_BOARD_PATTERNS)) {
    if (hostname.includes(config.domain)) {
      return board as keyof typeof JOB_BOARD_PATTERNS;
    }
  }
  
  return null;
}

function parseJobContent(html: string, url: string): ParsedJobData {
  const jobBoard = detectJobBoard(url);
  let confidence = 0.3; // Base confidence for generic parsing
  
  const result: ParsedJobData = {
    confidence,
    source: jobBoard || 'generic',
  };

  // LinkedIn-specific parsing
  if (jobBoard === 'linkedin') {
    confidence = 0.8;
    
    // Extract title - LinkedIn has specific patterns
    let titleMatch = html.match(/<h1[^>]*class="[^"]*job-title[^"]*"[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/<h1[^>]*>([^<]+)<\/h1>/i) ||
                    html.match(/<title>([^|]+)/i);
    if (titleMatch) {
      result.title = titleMatch[1].replace(/\s*-\s*.*$/, '').replace(/\s*\|\s*.*$/, '').trim();
    }
    
    // Extract company - LinkedIn patterns
    let companyMatch = html.match(/class="[^"]*company[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i) ||
                      html.match(/class="[^"]*company[^"]*"[^>]*>([^<]+)</i) ||
                      html.match(/"companyName":"([^"]+)"/i) ||
                      html.match(/data-tracking-control-name="[^"]*company[^"]*"[^>]*>([^<]+)</i);
    if (companyMatch) {
      result.company = companyMatch[1].trim();
    }
    
    // Extract location - LinkedIn patterns  
    let locationMatch = html.match(/class="[^"]*location[^"]*"[^>]*>([^<]+)</i) ||
                       html.match(/"location":"([^"]+)"/i) ||
                       html.match(/class="[^"]*bullet[^"]*"[^>]*>([^<]+)</i);
    if (locationMatch) {
      result.location = locationMatch[1].trim();
    }
  }
  
  // Indeed-specific parsing
  else if (jobBoard === 'indeed') {
    confidence = 0.8;
    
    let titleMatch = html.match(/data-testid="jobsearch-JobInfoHeader-title"[^>]*>([^<]+)</i) ||
                    html.match(/class="[^"]*jobsearch-JobInfoHeader-title[^"]*"[^>]*>([^<]+)</i);
    if (titleMatch) {
      result.title = titleMatch[1].trim();
    }
    
    let companyMatch = html.match(/data-testid="inlineHeader-companyName"[^>]*>([^<]+)</i) ||
                      html.match(/class="[^"]*jobsearch-InlineCompanyRating[^"]*"[^>]*>[\s\S]*?<a[^>]*>([^<]+)</i);
    if (companyMatch) {
      result.company = companyMatch[1].trim();
    }
    
    let locationMatch = html.match(/data-testid="job-location"[^>]*>([^<]+)</i) ||
                       html.match(/class="[^"]*jobsearch-JobInfoHeader-subtitle[^"]*"[^>]*>[\s\S]*?<div[^>]*>([^<]+)</i);
    if (locationMatch) {
      result.location = locationMatch[1].trim();
    }
  }
  
  // Generic fallback patterns
  if (!result.title) {
    let titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/i) || 
                    html.match(/<title>([^<|]+)/i);
    if (titleMatch) {
      result.title = titleMatch[1].replace(/\s*[-|]\s*.*$/, '').trim();
    }
  }
  
  if (!result.company) {
    let companyMatch = html.match(/company[^>]*>([^<]+)</i) ||
                      html.match(/employer[^>]*>([^<]+)</i) ||
                      html.match(/"company"[^>]*>([^<]+)</i) ||
                      html.match(/at\s+([A-Z][a-zA-Z\s&.,]+?)(?:\s+in|\s+\||$)/i);
    if (companyMatch) {
      result.company = companyMatch[1].trim();
    }
  }
  
  if (!result.location) {
    let locationMatch = html.match(/location[^>]*>([^<]+)</i) ||
                       html.match(/address[^>]*>([^<]+)</i) ||
                       html.match(/in\s+([A-Z][a-zA-Z\s,]+?)(?:\s+\||$)/i);
    if (locationMatch) {
      result.location = locationMatch[1].trim();
    }
  }
  
  // Extract salary information
  const salaryMatch = html.match(/\$[\d,]+(?:\s*k)?(?:\s*-\s*\$?[\d,]+(?:\s*k)?)?(?:\s*(?:per|\/)\s*(?:hour|year|month|yr|hr))?/i);
  if (salaryMatch) {
    result.salary = salaryMatch[0];
  }
  
  // Extract job type
  const jobTypeMatch = html.match(/(?:full.?time|part.?time|contract|temporary|internship|remote)/i);
  if (jobTypeMatch) {
    result.jobType = jobTypeMatch[0].toLowerCase().replace(/[^a-z]/g, '');
  }
  
  // Extract job description (improved with multiple patterns)
  let descriptionMatch = null;
  const descriptionPatterns = [
    // LinkedIn patterns
    /<div[^>]*class="[^"]*jobs-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*jobs-box__html-content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    // Indeed patterns
    /<div[^>]*id="jobDescriptionText"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*jobsearch-jobDescriptionText[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    // Glassdoor patterns
    /<div[^>]*class="[^"]*job-description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*data-test="job-description"[^>]*>([\s\S]*?)<\/div>/i,
    // Generic patterns
    /<div[^>]*(?:description|content|job-description|responsibilities|requirements)[^>]*>([\s\S]*?)<\/div>/i,
    /<section[^>]*(?:description|content|job-description)[^>]*>([\s\S]*?)<\/section>/i,
    /<article[^>]*(?:description|job-description)[^>]*>([\s\S]*?)<\/article>/i
  ];

  for (const pattern of descriptionPatterns) {
    descriptionMatch = html.match(pattern);
    if (descriptionMatch && descriptionMatch[1].length > 100) {
      break;
    }
  }

  if (descriptionMatch) {
    let cleanDescription = descriptionMatch[1]
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .trim();

    // Only use if we have substantial content
    if (cleanDescription.length > 50) {
      result.description = cleanDescription.substring(0, 2000); // Increased from 1000
    }
  }
  
  // Calculate final confidence based on extracted fields
  const extractedFields = [result.title, result.company, result.location, result.description].filter(Boolean).length;
  result.confidence = Math.min(0.95, confidence + (extractedFields * 0.05));
  
  return result;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { url } = ParseJobUrlSchema.parse(body);
    
    // Fetch the job page content
    const html = await fetchJobPageContent(url);
    
    let parsedData: ParsedJobData;
    
    // Try AnythingLLM first if configured
    if (process.env.ANYTHINGLLM_BASE_URL) {
      console.log('Using AnythingLLM for job parsing...');
      parsedData = await parseJobWithAnythingLLM(html, url);
      
      // If AnythingLLM parsing failed or has low confidence, fallback to HTML scraping
      if (parsedData.error || parsedData.confidence < 0.3) {
        console.log('AnythingLLM parsing failed or low confidence, falling back to HTML scraping...');
        const fallbackData = parseJobContent(html, url);
        
        // Use the better result based on confidence
        if (fallbackData.confidence > parsedData.confidence) {
          parsedData = fallbackData;
        }
      }
    } else {
      // Use traditional HTML scraping if AnythingLLM is not configured
      console.log('Using traditional HTML scraping for job parsing...');
      parsedData = parseJobContent(html, url);
    }
    
    return NextResponse.json({
      success: true,
      data: parsedData,
    });
    
  } catch (error) {
    console.error('Job URL parsing error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request format',
          details: error.errors,
        },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to parse job URL',
        data: {
          confidence: 0,
          source: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      },
      { status: 500 }
    );
  }
}
