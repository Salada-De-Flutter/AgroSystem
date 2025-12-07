import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Redirect, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Animated, PanResponder, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardData {
  metricasFinanceiras: {
    faturamentoTotal: number;
    receitaRecebida: number;
    receitaAReceber: number;
    receitaVencida: number;
    taxaInadimplencia: number;
  };
  indicadoresOperacionais: {
    totalClientes: number;
    novosClientesMes: number;
    totalVendas: number;
    totalRotas: number;
    totalVendedores: number;
    ticketMedio: number;
  };
  analiseParcelas: {
    pagas: {
      quantidade: number;
      valor: number;
    };
    aVencer: {
      quantidade: number;
      valor: number;
    };
    vencidas: {
      quantidade: number;
      valor: number;
    };
  };
  alertas: {
    parcelasVencendoHoje: number;
    clientesAtraso30Dias: number;
    maioresDevedores: Array<{
      clienteId: string;
      nomeCliente: string;
      valorDevido: number;
    }>;
  };
}

const DASHBOARD_CACHE_KEY = '@dashboard_data';
const CACHE_EXPIRY_TIME = 30 * 60 * 1000; // 30 minutos
const DRAWER_WIDTH = 280;

export default function HomeScreen() {
  const router = useRouter();
  const { usuario, logout, isAuthenticated, loading } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [errorDashboard, setErrorDashboard] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [usingCachedData, setUsingCachedData] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerPosition, setDrawerPosition] = useState(-DRAWER_WIDTH);
const drawerTranslateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
const overlayOpacity = useRef(new Animated.Value(0)).current;
const rotateAnim = useRef(new Animated.Value(0)).current;

  // Sincronização manual do drawerPosition nos PanResponders

const formatarValor = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    });
  };

  // Formatação melhorada para valores grandes
  const formatarValorResponsivo = (valor: number) => {
    return valor.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  };

  // Formatação para números inteiros
  const formatarNumero = (numero: number) => {
    return numero.toLocaleString('pt-BR');
  };

  // Salvar dados no cache
  const salvarDadosCache = async (data: DashboardData) => {
    try {
      const cacheData = {
        data,
        timestamp: Date.now(),
        userId: usuario?.id
      };
      await AsyncStorage.setItem(DASHBOARD_CACHE_KEY, JSON.stringify(cacheData));
      console.log('[CACHE] Dados salvos no cache');
    } catch (error) {
      console.error('[CACHE] Erro ao salvar no cache:', error);
    }
  };

  // Carregar dados do cache
  const carregarDadosCache = async (): Promise<DashboardData | null> => {
    try {
      const cachedString = await AsyncStorage.getItem(DASHBOARD_CACHE_KEY);
      if (!cachedString) return null;

      const cached = JSON.parse(cachedString);
      const isExpired = Date.now() - cached.timestamp > CACHE_EXPIRY_TIME;
      const isDifferentUser = cached.userId !== usuario?.id;

      if (isExpired || isDifferentUser) {
        console.log('[CACHE] Cache expirado ou usuário diferente');
        await AsyncStorage.removeItem(DASHBOARD_CACHE_KEY);
        return null;
      }

      console.log('[CACHE] Dados carregados do cache');
      return cached.data;
    } catch (error) {
      console.error('[CACHE] Erro ao carregar cache:', error);
      return null;
    }
  };

  // Animação circular simples e simétrica
  const startRotateAnimation = () => {
    rotateAnim.setValue(0);
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      { resetBeforeIteration: true }
    ).start();
  };

  const stopRotateAnimation = () => {
    rotateAnim.stopAnimation();
    rotateAnim.setValue(0);
  };

  const carregarDashboard = async (forceRefresh: boolean = false) => {
    if (!usuario?.id) return;

    // Se não for refresh forçado, tentar carregar do cache primeiro
    if (!forceRefresh) {
      setLoadingDashboard(true);
      setErrorDashboard(null);
      setUsingCachedData(false);
      
      const cachedData = await carregarDadosCache();
      if (cachedData) {
        setDashboardData(cachedData);
        setUsingCachedData(true);
        setLoadingDashboard(false);
        console.log('[DASHBOARD] Usando dados do cache, carregando dados atualizados...');
        
        // Carregar dados frescos em background
        setIsRefreshing(true);
        await carregarDashboardAPI();
        setIsRefreshing(false);
        return;
      }
    } else {
      setIsRefreshing(true);
    }

    setLoadingDashboard(!forceRefresh);
    setErrorDashboard(null);
    await carregarDashboardAPI();
    setIsRefreshing(false);
  };

  const carregarDashboardAPI = async () => {
    if (!usuario?.id) return;

    try {
      const response = await fetch('https://agroserver-it9g.onrender.com/api/dashboard/metricas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          usuario_id: usuario.id,
          // data_inicio e data_fim são opcionais - API usa padrões
        }),
      });

      // Verificar se a resposta é válida antes de tentar fazer parse
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[DASHBOARD] Resposta de erro da API:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText.substring(0, 200) // Primeiros 200 caracteres para debug
        });
        throw new Error(`Erro do servidor: ${response.status} - ${response.statusText}`);
      }

      const responseText = await response.text();
      console.log('[DASHBOARD] Resposta da API (primeiros 200 chars):', responseText.substring(0, 200));

      // Tentar fazer parse do JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[DASHBOARD] Erro ao fazer parse do JSON:', parseError);
        console.error('[DASHBOARD] Resposta recebida:', responseText.substring(0, 500));
        throw new Error('Resposta da API não é um JSON válido. Servidor pode estar retornando HTML.');
      }

      if (result.success) {
        console.log('[DASHBOARD] Dados completos recebidos:', JSON.stringify(result.data, null, 2));
        console.log('[DASHBOARD] Usuario ID usado na requisição:', usuario.id);
        
        // Verificar se todos os valores são zero
        const metrics = result.data.metricasFinanceiras;
        const isAllZero = metrics.faturamentoTotal === 0 && 
                         metrics.receitaRecebida === 0 && 
                         metrics.receitaAReceber === 0 && 
                         result.data.indicadoresOperacionais.totalClientes === 0;
        
        if (isAllZero) {
          console.log('[DASHBOARD] ⚠️  Todos os valores estão zerados. Possíveis causas:');
          console.log('[DASHBOARD] - Usuário não tem dados cadastrados');
          console.log('[DASHBOARD] - Banco de dados vazio');
          console.log('[DASHBOARD] - Problema na consulta SQL do backend');
          console.log('[DASHBOARD] - Usuario ID não encontrado no banco:', usuario.id);
        }
        
        setDashboardData(result.data);
        setUsingCachedData(false);
        
        // Salvar no cache
        await salvarDadosCache(result.data);
        
        console.log('[DASHBOARD] Métricas carregadas:', result.performance?.tempoProcessamento);
      } else {
        throw new Error(result.message || 'Erro ao carregar dashboard');
      }
    } catch (error: any) {
      console.error('[DASHBOARD] Erro:', error);
      setErrorDashboard(error.message || 'Erro ao carregar dados do dashboard');
    } finally {
      setLoadingDashboard(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && usuario?.id) {
      carregarDashboard();
    }
  }, [isAuthenticated, usuario?.id]);

  // Controlar animação baseado no estado de refresh
  useEffect(() => {
    if (isRefreshing) {
      startRotateAnimation();
    } else {
      stopRotateAnimation();
    }
  }, [isRefreshing]);

  // Funções do Drawer
  const openDrawer = () => {
    setDrawerOpen(true);
    setDrawerPosition(0);
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0.5,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeDrawer = () => {
    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setDrawerOpen(false);
      setDrawerPosition(-DRAWER_WIDTH);
      // Resetar posições para o próximo uso
      drawerTranslateX.setValue(-DRAWER_WIDTH);
      overlayOpacity.setValue(0);
    });
  };

  // PanResponder para abrir o drawer (tela principal)
  const openPanResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { pageX } = evt.nativeEvent;
        const { dx, dy } = gestureState;
        
        // Só para abrir: borda esquerda + movimento direita
        return !drawerOpen && pageX < 50 && dx > 5 && Math.abs(dx) > Math.abs(dy);
      },
      onPanResponderGrant: () => {
        drawerTranslateX.stopAnimation();
        overlayOpacity.stopAnimation();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Abrindo: começando de -280, movendo para direita
        const newPosition = Math.max(-DRAWER_WIDTH, Math.min(0, -DRAWER_WIDTH + gestureState.dx));
        drawerTranslateX.setValue(newPosition);
        
        const progress = (DRAWER_WIDTH + newPosition) / DRAWER_WIDTH;
        overlayOpacity.setValue(progress * 0.5);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newPosition = Math.max(-DRAWER_WIDTH, Math.min(0, -DRAWER_WIDTH + gestureState.dx));
        setDrawerPosition(newPosition);
        const shouldOpen = newPosition > -DRAWER_WIDTH * 0.85; // 85% fechado = abre (super sensível)
        
        if (shouldOpen) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
    })
  ).current;

  // PanResponder para fechar o drawer (dentro do drawer)
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const { dx, dy } = gestureState;
        
        // Capturar qualquer movimento horizontal no drawer
        return Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 3;
      },
      onPanResponderGrant: () => {
        drawerTranslateX.stopAnimation();
        overlayOpacity.stopAnimation();
      },
      onPanResponderMove: (evt, gestureState) => {
        // Fechando: permitir movimento para esquerda (dx negativo)
        const newPosition = Math.max(-DRAWER_WIDTH, Math.min(0, gestureState.dx));
        drawerTranslateX.setValue(newPosition);
        
        const progress = (DRAWER_WIDTH + newPosition) / DRAWER_WIDTH;
        overlayOpacity.setValue(progress * 0.5);
      },
      onPanResponderRelease: (evt, gestureState) => {
        const newPosition = Math.max(-DRAWER_WIDTH, Math.min(0, gestureState.dx));
        setDrawerPosition(newPosition);
        const shouldOpen = newPosition > -DRAWER_WIDTH * 0.15; // 15% fechado = abre (super sensível)
        
        if (shouldOpen) {
          openDrawer();
        } else {
          closeDrawer();
        }
      },
    })
  ).current;

  // Mostrar loading enquanto verifica autenticação
  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!isAuthenticated) {
    return <Redirect href="/auth/login" />;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  return (
    <View style={styles.container}>
      {/* Drawer Overlay */}
      {drawerOpen && (
        <Animated.View 
          style={[styles.overlay, { opacity: overlayOpacity }]}
        >
          <TouchableOpacity 
            style={styles.overlayTouchable}
            onPress={closeDrawer}
            activeOpacity={1}
          />
        </Animated.View>
      )}

      {/* Drawer */}
      <Animated.View 
        style={[
          styles.drawer, 
          { transform: [{ translateX: drawerTranslateX }] }
        ]}
      >
        <View style={styles.drawerHeader}>
          <Text style={styles.drawerTitle}>Menu</Text>
          <TouchableOpacity onPress={closeDrawer} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        <ScrollView 
          style={styles.drawerContent} 
          showsVerticalScrollIndicator={false}
          {...panResponder.panHandlers}
        >
          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              router.push('/(app)/rotas/criar');
            }}
          >
            <View style={[styles.drawerIconContainer, { backgroundColor: '#1a3a1a' }]}>
              <Ionicons name="add-circle-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.drawerTextContainer}>
              <Text style={styles.drawerItemTitle}>Criar Nova Rota</Text>
              <Text style={styles.drawerItemSubtitle}>Adicionar uma nova rota</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              router.push('/(app)/vendedores/criar');
            }}
          >
            <View style={[styles.drawerIconContainer, { backgroundColor: '#1a3a1a' }]}>
              <Ionicons name="person-add-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.drawerTextContainer}>
              <Text style={styles.drawerItemTitle}>Cadastrar Vendedor</Text>
              <Text style={styles.drawerItemSubtitle}>Adicionar novo vendedor</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              router.push('/(app)/rotas/listar');
            }}
          >
            <View style={[styles.drawerIconContainer, { backgroundColor: '#1a3a1a' }]}>
              <Ionicons name="list-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.drawerTextContainer}>
              <Text style={styles.drawerItemTitle}>Listar Rotas</Text>
              <Text style={styles.drawerItemSubtitle}>Ver todas as rotas</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              router.push('/(app)/relatorios');
            }}
          >
            <View style={[styles.drawerIconContainer, { backgroundColor: '#1a3a1a' }]}>
              <Ionicons name="stats-chart-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.drawerTextContainer}>
              <Text style={styles.drawerItemTitle}>Relatórios</Text>
              <Text style={styles.drawerItemSubtitle}>Visualizar relatórios</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              // TODO: Adicionar navegação para estoque quando existir
            }}
          >
            <View style={[styles.drawerIconContainer, { backgroundColor: '#1a3a1a' }]}>
              <Ionicons name="cube-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.drawerTextContainer}>
              <Text style={styles.drawerItemTitle}>Estoque</Text>
              <Text style={styles.drawerItemSubtitle}>Gerenciar estoque</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.drawerDivider} />

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              // Adicionar navegação para configurações quando existir
            }}
          >
            <View style={[styles.drawerIconContainer, { backgroundColor: '#1a3a1a' }]}>
              <Ionicons name="settings-outline" size={24} color="#4CAF50" />
            </View>
            <View style={styles.drawerTextContainer}>
              <Text style={styles.drawerItemTitle}>Configurações</Text>
              <Text style={styles.drawerItemSubtitle}>Ajustes do app</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.drawerItem}
            onPress={() => {
              closeDrawer();
              handleLogout();
            }}
          >
            <View style={[styles.drawerIconContainer, { backgroundColor: '#3a1a1a' }]}>
              <Ionicons name="log-out-outline" size={24} color="#ff4444" />
            </View>
            <View style={styles.drawerTextContainer}>
              <Text style={styles.drawerItemTitle}>Sair</Text>
              <Text style={styles.drawerItemSubtitle}>Fazer logout</Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>

      {/* Container principal com detector de gesto apenas para abrir */}
      <View style={styles.mainContainer} {...openPanResponder.panHandlers}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Olá,</Text>
          <Text style={styles.userName}>{usuario?.nome || 'Usuário'}</Text>
        </View>
      </View>

      {/* Conteúdo principal */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Loading do Dashboard */}
        {loadingDashboard && (
          <View style={styles.loadingDashboard}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Carregando dashboard...</Text>
          </View>
        )}

        {/* Erro do Dashboard */}
        {errorDashboard && (
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={24} color="#ff4444" />
            <Text style={styles.errorText}>{errorDashboard}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={() => carregarDashboard(true)}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Dashboard - Métricas Financeiras */}
        {dashboardData && (
          <>
            {/* Indicador de Cache e Botão Refresh */}
            <View style={styles.dashboardHeader}>
              <Text style={styles.sectionTitle}>Visão Geral Financeira</Text>
              <View style={styles.refreshContainer}>
                {usingCachedData && (
                  <View style={styles.cacheIndicator}>
                    <Ionicons name="time" size={16} color="#FFA500" />
                    <Text style={styles.cacheText}>Cache</Text>
                  </View>
                )}
                <TouchableOpacity 
                  style={[styles.refreshButton, isRefreshing && styles.refreshButtonActive]} 
                  onPress={() => carregarDashboard(true)}
                  disabled={isRefreshing}
                >
                  <Animated.View
                    style={{
                      transform: [{
                        rotate: rotateAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0deg', '360deg']
                        })
                      }]
                    }}
                  >
                    <Ionicons 
                      name="refresh" 
                      size={20} 
                      color={isRefreshing ? "#4CAF50" : "#b0b0b0"} 
                    />
                  </Animated.View>
                </TouchableOpacity>
              </View>
            </View>
            
            {/* Faturamento Total - Card Destaque */}
            <View style={[styles.metricCard, styles.metricCardLarge, { borderTopColor: '#4CAF50' }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="trending-up" size={24} color="#4CAF50" />
                <Text style={styles.metricLabel}>Faturamento Total</Text>
              </View>
              <Text style={styles.metricValueLarge} numberOfLines={1} adjustsFontSizeToFit>{formatarValorResponsivo(dashboardData.metricasFinanceiras.faturamentoTotal)}</Text>
            </View>

            {/* Cards principais em 2 colunas */}
            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.metricCardHalf, { borderTopColor: '#4CAF50' }]}>
                <View style={styles.cardHeaderSmall}>
                  <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />
                  <Text style={styles.metricLabel}>Recebido</Text>
                </View>
                <Text style={styles.metricValueMedium} numberOfLines={1} adjustsFontSizeToFit>{formatarValorResponsivo(dashboardData.metricasFinanceiras.receitaRecebida)}</Text>
              </View>

              <View style={[styles.metricCard, styles.metricCardHalf, { borderTopColor: '#FFA500' }]}>
                <View style={styles.cardHeaderSmall}>
                  <Ionicons name="time" size={20} color="#FFA500" />
                  <Text style={styles.metricLabel}>A Receber</Text>
                </View>
                <Text style={styles.metricValueMedium} numberOfLines={1} adjustsFontSizeToFit>{formatarValorResponsivo(dashboardData.metricasFinanceiras.receitaAReceber)}</Text>
              </View>
            </View>

            <View style={styles.metricsRow}>
              <View style={[styles.metricCard, styles.metricCardHalf, { borderTopColor: '#ff4444' }]}>
                <View style={styles.cardHeaderSmall}>
                  <Ionicons name="alert-circle" size={20} color="#ff4444" />
                  <Text style={styles.metricLabel}>Vencido</Text>
                </View>
                <Text style={styles.metricValueMedium} numberOfLines={1} adjustsFontSizeToFit>{formatarValorResponsivo(dashboardData.metricasFinanceiras.receitaVencida)}</Text>
              </View>

              <View style={[styles.metricCard, styles.metricCardHalf, { borderTopColor: '#ff4444' }]}>
                <View style={styles.cardHeaderSmall}>
                  <Ionicons name="warning" size={20} color="#ff4444" />
                  <Text style={styles.metricLabel}>Inadimplência</Text>
                </View>
                <Text style={[styles.metricValueMedium, { color: '#ff4444' }]}>
                  {dashboardData.metricasFinanceiras.taxaInadimplencia.toFixed(1)}%
                </Text>
              </View>
            </View>

            {/* Indicadores Operacionais */}
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Indicadores Operacionais</Text>
            
            <View style={styles.operationalGrid}>
              <View style={styles.operationalCard}>
                <Ionicons name="people" size={24} color="#4CAF50" />
                <Text style={styles.operationalValue}>{formatarNumero(dashboardData.indicadoresOperacionais.totalClientes)}</Text>
                <Text style={styles.operationalLabel}>Clientes</Text>
              </View>

              <View style={styles.operationalCard}>
                <Ionicons name="cart" size={24} color="#2196F3" />
                <Text style={styles.operationalValue}>{formatarNumero(dashboardData.indicadoresOperacionais.totalVendas)}</Text>
                <Text style={styles.operationalLabel}>Vendas</Text>
              </View>

              <View style={styles.operationalCard}>
                <Ionicons name="map" size={24} color="#9C27B0" />
                <Text style={styles.operationalValue}>{dashboardData.indicadoresOperacionais.totalRotas}</Text>
                <Text style={styles.operationalLabel}>Rotas</Text>
              </View>

              <View style={styles.operationalCard}>
                <Ionicons name="person-circle" size={24} color="#FF9800" />
                <Text style={styles.operationalValue}>{dashboardData.indicadoresOperacionais.totalVendedores}</Text>
                <Text style={styles.operationalLabel}>Vendedores</Text>
              </View>
            </View>

            {/* Análise de Parcelas */}
            <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Análise de Parcelas</Text>
            
            <View style={styles.parcelasRow}>
              <View style={[styles.parcelaCard, styles.parcelaCardHalf, { borderLeftColor: '#4CAF50' }]}>
                <View style={styles.parcelaHeader}>
                  <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                  <Text style={styles.parcelaTitle}>Pagas</Text>
                </View>
                <Text style={styles.parcelaValorCompacto} numberOfLines={1} adjustsFontSizeToFit>{formatarValorResponsivo(dashboardData.analiseParcelas.pagas.valor)}</Text>
                <Text style={styles.parcelaQuantidade}>{formatarNumero(dashboardData.analiseParcelas.pagas.quantidade)} parcelas</Text>
              </View>

              <View style={[styles.parcelaCard, styles.parcelaCardHalf, { borderLeftColor: '#FFA500' }]}>
                <View style={styles.parcelaHeader}>
                  <Ionicons name="time" size={18} color="#FFA500" />
                  <Text style={styles.parcelaTitle}>A Vencer</Text>
                </View>
                <Text style={styles.parcelaValorCompacto} numberOfLines={1} adjustsFontSizeToFit>{formatarValorResponsivo(dashboardData.analiseParcelas.aVencer.valor)}</Text>
                <Text style={styles.parcelaQuantidade}>{formatarNumero(dashboardData.analiseParcelas.aVencer.quantidade)} parcelas</Text>
              </View>
            </View>

            <View style={[styles.parcelaCard, styles.parcelaCardLarge, { borderLeftColor: '#ff4444' }]}>
              <View style={styles.cardHeader}>
                <Ionicons name="alert-circle" size={24} color="#ff4444" />
                <Text style={styles.metricLabel}>Parcelas Vencidas</Text>
              </View>
              <Text style={styles.metricValueLarge} numberOfLines={1} adjustsFontSizeToFit>{formatarValorResponsivo(dashboardData.analiseParcelas.vencidas.valor)}</Text>
              <Text style={styles.parcelaQuantidadeLarge}>{formatarNumero(dashboardData.analiseParcelas.vencidas.quantidade)} parcelas</Text>
            </View>

            {/* Alertas de Vencimentos */}
            {dashboardData.alertas.parcelasVencendoHoje > 0 && (
              <View style={styles.alertCard}>
                <Ionicons name="notifications" size={24} color="#FFA500" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>Atenção!</Text>
                  <Text style={styles.alertText}>
                    {dashboardData.alertas.parcelasVencendoHoje} parcela{dashboardData.alertas.parcelasVencendoHoje > 1 ? 's' : ''} vencendo hoje
                  </Text>
                </View>
              </View>
            )}

            {/* Alerta de Clientes em Atraso */}
            {dashboardData.alertas.clientesAtraso30Dias > 0 && (
              <View style={styles.alertCard}>
                <Ionicons name="warning" size={24} color="#ff4444" />
                <View style={styles.alertContent}>
                  <Text style={styles.alertTitle}>Atenção!</Text>
                  <Text style={styles.alertText}>
                    {dashboardData.alertas.clientesAtraso30Dias} cliente{dashboardData.alertas.clientesAtraso30Dias > 1 ? 's' : ''} com mais de 30 dias de atraso
                  </Text>
                </View>
              </View>
            )}
          </>
        )}

        {/* Menu de Ações */}
        <Text style={[styles.sectionTitle, { marginTop: 32 }]}>Ações Rápidas</Text>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(app)/rotas/criar')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#1a3a1a' }]}>
            <Ionicons name="add-circle-outline" size={28} color="#4CAF50" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Criar Nova Rota</Text>
            <Text style={styles.menuSubtitle}>Adicionar uma nova rota de transporte</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(app)/vendedores/criar')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#1a3a1a' }]}>
            <Ionicons name="person-add-outline" size={28} color="#4CAF50" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Cadastrar Vendedor</Text>
            <Text style={styles.menuSubtitle}>Adicionar um novo vendedor</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => router.push('/(app)/relatorios')}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#1a3a1a' }]}>
            <Ionicons name="stats-chart-outline" size={28} color="#4CAF50" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Relatórios</Text>
            <Text style={styles.menuSubtitle}>Visualizar relatório de rotas</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.menuItem}
          onPress={() => {
            // TODO: Adicionar navegação para estoque quando existir
          }}
        >
          <View style={[styles.menuIconContainer, { backgroundColor: '#1a3a1a' }]}>
            <Ionicons name="cube-outline" size={28} color="#4CAF50" />
          </View>
          <View style={styles.menuTextContainer}>
            <Text style={styles.menuTitle}>Estoque</Text>
            <Text style={styles.menuSubtitle}>Gerenciar produtos em estoque</Text>
          </View>
          <Ionicons name="chevron-forward" size={24} color="#666" />
        </TouchableOpacity>

        {/* Espaço extra para o menu inferior */}
        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Menu Inferior */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.bottomMenuItem} onPress={openDrawer}>
          <Ionicons name="menu" size={24} color="#4CAF50" />
          <Text style={styles.bottomMenuLabel}>Menu</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomMenuItem} onPress={() => {}}>
          <Ionicons name="home-outline" size={24} color="#b0b0b0" />
          <Text style={styles.bottomMenuLabel}>Início</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomMenuItem} onPress={() => {}}>
          <Ionicons name="settings-outline" size={24} color="#b0b0b0" />
          <Text style={styles.bottomMenuLabel}>Config</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.bottomMenuItem} onPress={handleLogout} accessibilityLabel="Sair">
          <Ionicons name="log-out-outline" size={24} color="#ff4444" />
          <Text style={styles.bottomMenuLabel}>Sair</Text>
        </TouchableOpacity>
      </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a1a',
  },
  mainContainer: {
    flex: 1,
  },
  // Drawer Styles
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000000',
    zIndex: 1000,
  },
  overlayTouchable: {
    flex: 1,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: '#1a1a1a',
    zIndex: 1001,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  drawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#2a2a2a',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  drawerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  closeButton: {
    padding: 8,
  },
  drawerContent: {
    flex: 1,
    padding: 16,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  drawerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  drawerTextContainer: {
    flex: 1,
  },
  drawerItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  drawerItemSubtitle: {
    fontSize: 13,
    color: '#b0b0b0',
  },
  drawerDivider: {
    height: 1,
    backgroundColor: '#333',
    marginVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 50,
    backgroundColor: '#2a2a2a',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  greeting: {
    fontSize: 16,
    color: '#b0b0b0',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 4,
  },
  // Removido logoutButton, agora no menu inferior
  bottomMenu: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: '#222',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: '#333',
    // Removido position absolute para evitar sobreposição
    height: 64,
  },
  bottomMenuItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomMenuLabel: {
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 2,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dashboardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
    marginBottom: 16,
  },
  refreshContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cacheIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a2a1a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  cacheText: {
    fontSize: 12,
    color: '#FFA500',
    fontWeight: '600',
  },
  refreshButton: {
    width: 36,
    height: 36,
    backgroundColor: '#2a2a2a',
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  refreshButtonActive: {
    borderColor: '#4CAF50',
  },
  // Métricas
  metricsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  metricCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderTopWidth: 3,
  },
  metricCardLarge: {
    padding: 20,
    marginTop: 0,
    marginBottom: 12,
    alignItems: 'center',
  },
  metricCardHalf: {
    flex: 1,
  },
  metricLabel: {
    fontSize: 12,
    color: '#b0b0b0',
    marginTop: 8,
    marginBottom: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  cardHeaderSmall: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  metricValueLarge: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    flexShrink: 1,
  },
  metricValueMedium: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    flexShrink: 1,
  },
  // Indicadores Operacionais
  operationalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  operationalCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  operationalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#ffffff',
    marginTop: 8,
    textAlign: 'center',
  },
  operationalLabel: {
    fontSize: 14,
    color: '#e0e0e0',
    marginTop: 4,
    fontWeight: '600',
  },
  operationalSublabel: {
    fontSize: 11,
    color: '#888',
    marginTop: 2,
  },
  // Análise de Parcelas
  parcelasRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  parcelaCard: {
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
    borderLeftWidth: 4,
  },
  parcelaCardHalf: {
    flex: 1,
  },
  parcelaHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  parcelaTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#e0e0e0',
  },
  parcelaQuantidade: {
    fontSize: 12,
    color: '#b0b0b0',
    marginBottom: 4,
    textAlign: 'center',
  },
  parcelaValor: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  parcelaValorCompacto: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    textAlign: 'center',
    flexShrink: 1,
  },
  parcelaCardLarge: {
    padding: 20,
    marginTop: 12,
    alignItems: 'center',
  },
  parcelaQuantidadeLarge: {
    fontSize: 14,
    color: '#b0b0b0',
    textAlign: 'center',
    marginBottom: 8,
  },
  // Alerta
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3a2a1a',
    padding: 16,
    borderRadius: 12,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#FFA500',
    gap: 12,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFA500',
    marginBottom: 4,
  },
  alertText: {
    fontSize: 14,
    color: '#e0e0e0',
  },
  // Menu de Ações
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2a2a2a',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#333',
  },
  menuIconContainer: {
    width: 50,
    height: 50,
    backgroundColor: '#333',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  menuSubtitle: {
    fontSize: 13,
    color: '#b0b0b0',
  },
  // Loading e Erro do Dashboard
  loadingDashboard: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    gap: 12,
  },
  loadingText: {
    color: '#b0b0b0',
    fontSize: 16,
  },
  errorContainer: {
    backgroundColor: '#3a1a1a',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#ff4444',
    gap: 12,
  },
  errorText: {
    color: '#ff6666',
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 8,
  },
  retryButton: {
    backgroundColor: '#ff4444',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Sistema Novo
  newSystemCard: {
    backgroundColor: '#1a3a1a',
    padding: 20,
    borderRadius: 16,
    marginBottom: 24,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#4CAF50',
    borderStyle: 'dashed',
  },
  newSystemTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginTop: 8,
    marginBottom: 12,
    textAlign: 'center',
  },
  newSystemText: {
    fontSize: 15,
    color: '#e0e0e0',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  newSystemSteps: {
    alignSelf: 'stretch',
    marginBottom: 20,
  },
  newSystemStep: {
    fontSize: 14,
    color: '#b0b0b0',
    marginBottom: 8,
    paddingLeft: 8,
  },
  newSystemButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  newSystemButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
