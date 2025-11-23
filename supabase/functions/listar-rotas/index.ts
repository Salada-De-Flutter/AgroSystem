// listar-rotas - Edge Function para listar rotas no AgroSystem
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

console.info('Função listar-rotas iniciada');

// Headers CORS
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

async function listarRotas(req: Request) {
  // Tratar requisição OPTIONS (preflight CORS)
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Verificar método HTTP
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({ 
        erro: 'Método não permitido',
        mensagem: 'Use o método GET'
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

    // Buscar todas as rotas com informações do vendedor
    const { data: rotas, error: selectError } = await supabase
      .from('rotas')
      .select(`
        id,
        nome,
        data_criacao,
        data_termino,
        vendedor:vendedores(id, nome)
      `)
      .order('data_criacao', { ascending: false });

    if (selectError) {
      console.error('Erro ao buscar rotas:', selectError);
      throw selectError;
    }

    // Formatar resposta
    const rotasFormatadas = (rotas || []).map(rota => ({
      id: rota.id,
      nome: rota.nome,
      data_criacao: rota.data_criacao,
      data_termino: rota.data_termino,
      status: rota.data_termino ? 'Concluída' : 'Ativa',
      vendedor_id: rota.vendedor?.id,
      vendedor_nome: rota.vendedor?.nome
    }));

    // Retornar sucesso
    return new Response(
      JSON.stringify({
        sucesso: true,
        rotas: rotasFormatadas
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (err) {
    console.error('Erro ao listar rotas:', err);
    return new Response(
      JSON.stringify({ 
        erro: 'Erro interno',
        mensagem: (err as Error)?.message ?? 'Erro ao buscar rotas' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
}

Deno.serve(listarRotas);
