import { useState, useRef, useEffect } from 'react';
import { Send, Image as ImageIcon, X, Smile, Camera } from 'lucide-react';
import type { User } from '../App';

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  timestamp: Date;
  images?: string[];
}

interface EventChatProps {
  eventId: string;
  eventName: string;
  currentUser: User | null;
  onClose: () => void;
}

export function EventChat({ eventId, eventName, currentUser, onClose }: EventChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      userId: 'user1',
      userName: 'Maria Costa',
      userAvatar: 'MC',
      message: 'Olá a todos! Mal posso esperar por este evento! 🎉',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
    },
    {
      id: '2',
      userId: 'user2',
      userName: 'João Silva',
      userAvatar: 'JS',
      message: 'Alguém já participou em eventos anteriores do organizador?',
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000),
    },
    {
      id: '3',
      userId: 'user3',
      userName: 'Ana Fernandes',
      userAvatar: 'AF',
      message: 'Sim! O último workshop foi excelente. Muito prático e interativo!',
      timestamp: new Date(Date.now() - 45 * 60 * 1000),
      images: ['https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&auto=format&fit=crop']
    },
  ]);
  
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (!currentUser) {
      alert('Você precisa estar logado para enviar mensagens.');
      return;
    }

    if (newMessage.trim() === '' && selectedImages.length === 0) {
      return;
    }

    const newMsg: ChatMessage = {
      id: Date.now().toString(),
      userId: currentUser.id,
      userName: currentUser.name,
      userAvatar: currentUser.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2),
      message: newMessage,
      timestamp: new Date(),
      images: selectedImages.length > 0 ? [...selectedImages] : undefined,
    };

    setMessages([...messages, newMsg]);
    setNewMessage('');
    setSelectedImages([]);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      const newImages: string[] = [];
      
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          newImages.push(reader.result as string);
          if (newImages.length === files.length) {
            setSelectedImages([...selectedImages, ...newImages]);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(selectedImages.filter((_, i) => i !== index));
  };

  const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    // Menos de 1 minuto
    if (diff < 60000) {
      return 'Agora';
    }
    
    // Menos de 1 hora
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes}m atrás`;
    }
    
    // Menos de 24 horas
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h atrás`;
    }
    
    // Mais de 24 horas
    return date.toLocaleDateString('pt-PT', { 
      day: '2-digit', 
      month: 'short',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full h-[80vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold">Chat do Evento</h2>
            <p className="text-sm text-white/90">{eventName}</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-gray-200 transition-colors p-2"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Messages Area */}
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50"
        >
          {messages.map((msg) => {
            const isCurrentUser = currentUser && msg.userId === currentUser.id;
            
            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isCurrentUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
                  isCurrentUser ? 'bg-orange-600' : 'bg-blue-600'
                }`}>
                  {msg.userAvatar}
                </div>

                {/* Message Bubble */}
                <div className={`flex-1 max-w-[70%] ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                  <div className={`${isCurrentUser ? 'text-right' : 'text-left'} mb-1`}>
                    <span className="text-sm font-semibold text-gray-900">
                      {isCurrentUser ? 'Você' : msg.userName}
                    </span>
                    <span className="text-xs text-gray-500 ml-2">
                      {formatTimestamp(msg.timestamp)}
                    </span>
                  </div>

                  <div className={`rounded-2xl p-3 ${
                    isCurrentUser 
                      ? 'bg-orange-600 text-white rounded-tr-none' 
                      : 'bg-white text-gray-900 rounded-tl-none shadow-sm'
                  }`}>
                    {msg.message && (
                      <p className="whitespace-pre-wrap break-words">{msg.message}</p>
                    )}
                    
                    {/* Images */}
                    {msg.images && msg.images.length > 0 && (
                      <div className={`grid gap-2 ${
                        msg.images.length === 1 ? 'grid-cols-1' : 
                        msg.images.length === 2 ? 'grid-cols-2' : 
                        'grid-cols-2'
                      } ${msg.message ? 'mt-2' : ''}`}>
                        {msg.images.map((img, idx) => (
                          <div key={idx} className="relative rounded-lg overflow-hidden">
                            <img 
                              src={img} 
                              alt={`Imagem ${idx + 1}`}
                              className="w-full h-32 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => window.open(img, '_blank')}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview Area */}
        {selectedImages.length > 0 && (
          <div className="px-4 py-2 bg-gray-100 border-t border-gray-200">
            <div className="flex gap-2 overflow-x-auto">
              {selectedImages.map((img, index) => (
                <div key={index} className="relative flex-shrink-0">
                  <img 
                    src={img} 
                    alt={`Preview ${index + 1}`}
                    className="w-20 h-20 object-cover rounded-lg"
                  />
                  <button
                    onClick={() => removeImage(index)}
                    className="absolute -top-2 -right-2 bg-red-600 text-white rounded-full p-1 hover:bg-red-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-gray-200">
          {!currentUser ? (
            <div className="text-center py-4">
              <p className="text-gray-600">Faça login para participar do chat</p>
            </div>
          ) : (
            <div className="flex gap-2">
              {/* Image Upload Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleImageUpload}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 transition-colors flex-shrink-0"
                title="Adicionar imagem"
              >
                <ImageIcon className="w-5 h-5" />
              </button>

              {/* Message Input */}
              <div className="flex-1 relative">
                <textarea
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Escreva uma mensagem..."
                  className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-600 resize-none"
                  rows={1}
                  style={{ minHeight: '48px', maxHeight: '120px' }}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendMessage}
                disabled={newMessage.trim() === '' && selectedImages.length === 0}
                className={`p-3 rounded-lg flex-shrink-0 transition-colors ${
                  newMessage.trim() === '' && selectedImages.length === 0
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-orange-600 text-white hover:bg-orange-700'
                }`}
                title="Enviar mensagem"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>

        {/* Info Footer */}
        <div className="px-4 py-2 bg-gray-50 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            💡 Partilhe as suas experiências, fotografias e interaja com outros participantes
          </p>
        </div>
      </div>
    </div>
  );
}
