// cadastrarUsuario - Edge Function para cadastro de usuários no AgroSystem
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface CadastroPayload {
  email: string;
  senha: string;
  nome: string;
}

// Função para criar hash da senha usando Web Crypto API
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

console.info('Função de cadastro iniciada');

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function cadastrarUsuario(req: Request) {
  // Tratar requisição OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verificar método HTTP
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        erro: 'Método não permitido',
        mensagem: 'Use o método POST'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 405 
      }
    );
  }

  try {
    // Criar cliente Supabase
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Usar service role para criar usuário
    );

    // Pegar dados do body
    const { email, senha, nome }: CadastroPayload = await req.json();

    // Validar dados obrigatórios
    if (!email || !senha || !nome) {
      return new Response(
        JSON.stringify({ 
          erro: 'Dados incompletos',
          mensagem: 'Email, senha e nome são obrigatórios' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Validar formato do email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          erro: 'Email inválido',
          mensagem: 'Por favor, forneça um email válido' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Validar tamanho da senha
    if (senha.length < 6) {
      return new Response(
        JSON.stringify({ 
          erro: 'Senha muito curta',
          mensagem: 'A senha deve ter pelo menos 6 caracteres' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verificar se o email já existe
    const { data: existingUser } = await supabase
      .from('usuarios')
      .select('id')
      .eq('email', email)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ 
          erro: 'Email já cadastrado',
          mensagem: 'Este email já está registrado no sistema' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409 
        }
      );
    }

    // Hash da senha usando SHA-256
    const senhaHash = await hashPassword(senha);

    // Inserir usuário na tabela usuarios
    const { data: novoUsuario, error: insertError } = await supabase
      .from('usuarios')
      .insert({
        nome: nome,
        email: email,
        senha_hash: senhaHash
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir usuário:', insertError);
      throw insertError;
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Usuário cadastrado com sucesso',
        usuario: {
          id: novoUsuario.id,
          email: novoUsuario.email,
          nome: novoUsuario.nome,
          criado_em: novoUsuario.criado_em
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
        status: 201 
      }
    );

  } catch (err) {
    console.error('Erro no registro:', err);
    return new Response(
      JSON.stringify({ 
        erro: 'Erro interno',
        mensagem: (err as Error)?.message ?? 'Erro ao processar cadastro' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

Deno.serve(cadastrarUsuario);
