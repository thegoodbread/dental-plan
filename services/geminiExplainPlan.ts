import { GoogleGenAI } from "@google/genai";
import { TreatmentPlan, TreatmentPlanItem } from "../types";

const apiKey = process.env.API_KEY || ''; 

export const explainPlanForPatient = async (plan: TreatmentPlan, items: TreatmentPlanItem[]): Promise<string> => {
  if (!apiKey) {
    console.warn("No Gemini API Key found.");
    return "AI Explanation unavailable: API Key missing.";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const proceduresText = items.map(i => {
       const area = i.selectedTeeth?.length ? `(Teeth: ${i.selectedTeeth.join(', ')})` :
                    i.selectedQuadrants?.length ? `(Quads: ${i.selectedQuadrants.join(', ')})` :
                    i.selectedArches?.length ? `(Arch: ${i.selectedArches.join(', ')})` : '';
       return `- ${i.procedureName} ${area}`;
    }).join('\n');

    const prompt = `
      You are a helpful dental treatment coordinator.
      Explain the following dental treatment plan to the patient in simple, reassuring language.
      
      Patient Name: ${plan.patient?.firstName || 'Patient'}
      Plan Title: ${plan.title}
      Total Cost: $${plan.totalFee.toFixed(2)}
      Patient Portion: $${plan.patientPortion.toFixed(2)}
      
      Procedures:
      ${proceduresText}
      
      Instructions:
      1. Write 1-2 short, friendly paragraphs.
      2. Avoid medical jargon.
      3. Explain briefly why these types of procedures are typically done (health, function, aesthetics).
      4. Mention the outcome (e.g. "restore your smile").
      5. Do NOT list the prices again in the text unless necessary for context.
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
