
export type AspectRatio = '1:1' | '4:5' | '9:16';

export interface Configuration {
  poseStyle: string;
  backgroundStyle: string;
  aspectRatio: AspectRatio;
  extraInstructions: string;
  removeWatermark: boolean;
}

export interface GeneratedImage {
  base64: string;
  fileName: string;
}

export interface GenerationError {
  message: string;
}
