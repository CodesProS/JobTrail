// src/services/claudeService.js — Gemini API integration for job extraction

const https = require('https');
const { GEMINI_API_KEY } = require('../config/env');

const MODEL = 'gemini-1.5-flash-8b';

const PROMPT_TEMPLATE = (text, url, title) => `
You are a job posting parser. Extract the following fields from the page text below and return ONLY a valid JSON object with these exact keys:

{
  "company": "Company name",
  "role": "Job title / role",
  "location": "Location or Remote (empty string if not found)",
  "pay": "Salary / compensation if mentioned (empty string if not found)",
  "url": "Job posting URL if present in text (empty string if not found)",
  "notes": "Key requirements, tech stack, or notable details in 1-2 sentences (empty string if not found)"
}

Rules:
- Return ONLY the JSON object, no markdown, no code fences, no commentary.
- If a field cannot be found, use an empty string "".
- For pay, include the currency symbol and range (e.g. "$120k–$150k").

URL: ${url}
Page title: ${title}

--- PAGE TEXT ---
${text}
`;

/**
 * Extract structured job info from raw page text using Gemini.
 */
async function extractJobData(text, url = '', title = '') {
  const body = JSON.stringify({
    contents: [
      {
        parts: [{ text: PROMPT_TEMPLATE(text, url, title) }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      maxOutputTokens: 512,
    },
  });

  const path = `/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const raw = await httpsPost('generativelanguage.googleapis.com', path, body, {
    'Content-Type': 'application/json',
  });

  const parsed = JSON.parse(raw);

  if (parsed.error) {
    throw new Error(parsed.error.message || 'Gemini API error');
  }

  const content = parsed.candidates?.[0]?.content?.parts?.[0]?.text || '';

  // Strip accidental markdown code fences
  const jsonText = content.replace(/```(?:json)?/g, '').trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error('Gemini returned non-JSON response: ' + content.slice(0, 200));
  }
}

function httpsPost(hostname, path, body, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

module.exports = { extractJobData };
