import { GoogleGenAI } from "@google/genai";
import { TreatmentPlanItem } from "../types";

// NOTE: In a real environment, this key must come from process.env.API_KEY
// For this demo to work, the user needs to provide a key or it will fail gracefully.
const apiKey = process.env.API_KEY || ''; 

export const generatePatientFriendlySummary = async (items: TreatmentPlanItem[]): Promise<string> => {
  if (!apiKey) {
    console.warn("No Gemini API Key found.");
    return "AI Summary unavailable: API Key missing.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const proceduresText = items.map(i => `- ${i.procedure_name} (Tooth: ${i.tooth || 'N/A'})`).join('\n');
    const prompt = `
      You are a helpful dental assistant. 
      Write a warm, non-technical, 2-sentence summary for a patient explaining the following procedures in their treatment plan. 
      Focus on the benefit (e.g., "restoring your smile", "preventing further decay").
      
      Procedures:
      ${proceduresText}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate AI summary at this time.";
  }
};