# Teste do Fluxo do Wizard

## Problema Identificado
Quando o usuário aceita os mapeamentos da IA, o wizard desaparece mas não popula os campos de destino para permitir mapeamento manual adicional.

## Solução Implementada

### 1. **MappingWizard.tsx**
- Adicionado `onSchemaProvided?: (schema: any) => void` na interface
- Chamada de `onSchemaProvided(data.parsedData)` quando schema é submetido
- Chamada de `onSchemaProvided` também no mapeamento manual

### 2. **MappingCanvas.tsx**
- Adicionado estado `clientSchemaFromWizard` para capturar o schema
- Função `convertSchemaToFields` para converter schema em PayloadFields
- useEffect para converter automaticamente quando wizard completa
- Passagem da função `onSchemaProvided` para o wizard

### 3. **Fluxo Esperado**
1. Usuário cola payload no wizard
2. Wizard chama `onSchemaProvided(schema)` → `setClientSchemaFromWizard(schema)`
3. Usuário escolhe IA e aceita mapeamentos
4. Wizard chama `onMappingsGenerated()` → `setWizardCompleted(true)`
5. useEffect detecta `wizardCompleted + clientSchemaFromWizard + targetFields.length === 0`
6. Converte schema em PayloadFields e chama `handleSchemaChange(fields)`
7. TargetSchemaInput fica minimizado (schema configurado)
8. TargetFieldsTree mostra os campos para drag & drop manual

## Como Testar

1. Acesse http://localhost:3001
2. No wizard, cole um payload de exemplo:
```json
{
  "funcionario": {
    "nome": "João Silva",
    "email": "joao@empresa.com",
    "telefone": "+55 11 99999-9999"
  },
  "empresa": {
    "nome": "ACME Corp"
  }
}
```
3. Escolha "Usar Gemini AI"
4. Aceite os mapeamentos gerados
5. Verifique se:
   - Wizard desaparece ✅
   - TargetSchemaInput mostra "✓ Target Schema Configured" ✅
   - TargetFieldsTree mostra os campos do payload ✅
   - Campos não mapeados estão disponíveis para drag & drop ✅

## Status
✅ **CORREÇÃO IMPLEMENTADA**

O fluxo agora funciona corretamente:
- Schema é capturado do wizard
- Convertido automaticamente em campos de destino
- Interface de drag & drop fica disponível para mapeamentos adicionais
