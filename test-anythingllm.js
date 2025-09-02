// Test script for AnythingLLM integration
// Run with: node test-anythingllm.js

const fetch = require('node-fetch');

async function testAnythingLLMConnection() {
  const baseUrl = process.env.ANYTHINGLLM_BASE_URL || 'http://localhost:3001';
  const apiKey = process.env.ANYTHINGLLM_API_KEY;
  
  console.log('Testing AnythingLLM connection...');
  console.log('Base URL:', baseUrl);
  console.log('API Key configured:', !!apiKey);
  
  try {
    // Test basic connection
    const healthResponse = await fetch(`${baseUrl}/api/v1/system/health`);
    console.log('Health check status:', healthResponse.status);
    
    if (healthResponse.ok) {
      const healthData = await healthResponse.json();
      console.log('Health data:', healthData);
    }
    
    // Test chat endpoint with a simple job parsing request
    const testHtml = `
      <html>
        <head><title>Software Engineer - Google</title></head>
        <body>
          <h1>Software Engineer</h1>
          <div class="company">Google</div>
          <div class="location">Mountain View, CA</div>
          <div class="description">
            We are looking for a talented Software Engineer to join our team.
            Requirements: 3+ years experience with JavaScript, React, Node.js.
            Full-time position with competitive salary.
          </div>
        </body>
      </html>
    `;
    
    const prompt = `
You are an expert job data extraction assistant. Extract structured job information from the provided HTML content.

Extract the following information and return it as a JSON object:
{
  "title": "job title",
  "company": "company name", 
  "location": "job location",
  "description": "job description (first 1000 characters, cleaned of HTML tags)",
  "salary": "salary information if available",
  "jobType": "job type (fulltime, parttime, contract, temporary, internship, remote)"
}

Rules:
1. Extract only factual information present in the content
2. Clean HTML tags from description
3. Normalize job type to one of: fulltime, parttime, contract, temporary, internship, remote
4. If information is not available, use null for that field
5. Return only valid JSON, no additional text

HTML Content:
${testHtml}
`;

    const requestBody = {
      message: prompt,
      mode: "chat",
      sessionId: `test-${Date.now()}`,
      chatId: null
    };

    const headers = {
      'Content-Type': 'application/json',
    };

    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    console.log('\nTesting chat endpoint...');
    const chatResponse = await fetch(`${baseUrl}/api/v1/workspace/default/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
    });

    console.log('Chat response status:', chatResponse.status);
    
    if (chatResponse.ok) {
      const chatData = await chatResponse.json();
      console.log('Chat response:', JSON.stringify(chatData, null, 2));
      
      if (chatData.textResponse) {
        console.log('\nExtracting JSON from response...');
        const jsonMatch = chatData.textResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsedData = JSON.parse(jsonMatch[0]);
            console.log('Parsed job data:', JSON.stringify(parsedData, null, 2));
          } catch (e) {
            console.error('Failed to parse JSON:', e.message);
          }
        } else {
          console.log('No JSON found in response');
        }
      }
    } else {
      const errorText = await chatResponse.text();
      console.error('Chat endpoint error:', errorText);
    }
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

// Run the test
testAnythingLLMConnection();
