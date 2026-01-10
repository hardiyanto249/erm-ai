
import { GoogleGenAI, Type } from "@google/genai";
import { RiskItem, RiskCategory, RiskImpact, RiskLikelihood, RiskStatus } from '../types';

// This is a mock implementation. In a real application, you would make an API call.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const riskSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      description: {
        type: Type.STRING,
        description: "A concise description of the identified risk.",
      },
      category: {
        type: Type.STRING,
        enum: Object.keys(RiskCategory),
        description: "The category of the risk.",
      },
      impact: {
        type: Type.STRING,
        enum: Object.keys(RiskImpact),
        description: "The potential impact of the risk if it occurs.",
      },
      likelihood: {
        type: Type.STRING,
        enum: Object.keys(RiskLikelihood),
        description: "The likelihood of the risk occurring.",
      },
    },
    required: ["description", "category", "impact", "likelihood"],
  },
};

export const identifyRisksFromScenario = async (prompt: string, startId: number): Promise<RiskItem[]> => {
  console.log("Simulating Gemini API call with prompt:", prompt);
  console.log("Using schema:", riskSchema);

  // In a real app, you would use this:
  /*
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Based on the following scenario for a Sharia Philanthropic Institution, identify potential risks. Scenario: "${prompt}"`,
    config: {
      responseMimeType: "application/json",
      responseSchema: riskSchema,
    },
  });
  const identifiedRisks = JSON.parse(response.text);
  */
  
  // Mock response for demonstration
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const mockResponse = [
    {
      description: "Data privasi muzakki (donatur) bocor akibat serangan siber pada platform online.",
      category: "Operational",
      impact: "High",
      likelihood: "Medium"
    },
    {
      description: "Persepsi publik negatif karena kampanye dianggap tidak transparan.",
      category: "Reputation",
      impact: "Critical",
      likelihood: "Medium"
    },
    {
      description: "Metode pembayaran online yang digunakan tidak sepenuhnya patuh syariah.",
      // Fix: Corrected 'Sharia Compliance' to 'ShariaCompliance' to match the 'RiskCategory' enum key.
      category: "ShariaCompliance",
      impact: "High",
      likelihood: "Low"
    }
  ];

  if (Math.random() > 0.1) { // 90% chance of success
    const newRisks: RiskItem[] = mockResponse.map((risk, index) => ({
      ...risk,
      id: `AI-${(startId + index).toString().padStart(3, '0')}`,
      status: 'Open',
    }) as RiskItem);
    return newRisks;
  } else { // 10% chance of failure
    throw new Error("Simulated API Error: Failed to analyze risks.");
  }
};