# iPaaS Integration Builder

Uma plataforma visual de integração que serve como fachada "customer face" para o Google Cloud Application Integration. Permite aos clientes mapear visualmente payloads através de uma interface drag & drop e gerar automaticamente integrações deployáveis.

## 🏗️ Arquitetura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  Google Cloud   │
│   (React)       │◄──►│   (Node.js)     │◄──►│  Application    │
│                 │    │                 │    │  Integration    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

### Componentes

- **Frontend**: Interface React com drag & drop para mapeamento visual
- **Backend**: API Node.js para validação e deployment
- **Google Cloud**: Application Integration para execução das integrações

## 🚀 Funcionalidades

- ✅ Interface visual drag & drop
- ✅ Mapeamento de payload Gupy → Sistema cliente
- ✅ **Sistema PubSub DLQ para tratamento robusto de falhas** ⭐ **NOVO**
- ✅ Geração automática de JSON de integração
- ✅ Deploy automático no Google Cloud Application Integration
- ✅ Pipeline CI/CD com Cloud Build
- ✅ Monitoramento e logs de execução

### 🔄 **Sistema PubSub Dead Letter Queue (DLQ)** ⭐ **FUNCIONALIDADE CRÍTICA IMPLEMENTADA**

#### **Contexto e Necessidade Business**
Substituímos o sistema EmailTask tradicional por uma solução PubSub Dead Letter Queue para tratamento robusto de falhas de integração. Esta mudança resolve limitações críticas de escalabilidade e configuração.

#### **Problema EmailTask Resolvido**
- **❌ Dependência email corporativa**: Configuração SMTP complexa e específica por cliente
- **❌ Limitações de escalabilidade**: Emails não são ideais para processamento em lote
- **❌ Variáveis dinâmicas problemáticas**: Contexto de erro corrompia variáveis de email
- **❌ Falta de reprocessamento**: Emails não permitem retry automático

#### **Solução PubSub Implementada**
- **✅ Assíncrono por design**: Processamento batch, retry automático e load balancing
- **✅ Infraestrutura existente**: Reutiliza connection PubSub já configurada
- **✅ Monitoramento avançado**: Métricas, alertas e tracking de mensagens
- **✅ Payload preservado**: SystemPayload original mantido para reprocessamento

#### **Arquitetura do Sistema DLQ**

```
Webhook Gupy → FieldMappingTask → RestTask (Cliente)
                                      ↓ (falha)
                               PubSubTask (DLQ)
                                      ↓
                          Topic: "dlq-pre-employee-moved"
                                      ↓
                            Sistema de Reprocessamento
```

#### **Especificações Técnicas**

**Connection PubSub**:
```
projects/apigee-prd1/locations/us-central1/connections/pubsub-poc
```

**Topic DLQ**:
```
dlq-pre-employee-moved
```

**Payload DLQ**: SystemPayload completo convertido para JSON string usando função nativa `TO_JSON`

**Schemas Definidos**:
- **Input Schema**: `{message: string, topic: string, attributes?: string}`
- **Output Schema**: `{messageId: string}` para tracking

#### **Fluxo de Execução Detalhado**

```
1. FieldMappingTask (taskId: 1) [~200ms]
   ├─ Resolve systemPayload usando CONFIG_systemPayload + RESOLVE_TEMPLATE
   ├─ Configura systemEndpoint usando CONFIG_systemEndpoint  
   ├─ Hardcode topic "dlq-pre-employee-moved"
   └─ Converte systemPayload JSON → String usando TO_JSON nativo
   
2. RestTask (taskId: 2) [~1-5s]
   ├─ POST para endpoint do cliente com systemPayload
   ├─ Headers: Content-Type: application/json, X-Integration-Source: iPaaS-Builder
   ├─ Conditional Success: responseStatus = "200 OK" → Task 5 (Success)
   └─ Conditional Failure: responseStatus != "200 OK" → Task 4 (PubSub DLQ)

3a. SUCCESS PATH: SuccessOutputTask (taskId: 5) [~100ms]
    └─ Retorna { "Status": "Success" } para Gupy

3b. FAILURE PATH: PubSubTask (taskId: 4) [~300-500ms]
    ├─ Connection: projects/apigee-prd1/locations/us-central1/connections/pubsub-poc
    ├─ Action: publishMessage usando Google Cloud Connectors
    ├─ Topic: "dlq-pre-employee-moved" 
    ├─ Message: systemPayload convertido para JSON string
    └─ Output: messageId para tracking e monitoramento
```

#### **Vantagens Técnicas**

**Performance e Simplicidade**:
- ✅ **Conversão Nativa**: TO_JSON integrado (elimina JsonnetMapperTask extra)
- ✅ **Compatibilidade Total**: Mantém taskId 4 (zero refactoring)
- ✅ **Schemas Bem Definidos**: JSON Draft-07 para validation automática

**Robustez e Monitoramento**:
- ✅ **Connection Reutilização**: Infraestrutura PubSub existente e testada
- ✅ **Topic Dedicado**: Filtering e alertas específicos para falhas Gupy
- ✅ **Payload Preservado**: Reprocessamento com dados originais completos
- ✅ **MessageId Tracking**: Rastreamento end-to-end de mensagens

**Escalabilidade e Flexibilidade**:
- ✅ **Processamento Assíncrono**: Batch processing, retry automático
- ✅ **Input Variable**: gupyPayload configurável por cliente
- ✅ **Schema Extensível**: Metadata customizada (timestamp, clientName)
- ✅ **Multi-ambiente**: Connection parameterizável para dev/prod

#### **Configuração Payload Gupy Real**

O sistema agora usa dados reais da Minerva Foods com estrutura completa:

```json
{
  "body": {
    "companyName": "Minerva Foods",
    "event": "pre-employee.moved",
    "id": "49589201-dbb3-46b7-b2d6-4f3ec16ac742",
    "date": "2025-07-03T13:22:51.239Z",
    "data": {
      "job": {
        "departmentCode": "40000605",
        "roleCode": "35251270", 
        "name": "VAGA TESTE INTEGRAÇÃO - Auxiliar de Produção",
        "department": {
          "id": 726936.0,
          "code": "40000605",
          "name": "MIUDOS DIURNO"
        }
      },
      "candidate": {
        "name": "Erica",
        "lastName": "Brugognolle", 
        "email": "ericabru@hotmail.com",
        "identificationDocument": "26962277806",
        "mobileNumber": "+5511986637567"
      },
      "admission": {
        "hiringDate": "2025-06-30T03:00:00.000Z",
        "documentsTemplate": {
          "id": 52807.0,
          "name": "Admissão CLT"
        }
      },
      "position": {
        "salary": {
          "value": 3000.0,
          "currency": "R$"
        }
      }
    }
  }
}
```

#### **Evidências de Sucesso**
- ✅ **Deploy Successful**: Integration JSON gerado sem erros
- ✅ **PubSub Connection**: Validada e operacional no ambiente apigee-prd1
- ✅ **Topic Creation**: "dlq-pre-employee-moved" criado e monitorado
- ✅ **Conditional Flow**: RestTask falha → PubSubTask executa automaticamente
- ✅ **Payload Structure**: Wrapper body.data.* funcionando com dados reais

## 📋 Pré-requisitos

- Node.js 18+
- Docker
- Google Cloud SDK
- Conta Google Cloud com Application Integration habilitado

## 🛠️ Desenvolvimento Local

### Frontend

```bash
cd frontend
npm install
npm start
```

A aplicação estará disponível em `http://localhost:3000`

### Backend

```bash
cd backend
npm install
npm run dev
```

A API estará disponível em `http://localhost:8080`

### Variáveis de Ambiente

Crie um arquivo `.env` no diretório `backend`:

```env
NODE_ENV=development
PORT=8080
GOOGLE_CLOUD_PROJECT_ID=seu-project-id
GOOGLE_CLOUD_REGION=us-central1
FRONTEND_URL=http://localhost:3000

# Gemini AI (opcional - para mapeamento automático)
GEMINI_API_KEY=sua-api-key-do-gemini
```

### 🤖 Configuração do Gemini AI (Opcional)

Para habilitar o mapeamento automático com IA:

1. **Obter API Key**:
   - Acesse: https://makersuite.google.com/app/apikey
   - Crie uma nova API key
   - Copie a chave gerada

2. **Configurar no Backend**:
   ```bash
   cd backend
   echo "GEMINI_API_KEY=sua-api-key-aqui" >> .env
   ```

3. **Funcionalidades com Gemini**:
   - ✅ Mapeamento automático baseado em semântica
   - ✅ Sugestões inteligentes de campos
   - ✅ Análise de padrões de nomenclatura
   - ✅ Fallback para algoritmo simples se API falhar

**Nota**: Sem a API key, o sistema usa um algoritmo de mapeamento baseado em padrões semânticos locais.

## 🐳 Docker

### Build Local

```bash
# Backend
docker build -t ipaas-backend ./backend

# Frontend
docker build -t ipaas-frontend ./frontend
```

### Docker Compose

```bash
docker-compose up -d
```

## ☁️ Deploy no Google Cloud

### 1. Configurar Projeto

```bash
# Definir projeto
export PROJECT_ID=seu-project-id
gcloud config set project $PROJECT_ID

# Habilitar APIs necessárias
gcloud services enable cloudbuild.googleapis.com
gcloud services enable run.googleapis.com
gcloud services enable integrations.googleapis.com
```

### 2. Deploy via Cloud Build

```bash
# Trigger manual
gcloud builds submit --config=deployment/cloudbuild.yaml

# Ou configurar trigger automático
gcloud builds triggers create github \
  --repo-name=ipaas-integration \
  --repo-owner=seu-usuario \
  --branch-pattern="^main$" \
  --build-config=deployment/cloudbuild.yaml
```

### 3. Configurar Permissões

```bash
# Service account para Application Integration
gcloud iam service-accounts create ipaas-integration \
  --display-name="iPaaS Integration Service Account"

# Adicionar roles necessários
gcloud projects add-iam-policy-binding $PROJECT_ID \
  --member="serviceAccount:ipaas-integration@$PROJECT_ID.iam.gserviceaccount.com" \
  --role="roles/integrations.integrationAdmin"
```

## 📖 Como Usar

### 1. Acessar a Interface

Navegue até a URL do frontend deployado no Cloud Run.

### 2. Configurar Integração

1. **Email do Cliente**: Insira o email para notificações de erro
2. **Endpoint do Sistema**: URL do webhook do sistema cliente

### 3. Mapear Campos

1. **Painel Esquerdo**: Visualize a estrutura do payload Gupy
2. **Painel Central**: Arraste campos para criar mapeamentos
3. **Painel Direito**: Configure e visualize o JSON gerado

### 4. Deploy

Clique em "Deploy Integration" para criar a integração no Google Cloud.

## 🧹 **LIMPEZA DE CÓDIGO RECÉM-IMPLEMENTADA** (Agosto 2025)

### ✅ **Código Otimizado e Simplificado**
O projeto passou por uma limpeza abrangente para remover código não utilizado:

- **22 arquivos/pastas removidos** (~25% redução no tamanho)
- **Interface simplificada** sem componentes Wizard desnecessários
- **Build otimizado** para 164.01 kB (bundle final)
- **Código mais limpo** focado apenas no essencial

### 📁 **Arquivos Removidos**
- ❌ Arquivos de teste manuais obsoletos (6 arquivos)
- ❌ Schemas duplicados e documentação redundante
- ❌ Templates Jsonnet obsoletos (pasta completa)
- ❌ Componentes Wizard não utilizados (2 pastas completas)
- ❌ Templates integration obsoletos

### 🎯 **Interface Otimizada**
- **Schema Input Direto**: Input JSON simplificado no MappingCanvas
- **Drag & Drop Core**: Foco na funcionalidade principal
- **Zero Dependências Mortas**: Código 100% utilizado

## 🔧 Estrutura do Projeto (Atualizada)

```
ipaas-integration/
├── frontend/                 # React frontend (otimizado)
│   ├── src/
│   │   ├── components/      # Componentes essenciais
│   │   │   ├── ConfigPanel/     # Configuração cliente
│   │   │   ├── DebugPanel/      # Debug e monitoramento  
│   │   │   ├── JsonPreview/     # Preview integração
│   │   │   ├── MappingCanvas/   # Interface principal drag & drop
│   │   │   └── PayloadTree/     # Visualização payload Gupy
│   │   ├── types/          # Definições TypeScript
│   │   ├── utils/          # Utilitários core
│   │   └── services/       # Serviços frontend
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # APIs RESTful
│   │   │   ├── deploy.ts       # Deploy integração
│   │   │   ├── gemini.ts       # Mapeamento IA
│   │   │   ├── integration.ts  # Gestão integração
│   │   │   └── transformations.ts # Preview transformação
│   │   └── services/       # Serviços de negócio
│   │       ├── CloudBuildService.ts     # Automação deploy
│   │       ├── GeminiMappingService.ts  # IA mapeamento
│   │       ├── IntegrationService.ts    # Geração integração
│   │       ├── SchemaManagerService.ts  # Gestão schemas
│   │       ├── TemplateService.ts       # Sistema PubSub
│   │       └── TransformationEngine.ts  # Engine transformação
│   └── Dockerfile
├── schemas/                # Schemas e exemplos
│   ├── gupy/              # Schema oficial Gupy
│   ├── examples/          # Exemplos sistemas
│   └── patterns/          # Padrões semânticos
├── deployment/            # Configurações deploy
│   ├── cloudbuild.yaml   # CI/CD pipeline
│   └── integration-build.yaml # Deploy integração
└── memory-bank/          # Documentação técnica
    ├── activeContext.md   # Estado atual
    ├── progress.md        # Progresso projeto
    └── systemPatterns.md  # Padrões arquiteturais
```

## 🔄 Fluxo de Integração

1. **Cliente configura** email e endpoint
2. **Cliente mapeia** campos Gupy → Sistema
3. **Sistema gera** JSON de integração
4. **Cloud Build** deploya no Application Integration
5. **Gupy envia** webhook para integração
6. **Integração processa** e envia para cliente
7. **Em caso de erro**, email é enviado ao cliente

## 📊 Monitoramento

### Logs de Execução

```bash
# Logs do Cloud Run
gcloud logging read "resource.type=cloud_run_revision" --limit=50

# Logs do Application Integration
gcloud logging read "resource.type=integration" --limit=50
```

### Métricas

- Execuções por minuto
- Taxa de sucesso/erro
- Latência média
- Uso de recursos

## 🛡️ Segurança

- ✅ Headers de segurança configurados
- ✅ Validação de entrada com Joi
- ✅ Rate limiting
- ✅ CORS configurado
- ✅ Containers não-root
- ✅ Health checks

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -am 'Adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

Para suporte, abra uma issue no GitHub ou entre em contato com a equipe de desenvolvimento.

---

**Desenvolvido com ❤️ para facilitar integrações no Google Cloud**
