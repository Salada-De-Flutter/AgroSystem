import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface Vendedor {
  id: string;
  nome: string;
}

export default function CriarRotaScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [vendedorId, setVendedorId] = useState('');
  const [vendedorSelecionado, setVendedorSelecionado] = useState<Vendedor | null>(null);
  const [vendedores, setVendedores] = useState<Vendedor[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingVendedores, setLoadingVendedores] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [mostrarVendedores, setMostrarVendedores] = useState(false);

  // Carregar vendedores quando a tela entrar em foco
  useFocusEffect(
    useCallback(() => {
      carregarVendedores();
    }, [])
  );

  const carregarVendedores = async () => {
    console.log('=== CARREGANDO VENDEDORES ===');
    setLoadingVendedores(true);

    try {
      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/listar-vendedores');
      console.log('📥 Status da resposta:', response.status);

      const data = await response.json();
      console.log('📦 Vendedores recebidos:', JSON.stringify(data, null, 2));

      if (response.ok && data.sucesso) {
        setVendedores(data.vendedores);
        console.log(`✅ ${data.vendedores.length} vendedores carregados`);
      } else {
        console.log('❌ Erro ao carregar vendedores:', data.mensagem);
        setErrorMessage('Erro ao carregar vendedores');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar vendedores:', error);
      setErrorMessage('Erro de conexão ao carregar vendedores');
    } finally {
      setLoadingVendedores(false);
    }
  };

  const selecionarVendedor = (vendedor: Vendedor) => {
    console.log('Vendedor selecionado:', vendedor.nome);
    setVendedorSelecionado(vendedor);
    setVendedorId(vendedor.id);
    setMostrarVendedores(false);
  };

  const handleSalvar = async () => {
    console.log('=== INICIANDO CRIAÇÃO DE ROTA ===');
    setErrorMessage('');
    setSuccessMessage('');

    if (!nome.trim()) {
      console.log('❌ Erro: Nome vazio');
      setErrorMessage('Por favor, informe o nome da rota');
      return;
    }

    if (!vendedorId) {
      console.log('❌ Erro: Vendedor não selecionado');
      setErrorMessage('Por favor, selecione um vendedor');
      return;
    }

    console.log('📤 Enviando requisição para API...');
    console.log('Nome da rota:', nome.trim());
    console.log('Vendedor ID:', vendedorId);

    setLoading(true);

    try {
      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/criar-rota', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
          vendedor_id: vendedorId,
        }),
      });

      console.log('📥 Resposta recebida - Status:', response.status);

      const data = await response.json();
      console.log('📦 Dados retornados:', JSON.stringify(data, null, 2));

      if (response.ok && data.sucesso) {
        console.log('✅ Rota criada com sucesso!');
        console.log('ID da rota:', data.rota?.id);
        console.log('Nome da rota:', data.rota?.nome);

        // Mostrar mensagem de sucesso
        setSuccessMessage(`Rota "${data.rota?.nome}" criada com sucesso!`);

        // Limpar campos
        setNome('');
        setVendedorId('');
        setVendedorSelecionado(null);

        // Aguardar 2 segundos e voltar para home
        setTimeout(() => {
          console.log('🏠 Redirecionando para home');
          router.replace('/(app)/home');
        }, 2000);
      } else {
        console.log('❌ Erro na criação:', data.mensagem);
        setErrorMessage(data.mensagem || 'Erro ao criar rota');
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      setErrorMessage('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
      console.log('=== FIM DA CRIAÇÃO ===');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Criar Nova Rota</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Mensagem de Sucesso */}
          {successMessage ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Mensagem de Erro */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ff4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Campo Nome */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nome da Rota *</Text>
            <View style={styles.inputContainer}>
              <Ionicons name="map-outline" size={20} color="#b0b0b0" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Ex: Rota Centro-Norte"
                placeholderTextColor="#666"
                value={nome}
                onChangeText={setNome}
                autoFocus
              />
            </View>
          </View>

          {/* Seleção de Vendedor */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Vendedor *</Text>
            {loadingVendedores ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color="#4CAF50" />
                <Text style={styles.loadingText}>Carregando vendedores...</Text>
              </View>
            ) : vendedores.length === 0 ? (
              <View style={styles.emptyVendedoresContainer}>
                <Text style={styles.emptyVendedoresText}>
                  Nenhum vendedor cadastrado. Cadastre um vendedor primeiro.
                </Text>
              </View>
            ) : (
              <>
                <TouchableOpacity 
                  style={styles.selectContainer}
                  onPress={() => setMostrarVendedores(!mostrarVendedores)}
                >
                  <Ionicons name="person-outline" size={20} color="#b0b0b0" style={styles.inputIcon} />
                  <Text style={[styles.selectText, vendedorSelecionado && styles.selectTextActive]}>
                    {vendedorSelecionado ? vendedorSelecionado.nome : 'Selecione um vendedor'}
                  </Text>
                  <Ionicons 
                    name={mostrarVendedores ? "chevron-up" : "chevron-down"} 
                    size={20} 
                    color="#b0b0b0" 
                  />
                </TouchableOpacity>

                {/* Lista de Vendedores */}
                {mostrarVendedores && (
                  <View style={styles.vendedoresList}>
                    {vendedores.map((vendedor) => (
                      <TouchableOpacity
                        key={vendedor.id}
                        style={[
                          styles.vendedorItem,
                          vendedorId === vendedor.id && styles.vendedorItemSelected
                        ]}
                        onPress={() => selecionarVendedor(vendedor)}
                      >
                        <Ionicons 
                          name={vendedorId === vendedor.id ? "checkmark-circle" : "person-circle-outline"} 
                          size={24} 
                          color={vendedorId === vendedor.id ? "#4CAF50" : "#b0b0b0"} 
                        />
                        <Text style={[
                          styles.vendedorNome,
                          vendedorId === vendedor.id && styles.vendedorNomeSelected
                        ]}>
                          {vendedor.nome}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </>
            )}
          </View>

          {/* Botão Salvar */}
          <TouchableOpacity 
            style={[styles.saveButton, loading && styles.saveButtonDisabled]}
            onPress={handleSalvar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                <Text style={styles.saveButtonText}>Criar Rota</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
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
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  successContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a3a1a',
    padding: 12,
    borderRadius: 8,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#4CAF50',
  },
  successText: {
    color: '#66ff66',
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    paddingVertical: 15,
  },
  textAreaContainer: {
    alignItems: 'flex-start',
    paddingTop: 15,
  },
  textArea: {
    minHeight: 100,
    paddingTop: 0,
  },
  loadingContainer: {
    flexDirection: 'row',
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#333',
  },
  loadingText: {
    color: '#b0b0b0',
    fontSize: 14,
  },
  emptyVendedoresContainer: {
    backgroundColor: '#2a2a2a',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  emptyVendedoresText: {
    color: '#ff9800',
    fontSize: 14,
    textAlign: 'center',
  },
  selectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 15,
    borderWidth: 1,
    borderColor: '#333',
  },
  selectText: {
    flex: 1,
    fontSize: 16,
    color: '#666',
  },
  selectTextActive: {
    color: '#ffffff',
  },
  vendedoresList: {
    marginTop: 8,
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    maxHeight: 200,
  },
  vendedorItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  vendedorItemSelected: {
    backgroundColor: '#1e4620',
  },
  vendedorNome: {
    fontSize: 16,
    color: '#ffffff',
    flex: 1,
  },
  vendedorNomeSelected: {
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#2a5a2d',
    opacity: 0.7,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
