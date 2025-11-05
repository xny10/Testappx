
import { GoogleGenAI, Modality, GenerateContentResponse } from "@google/genai";
import { Configuration } from '../types';
import { SYSTEM_PROMPT_TEMPLATE } from '../constants';

const API_KEY = process.env.API_KEY;
if (!API_KEY) {
  console.error("API_KEY environment variable not set.");
}
const ai = new GoogleGenAI({ apiKey: API_KEY! });

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

const buildPrompt = (config: Configuration): string => {
  let prompt = SYSTEM_PROMPT_TEMPLATE;
  prompt = prompt.replace('{{pose_style}}', config.poseStyle);
  prompt = prompt.replace('{{background_style}}', config.backgroundStyle);
  prompt = prompt.replace(/\{\{aspect_ratio\}\}/g, config.aspectRatio);
  prompt = prompt.replace('{{extra_instructions}}', config.extraInstructions || 'Tidak ada instruksi tambahan.');
  prompt = prompt.replace('{{remove_watermark}}', String(config.removeWatermark));
  return prompt;
};

export const generateStudioPhotos = async (sourceImageFile: File, config: Configuration): Promise<string[]> => {
  try {
    const imagePart = await fileToGenerativePart(sourceImageFile);
    const promptText = buildPrompt(config);

    const textPart = { text: promptText };

    const generationPromises = Array(4).fill(0).map(() => 
      ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
          parts: [imagePart, textPart],
        },
        config: {
          responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
      })
    );

    const responses = await Promise.all(generationPromises);

    const generatedImages: string[] = [];
    responses.forEach((response: GenerateContentResponse) => {
      if (response.candidates && response.candidates.length > 0) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            generatedImages.push(part.inlineData.data);
          }
        }
      }
    });

    if (generatedImages.length === 0) {
      throw new Error("AI tidak menghasilkan gambar. Coba lagi dengan foto atau prompt yang berbeda.");
    }

    return generatedImages;
  } catch (error) {
    console.error("Error generating images with Gemini:", error);
    throw new Error("Gagal menghasilkan gambar. Silakan coba lagi nanti.");
  }
};
