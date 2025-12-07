import { Ionicons } from '@expo/vector-icons';
import { File, Paths } from 'expo-file-system';
import * as Print from 'expo-print';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Parcela {
  id?: string;
  parcelamento_id?: string;
  valor: number;
  dataVencimento: string;
}

interface ClienteData {
  nomeCliente: string;
  clienteId?: string;
  parcelamentoId?: string;
  // optional celular/phone for contact (may be absent from API responses)
  celular?: string;
  status: string;
  parcelasVencidas: {
    quantidade: number;
    valor: number;
    parcelas: Parcela[];
  };
  parcelasPagas: {
    quantidade: number;
    valor: number;
    parcelas: Parcela[];
  };
  parcelasAVencer: {
    quantidade: number;
    valor: number;
    parcelas: Parcela[];
  };
}

interface ClienteProcessado extends ClienteData {
  expandido: boolean;
}

type FiltroStatus = 'todos' | 'pago' | 'a_vencer' | 'vencido';

export default function RotaDetalhesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // params pode retornar string ou array, pegamos o primeiro valor
  const rotaId = Array.isArray(params.id) ? params.id[0] : params.id;
  const rotaNome = (Array.isArray(params.nome) ? params.nome[0] : params.nome) || 'Rota';
  const vendedorNome = (Array.isArray(params.vendedor) ? params.vendedor[0] : params.vendedor) || 'Vendedor';

  console.log('[DEBUG] [rota-detalhes] Params recebidos:', params);
  console.log('[DEBUG] [rota-detalhes] rotaId extraído:', rotaId);
  console.log('[DEBUG] [rota-detalhes] rotaNome extraído:', rotaNome);
  console.log('[DEBUG] [rota-detalhes] vendedorNome extraído:', vendedorNome);

  const [clientes, setClientes] = useState<ClienteProcessado[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<ClienteProcessado[]>([]);
  const [searchText, setSearchText] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<FiltroStatus>('todos');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  
  // Estatísticas - Quantidade de CLIENTES por status
  const [totalEmDia, setTotalEmDia] = useState(0);
  const [totalInadimplente, setTotalInadimplente] = useState(0);
  const [totalAVencer, setTotalAVencer] = useState(0);
  
  // Valores financeiros
  const [valorRecebido, setValorRecebido] = useState(0);
  const [valorVencido, setValorVencido] = useState(0);
  const [valorAVencer, setValorAVencer] = useState(0);
  const [taxaInadimplencia, setTaxaInadimplencia] = useState(0);
  
  // Estados para modais
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [clienteParaRemover, setClienteParaRemover] = useState<ClienteProcessado | null>(null);
  const [removendo, setRemovendo] = useState(false);
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const [showRelatorioModal, setShowRelatorioModal] = useState(false);
  const [vendedorDaRota, setVendedorDaRota] = useState<string>(vendedorNome);

  useEffect(() => {
    if (rotaId) {
      carregarVendas();
      // Se vendedor não foi passado nos params, buscar da API
      if (vendedorNome === 'Vendedor') {
        buscarDadosRota();
      }
    } else {
      console.error('[ERROR] [rota-detalhes] rotaId não foi fornecido!');
      setErrorMessage('ID da rota não encontrado');
      setLoading(false);
    }
  }, [rotaId]);

  // Recarregar quando a tela ganhar foco (voltando da tela de adicionar cliente)
  useFocusEffect(
    useCallback(() => {
      if (rotaId) {
        carregarVendas();
      }
    }, [rotaId])
  );


  const carregarDadosTeste = () => {
    console.log('[TEST] Carregando dados de teste...');
    
    // Dados fictícios para teste
    const clientesTeste: ClienteProcessado[] = [
      {
        nomeCliente: 'Cliente Pago',
        clienteId: 'cliente-1',
        parcelamentoId: 'parc-1',
        status: 'Em Dia',
        expandido: false,
        parcelasPagas: {
          quantidade: 1,
          valor: 8000.00,
          parcelas: [
            { valor: 8000.00, dataVencimento: '2025-01-15' }
          ]
        },
        parcelasVencidas: {
          quantidade: 0,
          valor: 0,
          parcelas: []
        },
        parcelasAVencer: {
          quantidade: 1,
          valor: 5000.00,
          parcelas: [
            { valor: 5000.00, dataVencimento: '2026-01-15' }
          ]
        }
      },
      {
        nomeCliente: 'Cliente Inadimplente',
        clienteId: 'cliente-2',
        parcelamentoId: 'parc-2',
        status: 'Inadimplente',
        expandido: false,
        parcelasPagas: {
          quantidade: 0,
          valor: 0,
          parcelas: []
        },
        parcelasVencidas: {
          quantidade: 1,
          valor: 15000.00,
          parcelas: [
            { valor: 15000.00, dataVencimento: '2025-02-10' }
          ]
        },
        parcelasAVencer: {
          quantidade: 0,
          valor: 0,
          parcelas: []
        }
      }
    ];

    // Calcular estatísticas
    let emDia = 0, inadimplente = 0, aVencer = 0;
    let valRecebido = 0, valVencido = 0, valAVencer = 0;
    
    clientesTeste.forEach(cliente => {
      valRecebido += cliente.parcelasPagas.valor;
      valVencido += cliente.parcelasVencidas.valor;
      valAVencer += cliente.parcelasAVencer.valor;
      
      if (cliente.parcelasVencidas.quantidade > 0) {
        inadimplente++;
      } else if (cliente.parcelasAVencer.quantidade > 0) {
        aVencer++;
      } else if (cliente.parcelasPagas.quantidade > 0) {
        emDia++;
      }
    });

  // Taxa de inadimplência = valor vencido / (valor recebido + valor vencido) * 100
  const totalBase = valRecebido + valVencido;
  const taxaInad = totalBase > 0 ? (valVencido / totalBase) * 100 : 0;

    setTotalEmDia(emDia);
    setTotalInadimplente(inadimplente);
    setTotalAVencer(aVencer);
    setValorRecebido(valRecebido);
    setValorVencido(valVencido);
    setValorAVencer(valAVencer);
    setTaxaInadimplencia(taxaInad);
    setClientes(clientesTeste);
    setClientesFiltrados(clientesTeste);
    setLoading(false);
    
    console.log('[TEST] Dados de teste carregados:', clientesTeste.length, 'clientes');
  };

  const buscarDadosRota = async () => {
    try {
      console.log('[INFO] [rota-detalhes] Buscando dados da rota...');
      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/listar-rotas');
      const data = await response.json();

      if (response.ok && data.sucesso && Array.isArray(data.rotas)) {
        const rotaEncontrada = data.rotas.find((r: any) => r.id === rotaId);
        if (rotaEncontrada && rotaEncontrada.vendedor_nome) {
          console.log('[SUCCESS] [rota-detalhes] Vendedor encontrado:', rotaEncontrada.vendedor_nome);
          setVendedorDaRota(rotaEncontrada.vendedor_nome);
        }
      }
    } catch (error) {
      console.error('[ERROR] [rota-detalhes] Erro ao buscar dados da rota:', error);
    }
  };


  const carregarVendas = async () => {
    console.log(`[LOAD] [rota-detalhes] Carregando vendas da rota ${rotaId}...`);
    console.log(`[LOAD] [rota-detalhes] Tipo do rotaId:`, typeof rotaId);
    console.log(`[LOAD] [rota-detalhes] rotaId valor:`, rotaId);

    setLoading(true);
    setErrorMessage('');

    try {
      const API_URL = 'https://agroserver-it9g.onrender.com/api/rota/vendas';
      const body = {
        rota_id: rotaId,
        // limit: 1000 é o padrão no backend, mas pode ser ajustado se necessário
        // Se sua rota tiver mais de 1000 clientes, aumente este valor:
        // limit: 9999
      };
      
      console.log(`[SEND] [rota-detalhes] Body sendo enviado:`, JSON.stringify(body));
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body)
      });

      console.log('[RESPONSE] [rota-detalhes] Response status:', response.status);
      
      // Verificar se a resposta é JSON válido
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[ERROR] [rota-detalhes] Resposta não é JSON. Content-Type:', contentType);
        throw new Error('API retornou formato inválido (não é JSON)');
      }
      
      const responseData = await response.json();
      console.log('[DATA] [rota-detalhes] Response data:', JSON.stringify(responseData, null, 2));

      // Verificar se a resposta é OK
      if (response.ok) {
        let clientesArray: any[] = [];
        
        // Nova API otimizada retorna { success, data, pagination, performance }
        if (responseData && typeof responseData === 'object' && responseData.success && responseData.data) {
          console.log('[INFO] [rota-detalhes] API otimizada detectada');
          clientesArray = responseData.data;
          // Exibir métricas de performance (se disponíveis)
          if (responseData.performance) {
            console.log('[PERFORMANCE] Tempo de processamento:', responseData.performance.tempoProcessamento);
            console.log('[PERFORMANCE] Clientes em cache:', responseData.performance.clientesCache);
            console.log('[PERFORMANCE] Vendas processadas:', responseData.performance.vendasProcessadas);
          }
          // Informações de paginação (se disponíveis)
          if (responseData.pagination) {
            console.log('[PAGINATION] Página:', responseData.pagination.page);
            console.log('[PAGINATION] Total de vendas:', responseData.pagination.total);
            console.log('[PAGINATION] Total de páginas:', responseData.pagination.totalPages);
            console.log('[PAGINATION] Tem mais páginas:', responseData.pagination.hasMore);
            // Aviso se houver mais páginas (indicando que precisa aumentar o limit)
            if (responseData.pagination.hasMore) {
              console.warn('[WARNING] Há mais clientes disponíveis! Considere aumentar o limit na requisição.');
              console.warn('[WARNING] Total de clientes:', responseData.pagination.total);
            } else {
              console.log('[SUCCESS] Todos os clientes da rota foram carregados!');
            }
          }
        }
        // Fallback para API antiga (array direto)
        else if (Array.isArray(responseData)) {
          console.log('[INFO] [rota-detalhes] API antiga detectada (array direto)');
          clientesArray = responseData;
        }
        // Outros formatos de objeto
        else if (responseData && typeof responseData === 'object') {
          if (responseData.success === false || responseData.error || responseData.message) {
            console.log('[INFO] [rota-detalhes] Resposta indica lista vazia ou sem dados');
            clientesArray = [];
          } else if (responseData.vendas || responseData.clientes) {
            clientesArray = responseData.vendas || responseData.clientes || [];
          } else {
            console.log('[INFO] [rota-detalhes] Formato de resposta desconhecido, tratando como vazio');
            clientesArray = [];
          }
        }

        console.log('[RESULT] [rota-detalhes] Array de clientes:', clientesArray.length, 'clientes');

        // Se não houver vendas, apenas inicializa com arrays vazios sem mostrar erro
        if (clientesArray.length === 0) {
          console.log('[INFO] [rota-detalhes] Nenhum cliente cadastrado na rota');
          setTotalEmDia(0);
          setTotalInadimplente(0);
          setTotalAVencer(0);
          setValorRecebido(0);
          setValorVencido(0);
          setValorAVencer(0);
          setTaxaInadimplencia(0);
          setClientes([]);
          setClientesFiltrados([]);
        } else {
          // Processar dados da API para formato da tela
          const clientesProcessados: ClienteProcessado[] = clientesArray.map((item: any) => {
            console.log('[DEBUG] [rota-detalhes] Item completo da API:', JSON.stringify(item, null, 2));
            console.log('[DEBUG] [rota-detalhes] Campos disponíveis:', Object.keys(item));
            
            // Tentar todas as variações possíveis do ID do parcelamento
            const parcelamentoId = item.parcelamentoId || 
                                   item.parcelamento_id || 
                                   item.parcelamentoAsaas ||
                                   item.parcelamento_asaas_id ||
                                   item.asaasId ||
                                   item.id;
            
            console.log('[DEBUG] [rota-detalhes] parcelamentoId extraído:', parcelamentoId);
            
            return {
              ...item,
              expandido: false,
              parcelamentoId: parcelamentoId,
              clienteId: item.clienteId || item.cliente_id
            };
          });

          // Calcular estatísticas - Contar CLIENTES por status e VALORES
          let emDia = 0, inadimplente = 0, aVencer = 0;
          let valRecebido = 0, valVencido = 0, valAVencer = 0;
          
          clientesProcessados.forEach(cliente => {
            // Somar valores
            valRecebido += cliente.parcelasPagas.valor;
            valVencido += cliente.parcelasVencidas.valor;
            valAVencer += cliente.parcelasAVencer.valor;
            
            // Lógica correta: prioridade Inadimplente > A Vencer > Em Dia
            if (cliente.parcelasVencidas.quantidade > 0) {
              inadimplente++; // Tem parcela vencida
            } else if (cliente.parcelasAVencer.quantidade > 0) {
              aVencer++; // Não tem vencida, mas tem a vencer
            } else if (cliente.parcelasPagas.quantidade > 0) {
              emDia++; // Só tem pagas
            }
          });

          // Calcular taxa de inadimplência (padrão: vencido / (recebido + vencido) * 100)
          const totalBase = valRecebido + valVencido;
          const taxaInad = totalBase > 0 ? (valVencido / totalBase) * 100 : 0;

          setTotalEmDia(emDia);
          setTotalInadimplente(inadimplente);
          setTotalAVencer(aVencer);
          setValorRecebido(valRecebido);
          setValorVencido(valVencido);
          setValorAVencer(valAVencer);
          setTaxaInadimplencia(taxaInad);
          setClientes(clientesProcessados);
          setClientesFiltrados(clientesProcessados);
          console.log(`[SUCCESS] [rota-detalhes] ${clientesProcessados.length} clientes carregados`);
        }
      } else {
        // Erro real da API (status não OK)
        console.error('[ERROR] [rota-detalhes] API retornou status não OK:', response.status);
        throw new Error(`Erro ao carregar vendas (Status: ${response.status})`);
      }
    } catch (error) {
      console.error('[ERROR] [rota-detalhes] Erro ao carregar vendas:', error);
      setErrorMessage('Erro ao carregar vendas. Toque para tentar novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    aplicarFiltros(clientes, text, filtroStatus);
  };

  const handleFiltroStatus = (status: FiltroStatus) => {
    setFiltroStatus(status);
    aplicarFiltros(clientes, searchText, status);
  };

  const aplicarFiltros = (todosClientes: ClienteProcessado[], texto: string, status: FiltroStatus) => {
    let resultado = todosClientes;

    // Filtrar por status usando a lógica correta
    if (status !== 'todos') {
      resultado = resultado.filter(cliente => {
        if (status === 'pago') {
          // Em Dia: só parcelas pagas, nenhuma vencida ou a vencer
          return cliente.parcelasVencidas.quantidade === 0 && 
                 cliente.parcelasAVencer.quantidade === 0 && 
                 cliente.parcelasPagas.quantidade > 0;
        }
        if (status === 'vencido') {
          // Inadimplente: pelo menos uma parcela vencida
          return cliente.parcelasVencidas.quantidade > 0;
        }
        if (status === 'a_vencer') {
          // A Vencer: não tem vencida, mas tem a vencer
          return cliente.parcelasVencidas.quantidade === 0 && 
                 cliente.parcelasAVencer.quantidade > 0;
        }
        return true;
      });
    }

    // Filtrar por texto de pesquisa (nome)
    if (texto.trim() !== '') {
      resultado = resultado.filter(cliente =>
        cliente.nomeCliente.toLowerCase().includes(texto.toLowerCase())
      );
    }

    setClientesFiltrados(resultado);
    console.log(`[FILTER] [rota-detalhes] ${resultado.length} clientes encontrados`);
  };

  const toggleExpandir = (index: number) => {
    const novosClientes = [...clientesFiltrados];
    novosClientes[index].expandido = !novosClientes[index].expandido;
    setClientesFiltrados(novosClientes);
  };

  const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatarCpfCnpj = (cpfCnpj: string) => {
    if (cpfCnpj.length === 11) {
      // CPF: 000.000.000-00
      return cpfCnpj.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cpfCnpj.length === 14) {
      // CNPJ: 00.000.000/0000-00
      return cpfCnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    return cpfCnpj;
  };

  const determinarStatusCliente = (cliente: ClienteProcessado): { status: string; cor: string; corFundo: string } => {
    // Prioridade: Inadimplente > A Vencer > Em Dia
    if (cliente.parcelasVencidas.quantidade > 0) {
      return { status: 'Inadimplente', cor: '#ff4444', corFundo: '#3a1a1a' };
    } else if (cliente.parcelasAVencer.quantidade > 0) {
      return { status: 'A Vencer', cor: '#FFA500', corFundo: '#3a2a1a' };
    } else if (cliente.parcelasPagas.quantidade > 0) {
      return { status: 'Em Dia', cor: '#4CAF50', corFundo: '#1a3a1a' };
    }
    return { status: 'Sem Parcelas', cor: '#666', corFundo: '#2a2a2a' };
  };

  const gerarRelatorioPDF = async (tipoRelatorio: 'completo' | 'recebido' | 'a_vencer' | 'inadimplente') => {
    setGerandoPdf(true);
    setShowRelatorioModal(false);
    console.log('[PDF] Iniciando geração do relatório:', tipoRelatorio);

    try {
      const dataAtual = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      // Filtrar clientes baseado no tipo de relatório e ordenar alfabeticamente
      let clientesParaPDF: ClienteProcessado[] = [];
      let titulo = '';
      
      switch (tipoRelatorio) {
        case 'completo':
          clientesParaPDF = [...clientes].sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente));
          titulo = 'Relatório Completo';
          break;
        case 'recebido':
          clientesParaPDF = clientes
            .filter(c => c.parcelasPagas.quantidade > 0 && c.parcelasVencidas.quantidade === 0 && c.parcelasAVencer.quantidade === 0)
            .sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente));
          titulo = 'Relatório de Pagamentos Recebidos';
          break;
        case 'a_vencer':
          clientesParaPDF = clientes
            .filter(c => c.parcelasAVencer.quantidade > 0 && c.parcelasVencidas.quantidade === 0)
            .sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente));
          titulo = 'Relatório de Parcelas a Vencer';
          break;
        case 'inadimplente':
          clientesParaPDF = clientes
            .filter(c => c.parcelasVencidas.quantidade > 0)
            .sort((a, b) => a.nomeCliente.localeCompare(b.nomeCliente));
          titulo = 'Relatório de Inadimplência';
          break;
      }

      console.log(`[PDF] ${clientesParaPDF.length} clientes no relatório`);

      // Calcular estatísticas baseadas nos clientes selecionados
      let emDia = 0, inadimplente = 0, aVencer = 0;
      let valRecebido = 0, valVencido = 0, valAVencer = 0;
      
      clientesParaPDF.forEach(cliente => {
        valRecebido += cliente.parcelasPagas.valor;
        valVencido += cliente.parcelasVencidas.valor;
        valAVencer += cliente.parcelasAVencer.valor;
        
        if (cliente.parcelasVencidas.quantidade > 0) {
          inadimplente++;
        } else if (cliente.parcelasAVencer.quantidade > 0) {
          aVencer++;
        } else if (cliente.parcelasPagas.quantidade > 0) {
          emDia++;
        }
      });

      // Para relatórios específicos, calcular taxa baseada em TODOS os clientes (não filtrados)
      let taxaInad = 0;
      if (tipoRelatorio === 'completo') {
        const totalBase = valRecebido + valVencido;
        taxaInad = totalBase > 0 ? (valVencido / totalBase) * 100 : 0;
      } else if (tipoRelatorio === 'inadimplente') {
        // Para relatório de inadimplentes, usar dados globais
        const totalBaseGlobal = valorRecebido + valorVencido;
        taxaInad = totalBaseGlobal > 0 ? (valorVencido / totalBaseGlobal) * 100 : 0;
      }
      
      const totalGeral = valRecebido + valVencido + valAVencer;

      // Gerar HTML do relatório
      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: 'Arial', sans-serif; 
              padding: 20px; 
              background: #1a1a1a;
              color: #e0e0e0;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              padding-bottom: 20px;
              border-bottom: 3px solid #4CAF50;
            }
            .header h1 { 
              color: #ffffff; 
              font-size: 28px;
              margin-bottom: 10px;
            }
            .header .subtitle {
              color: #b0b0b0;
              font-size: 14px;
            }
            .header .tipo-relatorio {
              color: #4CAF50;
              font-size: 16px;
              font-weight: 600;
              margin-top: 8px;
            }
            .resumo {
              background: #2a2a2a;
              padding: 20px;
              border-radius: 8px;
              margin-bottom: 30px;
              border: 1px solid #333;
            }
            .resumo h2 {
              color: #ffffff;
              font-size: 20px;
              margin-bottom: 15px;
              border-bottom: 2px solid #4CAF50;
              padding-bottom: 8px;
            }
            .stats {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 20px;
            }
            .stats.centro {
              grid-template-columns: repeat(2, 1fr);
              max-width: 100%;
              margin-left: auto;
              margin-right: auto;
            }
            .stat-card {
              background: #252525;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #333;
              border-top: 3px solid #4CAF50;
              text-align: center;
            }
            .stat-card.inadimplente { border-top-color: #ff4444; }
            .stat-card.a-vencer { border-top-color: #FFA500; }
            .stat-card h3 {
              font-size: 12px;
              color: #999;
              text-transform: uppercase;
              margin-bottom: 8px;
            }
            .stat-card .value {
              font-size: 24px;
              font-weight: bold;
              color: #ffffff;
            }
            .financeiro {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 15px;
            }
            .financeiro.centro {
              grid-template-columns: 1fr;
              max-width: 400px;
              margin-left: auto;
              margin-right: auto;
            }
            .financeiro-item {
              background: #252525;
              padding: 12px;
              border-radius: 6px;
              text-align: center;
              border: 1px solid #333;
            }
            .financeiro-item.recebido { border-top: 3px solid #4CAF50; }
            .financeiro-item.vencido { border-top: 3px solid #ff4444; }
            .financeiro-item.a-vencer { border-top: 3px solid #FFA500; }
            .financeiro-item h4 {
              font-size: 11px;
              color: #999;
              margin-bottom: 6px;
              text-transform: uppercase;
            }
            .financeiro-item .valor {
              font-size: 16px;
              font-weight: bold;
            }
            .financeiro-item.recebido .valor { color: #4CAF50; }
            .financeiro-item.vencido .valor { color: #ff4444; }
            .financeiro-item.a-vencer .valor { color: #FFA500; }
            .totais {
              display: flex;
              justify-content: space-around;
              background: #252525;
              padding: 15px;
              border-radius: 6px;
              border: 1px solid #333;
            }
            .total-item {
              text-align: center;
            }
            .total-item h4 {
              font-size: 12px;
              color: #999;
              margin-bottom: 6px;
            }
            .total-item .valor {
              font-size: 18px;
              font-weight: bold;
              color: #ffffff;
            }
            .clientes {
              margin-top: 30px;
            }
            .clientes h2 {
              color: #ffffff;
              font-size: 20px;
              margin-bottom: 20px;
              border-bottom: 2px solid #4CAF50;
              padding-bottom: 8px;
            }
            .cliente {
              background: #2a2a2a;
              margin-bottom: 20px;
              padding: 15px;
              border-radius: 8px;
              border: 1px solid #333;
              page-break-inside: avoid;
            }
            .cliente-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 15px;
              padding-bottom: 12px;
              border-bottom: 1px solid #444;
            }
            .cliente-nome {
              font-size: 16px;
              font-weight: bold;
              color: #ffffff;
            }
            .cliente-status {
              padding: 6px 12px;
              border-radius: 20px;
              font-size: 12px;
              font-weight: 600;
            }
            .status-em-dia { background: #1a3a1a; color: #4CAF50; border: 1px solid #4CAF50; }
            .status-inadimplente { background: #3a1a1a; color: #ff4444; border: 1px solid #ff4444; }
            .status-a-vencer { background: #3a2a1a; color: #FFA500; border: 1px solid #FFA500; }
            .parcelas-grupo {
              margin-top: 15px;
            }
            .parcelas-grupo h4 {
              font-size: 13px;
              font-weight: 600;
              color: #e0e0e0;
              margin-bottom: 10px;
              display: flex;
              align-items: center;
            }
            .parcelas-grupo h4::before {
              content: '';
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 50%;
              margin-right: 8px;
            }
            .parcelas-grupo.pagas h4::before { background: #4CAF50; }
            .parcelas-grupo.vencidas h4::before { background: #ff4444; }
            .parcelas-grupo.a-vencer h4::before { background: #FFA500; }
            .parcela {
              display: flex;
              justify-content: space-between;
              padding: 8px 12px;
              background: #1a1a1a;
              margin-bottom: 6px;
              border-radius: 4px;
              font-size: 12px;
              border: 1px solid #333;
            }
            .parcela-valor {
              font-weight: 600;
              color: #ffffff;
            }
            .parcela-data {
              color: #b0b0b0;
            }
            .footer {
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #444;
              text-align: center;
              color: #999;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Relatório de Rota</h1>
            <div class="subtitle">${rotaNome}</div>
            <div class="tipo-relatorio">${titulo}</div>
            <div class="subtitle">Gerado em: ${dataAtual}</div>
          </div>

          <div class="resumo">
            <h2>Resumo Geral</h2>
            
            ${tipoRelatorio === 'completo' ? `
            <div class="stats">
              <div class="stat-card">
                <h3>Em Dia</h3>
                <div class="value">${emDia}</div>
              </div>
              <div class="stat-card inadimplente">
                <h3>Inadimplente</h3>
                <div class="value">${inadimplente}</div>
              </div>
              <div class="stat-card a-vencer">
                <h3>A Vencer</h3>
                <div class="value">${aVencer}</div>
              </div>
            </div>
            ` : ''}

            ${tipoRelatorio === 'recebido' ? `
            <div class="stats centro">
              <div class="stat-card">
                <h3>Clientes em Dia</h3>
                <div class="value">${emDia}</div>
              </div>
              <div class="financeiro-item recebido">
                <h4>Total Recebido</h4>
                <div class="valor">${formatarValor(valRecebido)}</div>
              </div>
            </div>
            ` : ''}

            ${tipoRelatorio === 'inadimplente' ? `
            <div class="stats centro">
              <div class="stat-card inadimplente">
                <h3>Clientes Inadimplentes</h3>
                <div class="value">${inadimplente}</div>
              </div>
              <div class="financeiro-item vencido">
                <h4>Total Vencido</h4>
                <div class="valor">${formatarValor(valVencido)}</div>
              </div>
            </div>
            ` : ''}

            ${tipoRelatorio === 'a_vencer' ? `
            <div class="stats centro">
              <div class="stat-card a-vencer">
                <h3>Clientes com Parcelas a Vencer</h3>
                <div class="value">${aVencer}</div>
              </div>
              <div class="financeiro-item a-vencer">
                <h4>Total a Vencer</h4>
                <div class="valor">${formatarValor(valAVencer)}</div>
              </div>
            </div>
            ` : ''}

            ${tipoRelatorio === 'completo' ? `
            <div class="financeiro">
              <div class="financeiro-item recebido">
                <h4>Recebido</h4>
                <div class="valor">${formatarValor(valRecebido)}</div>
              </div>
              <div class="financeiro-item vencido">
                <h4>Vencido</h4>
                <div class="valor">${formatarValor(valVencido)}</div>
              </div>
              <div class="financeiro-item a-vencer">
                <h4>A Vencer</h4>
                <div class="valor">${formatarValor(valAVencer)}</div>
              </div>
            </div>
            ` : ''}

            <div class="totais">
              <div class="total-item">
                <h4>Total ${tipoRelatorio === 'completo' ? 'Geral' : ''}</h4>
                <div class="valor">${formatarValor(tipoRelatorio === 'recebido' ? valRecebido : tipoRelatorio === 'a_vencer' ? valAVencer : tipoRelatorio === 'inadimplente' ? valVencido : totalGeral)}</div>
              </div>
              ${tipoRelatorio === 'completo' || tipoRelatorio === 'inadimplente' ? `
              <div class="total-item">
                <h4>Taxa de Inadimplência</h4>
                <div class="valor" style="color: ${taxaInad > 20 ? '#ff4444' : taxaInad > 10 ? '#FFA500' : '#4CAF50'}">${taxaInad.toFixed(3)}%</div>
              </div>
              ` : ''}
            </div>
          </div>

          <div class="clientes">
            <h2>Detalhamento por Cliente (${clientesParaPDF.length} ${clientesParaPDF.length === 1 ? 'cliente' : 'clientes'})</h2>
            
            ${clientesParaPDF.map((cliente) => {
              const statusInfo = determinarStatusCliente(cliente);
              const statusClass = statusInfo.status === 'Em Dia' ? 'status-em-dia' : 
                                  statusInfo.status === 'Inadimplente' ? 'status-inadimplente' : 'status-a-vencer';
              
              return `
                <div class="cliente">
                  <div class="cliente-header">
                    <div class="cliente-nome">${cliente.nomeCliente}</div>
                    <div class="cliente-status ${statusClass}">${statusInfo.status}</div>
                  </div>

                  ${(tipoRelatorio === 'completo' || tipoRelatorio === 'recebido') && cliente.parcelasPagas.quantidade > 0 ? `
                    <div class="parcelas-grupo pagas">
                      <h4>Pagas: ${cliente.parcelasPagas.quantidade} × ${formatarValor(cliente.parcelasPagas.valor / cliente.parcelasPagas.quantidade)} = ${formatarValor(cliente.parcelasPagas.valor)}</h4>
                    </div>
                  ` : ''}

                  ${(tipoRelatorio === 'completo' || tipoRelatorio === 'inadimplente') && cliente.parcelasVencidas.quantidade > 0 ? `
                    <div class="parcelas-grupo vencidas">
                      <h4>Vencidas: ${cliente.parcelasVencidas.quantidade} × ${formatarValor(cliente.parcelasVencidas.valor / cliente.parcelasVencidas.quantidade)} = ${formatarValor(cliente.parcelasVencidas.valor)}</h4>
                    </div>
                  ` : ''}

                  ${(tipoRelatorio === 'completo' || tipoRelatorio === 'a_vencer') && cliente.parcelasAVencer.quantidade > 0 ? `
                    <div class="parcelas-grupo a-vencer">
                      <h4>A Vencer: ${cliente.parcelasAVencer.quantidade} × ${formatarValor(cliente.parcelasAVencer.valor / cliente.parcelasAVencer.quantidade)} = ${formatarValor(cliente.parcelasAVencer.valor)}</h4>
                    </div>
                  ` : ''}
                </div>
              `;
            }).join('')}
          </div>

          <div class="footer">
            <p>Relatório gerado pelo AgroSystem</p>
            <p>${dataAtual}</p>
          </div>
        </body>
        </html>
      `;

      console.log('[PDF] HTML gerado, criando PDF...');

      // Formatar data para o nome do arquivo (DD-MM-YYYY)
      const dataArquivo = new Date().toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).replace(/\//g, '-');

      // Criar nome do arquivo: Relatório {tipo} - Nome da rota - Nome vendedor - Data
      const nomeArquivo = `Relatorio ${titulo.replace('Relatório de ', '').replace('Relatório ', '')} - ${rotaNome} - ${vendedorDaRota} - ${dataArquivo}.pdf`;
      
      console.log('[PDF] Nome do arquivo:', nomeArquivo);
      console.log('[PDF] Vendedor usado:', vendedorDaRota);

      // Gerar PDF temporário
      const { uri: tempUri } = await Print.printToFileAsync({
        html: htmlContent,
        base64: false
      });

      console.log('[PDF] PDF temporário criado:', tempUri);

      // Criar arquivo final com o nome correto
      const finalFile = new File(Paths.cache, nomeArquivo);
      const tempFile = new File(tempUri);
      
      // Copiar conteúdo do arquivo temporário para o arquivo final (como ArrayBuffer para preservar o PDF)
      await finalFile.create();
      const tempArrayBuffer = await tempFile.arrayBuffer();
      const tempUint8Array = new Uint8Array(tempArrayBuffer);
      const writer = await finalFile.writableStream();
      const writerInstance = writer.getWriter();
      await writerInstance.write(tempUint8Array);
      await writerInstance.close();

      console.log('[PDF] PDF renomeado para:', finalFile.uri);

      // Verificar se o compartilhamento está disponível
      const isAvailable = await Sharing.isAvailableAsync();
      
      if (isAvailable) {
        console.log('[PDF] Compartilhando PDF...');
        await Sharing.shareAsync(finalFile.uri, {
          mimeType: 'application/pdf',
          dialogTitle: nomeArquivo.replace('.pdf', ''),
          UTI: 'com.adobe.pdf'
        });
        console.log('[PDF] PDF compartilhado com sucesso!');
      } else {
        Alert.alert(
          'PDF Gerado',
          `O relatório foi gerado com sucesso!\nLocal: ${finalFile.uri}`,
          [{ text: 'OK' }]
        );
      }

    } catch (error) {
      console.error('[PDF] Erro ao gerar relatório:', error);
      Alert.alert(
        'Erro',
        'Não foi possível gerar o relatório PDF. Tente novamente.',
        [{ text: 'OK' }]
      );
    } finally {
      setGerandoPdf(false);
    }
  };

  const confirmarRemocao = async () => {
    if (!clienteParaRemover) return;
    
    // Verificar se temos parcelamentoId
    if (!clienteParaRemover.parcelamentoId) {
      console.error('[ERROR] [rota-detalhes] parcelamentoId não encontrado');
      console.error('[ERROR] [rota-detalhes] Cliente completo:', JSON.stringify(clienteParaRemover, null, 2));
      console.error('[ERROR] [rota-detalhes] Campos disponíveis:', Object.keys(clienteParaRemover));
      setErrorMsg('Erro: ID do parcelamento não encontrado. Verifique se a API está retornando o campo correto.');
      setShowErrorModal(true);
      setRemovendo(false);
      return;
    }
    
    console.log('[DELETE] [rota-detalhes] Removendo parcelamento da rota:', clienteParaRemover.parcelamentoId);
    setShowRemoveModal(false);
    setRemovendo(true);

    try {
      const API_URL = 'https://agroserver-it9g.onrender.com/api/rota/remover-parcelamento';
      
      const response = await fetch(API_URL, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rota_id: rotaId,
          parcelamento_id: clienteParaRemover.parcelamentoId
        })
      });

      const data = await response.json();
      console.log('[RESPONSE] [rota-detalhes] Response:', data);

      if (response.ok) {
        console.log('[SUCCESS] [rota-detalhes] Cliente removido com sucesso');
        setShowSuccessModal(true);
        // Recarregar lista após sucesso
        setTimeout(() => {
          carregarVendas();
        }, 500);
      } else {
        throw new Error(data.message || 'Erro ao remover cliente');
      }
    } catch (error: any) {
      console.error('[ERROR] [rota-detalhes] Erro:', error);
      setErrorMsg(error.message || 'Erro ao remover cliente da rota');
      setShowErrorModal(true);
    } finally {
      setRemovendo(false);
    }
  };

  const renderCliente = ({ item, index }: { item: ClienteProcessado; index: number }) => {
    // Determinar status correto do cliente
    const statusInfo = determinarStatusCliente(item);
    
    // Determinar qual grupo de parcelas mostrar baseado no status principal
    let quantidadeAtiva = 0;
    let valorUnitario = 0;

    if (item.parcelasVencidas.quantidade > 0) {
      quantidadeAtiva = item.parcelasVencidas.quantidade;
      valorUnitario = item.parcelasVencidas.quantidade > 0
        ? item.parcelasVencidas.valor / item.parcelasVencidas.quantidade
        : 0;
    } else if (item.parcelasAVencer.quantidade > 0) {
      quantidadeAtiva = item.parcelasAVencer.quantidade;
      valorUnitario = item.parcelasAVencer.quantidade > 0
        ? item.parcelasAVencer.valor / item.parcelasAVencer.quantidade
        : 0;
    } else if (item.parcelasPagas.quantidade > 0) {
      quantidadeAtiva = item.parcelasPagas.quantidade;
      valorUnitario = item.parcelasPagas.quantidade > 0
        ? item.parcelasPagas.valor / item.parcelasPagas.quantidade
        : 0;
    }

    return (
      <TouchableOpacity 
        style={styles.clienteCard}
        onPress={() => toggleExpandir(index)}
        activeOpacity={0.7}
      >
        <View style={styles.clienteHeader}>
          <View style={[styles.clienteIconContainer, { backgroundColor: statusInfo.corFundo }]}>
            <Ionicons name="person" size={24} color={statusInfo.cor} />
          </View>
          <View style={styles.clienteInfo}>
            <Text style={styles.clienteNome}>{item.nomeCliente}</Text>
            <View style={styles.clienteDetalhes}>
              <View style={[styles.statusBadge, { backgroundColor: statusInfo.corFundo }]}>
                <Text style={[styles.statusText, { color: statusInfo.cor }]}>
                  {statusInfo.status}
                </Text>
              </View>
              <Text style={styles.clienteSeparator}> • </Text>
              <Text style={styles.clienteParcelas}>{quantidadeAtiva}x {formatarValor(valorUnitario)}</Text>
            </View>
          </View>
          <Ionicons 
            name={item.expandido ? "chevron-up" : "chevron-down"} 
            size={24} 
            color="#666" 
          />
        </View>

        {/* Área Expandida com Detalhes das Parcelas */}
        {item.expandido && (
          <View style={styles.parcelasContainer}>
            {/* Parcelas Pagas */}
            {item.parcelasPagas.quantidade > 0 && (
              <View style={styles.grupoParcelasContainer}>
                <View style={styles.grupoParcelasTitleContainer}>
                  <View style={[styles.statusIndicador, { backgroundColor: '#4CAF50' }]} />
                  <Text style={styles.grupoParcelasTitle}>
                    Pagas ({item.parcelasPagas.quantidade}) - {formatarValor(item.parcelasPagas.valor)}
                  </Text>
                </View>
                {item.parcelasPagas.parcelas.map((parcela, idx) => (
                  <View key={`paga-${idx}`} style={[styles.parcelaItem, styles.parcelaPaga]}>
                    <View style={[styles.parcelaIndicador, { backgroundColor: '#4CAF50' }]} />
                    <View style={styles.parcelaInfo}>
                      <Text style={styles.parcelaValor}>{formatarValor(parcela.valor)}</Text>
                      <Text style={styles.parcelaData}>{formatarData(parcela.dataVencimento)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Parcelas Vencidas */}
            {item.parcelasVencidas.quantidade > 0 && (
              <View style={styles.grupoParcelasContainer}>
                <View style={styles.grupoParcelasTitleContainer}>
                  <View style={[styles.statusIndicador, { backgroundColor: '#ff4444' }]} />
                  <Text style={styles.grupoParcelasTitle}>
                    Vencidas ({item.parcelasVencidas.quantidade}) - {formatarValor(item.parcelasVencidas.valor)}
                  </Text>
                </View>
                {item.parcelasVencidas.parcelas.map((parcela, idx) => (
                  <View key={`vencida-${idx}`} style={[styles.parcelaItem, styles.parcelaVencida]}>
                    <View style={[styles.parcelaIndicador, { backgroundColor: '#ff4444' }]} />
                    <View style={styles.parcelaInfo}>
                      <Text style={styles.parcelaValor}>{formatarValor(parcela.valor)}</Text>
                      <Text style={styles.parcelaData}>{formatarData(parcela.dataVencimento)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Parcelas A Vencer */}
            {item.parcelasAVencer.quantidade > 0 && (
              <View style={styles.grupoParcelasContainer}>
                <View style={styles.grupoParcelasTitleContainer}>
                  <View style={[styles.statusIndicador, { backgroundColor: '#FFA500' }]} />
                  <Text style={styles.grupoParcelasTitle}>
                    A Vencer ({item.parcelasAVencer.quantidade}) - {formatarValor(item.parcelasAVencer.valor)}
                  </Text>
                </View>
                {item.parcelasAVencer.parcelas.map((parcela, idx) => (
                  <View key={`avencer-${idx}`} style={[styles.parcelaItem, styles.parcelaAVencer]}>
                    <View style={[styles.parcelaIndicador, { backgroundColor: '#FFA500' }]} />
                    <View style={styles.parcelaInfo}>
                      <Text style={styles.parcelaValor}>{formatarValor(parcela.valor)}</Text>
                      <Text style={styles.parcelaData}>{formatarData(parcela.dataVencimento)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Botão Cobrar via WhatsApp */}
              <TouchableOpacity
              style={[styles.removerClienteButton, { backgroundColor: '#25D366', flexDirection: 'row', alignItems: 'center', marginBottom: 8 }]}
              onPress={() => {
                // Remover todos os caracteres não numéricos do celular
                let numero = item.celular ? item.celular.replace(/\D/g, '') : '';
                
                if (!numero) {
                  Alert.alert('Erro', 'Cliente sem número de celular cadastrado.');
                  return;
                }
                
                // Adicionar código do país (+55) se não tiver
                if (!numero.startsWith('55')) {
                  numero = '55' + numero;
                }
                
                // Validar formato do número brasileiro (55 + DDD + número)
                // Deve ter 13 dígitos (55 + 2 DDD + 9 dígitos) ou 12 dígitos (55 + 2 DDD + 8 dígitos para fixo)
                if (numero.length < 12 || numero.length > 13) {
                  Alert.alert(
                    'Número inválido', 
                    `O número ${item.celular} parece estar incompleto ou incorreto. Verifique o cadastro do cliente.`
                  );
                  return;
                }
                
                // Construir mensagem de cobrança focada em inadimplência
                let mensagem = `Olá *${item.nomeCliente}*, tudo bem?\n\n`;
                mensagem += `Aqui é da *AgroVec do Brasil*. Estamos entrando em contato sobre a compra realizada com o vendedor *${vendedorDaRota}*.\n\n`;
                
                // Verificar se há parcelas vencidas
                if (item.parcelasVencidas.quantidade > 0) {
                  mensagem += `⚠️ *AVISO DE COBRANÇA*\n\n`;
                  mensagem += `Identificamos pendências em seu nome no valor total de *${formatarValor(item.parcelasVencidas.valor)}*.\n\n`;
                  
                  mensagem += `*Detalhamento das Parcelas Vencidas:*\n`;
                  item.parcelasVencidas.parcelas.forEach((parcela, idx) => {
                    const diasAtraso = Math.floor((new Date().getTime() - new Date(parcela.dataVencimento).getTime()) / (1000 * 60 * 60 * 24));
                    mensagem += `${idx + 1}. ${formatarValor(parcela.valor)} - Vencida em ${formatarData(parcela.dataVencimento)} _(${diasAtraso} dias de atraso)_\n`;
                  });
                  mensagem += `\n`;
                  
                  mensagem += `*Solicitamos a regularização urgente do pagamento.*\n\n`;
                  mensagem += `Entre em contato conosco para regularizar sua situação ou esclarecer dúvidas.`;
                } else {
                  // Caso não tenha parcelas vencidas (mensagem de lembrete)
                  mensagem += `Estamos entrando em contato sobre suas parcelas.\n\n`;
                  
                  if (item.parcelasAVencer.quantidade > 0) {
                    mensagem += `*Próximas Parcelas:*\n`;
                    const proximasParcelas = item.parcelasAVencer.parcelas.slice(0, 3);
                    proximasParcelas.forEach((parcela, idx) => {
                      mensagem += `${idx + 1}. ${formatarValor(parcela.valor)} - Vencimento: ${formatarData(parcela.dataVencimento)}\n`;
                    });
                    
                    if (item.parcelasAVencer.quantidade > 3) {
                      mensagem += `... e mais ${item.parcelasAVencer.quantidade - 3} parcela(s)\n`;
                    }
                    mensagem += `\n`;
                  }
                  
                  mensagem += `Mantenha seus pagamentos em dia. Caso tenha dúvidas, estamos à disposição!`;
                }
                
                const url = `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
                
                console.log('[WhatsApp] Abrindo URL:', url);
                console.log('[WhatsApp] Número formatado:', numero);
                
                // Abrir link do WhatsApp
                Linking.openURL(url).catch((error) => {
                  console.error('[WhatsApp] Erro ao abrir:', error);
                  Alert.alert(
                    'Erro', 
                    'Não foi possível abrir o WhatsApp. Verifique se o aplicativo está instalado.'
                  );
                });
              }}
              activeOpacity={0.7}
              disabled={removendo}
            >
              <Ionicons name="logo-whatsapp" size={18} color="#fff" style={{ marginRight: 6 }} />
              <Text style={[styles.removerClienteText, { color: '#fff' }]}>Cobrar via WhatsApp</Text>
            </TouchableOpacity>

            {/* Botão Remover Cliente da Rota */}
            <TouchableOpacity 
              style={styles.removerClienteButton}
              onPress={() => {
                setClienteParaRemover(item);
                setShowRemoveModal(true);
              }}
              activeOpacity={0.7}
              disabled={removendo}
            >
              <Ionicons name="trash-outline" size={18} color="#999" />
              <Text style={styles.removerClienteText}>Remover da Rota</Text>
            </TouchableOpacity>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{rotaNome}</Text>
        <TouchableOpacity 
          onPress={() => setShowRelatorioModal(true)} 
          style={styles.pdfButton}
          disabled={loading || gerandoPdf || clientes.length === 0}
        >
          {gerandoPdf ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Ionicons name="document-text" size={24} color={clientes.length === 0 ? "#666" : "#4CAF50"} />
          )}
        </TouchableOpacity>
      </View>


      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Estatísticas */}
        {!loading && (
          <View style={styles.estatisticasContainer}>
            <View style={styles.estatisticaCard}>
              <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
              <Text style={styles.estatisticaNumero}>{totalEmDia}</Text>
              <Text style={styles.estatisticaLabel}>Em Dia</Text>
            </View>
            <View style={styles.estatisticaCard}>
              <Ionicons name="close-circle" size={24} color="#ff4444" />
              <Text style={styles.estatisticaNumero}>{totalInadimplente}</Text>
              <Text style={styles.estatisticaLabel}>Inadimplente</Text>
            </View>
            <View style={styles.estatisticaCard}>
              <Ionicons name="time" size={24} color="#FFA500" />
              <Text style={styles.estatisticaNumero}>{totalAVencer}</Text>
              <Text style={styles.estatisticaLabel}>A Vencer</Text>
            </View>
          </View>
        )}

        {/* Resumo Financeiro */}
        {!loading && (
          <View style={styles.resumoFinanceiroContainer}>
            <Text style={styles.resumoFinanceiroTitulo}>Resumo Financeiro</Text>
            
            <View style={styles.resumoFinanceiroGrid}>
              {/* Valor Recebido */}
              <View style={styles.resumoFinanceiroItem}>
                <View style={styles.resumoFinanceiroIconContainer}>
                  <Ionicons name="cash" size={20} color="#4CAF50" />
                </View>
                <Text style={styles.resumoFinanceiroLabel}>Recebido</Text>
                <Text style={[styles.resumoFinanceiroValor, { color: '#4CAF50' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatarValor(valorRecebido)}
                </Text>
              </View>

              {/* Valor Vencido */}
              <View style={styles.resumoFinanceiroItem}>
                <View style={styles.resumoFinanceiroIconContainer}>
                  <Ionicons name="alert-circle" size={20} color="#ff4444" />
                </View>
                <Text style={styles.resumoFinanceiroLabel}>Vencido</Text>
                <Text style={[styles.resumoFinanceiroValor, { color: '#ff4444' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatarValor(valorVencido)}
                </Text>
              </View>

              {/* Valor A Vencer */}
              <View style={styles.resumoFinanceiroItem}>
                <View style={styles.resumoFinanceiroIconContainer}>
                  <Ionicons name="time" size={20} color="#FFA500" />
                </View>
                <Text style={styles.resumoFinanceiroLabel}>A Vencer</Text>
                <Text style={[styles.resumoFinanceiroValor, { color: '#FFA500' }]} numberOfLines={1} adjustsFontSizeToFit>
                  {formatarValor(valorAVencer)}
                </Text>
              </View>
            </View>

            {/* Métricas Adicionais */}
            <View style={styles.resumoFinanceiroMetricas}>
              <View style={styles.metricaItem}>
                <Text style={styles.metricaLabel}>Total Geral</Text>
                <Text style={styles.metricaValor}>
                  {formatarValor(valorRecebido + valorVencido + valorAVencer)}
                </Text>
              </View>
              
              <View style={styles.metricaDivisor} />
              
              <View style={styles.metricaItem}>
                <Text style={styles.metricaLabel}>Taxa de Inadimplência</Text>
                <Text style={[styles.metricaValor, { color: taxaInadimplencia > 20 ? '#ff4444' : taxaInadimplencia > 10 ? '#FFA500' : '#4CAF50' }]}> 
                  {taxaInadimplencia.toFixed(5)}%
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Botão Adicionar Cliente */}
        {!loading && (
          <TouchableOpacity 
            style={styles.adicionarClienteButton}
            onPress={() => {
              router.push({
                pathname: '/rotas/adicionar-cliente',
                params: {
                  rotaId: rotaId,
                  rotaNome: rotaNome
                }
              });
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="person-add" size={20} color="#4CAF50" />
            <Text style={styles.adicionarClienteText}>Adicionar Cliente na Rota</Text>
          </TouchableOpacity>
        )}

        {/* Botão de Teste - Carregar Dados Fictícios */}
        {!loading && clientes.length === 0 && (
          <TouchableOpacity 
            style={styles.testButton}
            onPress={carregarDadosTeste}
            activeOpacity={0.7}
          >
            <Ionicons name="flask" size={20} color="#FFA500" />
            <Text style={styles.testButtonText}>Carregar Dados de Teste</Text>
          </TouchableOpacity>
        )}

        {/* Divisor entre Dashboard e Lista */}
        {!loading && (
          <View style={styles.divisorSection}>
            <View style={styles.divisorLine} />
            <Text style={styles.divisorText}>CLIENTES DA ROTA</Text>
            <View style={styles.divisorLine} />
          </View>
        )}

        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#b0b0b0" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar cliente..."
            placeholderTextColor="#666"
            value={searchText}
            onChangeText={handleSearch}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => handleSearch('')} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {/* Filtros de Status - Carrossel Horizontal */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filtrosScrollContainer}
          contentContainerStyle={styles.filtrosContainer}
        >
          <TouchableOpacity 
            style={[styles.filtroButton, filtroStatus === 'todos' && styles.filtroButtonTodosActive]}
            onPress={() => handleFiltroStatus('todos')}
          >
            <Text style={[styles.filtroText, filtroStatus === 'todos' && styles.filtroTextTodosActive]}>
              Todos
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filtroButton, filtroStatus === 'pago' && styles.filtroButtonPagoActive]}
            onPress={() => handleFiltroStatus('pago')}
          >
            <Ionicons name="checkmark-circle" size={16} color={filtroStatus === 'pago' ? '#4CAF50' : '#666'} />
            <Text style={[styles.filtroText, filtroStatus === 'pago' && styles.filtroTextPagoActive]}>
              Em Dia
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filtroButton, filtroStatus === 'vencido' && styles.filtroButtonVencidoActive]}
            onPress={() => handleFiltroStatus('vencido')}
          >
            <Ionicons name="close-circle" size={16} color={filtroStatus === 'vencido' ? '#ff4444' : '#666'} />
            <Text style={[styles.filtroText, filtroStatus === 'vencido' && styles.filtroTextVencidoActive]}>
              Inadimplente
            </Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.filtroButton, filtroStatus === 'a_vencer' && styles.filtroButtonAVencerActive]}
            onPress={() => handleFiltroStatus('a_vencer')}
          >
            <Ionicons name="time" size={16} color={filtroStatus === 'a_vencer' ? '#FFA500' : '#666'} />
            <Text style={[styles.filtroText, filtroStatus === 'a_vencer' && styles.filtroTextAVencerActive]}>
              A Vencer
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Mensagem de Erro */}
        {errorMessage ? (
          <TouchableOpacity style={styles.errorMessageContainer} onPress={carregarVendas}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.errorMessageText}>{errorMessage}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Contador de Resultados */}
        {!loading && (
          <Text style={styles.resultCount}>
            {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente' : 'clientes'}
          </Text>
        )}

        {/* Lista de Clientes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Carregando vendas...</Text>
          </View>
        ) : clientesFiltrados.length > 0 ? (
          <View style={styles.list}>
            {clientesFiltrados.map((item, index) => (
              <React.Fragment key={item.clienteId || item.parcelamentoId || index}>
                {renderCliente({ item, index })}
              </React.Fragment>
            ))}
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>
              {searchText || filtroStatus !== 'todos' ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchText 
                ? 'Tente pesquisar com outro termo' 
                : filtroStatus !== 'todos'
                ? 'Altere os filtros para ver mais resultados'
                : 'Adicione clientes à esta rota'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Loading Overlay ao remover */}
      {removendo && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingOverlayContent}>
            <ActivityIndicator size="large" color="#ff4444" />
            <Text style={styles.loadingOverlayText}>Removendo cliente...</Text>
          </View>
        </View>
      )}

      {/* Loading Overlay ao gerar PDF */}
      {gerandoPdf && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingOverlayContent}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingOverlayText}>Gerando relatório PDF...</Text>
          </View>
        </View>
      )}

      {/* Modal de Confirmação de Remoção */}
      <Modal
        visible={showRemoveModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRemoveModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="warning" size={48} color="#ff4444" />
            <Text style={styles.modalTitle}>Remover Cliente</Text>
            {clienteParaRemover && (
              <Text style={styles.modalMessage}>
                Tem certeza que deseja remover o cliente {clienteParaRemover.nomeCliente} da rota {rotaNome}?
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowRemoveModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonRemove]}
                onPress={confirmarRemocao}
              >
                <Text style={styles.modalButtonTextRemove}>Remover</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de Sucesso */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.modalTitle}>Sucesso!</Text>
            <Text style={styles.modalMessage}>
              Cliente removido da rota com sucesso.
            </Text>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonConfirm, { width: '100%' }]}
              onPress={() => setShowSuccessModal(false)}
            >
              <Text style={styles.modalButtonTextConfirm}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Erro */}
      <Modal
        visible={showErrorModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowErrorModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="close-circle" size={48} color="#ff4444" />
            <Text style={styles.modalTitle}>Erro</Text>
            <Text style={styles.modalMessage}>{errorMsg}</Text>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonCancel, { width: '100%' }]}
              onPress={() => setShowErrorModal(false)}
            >
              <Text style={styles.modalButtonTextCancel}>Fechar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Opções de Relatório */}
      <Modal
        visible={showRelatorioModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowRelatorioModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="document-text" size={48} color="#4CAF50" />
            <Text style={styles.modalTitle}>Gerar Relatório PDF</Text>
            <Text style={styles.modalMessage}>Escolha o tipo de relatório:</Text>
            
            <View style={{ width: '100%', gap: 12, marginTop: 8 }}>
              <TouchableOpacity 
                style={[styles.relatorioOpcao, { borderColor: '#4CAF50' }]}
                onPress={() => gerarRelatorioPDF('completo')}
              >
                <Ionicons name="list" size={24} color="#4CAF50" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.relatorioOpcaoTitulo}>Relatório Completo</Text>
                  <Text style={styles.relatorioOpcaoDesc}>Todos os clientes com todas as informações</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.relatorioOpcao, { borderColor: '#4CAF50' }]}
                onPress={() => gerarRelatorioPDF('recebido')}
              >
                <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                <Text style={styles.relatorioOpcaoTitulo}>Pagamentos Recebidos</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.relatorioOpcao, { borderColor: '#FFA500' }]}
                onPress={() => gerarRelatorioPDF('a_vencer')}
              >
                <Ionicons name="time" size={24} color="#FFA500" />
                <Text style={styles.relatorioOpcaoTitulo}>Parcelas a Vencer</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.relatorioOpcao, { borderColor: '#ff4444' }]}
                onPress={() => gerarRelatorioPDF('inadimplente')}
              >
                <Ionicons name="warning" size={24} color="#ff4444" />
                <Text style={styles.relatorioOpcaoTitulo}>Clientes Inadimplentes</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.voltarRelatorioButton}
                onPress={() => setShowRelatorioModal(false)}
              >
                <Text style={styles.voltarRelatorioButtonText}>Voltar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2a2a2a',
  },
  backButton: {
    padding: 8,
  },
  pdfButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 15,
  },
  clearButton: {
    padding: 4,
  },
  filtrosScrollContainer: {
    marginBottom: 16,
  },
  filtrosContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 20,
  },
  filtroButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    gap: 4,
  },
  filtroButtonActive: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4CAF50',
  },
  filtroButtonTodosActive: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4CAF50',
  },
  filtroButtonPagoActive: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4CAF50',
  },
  filtroButtonVencidoActive: {
    backgroundColor: '#3a1a1a',
    borderColor: '#ff4444',
  },
  filtroButtonAVencerActive: {
    backgroundColor: '#3a2a1a',
    borderColor: '#FFA500',
  },
  filtroText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  filtroTextActive: {
    color: '#4CAF50',
  },
  filtroTextTodosActive: {
    color: '#4CAF50',
  },
  filtroTextPagoActive: {
    color: '#4CAF50',
  },
  filtroTextVencidoActive: {
    color: '#ff4444',
  },
  filtroTextAVencerActive: {
    color: '#FFA500',
  },
  resultCount: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 300,
  },
  clienteCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  clienteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clienteIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#1a3a1a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  clienteInfo: {
    flex: 1,
  },
  clienteNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  clienteDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clienteValor: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  clienteSeparator: {
    fontSize: 14,
    color: '#666',
  },
  clienteData: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  clienteCpf: {
    fontSize: 13,
    color: '#999',
    marginBottom: 6,
  },
  clienteParcelas: {
    fontSize: 14,
    color: '#b0b0b0',
    fontWeight: '600',
  },
  clienteDescricao: {
    fontSize: 12,
    color: '#777',
    marginTop: 6,
    fontStyle: 'italic',
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 300,
    minHeight: 400,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginTop: 20,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 8,
    textAlign: 'center',
  },
  errorMessageContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  errorMessageText: {
    color: '#ff6666',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#b0b0b0',
    fontSize: 14,
  },
  // Estatísticas
  estatisticasContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  estatisticaCard: {
    flex: 1,
    backgroundColor: '#2a2a2a',
    padding: 17,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  estatisticaNumero: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginVertical: 8,
  },
  estatisticaLabel: {
    fontSize: 10,
    color: '#b0b0b0',
  },
  // Parcelas Expandidas
  parcelasContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  grupoParcelasContainer: {
    marginBottom: 16,
  },
  grupoParcelasTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  statusIndicador: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  grupoParcelasTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  parcelaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
  },
  parcelaPaga: {
    borderColor: '#4CAF50',
  },
  parcelaVencida: {
    borderColor: '#ff4444',
  },
  parcelaAVencer: {
    borderColor: '#FFA500',
  },
  parcelaIndicador: {
    width: 4,
    height: 40,
    borderRadius: 2,
    marginRight: 12,
  },
  parcelaInfo: {
    flex: 1,
  },
  parcelaValor: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  parcelaData: {
    fontSize: 13,
    color: '#b0b0b0',
  },
  // Resumo Financeiro
  resumoFinanceiroContainer: {
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  resumoFinanceiroTitulo: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  resumoFinanceiroGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    gap: 10,
  },
  resumoFinanceiroItem: {
    flex: 1,
    backgroundColor: '#252525',
    padding: 12,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    minWidth: 0,
  },
  resumoFinanceiroIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2a2a2a',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  resumoFinanceiroLabel: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  resumoFinanceiroValor: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  resumoFinanceiroMetricas: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  metricaItem: {
    alignItems: 'center',
    flex: 1,
  },
  metricaLabel: {
    fontSize: 11,
    color: '#999',
    marginBottom: 6,
    textAlign: 'center',
  },
  metricaValor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metricaDivisor: {
    width: 1,
    backgroundColor: '#333',
  },
  // Divisor de Seções
  divisorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    marginBottom: 20,
  },
  divisorLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#333',
  },
  divisorText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginHorizontal: 16,
    letterSpacing: 1,
  },
  // Botão Adicionar Cliente
  adicionarClienteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 10,
  },
  adicionarClienteText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  // Botão de Teste
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#FFA500',
    gap: 10,
  },
  testButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFA500',
  },
  // Botão Remover Cliente
  removerClienteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#2a2a2a',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#444',
    gap: 8,
  },
  removerClienteText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#999',
  },
  // Modais
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingOverlayContent: {
    backgroundColor: '#2a2a2a',
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  loadingOverlayText: {
    color: '#ffffff',
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#2a2a2a',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    gap: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  modalMessage: {
    fontSize: 15,
    color: '#b0b0b0',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
  },
  modalButtonCancel: {
    backgroundColor: '#2a2a2a',
    borderColor: '#666',
  },
  modalButtonConfirm: {
    backgroundColor: '#1a3a1a',
    borderColor: '#4CAF50',
  },
  modalButtonRemove: {
    backgroundColor: '#3a1a1a',
    borderColor: '#ff4444',
  },
  modalButtonTextCancel: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonTextConfirm: {
    color: '#4CAF50',
    fontSize: 15,
    fontWeight: '600',
  },
  modalButtonTextRemove: {
    color: '#ff4444',
    fontSize: 15,
    fontWeight: '600',
  },
  relatorioOpcao: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1a1a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  relatorioOpcaoTitulo: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  relatorioOpcaoDesc: {
    color: '#999',
    fontSize: 13,
    lineHeight: 18,
  },
  voltarRelatorioButton: {
    width: '100%',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#333333',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginTop: 16,
  },
  voltarRelatorioButtonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  // Estilos do Progresso em Tempo Real
  progressContainer: {
    backgroundColor: '#1a2a3a',
    padding: 16,
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2a4a6a',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressMessage: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginRight: 12,
  },
  progressPercentage: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: 'bold',
  },
  progressBarBackground: {
    width: '100%',
    height: 8,
    backgroundColor: '#0a1a2a',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 4,
  },
  progressCount: {
    color: '#999',
    fontSize: 12,
    marginTop: 8,
    textAlign: 'center',
  },
  waitingAsaasContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#2a4a6a',
    gap: 8,
  },
  waitingAsaasText: {
    color: '#FFA500',
    fontSize: 13,
    fontWeight: '500',
  },
  completeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a1a',
    padding: 16,
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 12,
  },
  completeText: {
    flex: 1,
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a1a1a',
    padding: 16,
    margin: 20,
    marginTop: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#ff4444',
    gap: 12,
  },
  errorText: {
    flex: 1,
    color: '#ff4444',
    fontSize: 14,
    fontWeight: '600',
  },
});
