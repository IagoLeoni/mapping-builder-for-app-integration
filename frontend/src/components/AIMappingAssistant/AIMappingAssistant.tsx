import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  CircularProgress,
  Alert,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails
} from '@mui/material';
import {
  AutoAwesome,
  ExpandMore,
  Visibility,
  Code,
  CheckCircle
} from '@mui/icons-material';
import { MappingConnection } from '../../types';

interface ExampleSchema {
  name: string;
  description: string;
  schema: any;
}

interface AIMappingAssistantProps {
  onMappingsGenerated: (mappings: MappingConnection[]) => void;
}

const AIMappingAssistant: React.FC<AIMappingAssistantProps> = ({ onMappingsGenerated }) => {
  const [clientSchema, setClientSchema] = useState('');
  const [examples, setExamples] = useState<ExampleSchema[]>([]);
  const [gupySchema, setGupySchema] = useState<any>(null);
  const [selectedExample, setSelectedExample] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Carregar exemplos e schema da Gupy na inicialização
    loadExamples();
    loadGupySchema();
  }, []);

  const loadExamples = async () => {
    try {
      console.log('🔍 Carregando exemplos...');
      const response = await fetch('http://localhost:8080/api/gemini/example-schemas');
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Exemplos carregados:', data);
        setExamples(data);
      } else {
        console.error('❌ Erro ao carregar exemplos:', response.status);
      }
    } catch (error) {
      console.error('❌ Erro ao carregar exemplos:', error);
    }
  };

  const loadGupySchema = async () => {
    try {
      const response = await fetch('http://localhost:8080/api/gemini/gupy-schema');
      if (response.ok) {
        const data = await response.json();
        setGupySchema(data);
      } else {
        console.error('Erro ao carregar schema da Gupy:', response.status);
      }
    } catch (error) {
      console.error('Erro ao carregar schema da Gupy:', error);
    }
  };

  const handleExampleSelect = (exampleName: string) => {
    const example = examples.find(ex => ex.name === exampleName);
    if (example) {
      setClientSchema(JSON.stringify(example.schema, null, 2));
      setSelectedExample(exampleName);
      setError(null);
    }
  };

  const handleSchemaChange = (value: string) => {
    setClientSchema(value);
    setSelectedExample(''); // Limpa seleção de exemplo
    setError(null);
    setSuccess(null);
  };

  const validateSchema = () => {
    try {
      JSON.parse(clientSchema);
      return true;
    } catch (error) {
      setError('Schema JSON inválido. Verifique a sintaxe.');
      return false;
    }
  };

  const handleGenerateMappings = async () => {
    if (!validateSchema()) return;

    setIsGenerating(true);
    setError(null);
    setSuccess(null);

    try {
      const schema = JSON.parse(clientSchema);
      const response = await fetch('http://localhost:8080/api/gemini/generate-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientSchema: schema })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erro ao gerar mapeamentos');
      }

      const { mappings, count } = await response.json();
      
      if (count === 0) {
        setError('Nenhum mapeamento foi encontrado. Verifique se o schema contém campos compatíveis.');
      } else {
        setSuccess(`${count} mapeamento(s) gerado(s) com sucesso!`);
        onMappingsGenerated(mappings);
      }
    } catch (error) {
      console.error('Erro ao gerar mapeamentos:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <AutoAwesome color="primary" />
        Assistente de Mapeamento com IA
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Cole o schema JSON do seu sistema ou selecione um exemplo. A IA irá analisar e sugerir mapeamentos automáticos baseados no padrão da Gupy.
      </Typography>

      {/* Schema da Gupy (Referência) */}
      <Accordion sx={{ mb: 2 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Visibility fontSize="small" />
            <Typography variant="subtitle2">
              Ver Schema Padrão da Gupy (Referência)
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Paper sx={{ p: 2, bgcolor: '#f5f5f5', maxHeight: 300, overflow: 'auto' }}>
            <pre style={{ margin: 0, fontSize: '0.75rem', fontFamily: 'monospace' }}>
              {gupySchema ? JSON.stringify(gupySchema.schema, null, 2) : 'Carregando...'}
            </pre>
          </Paper>
        </AccordionDetails>
      </Accordion>

      {/* Seletor de Exemplos */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Code fontSize="small" />
          Exemplos Prontos:
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {examples.map((example) => (
            <Chip
              key={example.name}
              label={example.name}
              onClick={() => handleExampleSelect(example.name)}
              color={selectedExample === example.name ? 'primary' : 'default'}
              variant={selectedExample === example.name ? 'filled' : 'outlined'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
        {selectedExample && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {examples.find(ex => ex.name === selectedExample)?.description}
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />

      {/* Campo de Schema */}
      <TextField
        multiline
        rows={12}
        fullWidth
        label="Schema JSON do Cliente"
        placeholder={`Cole aqui o schema JSON do sistema cliente...

Exemplo:
{
  "empresa": {
    "nome": "string"
  },
  "funcionario": {
    "nome": "string",
    "email": "string"
  }
}`}
        value={clientSchema}
        onChange={(e) => handleSchemaChange(e.target.value)}
        sx={{ mb: 2 }}
        error={!!error}
        helperText={error}
      />

      {/* Alertas */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
          {success}
        </Alert>
      )}

      {/* Botão de Geração */}
      <Button
        variant="contained"
        onClick={handleGenerateMappings}
        disabled={!clientSchema.trim() || isGenerating}
        startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoAwesome />}
        fullWidth
        size="large"
      >
        {isGenerating ? 'Analisando Schema e Gerando Mapeamentos...' : 'Gerar Mapeamentos com IA'}
      </Button>

      {/* Informações adicionais */}
      <Box sx={{ mt: 2, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Dica:</strong> A IA analisa semanticamente os nomes dos campos e sugere mapeamentos baseados em padrões conhecidos. 
          Campos com nomes similares (ex: "name" → "nome", "email" → "mail") terão maior confiança.
        </Typography>
      </Box>
    </Paper>
  );
};

export default AIMappingAssistant;
