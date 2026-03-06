import { useState, useEffect } from 'react';
import { ArrowLeft, Edit2, Sparkles, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function UserDashboard() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estados para edição
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const user = JSON.parse(storedUser);
      setCurrentUser(user);
      setEditName(user.name || '');
      setEditUsername(user.username || '');
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const handleEditClick = () => {
    setIsEditing(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancelClick = () => {
    setIsEditing(false);
    setError(null);
    setSuccessMessage(null);
    // Restaurar valores originais
    setEditName(currentUser.name);
    setEditUsername(currentUser.username);
  };

  const handleSaveClick = async () => {
    if (!editName.trim()) {
      setError('O nome não pode estar vazio');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {

      // objeto com dados que serão atualizados
      const updateData: any = {
        nome_completo: editName,
        updated_at: new Date().toISOString()
      };

      // Só validar username se ele foi alterado
      if (editUsername && editUsername !== currentUser.username) {

        if (!/^[a-zA-Z0-9_]{3,20}$/.test(editUsername)) {
          setError('Nome de utilizador deve ter entre 3-20 caracteres e conter apenas letras, números e _');
          setIsLoading(false);
          return;
        }

        // verificar se já existe
        const { data: existingUsername } = await supabase
          .from('usuarios_normais')
          .select('nome_utilizador')
          .eq('nome_utilizador', editUsername)
          .neq('id', currentUser.id)
          .maybeSingle();

        if (existingUsername) {
          setError('Este nome de utilizador já está em uso');
          setIsLoading(false);
          return;
        }

        updateData.nome_utilizador = editUsername;
      }

      // atualizar no banco
      const { data: updatedUser, error } = await supabase
        .from('usuarios_normais')
        .update(updateData)
        .eq('id', currentUser.id)
        .select()
        .single();

      if (error) {
        setError('Erro ao atualizar perfil');
        setIsLoading(false);
        return;
      }

      const updatedUserData = {
        ...currentUser,
        name: updatedUser.nome_completo,
        username: updatedUser.nome_utilizador
      };

      setCurrentUser(updatedUserData);
      localStorage.setItem('user', JSON.stringify(updatedUserData));

      setSuccessMessage('Perfil atualizado com sucesso!');
      setIsEditing(false);

    } catch (err) {
      setError('Erro inesperado');
    } finally {
      setIsLoading(false);
    }
  };

  if (!currentUser) return null;

  // Pegar iniciais do nome
  const initials = currentUser.name
    ? currentUser.name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
    : 'U';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => navigate('/events')}
            className="flex items-center gap-2 text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Voltar</span>
          </button>
          <div className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-orange-600" />
            <span className="font-bold text-gray-900">Cresce.AO</span>
          </div>
        </div>
      </header>

      {/* Conteúdo */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Dashboard do Utilizador</h1>
          <p className="text-gray-600 mt-2">Gerir as informações do seu perfil</p>
        </div>

        {/* Mensagens de erro/sucesso */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-600 text-sm">{successMessage}</p>
          </div>
        )}

        {/* Profile Card */}
        <div className="bg-white rounded-xl shadow-md p-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {initials}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{currentUser.username}</h2>
                <p className="text-gray-600">@{currentUser.name}</p>
              </div>
            </div>

            {!isEditing ? (
              <button
                onClick={handleEditClick}
                className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg cursor-pointer hover:bg-orange-700 transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                Editar Perfil
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSaveClick}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg cursor-pointer  hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Salvando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Salvar
                    </>
                  )}
                </button>
                <button
                  onClick={handleCancelClick}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg cursor-pointer  hover:bg-gray-300 transition-colors disabled:opacity-50"
                >
                  <X className="w-4 h-4" />
                  Cancelar
                </button>
              </div>
            )}
          </div>

          <div className="border-t border-gray-200 pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações Pessoais</h3>
            <div className="space-y-4">
              {/* Nome Completo */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome de Utilizador
                </label>
                {isEditing ? (
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900"
                    placeholder="Seu nome completo"
                  />
                ) : (
                  <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                    {currentUser.name}
                  </p>
                )}
              </div>

              {/* Nome de Utilizador */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                {isEditing ? (
                  <div>
                    <div className="flex items-center">
                      <span className="text-gray-500 mr-1">@</span>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value)}
                        className="flex-1 px-4 py-3 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all text-gray-900"
                        placeholder="nomeutilizador"
                      />
                    </div>
                    <p className="text-xs text-gray-500 mt-1.5">
                      3-20 caracteres, apenas letras, números e _
                    </p>
                  </div>
                ) : (
                  <p className="px-4 py-3 bg-gray-50 rounded-lg text-gray-900">
                    @{currentUser.username}
                  </p>
                )}
              </div>

              {/* Email (não editável) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  E-mail
                </label>
                <p className="px-4 py-3 bg-gray-100 rounded-lg text-gray-600">
                  {currentUser.email}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  O e-mail não pode ser alterado
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Additional Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Dica:</strong> Mantenha as suas informações atualizadas para melhorar a sua experiência na plataforma Cresce.AO.
          </p>
        </div>
      </main>
    </div>
  );
}