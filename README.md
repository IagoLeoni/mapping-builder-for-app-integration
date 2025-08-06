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
- ✅ Geração automática de JSON de integração
- ✅ Deploy automático no Google Cloud Application Integration
- ✅ Pipeline CI/CD com Cloud Build
- ✅ Monitoramento e logs de execução

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

## 🔧 Estrutura do Projeto

```
ipaas-integration/
├── frontend/                 # React frontend
│   ├── src/
│   │   ├── components/      # Componentes React
│   │   ├── types/          # Definições TypeScript
│   │   └── utils/          # Utilitários
│   ├── Dockerfile
│   └── nginx.conf
├── backend/                 # Node.js backend
│   ├── src/
│   │   ├── routes/         # Rotas da API
│   │   ├── services/       # Serviços de negócio
│   │   └── models/         # Modelos de dados
│   └── Dockerfile
├── deployment/             # Configurações de deploy
│   └── cloudbuild.yaml
└── integration_example.json # Exemplo de integração
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
