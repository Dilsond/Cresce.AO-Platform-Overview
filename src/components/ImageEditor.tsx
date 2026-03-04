import { useState, useRef, useEffect } from 'react';
import { RotateCw, ZoomIn, ZoomOut, Sliders, X, Check } from 'lucide-react';

interface ImageEditorProps {
  image: string;
  onSave: (editedImage: string) => void;
  onCancel: () => void;
}

export function ImageEditor({ image, onSave, onCancel }: ImageEditorProps) {
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [saturate, setSaturate] = useState(100);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);

  const applyFilters = () => {
    if (!image || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      originalImageRef.current = img;

      // Calculate canvas size based on rotation
      const isRotated90or270 = rotation % 180 !== 0;
      const canvasWidth = isRotated90or270 ? img.height : img.width;
      const canvasHeight = isRotated90or270 ? img.width : img.height;
      
      canvas.width = canvasWidth * zoom;
      canvas.height = canvasHeight * zoom;

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply transformations
      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate((rotation * Math.PI) / 180);
      ctx.scale(zoom, zoom);
      ctx.filter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturate}%)`;
      ctx.drawImage(img, -img.width / 2, -img.height / 2, img.width, img.height);
      ctx.restore();
    };
    img.src = image;
  };

  useEffect(() => {
    if (image) {
      applyFilters();
    }
  }, [image, rotation, zoom, brightness, contrast, saturate]);

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.1, 3));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.1, 0.5));
  };

  const resetEdits = () => {
    setRotation(0);
    setZoom(1);
    setBrightness(100);
    setContrast(100);
    setSaturate(100);
  };

  const handleSave = () => {
    if (!canvasRef.current) return;
    const editedImage = canvasRef.current.toDataURL('image/jpeg', 0.9);
    onSave(editedImage);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold text-gray-900">Editar Imagem</h3>
          <button
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 grid lg:grid-cols-2 gap-6">
          {/* Left: Image Preview */}
          <div className="space-y-4">
            <div className="bg-gray-100 rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
              <canvas
                ref={canvasRef}
                className="max-w-full max-h-[500px] object-contain"
              />
            </div>

            {/* Edit Controls */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Sliders className="w-5 h-5" />
                Ferramentas de Edição
              </h4>

              {/* Rotation and Zoom */}
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRotate}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  <RotateCw className="w-4 h-4" />
                  Rodar
                </button>
                <button
                  onClick={handleZoomOut}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-sm font-medium text-gray-700">{Math.round(zoom * 100)}%</span>
                <button
                  onClick={handleZoomIn}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
              </div>

              {/* Brightness */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Brilho: {brightness}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Contrast */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraste: {contrast}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={contrast}
                  onChange={(e) => setContrast(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Saturation */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saturação: {saturate}%
                </label>
                <input
                  type="range"
                  min="0"
                  max="200"
                  value={saturate}
                  onChange={(e) => setSaturate(Number(e.target.value))}
                  className="w-full"
                />
              </div>

              {/* Reset Button */}
              <button
                onClick={resetEdits}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-medium"
              >
                Resetar Edições
              </button>
            </div>
          </div>

          {/* Right: Tips and Actions */}
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 mb-2">💡 Dicas de edição:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Use a rotação para alinhar a imagem</li>
                <li>• Ajuste o zoom para destacar detalhes</li>
                <li>• Brilho e contraste melhoram a claridade</li>
                <li>• Saturação realça as cores da imagem</li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleSave}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-orange-600 to-red-600 text-white rounded-lg hover:from-orange-700 hover:to-red-700 transition-all font-semibold text-lg shadow-lg"
              >
                <Check className="w-5 h-5" />
                Salvar Edições
              </button>
              <button
                onClick={onCancel}
                className="w-full px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
