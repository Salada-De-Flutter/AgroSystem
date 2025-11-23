import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

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

  console.log('[DEBUG] [rota-detalhes] Params recebidos:', params);
  console.log('[DEBUG] [rota-detalhes] rotaId extraído:', rotaId);
  console.log('[DEBUG] [rota-detalhes] rotaNome extraído:', rotaNome);

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

  useEffect(() => {
    if (rotaId) {
      carregarVendas();
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

  const carregarVendas = async () => {
    console.log(`[LOAD] [rota-detalhes] Carregando vendas da rota ${rotaId}...`);
    console.log(`[LOAD] [rota-detalhes] Tipo do rotaId:`, typeof rotaId);
    console.log(`[LOAD] [rota-detalhes] rotaId valor:`, rotaId);
    setLoading(true);
    setErrorMessage('');

    try {
      const API_URL = 'https://agroserver-it9g.onrender.com/api/rota/vendas';
      const body = {
        rota_id: rotaId
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

          // Calcular taxa de inadimplência
          const totalGeral = valRecebido + valVencido + valAVencer;
          const taxaInad = totalGeral > 0 ? (valVencido / totalGeral) * 100 : 0;

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
        <View style={{ width: 40 }} />
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
                  {taxaInadimplencia.toFixed(1)}%
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
          <TouchableOpacity style={styles.errorContainer} onPress={carregarVendas}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
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
            {clientesFiltrados.map((item, index) => renderCliente({ item, index }))}
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
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4a1a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#ff4444',
  },
  errorText: {
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
    color: '#b0b0b0',
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
});
