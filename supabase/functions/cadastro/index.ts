// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
}

console.info('Register function started');

Deno.serve(async (req: Request) => {
  // Verificar método HTTP
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
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
    const { email, password, name }: RegisterPayload = await req.json();

    // Validar dados obrigatórios
    if (!email || !password || !name) {
      return new Response(
        JSON.stringify({ 
          error: 'Dados incompletos',
          message: 'Email, senha e nome são obrigatórios' 
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
          error: 'Email inválido',
          message: 'Por favor, forneça um email válido' 
        }),
        { 
          headers: { 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Validar tamanho da senha
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ 
          error: 'Senha muito curta',
          message: 'A senha deve ter pelo menos 6 caracteres' 
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
      password,
      email_confirm: true, // Confirmar email automaticamente (ou false se quiser enviar email de confirmação)
      user_metadata: {
        name: name
      }
    });

    if (authError) {
      console.error('Erro ao criar usuário:', authError);
      
      // Tratar erro de email duplicado
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({ 
            error: 'Email já cadastrado',
            message: 'Este email já está registrado no sistema' 
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
        name: name
      });

    if (profileError) {
      console.error('Erro ao criar perfil:', profileError);
      // Não falhar o registro se o perfil não for criado
      // O trigger pode criar automaticamente
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Usuário cadastrado com sucesso',
        user: {
          id: authData.user.id,
          email: authData.user.email,
          name: name
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
        error: 'Erro interno',
        message: err?.message ?? 'Erro ao processar cadastro' 
      }),
      { 
        headers: { 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
