import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Rota {
  id: string;
  nome: string;
  vendedor_nome: string;
  data_criacao: string;
  status: string;
}

export default function RelatoriosScreen() {
  const router = useRouter();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [rotasFiltradas, setRotasFiltradas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [searchText, setSearchText] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Carregar rotas quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [relatorios] Tela ganhou foco, carregando rotas...');
      carregarRotas();
    }, [])
  );

  const carregarRotas = async () => {
    console.log('📥 [relatorios] Carregando rotas...');
    setErrorMessage('');

    try {
      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/listar-rotas');
      console.log('📡 [relatorios] Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 [relatorios] Response data:', data);

      if (response.ok && data.sucesso && Array.isArray(data.rotas)) {
        setRotas(data.rotas);
        setRotasFiltradas(data.rotas);
        console.log(`✅ [relatorios] ${data.rotas.length} rotas carregadas`);
      } else {
        throw new Error(data.erro || 'Erro ao carregar rotas');
      }
    } catch (error) {
      console.error('❌ [relatorios] Erro ao carregar rotas:', error);
      setErrorMessage('Erro ao carregar rotas. Toque para tentar novamente.');
    } finally {
      setLoading(false);
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
      setSearching(true);
      console.log('🔍 [relatorios] Filtrando rotas:', text);
      
      if (text.trim() === '') {
        setRotasFiltradas(rotas);
      } else {
        const filtradas = rotas.filter(rota => 
          rota.nome.toLowerCase().includes(text.toLowerCase())
        );
        setRotasFiltradas(filtradas);
        console.log(`🔍 [relatorios] ${filtradas.length} rotas encontradas para "${text}"`);
      }
      
      setSearching(false);
    }, 600);
    
    setSearchTimeout(timeout);
  };

  const formatarData = (dataISO: string) => {
    const data = new Date(dataISO);
    return data.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderRota = ({ item }: { item: Rota }) => (
    <TouchableOpacity 
      style={styles.rotaCard}
      onPress={() => router.push({
        pathname: '/(app)/rotas/[id]',
        params: { id: item.id, nome: item.nome }
      })}
    >
      <View style={styles.rotaHeader}>
        <View style={styles.rotaIconContainer}>
          <Ionicons name="map" size={24} color="#4CAF50" />
        </View>
        <View style={styles.rotaInfo}>
          <Text style={styles.rotaNome}>{item.nome}</Text>
          <Text style={styles.rotaVendedor}>
            <Ionicons name="person" size={14} color="#b0b0b0" /> {item.vendedor_nome}
          </Text>
        </View>
        <View style={[
          styles.statusBadge,
          { backgroundColor: item.status === 'Ativa' ? '#1a3a1a' : '#3a1a1a' }
        ]}>
          <Text style={[
            styles.statusText,
            { color: item.status === 'Ativa' ? '#4CAF50' : '#ff4444' }
          ]}>
            {item.status}
          </Text>
        </View>
      </View>
      <View style={styles.rotaFooter}>
        <Ionicons name="calendar-outline" size={14} color="#666" />
        <Text style={styles.rotaData}>{formatarData(item.data_criacao)}</Text>
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
        <Text style={styles.headerTitle}>Relatórios de Rotas</Text>
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
            placeholder="Pesquisar por nome da rota..."
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
          <Text style={styles.resultCount}>
            {rotasFiltradas.length} {rotasFiltradas.length === 1 ? 'rota encontrada' : 'rotas encontradas'}
          </Text>
        )}

        {/* Mensagem de Erro */}
        {errorMessage ? (
          <TouchableOpacity style={styles.errorContainer} onPress={carregarRotas}>
            <Ionicons name="alert-circle" size={20} color="#ff4444" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </TouchableOpacity>
        ) : null}

        {/* Lista de Rotas */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Carregando rotas...</Text>
          </View>
        ) : rotasFiltradas.length > 0 ? (
          <FlatList
            data={rotasFiltradas}
            renderItem={renderRota}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="search-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>
              {searchText ? 'Nenhuma rota encontrada' : 'Nenhuma rota cadastrada'}
            </Text>
            <Text style={styles.emptySubtext}>
              {searchText ? 'Tente pesquisar com outro termo' : 'Crie uma rota para começar'}
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
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
    marginBottom: 12,
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
  resultCount: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 16,
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
  list: {
    paddingBottom: 20,
  },
  rotaCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  rotaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  rotaIconContainer: {
    width: 48,
    height: 48,
    backgroundColor: '#1a3a1a',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  rotaInfo: {
    flex: 1,
  },
  rotaNome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  rotaVendedor: {
    fontSize: 14,
    color: '#b0b0b0',
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
  rotaFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#333',
  },
  rotaData: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
});
