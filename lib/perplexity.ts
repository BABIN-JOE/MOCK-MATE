// lib/perplexity.ts

export async function getPerplexityReply(prompt: string): Promise<string> {
  const perplexityKey = process.env.PERPLEXITY_API_KEY;
  if (!perplexityKey) throw new Error('Missing Perplexity API key');

  const response = await fetch('https://api.perplexity.ai/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${perplexityKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'pplx-70b-online', // or your preferred model
      messages: [
        { role: 'system', content: 'You are an expert AI interviewer.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 150
    }),
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a reply.";
}
