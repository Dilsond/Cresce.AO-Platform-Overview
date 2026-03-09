import { Sparkles } from 'lucide-react';

interface QuizLoadingProps {
  message?: string;
}

export function QuizLoading({ message = "Gerando perguntas personalizadas com IA..." }: QuizLoadingProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
        <div className="relative">
          <div className="w-24 h-24 mx-auto mb-6 relative">
            <div className="absolute inset-0 rounded-full border-4 border-orange-200"></div>
            <div className="absolute inset-0 rounded-full border-4 border-orange-600 border-t-transparent animate-spin"></div>
            <Sparkles className="absolute inset-0 m-auto w-10 h-10 text-orange-600 animate-pulse" />
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            Preparando Quiz
          </h3>
          
          <p className="text-gray-600 mb-4">
            {message}
          </p>
          
          <div className="space-y-2">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-orange-600 rounded-full animate-pulse" style={{ width: '60%' }}></div>
            </div>
            <p className="text-xs text-gray-500">
              Isso pode levar alguns segundos...
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}