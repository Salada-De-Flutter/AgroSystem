// cadastrarUsuario - Edge Function para cadastro de usuários no AgroSystem
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface CadastroPayload {
  email: string;
  senha: string;
  nome: string;
}

console.info('Função de cadastro iniciada');

async function cadastrarUsuario(req: Request) {
  // Verificar método HTTP
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ 
        erro: 'Método não permitido',
        mensagem: 'Use o método POST'
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
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
          headers: { 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Criar usuário com Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password: senha,
      email_confirm: true, // Confirmar email automaticamente (ou false se quiser enviar email de confirmação)
      user_metadata: {
        name: nome
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      
      // Tratar erro de email duplicado
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ 
            erro: 'Email já cadastrado',
            mensagem: 'Este email já está registrado no sistema' 
          }),
          { 
            headers: { 'Content-Type': 'application/json' },
            status: 409 
          }
        );
      }

      throw authError;
    }

    // Criar perfil do usuário na tabela profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: authData.user.id,
        name: nome
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Não falhar o registro se o perfil não for criado
      // O trigger pode criar automaticamente
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Usuário cadastrado com sucesso',
        usuario: {
          id: authData.user.id,
          email: authData.user.email,
          nome: nome
        }
      }),
      { 
        headers: { 'Content-Type': 'application/json', 'Connection': 'keep-alive' },
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
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

Deno.serve(cadastrarUsuario);
