// pages/api/ai-reply.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { getGeminiReply } from '@/lib/gemini';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let { prompt } = req.body;
  prompt = `You are an expert AI interviewer. Given the candidate's answer below, ask a relevant follow-up question or provide feedback. Candidate's answer: ${prompt}`;
  try {
    const reply = await getGeminiReply(prompt);
    return res.status(200).json({ reply });
  } catch (error: any) {
    console.error('Error contacting Gemini API:', error);
    return res.status(500).json({ error: error.message || 'Error contacting AI API' });
  }
}
