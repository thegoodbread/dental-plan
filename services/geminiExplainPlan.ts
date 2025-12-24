
import { GoogleGenAI } from "@google/genai";
import { TreatmentPlan, TreatmentPlanItem } from "../types";

export const explainPlanForPatient = async (plan: TreatmentPlan, items: TreatmentPlanItem[]): Promise<string> => {
  try {
    // FIX: Aligned with Gemini API guidelines by removing the API key check
    // and initializing the client directly with the environment variable.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const proceduresText = items.map(i => {
       // FIX: selection lists are now properly typed on TreatmentPlanItem
       const area = i.selectedTeeth?.length ? `(Teeth: ${i.selectedTeeth.join(', ')})` :
                    i.selectedQuadrants?.length ? `(Quads: ${i.selectedQuadrants.join(', ')})` :
                    i.selectedArches?.length ? `(Arch: ${i.selectedArches.join(', ')})` : '';
       return `- ${i.procedureName} ${area}`;
    }).join('\n');

    const prompt = `
      You are a helpful dental treatment coordinator.
      Explain the following dental treatment plan to the patient in simple, reassuring language.
      
      Case Alias: ${plan.caseAlias || 'Patient'}
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

    // FIX: Updated model to 'gemini-3-flash-preview' for basic text tasks
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || "Could not generate summary.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Could not generate AI explanation at this time.";
  }
};
