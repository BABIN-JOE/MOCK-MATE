import type { NextApiRequest, NextApiResponse } from 'next';
import { saveCompletedInterview, saveInterviewFormat } from '@/lib/actions/interview.action';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { userId, role, type, techstack, questions, saveFormat } = req.body;
  try {
    let formatId = null;
    if (saveFormat) {
      formatId = await saveInterviewFormat({ userId, role, type, techstack, questions });
    }
    const interviewId = await saveCompletedInterview({ userId, role, type, techstack, questions });
    return res.status(200).json({ interviewId, formatId });
  } catch (error: any) {
    console.error('Error saving interview:', error);
    return res.status(500).json({ error: error.message || 'Error saving interview' });
  }
}
