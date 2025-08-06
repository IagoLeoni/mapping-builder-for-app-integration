# Templates Directory

Este diretório contém todos os templates utilizados para gerar integrações do Application Integration do Google Cloud.

## Estrutura

```
templates/
├── integration/           # Templates de integração
│   ├── base-integration.json
│   └── tasks/            # Templates de tarefas
│       ├── field-mapping-task.json
│       ├── rest-task.json
│       ├── email-task.json
│       └── jsonnet-mapper-task.json
└── transformations/      # Templates de transformação Jsonnet
    ├── value-mapping.jsonnet
    ├── date-format.jsonnet
    ├── expression.jsonnet
    └── conditional.jsonnet
```

## Templates de Integração

### base-integration.json
Template principal da integração do Application Integration. Contém a estrutura base com placeholders para:
- `{{INTEGRATION_NAME}}` - Nome da integração
- `{{UPDATE_TIME}}` - Timestamp de atualização
- `{{CREATE_TIME}}` - Timestamp de criação
- `{{START_TASKS}}` - Tarefas iniciais
- `{{TRIGGER_NAME}}` - Nome do trigger
- `{{TRIGGER_ID}}` - ID do trigger
- `{{TASK_CONFIGS}}` - Configurações das tarefas
- `{{INTEGRATION_PARAMETERS}}` - Parâmetros da integração
- `{{CONFIG_PARAMETERS}}` - Parâmetros de configuração

### Templates de Tarefas

#### field-mapping-task.json
Template para tarefas de mapeamento de campos.

**Placeholders:**
- `{{TASK_ID}}` - ID da tarefa
- `{{MAPPING_CONFIG}}` - Configuração do mapeamento
- `{{NEXT_TASKS}}` - Próximas tarefas
- `{{DISPLAY_NAME}}` - Nome de exibição
- `{{POSITION_X}}`, `{{POSITION_Y}}` - Posição no canvas

#### rest-task.json
Template para tarefas de chamadas REST.

**Placeholders:**
- `{{TASK_ID}}` - ID da tarefa
- `{{HTTP_METHOD}}` - Método HTTP (GET, POST, etc.)
- `{{URL}}` - URL do endpoint
- `{{REQUEST_BODY}}` - Corpo da requisição
- `{{NEXT_TASKS}}` - Próximas tarefas
- `{{DISPLAY_NAME}}` - Nome de exibição
- `{{POSITION_X}}`, `{{POSITION_Y}}` - Posição no canvas
- `{{ERROR_CATCHER_ID}}` - ID do error catcher

#### email-task.json
Template para tarefas de envio de email.

**Placeholders:**
- `{{TASK_ID}}` - ID da tarefa
- `{{EMAIL_TO}}` - Destinatário do email
- `{{EMAIL_SUBJECT}}` - Assunto do email
- `{{EMAIL_BODY}}` - Corpo do email
- `{{DISPLAY_NAME}}` - Nome de exibição
- `{{POSITION_X}}`, `{{POSITION_Y}}` - Posição no canvas

#### jsonnet-mapper-task.json
Template para tarefas de transformação usando Jsonnet.

**Placeholders:**
- `{{TASK_ID}}` - ID da tarefa
- `{{JSONNET_TEMPLATE}}` - Template Jsonnet
- `{{NEXT_TASKS}}` - Próximas tarefas
- `{{DISPLAY_NAME}}` - Nome de exibição
- `{{POSITION_X}}`, `{{POSITION_Y}}` - Posição no canvas

## Templates de Transformação Jsonnet

### value-mapping.jsonnet
Template para mapeamento de valores (ex: "A" → "Alpha").

**Placeholders:**
- `{{INPUT_PATH}}` - Caminho para acessar o valor no payload
- `{{MAPPING_RULES}}` - Regras de mapeamento (if/then/else)
- `{{DEFAULT_VALUE}}` - Valor padrão se não houver match
- `{{VAR_NAME}}` - Nome da variável de saída

**Exemplo de uso:**
```jsonnet
local f = import "functions";
local gupyPayload = f.extVar("gupyPayload");
local inputValue = gupyPayload["companyName"];

local transformValue(value) = (
  if inputValue == "ACME" then "Company A"
  else if inputValue == "CORP" then "Company B"
  else inputValue
);

{
  transformed_mapping_companyname: transformValue(inputValue)
}
```

### date-format.jsonnet
Template para conversão de formato de data.

**Placeholders:**
- `{{INPUT_PATH}}` - Caminho para acessar a data no payload
- `{{FROM_FORMAT}}` - Formato de origem (ex: "DD/MM/YYYY")
- `{{TO_FORMAT}}` - Formato de destino (ex: "YYYY-MM-DD")
- `{{VAR_NAME}}` - Nome da variável de saída

### expression.jsonnet
Template para expressões customizadas.

**Placeholders:**
- `{{INPUT_PATH}}` - Caminho para acessar o valor no payload
- `{{FORMULA}}` - Fórmula/expressão a ser aplicada
- `{{VAR_NAME}}` - Nome da variável de saída

### conditional.jsonnet
Template para transformações condicionais.

**Placeholders:**
- `{{INPUT_PATH}}` - Caminho para acessar o valor no payload
- `{{CONDITIONS}}` - Condições (if/then/else)
- `{{DEFAULT_VALUE}}` - Valor padrão
- `{{VAR_NAME}}` - Nome da variável de saída

## Como Usar

Os templates são utilizados pelo `TemplateService` (`frontend/src/services/TemplateService.ts`) que:

1. **Carrega templates** dos arquivos ou usa fallbacks inline
2. **Substitui placeholders** com valores reais
3. **Gera código Jsonnet** para transformações
4. **Cria tarefas** do Application Integration

### Exemplo de uso no código:

```typescript
import { TemplateService } from '../services/TemplateService';

// Gerar template de value mapping
const jsonnetTemplate = await TemplateService.generateValueMappingTemplate(
  'transformed_mapping_status',
  'gupyPayload["status"]',
  { 'active': 'A', 'inactive': 'I' },
  'U' // default value
);

// Gerar nome de variável
const varName = TemplateService.generateVariableName('companyName');
// Resultado: 'transformed_mapping_companyname'

// Gerar path Jsonnet
const path = TemplateService.generateJsonnetPath('data.candidate.name');
// Resultado: 'gupyPayload["data"]["candidate"]["name"]'
```

## Manutenção

### Adicionando Novos Templates

1. **Criar arquivo** no diretório apropriado
2. **Definir placeholders** usando formato `{{PLACEHOLDER_NAME}}`
3. **Atualizar TemplateService** para suportar o novo template
4. **Documentar** neste README

### Modificando Templates Existentes

1. **Editar arquivo** de template
2. **Testar** com dados reais
3. **Atualizar documentação** se necessário
4. **Verificar compatibilidade** com Application Integration

### Pipeline de Deploy

Os templates podem ser utilizados em pipelines de CI/CD para:
- **Validação** de sintaxe Jsonnet
- **Testes** de geração de integrações
- **Deploy automatizado** no Google Cloud

## Benefícios

✅ **Manutenibilidade** - Templates centralizados e organizados
✅ **Reutilização** - Mesmo template para diferentes integrações
✅ **Consistência** - Estrutura padronizada
✅ **Flexibilidade** - Fácil customização via placeholders
✅ **Versionamento** - Controle de versão dos templates
✅ **Pipeline Ready** - Pronto para automação
