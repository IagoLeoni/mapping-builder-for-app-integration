import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import { MappingConnection } from '../../types';

interface AIMappingStepProps {
  onMappingsGenerated: (mappings: MappingConnection[]) => void;
  onBack: () => void;
  sourceFields?: any[]; // Fields do sistema origem já carregados
}

type InputType = 'json-schema' | 'json-payload';

const AIMappingStep: React.FC<AIMappingStepProps> = ({
  onMappingsGenerated,
  onBack,
  sourceFields = []
}) => {
  const [targetSchema, setTargetSchema] = useState('');
  const [inputType, setInputType] = useState<InputType>('json-payload');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MappingConnection[] | null>(null);
  const [selectedMappings, setSelectedMappings] = useState<Set<string>>(new Set());

  const loadExampleSchema = () => {
    const examplePayload = {
      "firstName": "John",
      "lastName": "Doe",
      "email": "john@example.com",
      "documentNumber": "12345678900",
      "phone": {
        "areaCode": "11",
        "number": "999999999"
      },
      "address": {
        "city": "São Paulo",
        "state": "SP",
        "country": "BRA"
      },
      "employment": {
        "departmentCode": "TECH",
        "jobTitle": "Software Engineer",
        "startDate": "2023-01-15",
        "salary": 5000.00
      },
      "personalInfo": {
        "genderCode": "M",
        "birthDate": "1990-05-15"
      }
    };

    setTargetSchema(JSON.stringify(examplePayload, null, 2));
  };

  const handleInputTypeChange = (event: SelectChangeEvent<InputType>) => {
    setInputType(event.target.value as InputType);
  };

  const handleGenerateMappings = async () => {
    setIsGenerating(true);
    setError(null);
    
    try {
      // Validar entrada
      if (!targetSchema.trim()) {
        throw new Error('Schema do sistema destino é obrigatório');
      }

      const targetParsed = JSON.parse(targetSchema);

      console.log('🤖 Iniciando mapeamento com Gemini AI...');
      console.log('📄 Target schema:', targetParsed);
      console.log('🔧 Input type:', inputType);

      const response = await fetch('/api/gemini/generate-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientSchema: targetParsed,
          inputType: inputType === 'json-schema' ? 'schema' : 'payload',
          sourceSystemId: 'gupy' // Para compatibilidade
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido na geração de mapeamentos');
      }

      console.log('✅ Mapeamentos AI gerados:', result);
      console.log(`🎯 ${result.mappings.length} mapeamentos com AI`);

      setResults(result.mappings);
      // Selecionar todos os mapeamentos por padrão
      const allMappingIds = new Set<string>(result.mappings.map((m: MappingConnection, index: number) => m.id || index.toString()));
      setSelectedMappings(allMappingIds);

    } catch (error) {
      console.error('❌ Erro na geração de mapeamentos AI:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMappingToggle = (mappingId: string) => {
    const newSelected = new Set(selectedMappings);
    if (newSelected.has(mappingId)) {
      newSelected.delete(mappingId);
    } else {
      newSelected.add(mappingId);
    }
    setSelectedMappings(newSelected);
  };

  const handleAcceptMappings = () => {
    if (results && selectedMappings.size > 0) {
      const acceptedMappings = results.filter((mapping, index) => 
        selectedMappings.has(mapping.id || index.toString())
      );
      console.log('🎉 Aceitando mapeamentos AI:', acceptedMappings.length);
      onMappingsGenerated(acceptedMappings);
    }
  };

  const isValidJSON = (str: string): boolean => {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  };

  const canGenerate = targetSchema.trim() && isValidJSON(targetSchema) && !isGenerating;
  const hasResults = results && results.length > 0;
  const selectedCount = selectedMappings.size;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        🤖 Mapeamento com Gemini AI
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Forneça o schema ou exemplo do seu sistema destino para gerar mapeamentos automáticos 
        com <strong>~95% de precisão</strong> usando inteligência artificial.
      </Typography>

      <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
          🧠 Como Funciona o Gemini AI
        </Typography>
        <Typography variant="body2" color="text.secondary">
          1. <strong>Análise Semântica:</strong> IA analisa nomes e estruturas dos campos<br/>
          2. <strong>Correspondência Inteligente:</strong> Encontra relações baseadas em significado<br/>
          3. <strong>Transformações Automáticas:</strong> Detecta necessidade de formatação e conversão<br/>
          4. <strong>Confidence Score:</strong> Cada mapeamento tem score de confiança
        </Typography>
      </Paper>

      {!hasResults && (
        <>
          <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Tipo de Input</InputLabel>
              <Select
                value={inputType}
                label="Tipo de Input"
                onChange={handleInputTypeChange}
              >
                <MenuItem value="json-payload">JSON Payload</MenuItem>
                <MenuItem value="json-schema">JSON Schema</MenuItem>
              </Select>
            </FormControl>
            
            <Button 
              variant="outlined" 
              onClick={loadExampleSchema}
              size="small"
            >
              📄 Carregar Exemplo
            </Button>
            
            <Typography variant="caption" color="text.secondary">
              Carrega um exemplo típico de sistema HR
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
              {inputType === 'json-schema' ? '📋 JSON Schema do Sistema Destino' : '🎯 Exemplo de Payload do Sistema Destino'}
            </Typography>
            
            <TextField
              fullWidth
              multiline
              rows={16}
              variant="outlined"
              placeholder={inputType === 'json-schema' 
                ? `{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "properties": {
    "firstName": { "type": "string" },
    "lastName": { "type": "string" },
    "email": { "type": "string" },
    "phone": {
      "type": "object",
      "properties": {
        "areaCode": { "type": "string" },
        "number": { "type": "string" }
      }
    }
  }
}`
                : `{
  "firstName": "João",
  "lastName": "Silva",
  "email": "joao@email.com",
  "documentNumber": "12345678900",
  "phone": {
    "areaCode": "11",
    "number": "999999999"
  },
  "address": {
    "city": "São Paulo",
    "state": "SP"
  }
}`
              }
              value={targetSchema}
              onChange={(e) => setTargetSchema(e.target.value)}
              error={!!(targetSchema && !isValidJSON(targetSchema))}
              helperText={
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>
                    {targetSchema && !isValidJSON(targetSchema) ? '❌ JSON inválido' : 
                     targetSchema ? '✅ JSON válido' : 'Aguardando input'}
                  </span>
                  <span>{targetSchema.length} caracteres</span>
                </Box>
              }
              sx={{ 
                '& .MuiInputBase-root': {
                  fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                  fontSize: '12px'
                }
              }}
            />
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={onBack}
              disabled={isGenerating}
            >
              ← Voltar
            </Button>
            
            <Button 
              variant="contained" 
              onClick={handleGenerateMappings}
              disabled={!canGenerate}
              sx={{ 
                bgcolor: '#1976d2',
                minWidth: '200px'
              }}
              startIcon={isGenerating ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isGenerating ? 'Gerando...' : '🤖 GERAR MAPEAMENTOS AI'}
            </Button>
          </Box>
        </>
      )}

      {hasResults && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            ✅ Mapeamentos gerados! {results.length} correspondências encontradas pela IA
          </Alert>

          <Paper sx={{ p: 2, mb: 3, maxHeight: '500px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              🔗 Mapeamentos Sugeridos pela IA
            </Typography>
            
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Selecione os mapeamentos que deseja aceitar:
            </Typography>
            
            <List dense>
              {results.map((mapping, index) => {
                const mappingId = mapping.id || index.toString();
                const isSelected = selectedMappings.has(mappingId);
                
                return (
                  <React.Fragment key={mappingId}>
                    <ListItem 
                      sx={{ 
                        bgcolor: isSelected ? 'action.selected' : 'transparent',
                        borderRadius: 1,
                        mb: 0.5
                      }}
                    >
                      <FormControlLabel
                        control={
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleMappingToggle(mappingId)}
                            size="small"
                          />
                        }
                        label=""
                        sx={{ mr: 1 }}
                      />
                      
                      <ListItemText
                        primary={
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" fontWeight="medium">
                              {mapping.sourceField.name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              →
                            </Typography>
                            <Typography variant="body2" fontWeight="medium">
                              {mapping.targetPath}
                            </Typography>
                            {mapping.confidence && (
                              <Chip 
                                label={`${Math.round(mapping.confidence * 100)}%`}
                                size="small"
                                color={mapping.confidence > 0.8 ? "success" : mapping.confidence > 0.6 ? "warning" : "default"}
                                variant="outlined"
                              />
                            )}
                            {mapping.aiGenerated && (
                              <Chip 
                                label="AI"
                                size="small"
                                color="primary"
                                variant="filled"
                              />
                            )}
                          </Box>
                        }
                        secondary={
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              {mapping.sourceField.path}
                              {mapping.transformation && ` • Transformação: ${mapping.transformation.type}`}
                            </Typography>
                            {mapping.reasoning && (
                              <Typography variant="caption" sx={{ display: 'block', fontStyle: 'italic' }}>
                                💡 {mapping.reasoning}
                              </Typography>
                            )}
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < results.length - 1 && <Divider sx={{ my: 0.5 }} />}
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', alignItems: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setResults(null);
                setSelectedMappings(new Set());
                setError(null);
              }}
            >
              🔄 Novo Mapeamento
            </Button>
            
            <Typography variant="body2" color="text.secondary">
              {selectedCount} de {results.length} selecionados
            </Typography>
            
            <Button
              variant="contained"
              onClick={handleAcceptMappings}
              disabled={selectedCount === 0}
              sx={{ bgcolor: '#4caf50' }}
            >
              ✅ Aceitar Selecionados ({selectedCount})
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default AIMappingStep;
