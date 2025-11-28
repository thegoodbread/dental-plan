import { GoogleGenAI } from "@google/genai";
import { TreatmentPlanItem, TreatmentPlan } from "../types";

// NOTE: In a real environment, this key must come from process.env.API_KEY
// For this demo to work, the user needs to provide a key or it will fail gracefully.
const apiKey = process.env.API_KEY || ''; 

export const explainPlanForPatient = async (plan: TreatmentPlan): Promise<string> => {
  if (!apiKey) {
    console.warn("No Gemini API Key found.");
    return "AI Explanation unavailable: API Key missing.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const proceduresText = (plan.items || []).map(i => `- ${i.procedureName} (Tooth: ${i.selectedTeeth?.join(', ') || 'N/A'}, Fee: $${i.netFee})`).join('\n');
    const prompt = `
      You are a friendly, empathetic treatment coordinator at a dental clinic.
      Explain the following treatment plan to the patient, named ${plan.patient?.firstName || 'Patient'}.
      
      Plan Title: ${plan.title}
      Total Cost: $${plan.totalFee}
      Patient Portion: $${plan.patientPortion}

      Procedures:
      ${proceduresText}

      Instructions:
      1. Write a 3-4 sentence paragraph.
      2. Use simple, non-medical language.
      3. Focus on the health benefits (e.g. restoring function, aesthetics, preventing pain).
      4. Mention the financial investment gently if it's high, otherwise focus on the outcome.
      5. Do not use bullet points, just a nice paragraph.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate AI explanation at this time.";
  }
};

// keeping old one for backward compat if needed, but the new one is preferred
export const generatePatientFriendlySummary = async (items: TreatmentPlanItem[]): Promise<string> => {
    return "Deprecated function, use explainPlanForPatient";
};