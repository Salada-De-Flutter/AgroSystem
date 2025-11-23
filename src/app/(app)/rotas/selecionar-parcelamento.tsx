import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Parcelamento {
  id: string;
  valor: number;
  numeroParcelas: number;
  descricao: string;
  dataCriacao: string;
  status: string;
}

interface ClienteInfo {
  id: string;
  nome: string;
  cpfCnpj: string;
}

export default function SelecionarParcelamentoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const rotaId = Array.isArray(params.rotaId) ? params.rotaId[0] : params.rotaId;
  const rotaNome = (Array.isArray(params.rotaNome) ? params.rotaNome[0] : params.rotaNome) || 'Rota';
  const clienteId = Array.isArray(params.clienteId) ? params.clienteId[0] : params.clienteId;
  const clienteNome = (Array.isArray(params.clienteNome) ? params.clienteNome[0] : params.clienteNome) || 'Cliente';

  const [parcelamentos, setParcelamentos] = useState<Parcelamento[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [adicionando, setAdicionando] = useState(false);
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [parcelamentoSelecionado, setParcelamentoSelecionado] = useState<Parcelamento | null>(null);

  useEffect(() => {
    carregarParcelamentos();
  }, []);

  const carregarParcelamentos = async () => {
    console.log(`📥 [selecionar-parcelamento] Carregando parcelamentos do cliente ${clienteId}...`);
    setLoading(true);
    setErrorMessage('');

    try {
      const API_URL = `https://agroserver-it9g.onrender.com/api/clientes/${clienteId}/parcelamentos`;
      
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [selecionar-parcelamento] Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 [selecionar-parcelamento] Response data:', JSON.stringify(data, null, 2));

      if (response.ok && data.success) {
        setCliente(data.cliente);
        setParcelamentos(data.parcelamentos || []);
        console.log(`✅ [selecionar-parcelamento] ${data.parcelamentos?.length || 0} parcelamentos carregados`);
      } else {
        throw new Error('Erro ao carregar parcelamentos');
      }
    } catch (error) {
      console.error('❌ [selecionar-parcelamento] Erro ao carregar parcelamentos:', error);
      setErrorMessage('Erro ao carregar parcelamentos. Toque para tentar novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdicionarParcelamento = (parcelamento: Parcelamento) => {
    setParcelamentoSelecionado(parcelamento);
    setShowConfirmModal(true);
  };

  const confirmarAdicao = async () => {
    if (!parcelamentoSelecionado) return;
    
    console.log('🔍 [selecionar-parcelamento] Adicionando parcelamento:', parcelamentoSelecionado.id);
    setShowConfirmModal(false);
    setAdicionando(true);

    try {
      const API_URL = 'https://agroserver-it9g.onrender.com/api/rota/adicionar-parcelamento';
      
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rota_id: rotaId,
          parcelamento_id: parcelamentoSelecionado.id
        })
      });

      const data = await response.json();
      console.log('📦 [selecionar-parcelamento] Response:', data);

      if (response.ok) {
        console.log('✅ [selecionar-parcelamento] Parcelamento adicionado com sucesso');
        setShowSuccessModal(true);
      } else {
        throw new Error(data.message || 'Erro ao adicionar parcelamento');
      }
    } catch (error: any) {
      console.error('❌ [selecionar-parcelamento] Erro:', error);
      setErrorMsg(error.message || 'Erro ao adicionar parcelamento à rota');
      setShowErrorModal(true);
    } finally {
      setAdicionando(false);
    }
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

  const getStatusColor = (status: string) => {
    if (!status) {
      return { cor: '#999', corFundo: '#2a2a2a', texto: 'N/A' };
    }
    
    switch (status.toLowerCase()) {
      case 'active':
        return { cor: '#4CAF50', corFundo: '#1a3a1a', texto: 'Ativo' };
      case 'paid':
        return { cor: '#2196F3', corFundo: '#1a2a3a', texto: 'Pago' };
      case 'overdue':
        return { cor: '#ff4444', corFundo: '#3a1a1a', texto: 'Vencido' };
      default:
        return { cor: '#999', corFundo: '#2a2a2a', texto: status };
    }
  };

  const renderParcelamento = ({ item }: { item: Parcelamento }) => {
    const statusInfo = getStatusColor(item.status);
    const valorParcela = item.valor / item.numeroParcelas;

    return (
      <TouchableOpacity 
        style={styles.parcelamentoCard}
        onPress={() => handleAdicionarParcelamento(item)}
        activeOpacity={0.7}
        disabled={adicionando}
      >
        <View style={styles.parcelamentoHeader}>
          <View style={[styles.parcelamentoIconContainer, { backgroundColor: statusInfo.corFundo }]}>
            <Ionicons name="card" size={24} color={statusInfo.cor} />
          </View>
          <View style={styles.parcelamentoInfo}>
            <Text style={styles.parcelamentoDescricao}>{item.descricao}</Text>
            <View style={styles.parcelamentoDetalhes}>
              <Text style={styles.parcelamentoParcelas}>
                {item.numeroParcelas}x {formatarValor(valorParcela)}
              </Text>
              <Text style={styles.parcelamentoSeparator}> • </Text>
              <Text style={styles.parcelamentoTotal}>
                Total: {formatarValor(item.valor)}
              </Text>
            </View>
            <Text style={styles.parcelamentoData}>
              <Ionicons name="calendar-outline" size={12} color="#999" /> {formatarData(item.dataCriacao)}
            </Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.corFundo }]}>
            <Text style={[styles.statusText, { color: statusInfo.cor }]}>
              {statusInfo.texto}
            </Text>
          </View>
        </View>
        <View style={styles.adicionarIndicator}>
          <Ionicons name="add-circle-outline" size={20} color="#4CAF50" />
          <Text style={styles.adicionarText}>Tocar para adicionar</Text>
        </View>
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
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Selecionar Parcelamento</Text>
          <Text style={styles.headerSubtitle}>{clienteNome}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Info da Rota */}
        <View style={styles.infoCard}>
          <Ionicons name="map" size={20} color="#4CAF50" />
          <Text style={styles.infoText}>Adicionando à rota: <Text style={styles.infoDestaque}>{rotaNome}</Text></Text>
        </View>

        {/* Mensagem de Erro */}
        {errorMessage ? (
          <TouchableOpacity style={styles.errorContainer} onPress={() => carregarParcelamentos()}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Lista de Parcelamentos */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Carregando parcelamentos...</Text>
          </View>
        ) : parcelamentos.length > 0 ? (
          <>
            <Text style={styles.sectionTitle}>
              {parcelamentos.length} {parcelamentos.length === 1 ? 'parcelamento disponível' : 'parcelamentos disponíveis'}
            </Text>
            <FlatList
              data={parcelamentos}
              renderItem={renderParcelamento}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
            />
          </>
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="card-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>Nenhum parcelamento encontrado</Text>
            <Text style={styles.emptySubtext}>
              Este cliente não possui parcelamentos ativos
            </Text>
          </View>
        )}
      </View>

      {/* Loading Overlay ao adicionar */}
      {adicionando && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingOverlayContent}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingOverlayText}>Adicionando parcelamento...</Text>
          </View>
        </View>
      )}

      {/* Modal de Confirmação */}
      <Modal
        visible={showConfirmModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="help-circle" size={48} color="#FFA500" />
            <Text style={styles.modalTitle}>Adicionar Parcelamento</Text>
            {parcelamentoSelecionado && (
              <Text style={styles.modalMessage}>
                Deseja adicionar o parcelamento "{parcelamentoSelecionado.descricao}" ({parcelamentoSelecionado.numeroParcelas}x {formatarValor(parcelamentoSelecionado.valor / parcelamentoSelecionado.numeroParcelas)}) à rota {rotaNome}?
              </Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonCancel]}
                onPress={() => setShowConfirmModal(false)}
              >
                <Text style={styles.modalButtonTextCancel}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={[styles.modalButton, styles.modalButtonConfirm]}
                onPress={confirmarAdicao}
              >
                <Text style={styles.modalButtonTextConfirm}>Adicionar</Text>
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
        onRequestClose={() => {
          setShowSuccessModal(false);
          // Voltar 2 vezes: sai da tela de parcelamentos e da tela de seleção de clientes
          router.back();
          setTimeout(() => router.back(), 100);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Ionicons name="checkmark-circle" size={48} color="#4CAF50" />
            <Text style={styles.modalTitle}>Sucesso!</Text>
            <Text style={styles.modalMessage}>
              Parcelamento adicionado à rota com sucesso.
            </Text>
            <TouchableOpacity 
              style={[styles.modalButton, styles.modalButtonConfirm, { width: '100%' }]}
              onPress={() => {
                setShowSuccessModal(false);
                // Voltar 2 vezes: sai da tela de parcelamentos e da tela de seleção de clientes
                router.back();
                setTimeout(() => router.back(), 100);
              }}
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
  headerTextContainer: {
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#b0b0b0',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
    gap: 10,
  },
  infoText: {
    color: '#b0b0b0',
    fontSize: 14,
    flex: 1,
  },
  infoDestaque: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 20,
  },
  parcelamentoCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  parcelamentoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  parcelamentoIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#1a3a1a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  parcelamentoInfo: {
    flex: 1,
  },
  parcelamentoDescricao: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  parcelamentoDetalhes: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  parcelamentoParcelas: {
    fontSize: 14,
    color: '#4CAF50',
    fontWeight: '600',
  },
  parcelamentoSeparator: {
    fontSize: 14,
    color: '#666',
  },
  parcelamentoTotal: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  parcelamentoData: {
    fontSize: 12,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  adicionarIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
    gap: 6,
  },
  adicionarText: {
    fontSize: 13,
    color: '#4CAF50',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
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
});
