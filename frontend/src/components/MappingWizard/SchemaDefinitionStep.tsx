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
  FormLabel
} from '@mui/material';
import {
  Code,
  DataObject,
  CheckCircle,
  Error as ErrorIcon
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

const SchemaDefinitionStep: React.FC<SchemaDefinitionStepProps> = ({ onSchemaSubmit }) => {
  const [inputType, setInputType] = useState<'schema' | 'payload'>('payload');
  const [content, setContent] = useState('');
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
    validateContent();
  }, [content, inputType]);

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

  const handleExampleSelect = (example: ExampleSchema) => {
    setContent(JSON.stringify(example.schema, null, 2));
    setInputType('payload'); // Exemplos são sempre payloads
  };

  const handleSubmit = () => {
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
        Como você quer definir a estrutura do seu sistema? Recomendamos usar um exemplo real de payload.
      </Typography>

      {/* Seletor de Tipo */}
      <FormControl component="fieldset" sx={{ mb: 3 }}>
        <FormLabel component="legend">Tipo de Entrada:</FormLabel>
        <RadioGroup
          row
          value={inputType}
          onChange={(e) => setInputType(e.target.value as 'schema' | 'payload')}
        >
          <FormControlLabel
            value="payload"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DataObject fontSize="small" />
                Exemplo de Payload (Recomendado)
              </Box>
            }
          />
          <FormControlLabel
            value="schema"
            control={<Radio />}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Code fontSize="small" />
                Schema JSON
              </Box>
            }
          />
        </RadioGroup>
      </FormControl>

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

      {/* Campo de Entrada */}
      <TextField
        multiline
        rows={12}
        fullWidth
        label={inputType === 'payload' ? 'Exemplo de Payload' : 'Schema JSON'}
        placeholder={getPlaceholder()}
        value={content}
        onChange={(e) => setContent(e.target.value)}
        sx={{ mb: 2 }}
        error={!validation.isValid && content.length > 0}
      />

      {/* Validação */}
      {validation.errors.length > 0 && (
        <Alert severity="error" sx={{ mb: 2 }} icon={<ErrorIcon />}>
          {validation.errors.join(', ')}
        </Alert>
      )}

      {validation.isValid && content.length > 0 && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
          ✅ {validation.detectedFields} campos detectados • Tipo: {inputType === 'payload' ? 'Payload' : 'Schema'}
        </Alert>
      )}

      {/* Informações */}
      <Paper sx={{ p: 2, bgcolor: '#f8f9fa', mb: 3 }}>
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Dica:</strong> {inputType === 'payload' 
            ? 'Payloads de exemplo permitem que a IA entenda melhor o contexto dos seus dados, resultando em mapeamentos mais precisos.'
            : 'Schemas JSON definem a estrutura técnica dos dados. Para melhores resultados, considere usar um exemplo de payload real.'
          }
        </Typography>
      </Paper>

      {/* Botão de Continuar */}
      <Button
        variant="contained"
        onClick={handleSubmit}
        disabled={!validation.isValid || !content.trim()}
        size="large"
        fullWidth
        sx={{ mt: 2 }}
      >
        Continuar para Método de Mapeamento →
      </Button>
    </Box>
  );
};

export default SchemaDefinitionStep;
