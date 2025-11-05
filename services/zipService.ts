
import { GeneratedImage, Configuration } from '../types';

declare const JSZip: any;

export const createZipAndDownload = async (images: GeneratedImage[], config: Configuration): Promise<void> => {
  const zip = new JSZip();
  const timestamp = new Date().getTime();

  images.forEach(image => {
    zip.file(image.fileName, image.base64, { base64: true });
  });

  const metadata = {
    ...config,
    generationTimestamp: new Date().toISOString(),
  };
  zip.file("metadata.json", JSON.stringify(metadata, null, 2));

  const content = await zip.generateAsync({ type: "blob" });
  
  const link = document.createElement("a");
  link.href = URL.createObjectURL(content);
  link.download = `ano_photo_studio_${timestamp}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
