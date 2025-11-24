# 📱 Guia EAS Build & Update - AgroSystem

## 🚀 Configuração Inicial (Já Feita)

✅ EAS CLI instalado  
✅ Projeto configurado no EAS  
✅ EAS Update habilitado  
✅ app.json e eas.json configurados

---

## 📦 Gerando o APK de Produção

### 1. Build de Produção (APK)
```bash
eas build --platform android --profile production
```

Este comando irá:
- Compilar o app no servidor Expo
- Gerar um APK pronto para distribuição
- Configurar o app para receber updates OTA
- Disponibilizar o download do APK

**⏱️ Tempo estimado:** 10-20 minutos

### 2. Preview Build (APK - Testes)
```bash
eas build --platform android --profile preview
```

Use este para testes antes de gerar o build de produção.

---

## 🔄 Enviando Atualizações OTA

### Atualização para Produção
```bash
eas update --branch production --message "Descrição da atualização"
```

**Exemplos:**
```bash
# Correção de bug
eas update --branch production --message "Corrigido erro no relatório PDF"

# Nova funcionalidade
eas update --branch production --message "Adicionado filtro de vendedores"

# Atualização de design
eas update --branch production --message "Melhorias no layout da tela de rotas"
```

### Atualização para Preview (Testes)
```bash
eas update --branch preview --message "Testando nova funcionalidade"
```

---

## 📋 Comandos Úteis

### Verificar Status do Projeto
```bash
eas project:info
```

### Listar Builds Anteriores
```bash
eas build:list
```

### Ver Updates Publicados
```bash
eas update:list
```

### Ver Configuração do Update
```bash
eas update:view
```

### Cancelar Build em Andamento
```bash
eas build:cancel
```

---

## 🎯 Fluxo de Trabalho Recomendado

### Para Atualizações Pequenas (JS/TS/Styles)
1. Faça as alterações no código
2. Teste localmente: `npx expo start`
3. Envie o update:
   ```bash
   eas update --branch production --message "Sua mensagem"
   ```
4. ✅ Usuários receberão a atualização na próxima vez que abrirem o app

### Para Mudanças em Código Nativo (Plugins, Permissões)
1. Faça as alterações necessárias
2. Gere um novo build:
   ```bash
   eas build --platform android --profile production
   ```
3. Distribua o novo APK para os usuários

---

## 📱 Como os Usuários Recebem Updates

### Updates OTA (Automático)
- O app verifica por updates ao ser aberto
- Download acontece em segundo plano
- Update é aplicado no próximo restart do app
- **Não precisa baixar novo APK**

### New Builds (Manual)
- Necessário apenas quando há mudanças nativas
- Usuários precisam instalar novo APK
- Acontece raramente (novo plugin, permissão, etc.)

---

## 🔍 Verificando Updates

### No código do app:
```typescript
import * as Updates from 'expo-updates';

// Verificar por updates manualmente
async function checkForUpdates() {
  const update = await Updates.checkForUpdateAsync();
  if (update.isAvailable) {
    await Updates.fetchUpdateAsync();
    await Updates.reloadAsync();
  }
}
```

---

## 📊 Monitoramento

### Dashboard Expo
Acesse: https://expo.dev/accounts/dev-flutter/projects/AgroSystem

Você pode ver:
- 📦 Histórico de builds
- 🔄 Updates publicados
- 📈 Estatísticas de uso
- 🐛 Crash reports

---

## ⚠️ Importantes

### O que PODE ser atualizado via OTA:
✅ Código JavaScript/TypeScript
✅ Estilos e layouts
✅ Lógica de negócio
✅ Assets (imagens podem precisar de build)
✅ Configurações do app.json (algumas)

### O que REQUER novo build:
❌ Novos plugins nativos
❌ Mudanças em permissões (AndroidManifest)
❌ Atualização de versão do Expo SDK
❌ Mudanças em código nativo (Java/Kotlin/Swift)

---

## 🆘 Problemas Comuns

### Update não está sendo aplicado?
```bash
# Limpar cache do update
eas update:delete --branch production
eas update --branch production --message "Reenviar update"
```

### Build falhou?
```bash
# Ver logs detalhados
eas build:list
# Clique no build e veja os logs
```

### Testar update localmente?
```bash
# Não é possível testar updates OTA em desenvolvimento
# Use preview build para testes
```

---

## 📝 Checklist Antes de Publicar Update

- [ ] Testado localmente com `npx expo start`
- [ ] Sem erros no console
- [ ] Funcionalidades críticas testadas
- [ ] Não há mudanças em código nativo
- [ ] Mensagem descritiva no update
- [ ] Branch correto (production/preview)

---

## 🎓 Links Úteis

- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [EAS Update Docs](https://docs.expo.dev/eas-update/introduction/)
- [Dashboard](https://expo.dev/accounts/dev-flutter/projects/AgroSystem)
- [Runtime Versions](https://docs.expo.dev/eas-update/runtime-versions/)

---

## 🔑 Informações do Projeto

- **Project ID:** `1b50cc83-0d0f-4c7c-a882-074621dbd3db`
- **Package Name:** `com.devflutter.agrosystem`
- **Slug:** `AgroSystem`
- **Runtime Policy:** `appVersion` (updates compatíveis com mesma versão)

---

**💡 Dica:** Mantenha este arquivo atualizado conforme o projeto evolui!
