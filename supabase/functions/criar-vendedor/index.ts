// criar-vendedor - Edge Function para cadastrar vendedores no AgroSystem
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface VendedorPayload {
  nome: string;
}

console.info('Função criar-vendedor iniciada');

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function criarVendedor(req: Request) {
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
    const { nome }: VendedorPayload = await req.json();

    // Validar dados obrigatórios
    if (!nome || !nome.trim()) {
      return new Response(
        JSON.stringify({ 
          erro: 'Dados incompletos',
          mensagem: 'Nome é obrigatório' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verificar se já existe um vendedor com esse nome
    const { data: vendedorExistente } = await supabase
      .from('vendedores')
      .select('id')
      .ilike('nome', nome.trim())
      .single();

    if (vendedorExistente) {
      return new Response(
        JSON.stringify({ 
          erro: 'Vendedor já existe',
          mensagem: 'Já existe um vendedor cadastrado com este nome' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409 
        }
      );
    }

    // Inserir vendedor no banco
    const { data: novoVendedor, error: insertError } = await supabase
      .from('vendedores')
      .insert({
        nome: nome.trim()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Erro ao inserir vendedor:', insertError);
      throw insertError;
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Vendedor cadastrado com sucesso',
        vendedor: {
          id: novoVendedor.id,
          nome: novoVendedor.nome
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    );

  } catch (err) {
    console.error('Erro ao cadastrar vendedor:', err);
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

Deno.serve(criarVendedor);
