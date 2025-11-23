import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function RegisterScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const handleRegister = async () => {
    // Limpar mensagens anteriores
    setErrorMessage('');
    setSuccessMessage('');

    // Validar senhas
    if (password !== confirmPassword) {
      setErrorMessage('As senhas não coincidem');
      return;
    }

    // Validar campos vazios
    if (!name || !email || !password) {
      setErrorMessage('Preencha todos os campos');
      return;
    }

    setLoading(true);

    try {
      console.log('=== INICIANDO CADASTRO ===');
      console.log('Dados enviados:', {
        nome: name,
        email: email,
        senha: '***',
      });

      const response = await fetch('https://vqdmwevdlmqdtfbfceoc.supabase.co/functions/v1/cadastro', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: name,
          email: email,
          senha: password,
        }),
      });

      console.log('Status da resposta:', response.status);
      console.log('Headers da resposta:', response.headers);

      const data = await response.json();
      console.log('Dados recebidos:', data);

      if (response.ok && data.sucesso) {
        // Sucesso no cadastro
        console.log('✅ Cadastro realizado com sucesso!');
        setSuccessMessage(data.mensagem || 'Cadastro realizado com sucesso!');
        
        // Limpar campos
        setName('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');

        // Redirecionar para login após 2 segundos
        setTimeout(() => {
          router.back();
        }, 2000);
      } else {
        // Erro retornado pela API
        console.log('❌ Erro da API:', data);
        setErrorMessage(data.mensagem || 'Erro ao realizar cadastro');
      }
    } catch (error) {
      console.error('❌ Erro ao cadastrar:', error);
      console.error('Detalhes do erro:', JSON.stringify(error, null, 2));
      setErrorMessage('Erro de conexão. Tente novamente.');
    } finally {
      setLoading(false);
      console.log('=== FIM DO CADASTRO ===');
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* Botão voltar */}
      <TouchableOpacity 
        style={styles.backButton}
        onPress={() => router.back()}
      >
        <Ionicons name="arrow-back" size={24} color="#ffffff" />
      </TouchableOpacity>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Ícone */}
          <View style={styles.iconContainer}>
            <Ionicons name="person-add" size={60} color="#4CAF50" />
          </View>

          {/* Título */}
          <Text style={styles.title}>Criar Conta</Text>
          <Text style={styles.subtitle}>Preencha seus dados para começar</Text>

          {/* Mensagem de Erro */}
          {errorMessage ? (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle" size={20} color="#ff4444" />
              <Text style={styles.errorText}>{errorMessage}</Text>
            </View>
          ) : null}

          {/* Mensagem de Sucesso */}
          {successMessage ? (
            <View style={styles.successContainer}>
              <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
              <Text style={styles.successText}>{successMessage}</Text>
            </View>
          ) : null}

          {/* Campo Nome */}
          <View style={styles.inputContainer}>
            <Ionicons name="person-outline" size={20} color="#b0b0b0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Nome completo"
              placeholderTextColor="#666"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
            />
          </View>

          {/* Campo Email */}
          <View style={styles.inputContainer}>
            <Ionicons name="mail-outline" size={20} color="#b0b0b0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor="#666"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          {/* Campo Senha */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#b0b0b0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor="#666"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons 
                name={showPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#b0b0b0" 
              />
            </TouchableOpacity>
          </View>

          {/* Campo Confirmar Senha */}
          <View style={styles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={20} color="#b0b0b0" style={styles.inputIcon} />
            <TextInput
              style={styles.input}
              placeholder="Confirmar senha"
              placeholderTextColor="#666"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry={!showConfirmPassword}
            />
            <TouchableOpacity onPress={() => setShowConfirmPassword(!showConfirmPassword)}>
              <Ionicons 
                name={showConfirmPassword ? "eye-outline" : "eye-off-outline"} 
                size={20} 
                color="#b0b0b0" 
              />
            </TouchableOpacity>
          </View>

          {/* Botão Cadastrar */}
          <TouchableOpacity 
            style={[styles.button, loading && styles.buttonDisabled]} 
            onPress={handleRegister}
            disabled={loading}
          >
            <Text style={styles.buttonText}>
              {loading ? 'Cadastrando...' : 'Cadastrar'}
            </Text>
          </TouchableOpacity>

          {/* Link Login */}
          <View style={styles.loginContainer}>
            <Text style={styles.loginText}>Já tem uma conta? </Text>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.loginLink}>Entrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 10,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 30,
    paddingTop: 100,
    paddingBottom: 50,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 20,
    backgroundColor: '#2a2a2a',
    padding: 20,
    borderRadius: 50,
  },
  title: {
    fontSize: 32,
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    borderRadius: 12,
    paddingHorizontal: 15,
    marginBottom: 15,
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
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    marginTop: 10,
    marginBottom: 20,
  },
  buttonDisabled: {
    backgroundColor: '#2a5a2d',
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loginText: {
    color: '#b0b0b0',
    fontSize: 14,
  },
  loginLink: {
    color: '#4CAF50',
    fontSize: 14,
    fontWeight: '600',
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
});
