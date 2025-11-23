// criar-rota - Edge Function para criar rotas no AgroSystem
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

interface RotaPayload {
  nome: string;
  vendedor_id: string;
}

console.info('Função criar-rota iniciada');

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

async function criarRota(req: Request) {
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
    const { nome, vendedor_id }: RotaPayload = await req.json();

    // Validar dados obrigatórios
    if (!nome || !nome.trim()) {
      return new Response(
        JSON.stringify({ 
          erro: 'Dados incompletos',
          mensagem: 'Nome da rota é obrigatório' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    if (!vendedor_id) {
      return new Response(
        JSON.stringify({ 
          erro: 'Dados incompletos',
          mensagem: 'Vendedor é obrigatório' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Verificar se o vendedor existe
    const { data: vendedor, error: vendedorError } = await supabase
      .from('vendedores')
      .select('id, nome')
      .eq('id', vendedor_id)
      .single();

    if (vendedorError || !vendedor) {
      return new Response(
        JSON.stringify({ 
          erro: 'Vendedor não encontrado',
          mensagem: 'O vendedor selecionado não existe' 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Inserir rota no banco
    const { data: novaRota, error: insertError } = await supabase
      .from('rotas')
      .insert({
        nome: nome.trim(),
        vendedor_id: vendedor_id
      })
      .select('id, nome, vendedor_id, data_criacao')
      .single();

    if (insertError) {
      console.error('Erro ao inserir rota:', insertError);
      throw insertError;
    }

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        sucesso: true,
        mensagem: 'Rota criada com sucesso',
        rota: {
          id: novaRota.id,
          nome: novaRota.nome,
          vendedor_id: novaRota.vendedor_id,
          vendedor_nome: vendedor.nome,
          data_criacao: novaRota.data_criacao
        }
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201 
      }
    );

  } catch (err) {
    console.error('Erro ao criar rota:', err);
    return new Response(
      JSON.stringify({ 
        erro: 'Erro interno',
        mensagem: (err as Error)?.message ?? 'Erro ao criar rota' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

Deno.serve(criarRota);
