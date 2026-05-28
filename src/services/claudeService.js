// src/services/claudeService.js — Groq API integration for job extraction

const https = require('https');
const { GROQ_API_KEY } = require('../config/env');

const MODEL = 'llama-3.1-8b-instant'; // free, fast

const SYSTEM_PROMPT = `You are a job posting parser. Given raw text from a job board page, extract the following fields and return ONLY a valid JSON object with these exact keys:

{
  "company": "Company name",
  "role": "Job title / role",
  "location": "Location or Remote (empty string if not found)",
  "pay": "Salary / compensation if mentioned (empty string if not found)",
  "url": "Job posting URL if present in text (empty string if not found)",
  "notes": "Key requirements, tech stack, or notable details in 1-2 sentences (empty string if not found)",
  "term": "Internship/job term — one of: Summer 2026, Fall 2026, Spring 2027, Summer 2027, Fall 2027, Full-time. Infer from context (e.g. 'summer intern' → Summer 2026, 'new grad' or 'full time' → Full-time). Empty string if unclear."
}

Rules:
- Return ONLY the JSON object, no markdown, no code fences, no commentary.
- If a field cannot be found, use an empty string "".
- For pay, include the currency symbol and range (e.g. "$120k–$150k").
- For term, only use one of the listed values exactly as written, or empty string.`;

async function extractJobData(text, url = '', title = '') {
  const body = JSON.stringify({
    model: MODEL,
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: `URL: ${url}\nPage title: ${title}\n\n--- PAGE TEXT ---\n${text}` },
    ],
    max_tokens: 512,
    temperature: 0.1,
  });

  const raw = await httpsPost('api.groq.com', '/openai/v1/chat/completions', body, {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${GROQ_API_KEY}`,
  });

  const parsed = JSON.parse(raw);
  if (parsed.error) throw new Error(parsed.error.message || 'Groq API error');

  const content = parsed.choices?.[0]?.message?.content || '';
  const jsonText = content.replace(/```(?:json)?/g, '').trim();

  try {
    return JSON.parse(jsonText);
  } catch {
    throw new Error('Groq returned non-JSON response: ' + content.slice(0, 200));
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
