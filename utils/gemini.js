const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function parseEmailForTasks(emailContent, emailSubject) {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash-exp",
    generationConfig: {
      responseMimeType: "application/json",
    },
  });

  const prompt = `
Extract all tasks, deadlines, assignments, and events from this email.
Return ONLY a JSON array with this exact structure:

{
  "tasks": [
    {
      "title": "task title",
      "due_date": "YYYY-MM-DD or null if no date",
      "due_time": "HH:MM or null if no time",
      "priority": "high/medium/low",
      "category": "assignment/meeting/deadline/event/other",
      "description": "brief description"
    }
  ]
}

Rules:
- If no specific due date is mentioned, set due_date to null
- For relative dates like "tomorrow" or "next week", calculate the actual date
- Priority: high = urgent/ASAP, medium = specific deadline, low = no rush
- Only extract actionable items, not general information

Email Subject: ${emailSubject}
Email Body:
${emailContent}
`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response.text();
    const parsed = JSON.parse(response);
    return parsed.tasks || [];
  } catch (error) {
    console.error('Gemini parsing error:', error);
    return [];
  }
}

module.exports = { parseEmailForTasks };