import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Rota {
  id: string;
  nome: string;
  vendedor_nome: string;
  data_criacao: string;
  status: string;
}

export default function RotasScreen() {
  const router = useRouter();
  const [rotas, setRotas] = useState<Rota[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Carregar rotas quando a tela ganhar foco
  useFocusEffect(
    useCallback(() => {
      console.log('🔄 [listar-rotas] Tela ganhou foco, carregando rotas...');
      carregarRotas();
    }, [])
  );

  const carregarRotas = async () => {
    console.log('📥 [listar-rotas] Carregando rotas...');
    setErrorMessage('');

    try {
      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/listar-rotas');
      console.log('📡 [listar-rotas] Response status:', response.status);
      
      const data = await response.json();
      console.log('📦 [listar-rotas] Response data:', data);

      if (response.ok && data.sucesso && Array.isArray(data.rotas)) {
        setRotas(data.rotas);
        console.log(`✅ [listar-rotas] ${data.rotas.length} rotas carregadas`);
      } else {
        throw new Error(data.erro || 'Erro ao carregar rotas');
      }
    } catch (error) {
      console.error('❌ [listar-rotas] Erro ao carregar rotas:', error);
      setErrorMessage('Erro ao carregar rotas. Toque para tentar novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    carregarRotas();
  };

  const renderRota = ({ item }: { item: Rota }) => (
    <TouchableOpacity 
      style={styles.rotaCard}
      onPress={() => {
        console.log('🔍 [listar-rotas] Navegando para rota:', item.id, item.nome);
        router.push({
          pathname: '/(app)/rotas/[id]',
          params: { id: item.id, nome: item.nome }
        });
      }}
    >
      <View style={styles.rotaIcon}>
        <Ionicons name="map-outline" size={24} color="#4CAF50" />
      </View>
      <View style={styles.rotaInfo}>
        <Text style={styles.rotaNome}>{item.nome}</Text>
        <Text style={styles.rotaVendedor}>Vendedor: {item.vendedor_nome}</Text>
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
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minhas Rotas</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Botão Criar Nova Rota */}
      <View style={styles.content}>
        <TouchableOpacity 
          style={styles.createButton}
          onPress={() => router.push('/(app)/rotas/criar')}
        >
          <Ionicons name="add-circle" size={24} color="#ffffff" />
          <Text style={styles.createButtonText}>Criar Nova Rota</Text>
        </TouchableOpacity>

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
        ) : rotas.length > 0 ? (
          <FlatList
            data={rotas}
            renderItem={renderRota}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4CAF50" />
            }
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Ionicons name="map-outline" size={80} color="#666" />
            <Text style={styles.emptyText}>Nenhuma rota cadastrada</Text>
            <Text style={styles.emptySubtext}>
              Crie sua primeira rota para começar
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
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  createButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  list: {
    paddingBottom: 20,
  },
  rotaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  rotaIcon: {
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
  errorContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8d7da',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    alignItems: 'center',
    gap: 8,
  },
  errorText: {
    color: '#721c24',
    fontSize: 14,
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
