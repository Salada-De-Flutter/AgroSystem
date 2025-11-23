// login - Edge Function para autenticação de usuários no AgroSystem
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface LoginPayload {
  email: string;
  senha: string;
}

// Função para criar hash da senha usando Web Crypto API (mesma do cadastro)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

// Função para gerar token JWT simples (você pode melhorar isso depois)
async function generateToken(userId: string): Promise<string> {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const payload = btoa(JSON.stringify({ 
    userId, 
    exp: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 dias
  }));
  const signature = btoa(`${header}.${payload}.${Deno.env.get('JWT_SECRET') ?? 'secret'}`);
  return `${header}.${payload}.${signature}`;
}

console.info('Função de login iniciada');

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function fazerLogin(req: Request) {
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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    // Pegar dados do body
    const { email, senha }: LoginPayload = await req.json();

    // Validar dados obrigatórios
    if (!email || !senha) {
      return new Response(
        JSON.stringify({ 
          erro: 'Dados incompletos',
          mensagem: 'Email e senha são obrigatórios' 
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

    // Hash da senha para comparar
    const senhaHash = await hashPassword(senha);

    // Buscar usuário no banco
    const { data: usuario, error: selectError } = await supabase
      .from('usuarios')
      .select('id, nome, email, criado_em')
      .eq('email', email)
      .eq('senha_hash', senhaHash)
      .single();

    if (selectError || !usuario) {
      return new Response(
        JSON.stringify({ 
          erro: 'Credenciais inválidas',
          mensagem: 'Email ou senha incorretos' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 401 
        }
      );
    }

    // Gerar token
    const token = await generateToken(usuario.id);

    // Retornar sucesso com dados do usuário e token
    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Login realizado com sucesso',
        token: token,
        usuario: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          criado_em: usuario.criado_em
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
        status: 200 
      }
    );

  } catch (err) {
    console.error('Erro no login:', err);
    return new Response(
      JSON.stringify({ 
        erro: 'Erro interno',
        mensagem: (err as Error)?.message ?? 'Erro ao processar login' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

Deno.serve(fazerLogin);
