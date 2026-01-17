
import { authFetch } from '../utils/auth';
import { API_BASE_URL } from '../utils/config';
import { RiskItem, RiskCategory, RiskImpact, RiskLikelihood, RiskStatus } from '../types';

export const identifyRisksFromScenario = async (prompt: string, startId: number): Promise<RiskItem[]> => {
  try {
    const res = await authFetch(`${API_BASE_URL}/api/generate-risks`, {
      method: 'POST',
      body: JSON.stringify({ eventType: prompt }),
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({}));
      throw new Error(errorData.error || "Failed to generate risks");
    }

    const data = await res.json(); // Array of GeneratedRisk

    // Map backend response to RiskItem
    return data.map((gen: any, index: number) => {
      // Basic validation/fallback for Enums
      const category = Object.keys(RiskCategory).includes(gen.category) ? gen.category : 'Operational';
      const impact = Object.keys(RiskImpact).includes(gen.impact) ? gen.impact : 'Medium';
      const likelihood = Object.keys(RiskLikelihood).includes(gen.likelihood) ? gen.likelihood : 'Medium';

      return {
        id: `AI-${(startId + index).toString().padStart(3, '0')}`,
        description: gen.description,
        category: category as keyof typeof RiskCategory,
        impact: impact as keyof typeof RiskImpact,
        likelihood: likelihood as keyof typeof RiskLikelihood,
        status: 'Open' as keyof typeof RiskStatus,
        context: gen.context || prompt
      };
    });

  } catch (error) {
    console.error("AI Service Error:", error);
    throw error;
  }
};