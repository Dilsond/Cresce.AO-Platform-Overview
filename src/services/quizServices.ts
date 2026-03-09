import { supabase } from '../lib/supabase';
import { generateQuizQuestions, GeneratedQuestion } from '../lib/ia';

interface QuizData {
  evento_id: string;
  titulo: string;
  descricao?: string;
  created_by_usuario?: string;
  created_by_organizador?: string;
}

export async function createQuizWithQuestions(
  quizData: QuizData,
  questions: GeneratedQuestion[]
) {
  try {
    // 1. Criar o quiz
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .insert([quizData])
      .select()
      .single();

    if (quizError) throw quizError;

    // 2. Criar as questões
    const questoesData = questions.map((q, index) => ({
      quiz_id: quiz.id,
      pergunta: q.question,
      opcoes: q.options,
      resposta_correta: q.correctAnswer,
      explicacao: q.explanation,
      ordem: index
    }));

    const { data: questoes, error: questoesError } = await supabase
      .from('questoes_quiz')
      .insert(questoesData)
      .select();

    if (questoesError) throw questoesError;

    return { quiz, questoes };
  } catch (error) {
    console.error('Erro ao criar quiz:', error);
    throw error;
  }
}

export async function getQuizForEvent(evento_id: string) {
  try {
    // Buscar quiz existente
    const { data: quiz, error: quizError } = await supabase
      .from('quizzes')
      .select(`
        *,
        questoes:questoes_quiz(*)
      `)
      .eq('evento_id', evento_id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (quizError && quizError.code !== 'PGRST116') { // PGRST116 = não encontrado
      throw quizError;
    }

    return quiz;
  } catch (error) {
    console.error('Erro ao buscar quiz:', error);
    throw error;
  }
}

export async function saveUserAnswers(
  quiz_id: string,
  questao_id: string,
  resposta_selecionada: number,
  is_correta: boolean,
  usuario_id: string,
  usuario_tipo: 'user' | 'organizer'
) {
  try {
    const insertData: any = {
      quiz_id,
      questao_id,
      resposta_selecionada,
      is_correta
    };

    if (usuario_tipo === 'user') {
      insertData.usuario_normal_id = usuario_id;
    } else {
      insertData.organizador_id = usuario_id;
    }

    const { data, error } = await supabase
      .from('respostas_quiz')
      .insert([insertData])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao salvar resposta:', error);
    throw error;
  }
}

export async function getUserQuizResults(
  quiz_id: string,
  usuario_id: string,
  usuario_tipo: 'user' | 'organizer'
) {
  try {
    let query = supabase
      .from('respostas_quiz')
      .select(`
        *,
        questao:questoes_quiz(*)
      `)
      .eq('quiz_id', quiz_id);

    if (usuario_tipo === 'user') {
      query = query.eq('usuario_normal_id', usuario_id);
    } else {
      query = query.eq('organizador_id', usuario_id);
    }

    const { data, error } = await query;

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Erro ao buscar resultados:', error);
    throw error;
  }
}