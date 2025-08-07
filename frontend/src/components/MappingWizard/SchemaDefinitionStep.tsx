import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  RadioGroup,
  FormControlLabel,
  Radio,
  Chip,
  Alert,
  Paper,
  Divider,
  FormControl,
  FormLabel,
  Tabs,
  Tab
} from '@mui/material';
import {
  Code,
  DataObject,
  CheckCircle,
  Error as ErrorIcon,
  Edit,
  Add,
  Remove
} from '@mui/icons-material';
import { SchemaData } from './MappingWizard';

interface SchemaDefinitionStepProps {
  onSchemaSubmit: (data: SchemaData) => void;
}

interface ExampleSchema {
  name: string;
  description: string;
  schema: any;
}

// Interface para TabPanel
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`schema-tabpanel-${index}`}
      aria-labelledby={`schema-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ pt: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

// Campos que não devem ser mapeados (metadados de schema)
const NON_MAPPABLE_FIELDS = [
  '$schema', 'title', 'description', 'required', 'type', 'properties', 'items',
  'format', 'default', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength',
  'pattern', 'additionalProperties', 'definitions', '$ref', '$id', 'examples',
  'const', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else'
];

const SchemaDefinitionStep: React.FC<SchemaDefinitionStepProps> = ({ onSchemaSubmit }) => {
  const [tabValue, setTabValue] = useState(0);
  const [inputType, setInputType] = useState<'schema' | 'payload'>('payload');
  const [content, setContent] = useState('');
  const [manualFields, setManualFields] = useState<string[]>(['']);
  const [examples, setExamples] = useState<ExampleSchema[]>([]);
  const [validation, setValidation] = useState<{
    isValid: boolean;
    errors: string[];
    detectedFields: number;
  }>({
    isValid: false,
    errors: [],
    detectedFields: 0
  });

  useEffect(() => {
    loadExamples();
  }, []);

  useEffect(() => {
    if (tabValue < 2) { // Validar apenas para abas JSON
      validateContent();
    } else { // Validar para aba manual
      validateManualFields();
    }
  }, [content, inputType, manualFields, tabValue]);

  const loadExamples = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/gemini/example-schemas');
      if (response.ok) {
        const data = await response.json();
        setExamples(data);
      }
    } catch (error) {
      console.error('Erro ao carregar exemplos:', error);
    }
  };

  const validateContent = () => {
    if (!content.trim()) {
      setValidation({
        isValid: false,
        errors: [],
        detectedFields: 0
      });
      return;
    }

    try {
      const parsed = JSON.parse(content);
      const detectedFields = countFields(parsed);
      const detectedType = detectInputType(parsed);
      
      // Auto-ajustar o tipo se necessário
      if (detectedType !== inputType) {
        setInputType(detectedType);
      }

      setValidation({
        isValid: true,
        errors: [],
        detectedFields
      });
    } catch (error) {
      setValidation({
        isValid: false,
        errors: ['JSON inválido. Verifique a sintaxe.'],
        detectedFields: 0
      });
    }
  };

  const detectInputType = (parsed: any): 'schema' | 'payload' => {
    // Se tem valores concretos (não são definições de tipo), é payload
    const hasConcreteValues = (obj: any): boolean => {
      if (typeof obj !== 'object' || obj === null) {
        return typeof obj === 'string' && obj !== 'string' && obj !== 'number' && obj !== 'boolean';
      }

      for (const value of Object.values(obj)) {
        if (typeof value === 'string' && !['string', 'number', 'boolean', 'object', 'array'].includes(value)) {
          return true;
        }
        if (typeof value === 'object' && hasConcreteValues(value)) {
          return true;
        }
      }
      return false;
    };

    return hasConcreteValues(parsed) ? 'payload' : 'schema';
  };

  const countFields = (obj: any, depth = 0): number => {
    if (typeof obj !== 'object' || obj === null || depth > 5) {
      return 1;
    }

    let count = 0;
    for (const value of Object.values(obj)) {
      if (typeof value === 'object' && value !== null) {
        count += countFields(value, depth + 1);
      } else {
        count += 1;
      }
    }
    return count;
  };

  // Validação para campos manuais
  const validateManualFields = () => {
    const validFields = manualFields.filter(field => field.trim() !== '');
    
    if (validFields.length === 0) {
      setValidation({
        isValid: false,
        errors: [],
        detectedFields: 0
      });
      return;
    }

    setValidation({
      isValid: true,
      errors: [],
      detectedFields: validFields.length
    });
  };

  // Migrado do TargetSchemaInput - Parsing robusto de JSON para PayloadFields
  const parseJsonToFields = (jsonString: string): any => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Check if it's a JSON Schema with properties at root level
      if (parsed.properties && typeof parsed.properties === 'object') {
        return parseObjectToFields(parsed.properties);
      }
      
      // Otherwise parse as regular object
      return parseObjectToFields(parsed);
    } catch (err) {
      throw new Error('Invalid JSON format');
    }
  };

  // Migrado do TargetSchemaInput - Parser robusto de objetos
  const parseObjectToFields = (obj: any, parentPath: string = '', parentId: string = ''): any => {
    const fields: any[] = [];
    
    Object.entries(obj).forEach(([key, value]) => {
      // Skip schema metadata fields
      if (NON_MAPPABLE_FIELDS.includes(key)) {
        return;
      }

      const path = parentPath ? `${parentPath}.${key}` : key;
      const id = parentId ? `${parentId}-${key}` : key;
      
      let type: string = 'string';
      let children: any[] | undefined;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const valueObj = value as any;
        
        // Check if it's a schema definition with properties
        if (valueObj.properties && typeof valueObj.properties === 'object') {
          type = 'object';
          children = parseObjectToFields(valueObj.properties, path, id);
        } 
        // Check if it's a schema definition with type object and properties
        else if (valueObj.type === 'object' && valueObj.properties) {
          type = 'object';
          children = parseObjectToFields(valueObj.properties, path, id);
        } 
        // Check if it's a schema definition with type array and items
        else if (valueObj.type === 'array' && valueObj.items) {
          type = 'array';
          if (valueObj.items.properties) {
            children = parseObjectToFields(valueObj.items.properties, path, id);
          } else if (valueObj.items.type) {
            // Array of primitives - create a single field for the array
            fields.push({
              id,
              name: key,
              type: 'array',
              path
            });
            return;
          }
        }
        // Check if it has a type property (schema field definition)
        else if (valueObj.type && typeof valueObj.type === 'string') {
          // If it's a primitive type, create a leaf field
          if (['string', 'number', 'boolean'].includes(valueObj.type)) {
            type = valueObj.type;
            fields.push({
              id,
              name: key,
              type,
              path
            });
            return;
          }
          // If it's an object type without properties, skip it (no drop area)
          else if (valueObj.type === 'object' && !valueObj.properties) {
            return; // Skip objects without defined properties
          }
          // If it's an array type without items.properties, skip it
          else if (valueObj.type === 'array' && (!valueObj.items || !valueObj.items.properties)) {
            return; // Skip arrays without defined item properties
          }
        }
        // Regular object without schema properties
        else {
          type = 'object';
          children = parseObjectToFields(value, path, id);
        }
      } 
      else if (Array.isArray(value)) {
        type = 'array';
        if (value.length > 0 && typeof value[0] === 'object') {
          children = parseObjectToFields(value[0], path, id);
        }
      } 
      else if (typeof value === 'number') {
        type = 'number';
      } 
      else if (typeof value === 'boolean') {
        type = 'boolean';
      }
      else if (typeof value === 'string') {
        type = 'string';
      }
      
      // Add field if it has children (but no drop area for containers)
      if (children && children.length > 0) {
        fields.push({
          id,
          name: key,
          type,
          path,
          children
        });
      } 
      // Only add leaf fields (primitives) with drop areas
      else if (!children && ['string', 'number', 'boolean'].includes(type)) {
        fields.push({
          id,
          name: key,
          type,
          path
        });
      }
    });
    
    return fields;
  };

  // Handlers para campos manuais
  const handleManualFieldChange = (index: number, value: string) => {
    const newFields = [...manualFields];
    newFields[index] = value;
    setManualFields(newFields);
  };

  const addManualField = () => {
    setManualFields([...manualFields, '']);
  };

  const removeManualField = (index: number) => {
    if (manualFields.length > 1) {
      const newFields = manualFields.filter((_, i) => i !== index);
      setManualFields(newFields);
    }
  };

  const handleExampleSelect = (example: ExampleSchema) => {
    setContent(JSON.stringify(example.schema, null, 2));
    setInputType('payload'); // Exemplos são sempre payloads
    setTabValue(0); // Voltar para primeira aba
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleJsonSubmit = () => {
    if (!validation.isValid) return;

    const parsedData = JSON.parse(content);
    const schemaData: SchemaData = {
      type: inputType,
      content,
      isValid: true,
      parsedData
    };

    onSchemaSubmit(schemaData);
  };

  const handleManualSubmit = () => {
    if (!validation.isValid) return;

    const validFields = manualFields.filter(field => field.trim() !== '');
    
    if (validFields.length === 0) {
      setValidation({
        isValid: false,
        errors: ['Please add at least one field'],
        detectedFields: 0
      });
      return;
    }

    // Criar objeto schema a partir dos campos manuais
    const manualSchema: any = {};
    
    validFields.forEach((fieldPath) => {
      const parts = fieldPath.split('.');
      let current = manualSchema;
      
      for (let i = 0; i < parts.length - 1; i++) {
        if (!current[parts[i]]) {
          current[parts[i]] = {};
        }
        current = current[parts[i]];
      }
      
      const lastPart = parts[parts.length - 1];
      current[lastPart] = 'string'; // Tipo padrão
    });

    const schemaData: SchemaData = {
      type: 'schema',
      content: JSON.stringify(manualSchema, null, 2),
      isValid: true,
      parsedData: manualSchema
    };

    onSchemaSubmit(schemaData);
  };

  const getPlaceholder = () => {
    if (inputType === 'payload') {
      return `Cole aqui um exemplo real do seu sistema:

{
  "funcionario": {
    "nome": "João Silva",
    "email": "joao@empresa.com",
    "cpf": "123.456.789-00",
    "endereco": {
      "cidade": "São Paulo",
      "estado": "SP"
    }
  }
}`;
    } else {
      return `Cole aqui o schema JSON do seu sistema:

{
  "funcionario": {
    "nome": "string",
    "email": "string",
    "cpf": "string",
    "endereco": {
      "cidade": "string",
      "estado": "string"
    }
  }
}`;
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📋 Defina a Estrutura do Seu Sistema
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Escolha como você quer definir a estrutura do seu sistema. Você pode usar exemplos de payload, schemas JSON ou criar campos manualmente.
      </Typography>

      {/* Exemplos Prontos */}
      {examples.length > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            💡 Exemplos Prontos:
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {examples.map((example) => (
              <Chip
                key={example.name}
                label={example.name}
                onClick={() => handleExampleSelect(example)}
                sx={{ cursor: 'pointer' }}
                variant="outlined"
              />
            ))}
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 2 }} />

      {/* Interface de Abas */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab 
            label="Exemplo de Payload" 
            icon={<DataObject />} 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            label="Schema JSON" 
            icon={<Code />} 
            sx={{ textTransform: 'none' }}
          />
          <Tab 
            label="Campos Manuais" 
            icon={<Edit />} 
            sx={{ textTransform: 'none' }}
          />
        </Tabs>
      </Box>

      {/* Aba 1: Exemplo de Payload */}
      <TabPanel value={tabValue} index={0}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Cole aqui um exemplo real do seu sistema (recomendado para melhor precisão da IA):
        </Typography>
        
        <TextField
          multiline
          rows={10}
          fullWidth
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`{
  "funcionario": {
    "nome": "João Silva",
    "email": "joao@empresa.com",
    "cpf": "123.456.789-00",
    "endereco": {
      "cidade": "São Paulo",
      "estado": "SP"
    }
  }
}`}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleJsonSubmit}
          disabled={!validation.isValid || !content.trim()}
          fullWidth
        >
          Usar Este Payload →
        </Button>
      </TabPanel>

      {/* Aba 2: Schema JSON */}
      <TabPanel value={tabValue} index={1}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Cole aqui o schema JSON do seu sistema:
        </Typography>
        
        <TextField
          multiline
          rows={10}
          fullWidth
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={`{
  "funcionario": {
    "nome": "string",
    "email": "string",
    "cpf": "string",
    "endereco": {
      "cidade": "string",
      "estado": "string"
    }
  }
}`}
          sx={{ mb: 2 }}
        />

        <Button
          variant="contained"
          onClick={handleJsonSubmit}
          disabled={!validation.isValid || !content.trim()}
          fullWidth
        >
          Usar Este Schema →
        </Button>
      </TabPanel>

      {/* Aba 3: Campos Manuais */}
      <TabPanel value={tabValue} index={2}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Adicione campos do seu sistema manualmente (use dot notation para campos aninhados):
        </Typography>
        
        {manualFields.map((field, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={field}
              onChange={(e) => handleManualFieldChange(index, e.target.value)}
              placeholder="ex: funcionario.nome, funcionario.endereco.cidade"
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => removeManualField(index)}
              disabled={manualFields.length === 1}
              sx={{ minWidth: 'auto', px: 2 }}
            >
              <Remove />
            </Button>
          </Box>
        ))}
        
        <Box sx={{ display: 'flex', gap: 1, mt: 2, mb: 3 }}>
          <Button
            variant="outlined"
            onClick={addManualField}
            startIcon={<Add />}
          >
            Adicionar Campo
          </Button>
          <Button
            variant="contained"
            onClick={handleManualSubmit}
            disabled={!validation.isValid}
            sx={{ flexGrow: 1 }}
          >
            Criar Schema Manual →
          </Button>
        </Box>
      </TabPanel>

      {/* Validação Global */}
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
          {validation.errors.join(', ')}
        </Alert>
      )}

      {validation.isValid && validation.detectedFields > 0 && (
        <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle />}>
          ✅ {validation.detectedFields} campos detectados
        </Alert>
      )}

      {/* Informações */}
      <Paper sx={{ p: 2, bgcolor: '#f8f9fa', mt: 3 }}>
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Dica:</strong> {tabValue === 0 
            ? 'Payloads de exemplo permitem que a IA entenda melhor o contexto dos seus dados, resultando em mapeamentos mais precisos.'
            : tabValue === 1
            ? 'Schemas JSON definem a estrutura técnica dos dados. Para melhores resultados, considere usar um exemplo de payload real.'
            : 'Campos manuais oferecem controle total sobre a estrutura. Use dot notation para campos aninhados (ex: usuario.endereco.cidade).'
          }
        </Typography>
      </Paper>
    </Box>
  );
};

export default SchemaDefinitionStep;
