import React, { useState, useCallback, useMemo } from 'react';
import { Configuration, AspectRatio, GeneratedImage, GenerationError } from './types';
import { POSE_OPTIONS, BACKGROUND_OPTIONS, ASPECT_RATIO_OPTIONS, SYSTEM_PROMPT_TEMPLATE } from './constants';
import { generateStudioPhotos } from './services/geminiService';
import { createZipAndDownload } from './services/zipService';
import Icon from './components/Icon';

// Helper component: ImageUploader
interface ImageUploaderProps {
  onImageUpload: (file: File) => void;
  sourceImageUrl: string | null;
  error: string | null;
  clearImage: () => void;
}
const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageUpload, sourceImageUrl, error, clearImage }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onImageUpload(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onImageUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragEvents = (e: React.DragEvent<HTMLDivElement>, enter: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(enter);
  };

  return (
    <div className="bg-card-bg p-6 rounded-2xl shadow-sm flex flex-col h-full">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Foto Subjek</h2>
      <div 
        className={`relative flex-grow border-2 border-dashed rounded-2xl transition-colors duration-200 flex items-center justify-center text-center ${isDragging ? 'border-primary bg-teal-50' : 'border-border-color'}`}
        onDrop={handleDrop}
        onDragOver={(e) => handleDragEvents(e, true)}
        onDragEnter={(e) => handleDragEvents(e, true)}
        onDragLeave={(e) => handleDragEvents(e, false)}
      >
        <input type="file" id="file-upload" className="hidden" accept="image/png, image/jpeg" onChange={handleFileChange} />
        {sourceImageUrl ? (
          <>
            <img src={sourceImageUrl} alt="Pratinjau subjek" className="max-h-full max-w-full object-contain rounded-xl" />
            <button onClick={clearImage} className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors">
              <Icon name="x-circle" className="w-6 h-6" />
            </button>
          </>
        ) : (
          <label htmlFor="file-upload" className="cursor-pointer p-8">
            <Icon name="upload" className="w-12 h-12 text-text-secondary mx-auto mb-2" />
            <p className="text-text-secondary">Klik untuk mengunggah atau seret & lepas</p>
            <p className="text-sm text-slate-400 mt-1">PNG atau JPG (Min 512px, maks 10MB)</p>
          </label>
        )}
      </div>
       {error && <p className="text-red-500 text-sm mt-2">{error}</p>}
    </div>
  );
};


// Helper component: ConfigurationPanel
interface ConfigurationPanelProps {
  config: Configuration;
  onConfigChange: <K extends keyof Configuration>(key: K, value: Configuration[K]) => void;
  onGenerate: () => void;
  isGenerating: boolean;
  isSourceImage: boolean;
}
const ConfigurationPanel: React.FC<ConfigurationPanelProps> = ({ config, onConfigChange, onGenerate, isGenerating, isSourceImage }) => {
  return (
    <div className="bg-card-bg p-6 rounded-2xl shadow-sm">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Konfigurasi Gaya</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="pose-style" className="block text-sm font-medium text-text-secondary mb-1">Gaya Pose</label>
          <select id="pose-style" value={config.poseStyle} onChange={(e) => onConfigChange('poseStyle', e.target.value)} className="w-full bg-white border border-border-color text-text-primary rounded-xl p-2 focus:ring-2 focus:ring-primary focus:border-primary">
            {POSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="background-style" className="block text-sm font-medium text-text-secondary mb-1">Gaya Latar</label>
          <select id="background-style" value={config.backgroundStyle} onChange={(e) => onConfigChange('backgroundStyle', e.target.value)} className="w-full bg-white border border-border-color text-text-primary rounded-xl p-2 focus:ring-2 focus:ring-primary focus:border-primary">
            {BACKGROUND_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
          </select>
        </div>
      </div>
      <div className="mt-4">
        <label className="block text-sm font-medium text-text-secondary mb-1">Rasio Aspek</label>
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {ASPECT_RATIO_OPTIONS.map(ratio => (
            <button key={ratio} onClick={() => onConfigChange('aspectRatio', ratio)} className={`flex-1 text-center py-1.5 rounded-lg text-sm transition-colors ${config.aspectRatio === ratio ? 'bg-white text-primary font-semibold shadow-sm' : 'text-text-secondary hover:bg-slate-200'}`}>
              {ratio}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <label htmlFor="extra-instructions" className="block text-sm font-medium text-text-secondary mb-1">Instruksi Tambahan (Opsional)</label>
        <textarea id="extra-instructions" rows={2} value={config.extraInstructions} onChange={(e) => onConfigChange('extraInstructions', e.target.value)} placeholder="Contoh: Gunakan pencahayaan dramatis lembut" className="w-full bg-white border border-border-color text-text-primary rounded-xl p-2 focus:ring-2 focus:ring-primary focus:border-primary"></textarea>
      </div>
      <div className="mt-6">
        <button onClick={onGenerate} disabled={isGenerating || !isSourceImage} className="w-full bg-primary text-white font-semibold py-3 rounded-xl flex items-center justify-center transition-colors hover:bg-primary-hover disabled:bg-muted-color disabled:cursor-not-allowed">
          {isGenerating ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
              Sedang menyulap fotomu...
            </>
          ) : (
            <>
              <Icon name="sparkles" className="w-5 h-5 mr-2" />
              Generate Foto
            </>
          )}
        </button>
      </div>
    </div>
  );
};


// Helper component: ResultPanel
interface ResultPanelProps {
  images: GeneratedImage[];
  isLoading: boolean;
  onDownloadAll: () => void;
  isDownloading: boolean;
  config: Configuration;
  onConfigChange: <K extends keyof Configuration>(key: K, value: Configuration[K]) => void;
}
const ResultPanel: React.FC<ResultPanelProps> = ({ images, isLoading, onDownloadAll, isDownloading, config, onConfigChange }) => {
  const handleUpscale = () => {
      alert("Fitur upscale resolusi akan segera hadir!");
  };

  return (
    <div className="bg-card-bg p-6 rounded-2xl shadow-sm flex flex-col h-full">
      <h2 className="text-lg font-semibold text-text-primary mb-4">Hasil Foto</h2>
      <div className="flex-grow grid grid-cols-1 sm:grid-cols-2 gap-4 min-h-[200px]">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-slate-200 rounded-2xl animate-pulse aspect-[4/5]"></div>
          ))
        ) : images.length > 0 ? (
          images.map((img, i) => (
            <div key={i} className="group relative rounded-2xl overflow-hidden aspect-[4/5] bg-slate-100">
              <img src={`data:image/png;base64,${img.base64}`} alt={`Hasil foto studio profesional ${i + 1}`} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-2">
                <button onClick={handleUpscale} className="bg-white/90 text-text-primary text-xs font-semibold py-1 px-2 rounded-md hover:bg-white">Upscale 2x/4x</button>
              </div>
            </div>
          ))
        ) : (
          <div className="sm:col-span-2 flex flex-col items-center justify-center text-center bg-slate-50 rounded-2xl p-8">
            <Icon name="image" className="w-12 h-12 text-text-secondary mb-2" />
            <p className="text-text-secondary">Hasil generasimu akan muncul di sini</p>
          </div>
        )}
      </div>
      {images.length > 0 && (
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <label className="flex items-center cursor-pointer select-none">
            <div className="relative">
              <input type="checkbox" checked={!config.removeWatermark} onChange={(e) => onConfigChange('removeWatermark', !e.target.checked)} className="sr-only" />
              <div className={`box block h-6 w-10 rounded-full ${!config.removeWatermark ? 'bg-primary' : 'bg-muted-color'}`}></div>
              <div className={`dot absolute left-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-white transition ${!config.removeWatermark ? 'translate-x-full' : ''}`}></div>
            </div>
            <div className="ml-3 text-sm text-text-secondary font-medium">Watermark "AnoTechHub"</div>
          </label>
          <button onClick={onDownloadAll} disabled={isDownloading} className="w-full sm:w-auto bg-slate-700 text-white font-semibold py-2 px-6 rounded-xl flex items-center justify-center transition-colors hover:bg-slate-800 disabled:bg-muted-color">
            {isDownloading ? 'Menyiapkan...' : (
              <>
                <Icon name="download" className="w-5 h-5 mr-2" />
                Unduh Semua (ZIP)
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};


// Main App Component
const App: React.FC = () => {
  const [sourceImageFile, setSourceImageFile] = useState<File | null>(null);
  const [sourceImageUrl, setSourceImageUrl] = useState<string | null>(null);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [config, setConfig] = useState<Configuration>({
    poseStyle: POSE_OPTIONS[0],
    backgroundStyle: BACKGROUND_OPTIONS[0],
    aspectRatio: '4:5',
    extraInstructions: '',
    removeWatermark: false,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfigChange = useCallback(<K extends keyof Configuration>(key: K, value: Configuration[K]) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    setError(null);
    if (file.size > 10 * 1024 * 1024) {
      setError("Ukuran file maksimal 10MB.");
      return;
    }
    const img = new Image();
    img.onload = () => {
      if (img.width < 512 || img.height < 512) {
        setError("Dimensi gambar minimal 512x512 piksel.");
        return;
      }
      setSourceImageFile(file);
      setSourceImageUrl(URL.createObjectURL(file));
    };
    img.onerror = () => {
        setError("File gambar tidak valid.");
    };
    img.src = URL.createObjectURL(file);
  }, []);

  const clearSourceImage = useCallback(() => {
      setSourceImageFile(null);
      setSourceImageUrl(null);
  }, []);

  const handleGenerate = async () => {
    if (!sourceImageFile) {
      setError("Silakan unggah foto subjek terlebih dahulu.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImages([]);

    try {
      const imageBases64 = await generateStudioPhotos(sourceImageFile, config);
      const timestamp = new Date().getTime();
      const newImages: GeneratedImage[] = imageBases64.map((base64, index) => ({
        base64,
        fileName: `ano_photo_${timestamp}_v${index + 1}.png`,
      }));
      setGeneratedImages(newImages);
    } catch (err) {
      const generationError = err as GenerationError;
      setError(generationError.message || "Oops, coba ulangi atau unggah foto lain.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadAll = async () => {
      if(generatedImages.length === 0) return;
      setIsDownloading(true);
      try {
        await createZipAndDownload(generatedImages, config);
      } catch (err) {
        setError("Gagal membuat file ZIP.");
      } finally {
        setIsDownloading(false);
      }
  };

  const filledSystemPrompt = useMemo(() => {
    let prompt = SYSTEM_PROMPT_TEMPLATE;
    prompt = prompt.replace('{{pose_style}}', config.poseStyle);
    prompt = prompt.replace('{{background_style}}', config.backgroundStyle);
    prompt = prompt.replace(/\{\{aspect_ratio\}\}/g, config.aspectRatio);
    prompt = prompt.replace('{{extra_instructions}}', config.extraInstructions || 'Tidak ada instruksi tambahan.');
    prompt = prompt.replace('{{remove_watermark}}', String(config.removeWatermark));
    return prompt;
  }, [config]);

  return (
    <div className="min-h-screen text-text-primary p-4 sm:p-6 lg:p-8">
      <header className="bg-sky-50 text-center mb-8 p-8 rounded-2xl">
        <h1 className="text-4xl sm:text-5xl font-bold bg-gradient-to-r from-emerald-500 to-cyan-500 bg-clip-text text-transparent pb-2">Ano Photo Studio</h1>
        <p className="mt-2 text-lg text-slate-700 max-w-3xl mx-auto">
          Ubah foto Anda menjadi sesi foto studio profesional. Unggah foto, pilih gaya pose dan latar belakang, dan biarkan AI kami menyulapnya.
        </p>
      </header>
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-6">
          <ImageUploader onImageUpload={handleImageUpload} sourceImageUrl={sourceImageUrl} error={error} clearImage={clearSourceImage} />
          <ConfigurationPanel config={config} onConfigChange={handleConfigChange} onGenerate={handleGenerate} isGenerating={isLoading} isSourceImage={!!sourceImageFile} />
        </div>
        <div className="lg:col-span-3">
          <ResultPanel images={generatedImages} isLoading={isLoading} onDownloadAll={handleDownloadAll} isDownloading={isDownloading} config={config} onConfigChange={handleConfigChange} />
        </div>
      </main>
      <footer className="max-w-7xl mx-auto mt-6">
          <details className="bg-card-bg rounded-2xl shadow-sm">
            <summary className="p-4 cursor-pointer text-text-primary font-semibold flex justify-between items-center">
              System Prompt Editor
              <Icon name="chevron-down" className="w-5 h-5 transition-transform details-open:rotate-180" />
            </summary>
            <div className="p-4 border-t border-border-color">
              <pre className="text-xs bg-slate-100 text-slate-600 p-4 rounded-xl whitespace-pre-wrap font-mono">{filledSystemPrompt}</pre>
            </div>
          </details>
      </footer>
    </div>
  );
};

export default App;

// Simple CSS to handle details[open] summary icon rotation
const style = document.createElement('style');
style.innerHTML = `
  details[open] > summary .details-open\\:rotate-180 {
    transform: rotate(180deg);
  }
`;
document.head.appendChild(style);