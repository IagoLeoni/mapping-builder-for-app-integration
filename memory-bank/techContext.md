# Contexto Tecnológico - Construtor de Integrações iPaaS

## 🛠️ Stack Tecnológico

### Arquitetura Frontend
- **Framework**: React 18 com TypeScript
- **Biblioteca UI**: Implementação personalizada de arrastar & soltar com react-dnd
- **Gestão de Estado**: Hooks React (useState, useEffect, useContext)
- **Estilização**: Módulos CSS com design responsivo
- **Build**: Create React App com template TypeScript
- **Deployment**: Container Docker rodando no Google Cloud Run

### Arquitetura Backend
- **Runtime**: Node.js 18+ com Express.js
- **Linguagem**: TypeScript para type safety
- **Design API**: Serviços RESTful com payloads JSON
- **Validação**: Validação de schema Joi para todos inputs
- **Integração IA**: API Google Gemini 2.0 Flash
- **Deployment**: Container Docker no Google Cloud Run

### Infraestrutura Cloud
- **Plataforma**: Google Cloud Platform
- **Engine Integração**: Google Cloud Application Integration
- **Runtime Container**: Cloud Run (containers serverless)
- **CI/CD**: Cloud Build com triggers automatizados
- **Monitoramento**: Cloud Logging e Cloud Monitoring
- **Segurança**: IAM com service accounts, scanning de containers

### Componentes IA/ML
- **IA Primária**: Gemini 2.0 Flash (gemini-2.0-flash-exp)
- **Capacidades**: Input 1M token, contexto 2M token, melhoria velocidade 2x
- **Casos de Uso**: Mapeamento campos, detecção transformação, análise semântica
- **Fallback**: Algoritmo baseado em padrões locais quando API indisponível

## 🔧 Ambiente de Desenvolvimento

### Configuração Desenvolvimento Local
```bash
# Desenvolvimento Frontend
cd frontend
npm install && npm start  # http://localhost:3000

# Desenvolvimento Backend  
cd backend
npm install && npm run dev  # http://localhost:8080

# Full Stack com Docker
docker-compose up -d
```

### Ferramentas Necessárias
- **Node.js**: Versão 18+ para frontend e backend
- **Docker**: Para containerização e desenvolvimento local
- **Google Cloud SDK**: Para deployment e gestão recursos cloud
- **Git**: Controle versão com integração GitHub

### Configuração Ambiente
```env
# Backend (.env)
NODE_ENV=development|production
PORT=8080
GOOGLE_CLOUD_PROJECT_ID=seu-project-id
GOOGLE_CLOUD_REGION=us-central1
FRONTEND_URL=http://localhost:3000

# Integração Gemini AI
GEMINI_API_KEY=sua-gemini-api-key
```

## 📚 Dependências Principais

### Dependências Frontend
```json
{
  "react": "^18.x",
  "react-dom": "^18.x", 
  "typescript": "^4.x",
  "react-dnd": "^16.x",           // Funcionalidade arrastar & soltar
  "react-dnd-html5-backend": "^16.x"
}
```

### Dependências Backend
```json
{
  "express": "^4.x",
  "typescript": "^4.x",
  "joi": "^17.x",                 // Validação input
  "@google/generative-ai": "^0.x", // Integração Gemini AI
  "googleapis": "^118.x",         // APIs Google Cloud
  "cors": "^2.x",
  "helmet": "^6.x"                // Headers segurança
}
```

### Dependências Desenvolvimento
```json
{
  "nodemon": "^2.x",             // Auto-reload desenvolvimento
  "ts-node": "^10.x",            // Execução TypeScript
  "@types/node": "^18.x",
  "@types/express": "^4.x"
}
```

## 🏗️ Padrões de Desenvolvimento

### Padrões Frontend
- **Arquitetura Componente**: Componentes funcionais com hooks
- **Gestão Estado**: Estado local com prop drilling, context para estado global
- **Type Safety**: Interfaces TypeScript abrangentes
- **Organização Arquivo**: Estrutura diretório baseada em features
- **Estilização**: Módulos CSS com metodologia BEM

### Padrões Backend
- **Arquitetura Camada Serviço**: Rotas → Serviços → APIs Externas
- **Tratamento Erro**: Middleware erro centralizado com exceções tipadas
- **Validação**: Schemas Joi para todos endpoints API
- **Configuração**: Configuração baseada em ambiente com defaults
- **Logging**: Logging estruturado com correlação request

### Qualidade Código
- **TypeScript**: Modo strict habilitado com cobertura tipo abrangente
- **Linting**: ESLint com regras TypeScript
- **Formatação**: Prettier para estilo código consistente
- **Testes**: Jest para testes unitários (framework pronto)

## 🔒 Configuração Segurança

### Segurança Backend
```typescript
// Configuração middleware segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"]
    }
  }
}));

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true
}));
```

### Segurança Container
- **Containers não-root**: Frontend e backend rodam como usuários não-root
- **Imagens base mínimas**: Usando alpine Linux para menor superfície ataque
- **Scanning segurança**: Scanning vulnerabilidade automatizado no CI/CD
- **Gestão secrets**: Variáveis ambiente para configuração sensível

## 📦 Arquitetura Deployment

### Configuração Container
```dockerfile
# Builds multi-stage para otimização
FROM node:18-alpine AS builder
FROM node:18-alpine AS runtime
USER node  # Execução não-root
EXPOSE 8080
```

### Pipeline CI/CD
```yaml
# Configuração Cloud Build
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/frontend', './frontend']
  - name: 'gcr.io/cloud-builders/docker'
    args: ['build', '-t', 'gcr.io/$PROJECT_ID/backend', './backend']
  - name: 'gcr.io/cloud-builders/gcloud'
    args: ['run', 'deploy', 'ipaas-frontend', '--image', 'gcr.io/$PROJECT_ID/frontend']
```

## 🔧 Padrões Uso Ferramentas

### Workflow Desenvolvimento
1. **Desenvolvimento Local**: Use `docker-compose` para desenvolvimento full stack
2. **Apenas Frontend**: `npm start` para iteração rápida frontend
3. **Apenas Backend**: `npm run dev` com nodemon para desenvolvimento API
4. **Testes**: `npm test` para testes unitários (quando implementado)
5. **Deployment**: Git push dispara Cloud Build automatizado

### Debug
- **Frontend**: React DevTools, ferramentas desenvolvedor browser
- **Backend**: Node.js inspector, logging estruturado
- **Cloud**: Cloud Logging para debug produção
- **Integração**: Logs execução Cloud Application Integration

### Monitoramento
- **Aplicação**: Cloud Monitoring com métricas customizadas
- **Logs**: Logging centralizado com formato JSON estruturado
- **Performance**: Cloud Trace para tracing request
- **Erros**: Relatório erro com stack traces

## 🚀 Considerações Performance

### Otimização Frontend
- **Code Splitting**: React.lazy para splitting nível componente
- **Otimização Bundle**: Otimização Webpack via Create React App
- **Caching**: Cache browser para assets estáticos
- **CDN**: Cloud CDN para entrega assets global

### Otimização Backend
- **Design Stateless**: Sem estado sessão server-side
- **Caching**: Cache em memória para validação schema
- **Connection Pooling**: Reutilização conexão cliente HTTP
- **Auto-scaling**: Scaling automático Cloud Run baseado em load

### Otimização Integração IA
- **Processamento Single-Shot**: Processar todos 190+ campos em uma chamada API
- **Gestão Token**: Design prompt eficiente para ficar dentro limites
- **Estratégia Fallback**: Algoritmos locais quando serviço IA indisponível
- **Caching**: Cache respostas IA para payloads similares (melhoria futura)
