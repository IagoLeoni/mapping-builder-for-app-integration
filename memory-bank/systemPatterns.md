# Padrões do Sistema & Arquitetura - Construtor de Integrações iPaaS

## 🏗️ Arquitetura do Sistema

### Padrão de Arquitetura de Alto Nível
```
┌─────────────────────────────────────────────────────────────────┐
│                        INTERFACE DO CLIENTE                     │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Assistente Sch. │  Canvas Mapea.  │     Preview Integração      │
│ - Parse JSON    │  - Arrastar &   │     - JSON Gerado          │
│ - Mapea. IA     │    Soltar       │     - Config Deployment    │
└─────────────────┴─────────────────┴─────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                    CAMADA DE API BACKEND                      │
├─────────────────┬─────────────────┬─────────────────────────────┤
│ Serviço Schema  │ Serviço Gemini  │   Serviço Integração       │
│ - Validação     │ - Mapeamento IA │   - Geração JSON           │
│ - Parsing       │ - Transformações│   - Trigger Cloud Build   │
└─────────────────┴─────────────────┴─────────────────────────────┘
                            │
┌───────────────────────────▼───────────────────────────────────┐
│                  GOOGLE CLOUD PLATFORM                        │
├─────────────────┬─────────────────┬─────────────────────────────┤
│   Cloud Build   │ Application Int │     Cloud Monitoring       │
│   - CI/CD       │ - Exec Runtime  │     - Logs & Métricas      │
│   - Deploy      │ - Transform Data│     - Track Erros          │
└─────────────────┴─────────────────┴─────────────────────────────┘
```

### Relacionamentos de Componentes

#### Hierarquia de Componentes Frontend
```
App.tsx
├── MappingWizard/
│   ├── SchemaDefinitionStep.tsx      // Input e parsing JSON
│   ├── MappingMethodSelector.tsx     // Escolha IA vs Manual
│   └── AIMappingResults.tsx          // Revisão sugestões IA
├── MappingCanvas/
│   ├── MappingCanvas.tsx             // Interface principal arrastar & soltar
│   ├── TargetSchemaInput.tsx         // Painel configuração schema
│   ├── TargetFieldsTree.tsx          // Campos destino arrastáveis
│   ├── MappingConnections.tsx        // Linhas conexão visual
│   └── TransformationModal.tsx       // Editor transformação
├── PayloadTree/
│   └── PayloadTree.tsx               // Visualização árvore dados origem
├── JsonPreview/
│   ├── IntegrationJsonPreview.tsx    // JSON integração gerado
│   └── SimpleJsonPreview.tsx         // Visualizador JSON genérico
├── AIMappingAssistant/
│   └── AIMappingAssistant.tsx        // Interface mapeamento IA
└── ConfigPanel/
    └── ConfigPanel.tsx               // Config cliente (email/endpoint)
```

#### Arquitetura de Serviços Backend
```
index.ts (App Express)
├── routes/
│   ├── gemini.ts                     // Endpoints mapeamento IA
│   ├── transformations.ts            // Gestão transformações
│   ├── integration.ts                // CRUD integração
│   └── deploy.ts                     // Deployment cloud
├── services/
│   ├── GeminiMappingService.ts       // Lógica mapeamento IA
│   ├── TransformationEngine.ts       // Engine transformação dados
│   ├── SchemaManagerService.ts       // Validação & parsing schema
│   ├── TemplateService.ts            // Templates integração
│   ├── IntegrationService.ts         // Geração integração
│   └── CloudBuildService.ts          // Automação deployment
└── models/
    └── (Interfaces TypeScript em frontend/src/types/)
```

## 🔑 Padrões de Design Principais

### 1. **Padrão Arquitetura Unificada (CRÍTICO)**
**Implementação**: Sistema unificado para geração de integração em todos endpoints
```typescript
// PADRÃO UNIFICADO: Todos endpoints usam IntegrationService
router.post('/preview-integration', async (req, res) => {
  const integrationService = new IntegrationService();
  const integrationJson = integrationService.generateIntegrationWithTransformations(config);
  res.json({ success: true, integrationJson });
});

// EVITAR: Código hardcoded duplicado
// ❌ const integrationJson = { hardcoded: 'values' };
```

**Benefícios Alcançados**:
- JSON aparece corretamente na interface
- Transformações Jsonnet funcionam
- Manutenção simplificada
- Comportamento consistente

### 2. **Padrão Validação Flexível para Debug**
**Implementação**: Validação adaptável que permite desenvolvimento fluido
```typescript
// FRONTEND: Validação flexível
const fetchIntegrationJson = async () => {
  // ✅ Permite geração mesmo com dados incompletos
  if (!config.customerEmail && !config.systemEndpoint && mappings.length === 0) {
    console.log('⚠️ DEBUG: No data available, skipping...');
    return;
  }
  // Continua com defaults para debug
};

// BACKEND: Defaults inteligentes
const config = {
  customerEmail: customerEmail || 'debug@example.com',
  systemEndpoint: systemEndpoint || 'https://debug.example.com/webhook',
  mappings: mappings || []
};
```

### 3. **Padrão Templates Hardcoded para Estabilidade**
**Implementação**: Eliminação de erros de parsing JSON com objetos diretos
```typescript
// ✅ PADRÃO HARDCODED - Estável
private static generateEmailTaskHardcoded(customerEmail: string): any {
  return {
    "task": "EmailTask",
    "taskId": "4",
    "parameters": {
      "to": { "key": "to", "value": { "stringValue": customerEmail || "customer@example.com" }}
    }
  };
}

// ❌ EVITAR: Templates com placeholders problemáticos
// const template = this.loadTemplate('email-task.json');
// const result = this.replacePlaceholders(template, replacements); // Parsing errors
```

### 4. **Padrão Templates Jsonnet Auto-Contidos (CRÍTICO PARA PRODUÇÃO)**
**Implementação**: Templates Jsonnet sem imports externos para compatibilidade com Application Integration
```typescript
// ❌ PROBLEMA CRÍTICO - Application Integration não suporta imports
private generateFormatDocumentJsonnet(varName: string, inputPath: string, transformation: any): string {
  return `local transformations = import "auto-transformations.libsonnet";
local gupyPayload = std.extVar("gupyPayload");
{ ${varName}: transformations.formatDocument(inputValue, {...}) }`;
  // ERRO: RUNTIME ERROR: import not available auto-transformations.libsonnet
}

// ✅ SOLUÇÃO - Templates inline auto-contidos usando apenas stdlib v0.20.0
private generateFormatDocumentJsonnet(varName: string, inputPath: string, transformation: any): string {
  return `local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.strReplace(std.strReplace(std.strReplace(inputValue, ".", ""), "-", ""), " ", "") }`;
}
```

**Templates Auto-Contidos por Tipo**:
```typescript
// format_document: Remove formatação usando apenas std.strReplace()
`local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.strReplace(std.strReplace(std.strReplace(inputValue, ".", ""), "-", ""), " ", "") }`

// name_split: Divide nomes usando std.split() + std.length()
`local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; local parts = std.split(inputValue, " "); { ${varName}: if std.length(parts) > 0 then parts[0] else "" }`

// phone_split: Extrai partes usando std.substr() + std.strReplace()
`local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", ""); { ${varName}: std.substr(cleanPhone, 0, 2) }`

// normalize: Case conversion usando std.asciiUpper()/std.asciiLower()
`local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: std.asciiUpper(inputValue) }`

// country_code: Mapeamento usando condicionais inline
`local gupyPayload = std.extVar("gupyPayload"); local inputValue = ${inputPath}; { ${varName}: if inputValue == "Brasil" then "BRA" else if inputValue == "Brazil" then "BRA" else inputValue }`
```

**Benefícios Críticos**:
- ✅ **100% Compatível**: Funciona no sandbox Application Integration
- ✅ **Sem Dependências**: Apenas stdlib v0.20.0 do Jsonnet
- ✅ **Performance Otimizada**: Sem overhead de imports
- ✅ **Manutenção Simplificada**: Código inline fácil de debugar
- ✅ **Pronto Produção**: Zero erros de runtime

### 4. **Padrão Camada de Serviço Robusta**
**Implementação**: Separação limpa entre rotas e lógica de negócio
```typescript
// Handler de Rota (Fina)
app.post('/api/mapping/generate', async (req, res) => {
  try {
    const result = await GeminiMappingService.generateMappings(req.body);
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Camada de Serviço (Lógica de Negócio)
class GeminiMappingService {
  static async generateMappings(payload: any) {
    // Lógica complexa de mapeamento IA
    const prompt = this.buildComprehensivePrompt(payload);
    const response = await this.callGeminiAPI(prompt);
    return this.parseAndValidateResponse(response);
  }
}
```

### 2. **Padrão Gestão de Estado**
**Implementação**: Hooks React com context para estado global
```typescript
// Estado Local do Componente
const [mappings, setMappings] = useState<MappingConnection[]>([]);
const [targetFields, setTargetFields] = useState<PayloadField[]>([]);

// Estado Global via Context (quando necessário)
const ConfigContext = React.createContext<{
  customerEmail: string;
  systemEndpoint: string;
  updateConfig: (config: Partial<ConfigData>) => void;
}>();
```

### 3. **Padrão Pipeline de Transformação**
**Implementação**: Transformações de dados encadeáveis
```typescript
interface TransformationConfig {
  type: 'format_document' | 'split' | 'convert' | 'normalize';
  operation: string;
  preview?: { input: string; output: string; };
}

// Execução pipeline
const applyTransformation = (value: any, config: TransformationConfig) => {
  switch (config.type) {
    case 'format_document':
      return formatDocument(value, config.pattern);
    case 'split':
      return splitValue(value, config.separator);
    // ... outras transformações
  }
};
```

### 4. **Padrão Integração IA**
**Implementação**: Processamento single-shot com fallback
```typescript
class GeminiMappingService {
  static async generateMappings(payload: any) {
    try {
      // Primário: Gemini 2.0 Flash single-shot
      if (fieldCount > 100) {
        return await this.singleShotMapping(payload);
      }
      return await this.standardMapping(payload);
    } catch (error) {
      // Fallback: Correspondência padrão local
      return await this.fallbackPatternMatching(payload);
    }
  }
}
```

## 🎯 Caminhos Críticos de Implementação

### 1. **Fluxo Assistente → Canvas**
**Caminho Crítico**: Definição schema para interface mapeamento
```typescript
// MappingWizard.tsx
const handleSchemaSubmit = (schema: any) => {
  onSchemaProvided(schema);  // Passa para parent
};

// MappingCanvas.tsx
useEffect(() => {
  if (wizardCompleted && clientSchemaFromWizard && targetFields.length === 0) {
    const fields = convertSchemaToFields(clientSchemaFromWizard);
    handleSchemaChange(fields);
  }
}, [wizardCompleted, clientSchemaFromWizard, targetFields]);
```

### 2. **Integração Mapeamento IA**
**Caminho Crítico**: Única chamada API para todos mapeamentos de campos
```typescript
// Processamento single-shot para 190+ campos
const generateMappings = async (payload: any) => {
  const prompt = buildComprehensivePrompt({
    gupySchema: fullGupySchema,
    gupyExample: gupyExamplePayload,
    clientSchema: clientPayload,
    semanticPatterns: patterns
  });
  
  const response = await model.generateContent(prompt);
  return parseAIResponse(response); // Retorna 27+ mapeamentos com transformações
};
```

### 3. **Implementação Arrastar & Soltar**
**Caminho Crítico**: Interface visual de mapeamento de campos
```typescript
// Campos origem arrastáveis
<div className="payload-field" draggable onDragStart={(e) => {
  e.dataTransfer.setData('application/json', JSON.stringify(field));
}}>

// Áreas destino para soltar  
<div className="target-field" onDrop={(e) => {
  const sourceField = JSON.parse(e.dataTransfer.getData('application/json'));
  onFieldMapped(sourceField, targetPath);
}}>
```

### 4. **Geração de Integração**
**Caminho Crítico**: Mapeamentos visuais para integração Google Cloud
```typescript
const generateIntegration = (mappings: MappingConnection[]) => {
  const integration = {
    name: `gupy-${customerEmail}-integration`,
    triggerConfigs: [{ trigger: 'webhook' }],
    taskConfigs: [
      { taskType: 'data-mapping', mappings: convertMappings(mappings) },
      { taskType: 'rest-call', endpoint: systemEndpoint }
    ]
  };
  return integration;
};
```

## 🔄 Padrões de Fluxo de Dados

### 1. **Fluxo Processamento Schema**
```
Input JSON → Parser Schema → Árvore PayloadField → Fontes Arraste
                ↓
Análise IA → Mapeamentos Campo → Detecção Transformação → Display UI
```

### 2. **Fluxo Criação Mapeamento**
```
Campo Origem → Evento Arraste → Drop Destino → Conexão Mapeamento → Modal Transformação
                ↓
Geração Preview → Validação → Armazenamento Mapeamento → Geração JSON
```

### 3. **Fluxo Deployment**
```
Mapeamentos Visuais → JSON Integração → Trigger Cloud Build → Deployment Application Integration
                ↓
Health Check → Ativação → Configuração Monitoramento → Notificação Cliente
```

## 🧩 Padrões Design de Componentes

### 1. **Padrão Componente Composto**
**Uso**: Componentes complexos com múltiplas partes relacionadas
```typescript
// MappingCanvas com componentes relacionados
<MappingCanvas>
  <TargetSchemaInput onSchemaChange={handleSchemaChange} />
  <TargetFieldsTree fields={targetFields} onFieldDrop={handleFieldDrop} />
  <MappingConnections connections={mappings} />
</MappingCanvas>
```

### 2. **Padrão Render Props**
**Uso**: Composição flexível de componentes
```typescript
<PayloadTree 
  data={gupyPayload}
  renderField={(field) => (
    <DraggableField field={field} onDragStart={handleDragStart} />
  )}
/>
```

### 3. **Padrão Hooks Customizados**
**Uso**: Lógica stateful reutilizável
```typescript
const useMappingCanvas = () => {
  const [mappings, setMappings] = useState<MappingConnection[]>([]);
  const [targetFields, setTargetFields] = useState<PayloadField[]>([]);
  
  const addMapping = (source: PayloadField, targetPath: string) => {
    // Lógica mapeamento
  };
  
  return { mappings, targetFields, addMapping };
};
```

## 🔧 Padrões de Integração

### 1. **Padrão Design API**
**Implementação**: RESTful com formato resposta consistente
```typescript
// Estrutura resposta API consistente
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```

### 2. **Padrão Tratamento Erro**
**Implementação**: Tratamento erro centralizado com mensagens amigáveis
```typescript
// Handler erro global
app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Erro API:', error);
  res.status(500).json({
    success: false,
    error: 'Erro interno servidor',
    timestamp: new Date().toISOString()
  });
});
```

### 3. **Padrão Configuração**
**Implementação**: Configuração baseada em ambiente com validação
```typescript
const config = {
  port: process.env.PORT || 8080,
  geminiApiKey: process.env.GEMINI_API_KEY || '',
  googleProjectId: process.env.GOOGLE_CLOUD_PROJECT_ID || '',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:3000'
};

// Validação no startup
if (!config.geminiApiKey) {
  console.warn('GEMINI_API_KEY não configurada - mapeamento IA usará algoritmo fallback');
}
```

## 🏗️ Padrões de Geração de Integração

### 1. **Padrão Template Service**
**Implementação**: Sistema de templates com substituição de placeholders
```typescript
class TemplateService {
  // Carregamento de templates externos
  private static loadTemplate(templatePath: string): string {
    return fs.readFileSync(path.join(this.templatesPath, templatePath), 'utf-8');
  }

  // Substituição inteligente de placeholders
  private static replacePlaceholders(template: string, replacements: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const quotedPlaceholder = `"{{${key}}}"`;
      const unquotedPlaceholder = `{{${key}}}`;
      
      if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        // Arrays/objetos JSON sem aspas extras
        result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), value);
      } else {
        // Strings simples com aspas
        result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), JSON.stringify(value));
      }
    }
    return result;
  }
}
```

### 2. **Padrão JsonnetMapperTask**
**Implementação**: Geração de tarefas Jsonnet para transformações
```typescript
// Estrutura JsonnetMapperTask padrão
interface JsonnetMapperTask {
  task: "JsonnetMapperTask";
  taskId: string;
  parameters: {
    template: {
      key: "template";
      value: {
        stringValue: string; // Template Jsonnet de linha única
      };
    };
  };
  nextTasks: Array<{ taskId: string }>;
  taskExecutionStrategy: "WHEN_ALL_SUCCEED";
  displayName: string;
  externalTaskType: "NORMAL_TASK";
  position: { x: string; y: string };
}

// Geração de template Jsonnet otimizado
const generateJsonnetTemplate = (transformation: TransformationConfig, sourceField: string) => {
  return `local transformations = import "auto-transformations.libsonnet"; local gupyPayload = std.extVar("gupyPayload"); local inputValue = gupyPayload["${sourceField.replace(/\./g, '"]["')}"]; { ${generateVariableName(sourceField)}: transformations.${getTransformationFunction(transformation.type)}(inputValue, ${JSON.stringify(transformation.parameters || {})}) }`;
};
```

### 3. **Padrão Integration Service**
**Implementação**: Orquestração de geração de integração completa
```typescript
class IntegrationService {
  // Geração hardcoded para evitar problemas de template
  static generateIntegrationWithTransformations(config: IntegrationConfig): any {
    const integrationId = `int-${Date.now()}`;
    const timestamp = new Date().toISOString();

    // Geração de tarefas de transformação
    const transformationTasks = config.mappings
      .filter(m => m.transformation && m.transformation.type)
      .map((mapping, index) => ({
        "task": "JsonnetMapperTask",
        "taskId": (10 + index).toString(),
        "parameters": {
          "template": {
            "key": "template",
            "value": {
              "stringValue": generateJsonnetTemplate(mapping.transformation!, mapping.sourceField.path)
            }
          }
        },
        "nextTasks": index === 0 ? [{ "taskId": "1" }] : [],
        "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
        "displayName": `Transform ${mapping.sourceField.name} (${mapping.transformation.type})`,
        "externalTaskType": "NORMAL_TASK",
        "position": { "x": (140 + index * 200).toString(), "y": "100" }
      }));

    // Estrutura final do Application Integration
    return {
      "name": `projects/160372229474/locations/us-central1/integrations/${integrationId}/versions/1`,
      "updateTime": timestamp,
      "createTime": timestamp,
      "triggerConfigs": [/* ... */],
      "taskConfigs": [...transformationTasks, ...basicTasks],
      "integrationParameters": [/* ... */],
      "integrationConfigParameters": [/* ... */]
    };
  }
}
```

### 4. **Padrão Auto-Transformations Jsonnet**
**Implementação**: Biblioteca reutilizável de transformações
```typescript
// Estrutura auto-transformations.libsonnet
local transformations = {
  // Formatação de documentos (CPF, CNPJ, etc.)
  formatDocument(value, options): 
    std.strReplace(std.strReplace(value, ".", ""), "-", ""),
    
  // Divisão de telefone em partes
  splitPhone(value, options): 
    if options.operation == "extract_area_code" then
      std.substr(std.strReplace(value, "+55", ""), 0, 2)
    else if options.operation == "extract_phone_number" then
      std.substr(std.strReplace(value, "+55", ""), 2, 9)
    else value,
    
  // Divisão de nomes
  splitName(value, options):
    local parts = std.split(value, " ");
    if options.operation == "split_first_name" then
      parts[0]
    else if options.operation == "split_last_name" then
      std.join(" ", parts[1:])
    else value,
    
  // Normalização de case
  normalizeCase(value, options):
    if options.operation == "upper_case" then
      std.asciiUpper(value)
    else if options.operation == "lower_case" then
      std.asciiLower(value)
    else value,
    
  // Conversões de código de país
  convertCountryCode(value, mapping):
    if std.objectHas(mapping, value) then
      mapping[value]
    else value,
    
  // Função identidade para fallback
  identity(value, options): value
};

transformations
```

## 🔗 Padrões de Comunicação Frontend-Backend

### 1. **Padrão Chamada Direta (Sem Proxy)**
**Implementação**: URLs completas para evitar problemas de proxy
```typescript
// Frontend - Chamada direta com URL completa
const fetchIntegrationJson = async () => {
  const response = await fetch('http://localhost:8080/api/transformations/preview-integration', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      customerEmail: config.customerEmail,
      systemEndpoint: config.systemEndpoint,
      mappings: mappings,
      systemPayload: config.systemPayload || {}
    }),
  });
  
  const data = await response.json();
  if (data.success) {
    setIntegrationJson(data.integrationJson);
  }
};
```

### 2. **Padrão Endpoint Preview Integration**
**Implementação**: Endpoint especializado para geração de JSON final
```typescript
// Backend - Endpoint otimizado para preview
router.post('/preview-integration', async (req, res) => {
  try {
    const { customerEmail, systemEndpoint, mappings, systemPayload } = req.body;
    
    const integrationJson = generateCompleteIntegrationJSON({
      customerEmail,
      systemEndpoint, 
      mappings: mappings || [],
      systemPayload: systemPayload || {}
    });

    res.json({
      success: true,
      integrationJson,
      summary: {
        totalMappings: (mappings || []).length,
        transformationsCount: transformationTasks.length,
        taskConfigs: integrationJson.taskConfigs.length
      },
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Erro interno do servidor',
      details: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
});
```

## 📋 Padrões de Mapeamento de Transformações

### 1. **Padrão Função de Transformação**
**Implementação**: Mapeamento de tipos para funções Jsonnet
```typescript
const getTransformationFunction = (type: string): string => {
  const mapping: { [key: string]: string } = {
    'format_document': 'formatDocument',
    'phone_split': 'splitPhone',
    'name_split': 'splitName',
    'normalize': 'normalizeCase',
    'country_code': 'convertCountryCode',
    'gender_code': 'convertGenderCode',
    'code_lookup': 'lookupCode',
    'concat': 'concat',
    'split': 'splitString',
    'convert': 'convertType',
    'format_date': 'formatDate'
  };
  return mapping[type] || 'identity';
};
```

### 2. **Padrão Geração de Nomes de Variáveis**
**Implementação**: Normalização consistente de nomes
```typescript
const generateVariableName = (fieldName: string): string => {
  const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
  return `transformed_mapping_${normalizedName}`;
};
```

### 3. **Padrão Geração de Paths Jsonnet**
**Implementação**: Conversão de paths JavaScript para Jsonnet
```typescript
const generateJsonnetPath = (fieldPath: string): string => {
  const pathParts = fieldPath.split('.');
  let jsonnetPath = 'gupyPayload';
  pathParts.forEach(part => {
    jsonnetPath += `["${part}"]`;
  });
  return jsonnetPath;
};
```
