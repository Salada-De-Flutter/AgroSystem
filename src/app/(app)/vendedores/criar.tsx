import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function CriarVendedorScreen() {
  const router = useRouter();
  const [nome, setNome] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleCadastrar = async () => {
    console.log('=== INICIANDO CADASTRO DE VENDEDOR ===');
    setErrorMessage('');
    setSuccessMessage('');

    if (!nome.trim()) {
      console.log('❌ Erro: Nome vazio');
      setErrorMessage('Por favor, informe o nome do vendedor');
      return;
    }

    console.log('📤 Enviando requisição para API...');
    console.log('Nome do vendedor:', nome.trim());
    
    setLoading(true);

    try {
      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/criar-vendedor', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: nome.trim(),
        }),
      });

      console.log('📥 Resposta recebida - Status:', response.status);

      const data = await response.json();
      console.log('📦 Dados retornados:', JSON.stringify(data, null, 2));

      if (response.ok && data.sucesso) {
        console.log('✅ Vendedor cadastrado com sucesso!');
        console.log('ID do vendedor:', data.vendedor?.id);
        console.log('Nome do vendedor:', data.vendedor?.nome);
        
        // Mostrar mensagem de sucesso na tela
        setSuccessMessage(`Vendedor "${data.vendedor?.nome}" cadastrado com sucesso!`);
        
        // Limpar o campo
        setNome('');
        
        // Aguardar 2 segundos e voltar para home
        setTimeout(() => {
          console.log('🏠 Redirecionando para home');
          router.replace('/(app)/home');
        }, 2000);
      } else {
        console.log('❌ Erro no cadastro:', data.mensagem);
        setErrorMessage(data.mensagem || 'Erro ao cadastrar vendedor');
      }
    } catch (error) {
      console.error('❌ Erro na requisição:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      setErrorMessage('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
      console.log('=== FIM DO CADASTRO ===');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Cadastrar Vendedor</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView 
        style={styles.content}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.form}>
          {/* Ícone */}
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={60} color="#4CAF50" />
          </View>

          <Text style={styles.title}>Novo Vendedor</Text>
          <Text style={styles.subtitle}>Informe o nome do vendedor</Text>

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
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#b0b0b0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="#666"
              value={nome}
              onChangeText={setNome}
              autoCapitalize="words"
              autoFocus
            />
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleCadastrar}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                <Text style={styles.buttonText}>Cadastrar</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
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
    justifyContent: 'center',
    padding: 30,
  },
  form: {
    width: '100%',
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: 40,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 30,
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
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  buttonDisabled: {
    backgroundColor: '#2a5a2d',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
