import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Cliente {
  id: string;
  nome: string;
  cpfCnpj: string;
  email?: string;
  telefone?: string;
  cidade?: string;
  estado?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
  totalPages: number;
}

export default function AdicionarClienteScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const rotaId = Array.isArray(params.rotaId) ? params.rotaId[0] : params.rotaId;
  const rotaNome = (Array.isArray(params.rotaNome) ? params.rotaNome[0] : params.rotaNome) || 'Rota';

  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [clientesFiltrados, setClientesFiltrados] = useState<Cliente[]>([]);
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    limit: 20,
    total: 0,
    hasMore: false,
    totalPages: 0
  });
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    carregarClientes();
  }, []);

  const carregarClientes = async (page: number = 1, append: boolean = false, searchQuery: string = '') => {
    console.log(`📥 [adicionar-cliente] Carregando clientes da página ${page}...`, searchQuery ? `Busca: "${searchQuery}"` : '');
    
    if (append) {
      setLoadingMore(true);
    } else if (searchQuery !== '') {
      setSearching(true);
    } else {
      setLoading(true);
    }
    setErrorMessage('');

    try {
      let API_URL = `https://agroserver-it9g.onrender.com/api/clientes/listar?page=${page}&limit=20`;
      
      // Se houver busca, adiciona o parâmetro de pesquisa
      if (searchQuery.trim() !== '') {
        API_URL += `&search=${encodeURIComponent(searchQuery)}`;
      }
      
      const response = await fetch(API_URL, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('📡 [adicionar-cliente] Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 [adicionar-cliente] Response data:', JSON.stringify(data, null, 2));

      if (response.ok && data.success && Array.isArray(data.clientes)) {
        const novosClientes = append ? [...clientes, ...data.clientes] : data.clientes;
        setClientes(novosClientes);
        setClientesFiltrados(novosClientes);
        setPagination(data.pagination);
        console.log(`✅ [adicionar-cliente] ${data.clientes.length} clientes carregados (total: ${novosClientes.length})`);
      } else {
        throw new Error('Erro ao carregar clientes');
      }
    } catch (error) {
      console.error('❌ [adicionar-cliente] Erro ao carregar clientes:', error);
      setErrorMessage('Erro ao carregar clientes. Toque para tentar novamente.');
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setSearching(false);
    }
  };

  const carregarMaisClientes = () => {
    if (!loadingMore && pagination.hasMore) {
      carregarClientes(pagination.page + 1, true, searchText);
    }
  };

  const handleSearch = (text: string) => {
    setSearchText(text);
    
    // Limpar timeout anterior
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }
    
    // Debounce: esperar 600ms após usuário parar de digitar
    const timeout = setTimeout(() => {
      console.log('🔍 [adicionar-cliente] Buscando na API:', text);
      if (text.trim() === '') {
        carregarClientes(1, false, '');
      } else {
        carregarClientes(1, false, text);
      }
    }, 600);
    
    setSearchTimeout(timeout);
  };

  const handleSelecionarCliente = (cliente: Cliente) => {
    console.log('🔍 [adicionar-cliente] Cliente selecionado:', cliente.nome);
    // Navegar para tela de seleção de parcelamentos
    router.push({
      pathname: '/rotas/selecionar-parcelamento',
      params: {
        rotaId: rotaId,
        rotaNome: rotaNome,
        clienteId: cliente.id,
        clienteNome: cliente.nome
      }
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

  const renderCliente = ({ item }: { item: Cliente }) => (
    <TouchableOpacity 
      style={styles.clienteCard}
      onPress={() => handleSelecionarCliente(item)}
      activeOpacity={0.7}
    >
      <View style={styles.clienteIconContainer}>
        <Ionicons name="person" size={24} color="#4CAF50" />
      </View>
      <View style={styles.clienteInfo}>
        <Text style={styles.clienteNome}>{item.nome}</Text>
        <Text style={styles.clienteCpfCnpj}>{formatarCpfCnpj(item.cpfCnpj)}</Text>
        {item.email && (
          <Text style={styles.clienteDetalhe}>
            <Ionicons name="mail-outline" size={12} color="#999" /> {item.email}
          </Text>
        )}
        {item.telefone && (
          <Text style={styles.clienteDetalhe}>
            <Ionicons name="call-outline" size={12} color="#999" /> {item.telefone}
          </Text>
        )}
        {item.cidade && item.estado && (
          <Text style={styles.clienteDetalhe}>
            <Ionicons name="location-outline" size={12} color="#999" /> {item.cidade}/{item.estado}
          </Text>
        )}
      </View>
      <View style={styles.clienteAction}>
        <Ionicons name="chevron-forward" size={20} color="#4CAF50" />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <View style={styles.headerTextContainer}>
          <Text style={styles.headerTitle}>Selecionar Cliente</Text>
          <Text style={styles.headerSubtitle}>{rotaNome}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        {/* Barra de Pesquisa */}
        <View style={styles.searchContainer}>
          {searching ? (
            <ActivityIndicator size="small" color="#4CAF50" style={styles.searchIcon} />
          ) : (
            <Ionicons name="search" size={20} color="#b0b0b0" style={styles.searchIcon} />
          )}
          <TextInput
            style={styles.searchInput}
            placeholder="Pesquisar por nome ou CPF/CNPJ..."
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

        {/* Contador de Resultados */}
        {!loading && (
          <View style={styles.resultCountContainer}>
            <Text style={styles.resultCount}>
              {clientesFiltrados.length} {clientesFiltrados.length === 1 ? 'cliente encontrado' : 'clientes encontrados'}
            </Text>
            {pagination.total > 0 && (
              <Text style={styles.paginationInfo}>
                Página {pagination.page} de {pagination.totalPages} • Total: {pagination.total}
              </Text>
            )}
          </View>
        )}

        {/* Mensagem de Erro */}
        {errorMessage ? (
          <TouchableOpacity style={styles.errorContainer} onPress={() => carregarClientes()}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Lista de Clientes */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Carregando clientes...</Text>
          </View>
        ) : clientesFiltrados.length > 0 ? (
          <FlatList
            data={clientesFiltrados}
            renderItem={renderCliente}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            onEndReached={carregarMaisClientes}
            onEndReachedThreshold={0.5}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.loadingMoreContainer}>
                  <ActivityIndicator size="small" color="#4CAF50" />
                  <Text style={styles.loadingMoreText}>Carregando mais...</Text>
                </View>
              ) : pagination.hasMore ? (
                <TouchableOpacity 
                  style={styles.loadMoreButton}
                  onPress={carregarMaisClientes}
                >
                  <Text style={styles.loadMoreText}>Carregar mais clientes</Text>
                </TouchableOpacity>
              ) : null
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="people-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>Nenhum cliente encontrado</Text>
            <Text style={styles.emptySubtext}>
              {searchText ? 'Tente pesquisar com outro termo' : 'Não há clientes cadastrados'}
            </Text>
          </View>
        )}
      </View>

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
  resultCountContainer: {
    marginBottom: 16,
    gap: 4,
  },
  resultCount: {
    fontSize: 14,
    color: '#b0b0b0',
  },
  paginationInfo: {
    fontSize: 12,
    color: '#666',
  },
  list: {
    paddingBottom: 20,
  },
  clienteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
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
  clienteCpfCnpj: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 4,
  },
  clienteDetalhe: {
    fontSize: 12,
    color: '#999',
    marginTop: 2,
  },
  clienteAction: {
    padding: 8,
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
  loadingMoreContainer: {
    paddingVertical: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    color: '#b0b0b0',
    fontSize: 14,
  },
  loadMoreButton: {
    backgroundColor: '#2a2a2a',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  loadMoreText: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
  },
});
