import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Grid,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  Chip,
  Divider
} from '@mui/material';
import { MappingConnection } from '../../types';

interface PayloadComparisonStepProps {
  onMappingsGenerated: (mappings: MappingConnection[]) => void;
  onBack: () => void;
}

interface PayloadEditorProps {
  title: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  error?: string;
}

const PayloadEditor: React.FC<PayloadEditorProps> = ({ 
  title, 
  value, 
  onChange, 
  placeholder, 
  error 
}) => {
  return (
    <Box>
      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
        {title}
      </Typography>
      <TextField
        fullWidth
        multiline
        rows={12}
        variant="outlined"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        error={!!error}
        helperText={error}
        sx={{ 
          mb: 1,
          '& .MuiInputBase-root': {
            fontFamily: 'Monaco, Consolas, "Courier New", monospace',
            fontSize: '12px'
          }
        }}
      />
      <Typography variant="caption" color="text.secondary">
        {value.length} caracteres • {value ? (isValidJSON(value) ? '✅ JSON válido' : '❌ JSON inválido') : 'Aguardando input'}
      </Typography>
    </Box>
  );
};

const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str);
    return true;
  } catch {
    return false;
  }
};

const InfoBox: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50', border: '1px solid', borderColor: 'grey.200' }}>
    <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
      {title}
    </Typography>
    <Typography variant="body2" color="text.secondary">
      {children}
    </Typography>
  </Paper>
);

const PayloadComparisonStep: React.FC<PayloadComparisonStepProps> = ({
  onMappingsGenerated,
  onBack
}) => {
  const [sourcePayload, setSourcePayload] = useState('');
  const [targetPayload, setTargetPayload] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<MappingConnection[] | null>(null);

  const loadExamplePayloads = () => {
    const exampleSource = {
      "body": {
        "companyName": "Minerva Foods",
        "event": "pre-employee.moved",
        "data": {
          "candidate": {
            "name": "João",
            "lastName": "Silva",
            "email": "joao.silva@email.com",
            "identificationDocument": "123.456.789-00",
            "mobileNumber": "+5511999998888",
            "addressCity": "São Paulo",
            "addressState": "São Paulo",
            "addressCountry": "Brasil",
            "gender": "Male"
          },
          "job": {
            "departmentCode": "40000605",
            "roleCode": "35251270",
            "name": "Software Engineer"
          },
          "admission": {
            "hiringDate": "2019-06-19T00:00:00.000Z"
          }
        }
      }
    };

    const exampleTarget = {
      "firstName": "JOÃO",
      "lastName": "SILVA",
      "email": "joao.silva@email.com",
      "documentNumber": "12345678900",
      "areaCode": "11",
      "phoneNumber": "999998888",
      "city": "São Paulo",
      "state": "São Paulo",
      "country": "BRA",
      "genderCode": "M",
      "departmentCode": "40000605",
      "roleCode": "35251270",
      "jobTitle": "Software Engineer",
      "startDate": "2019-06-19"
    };

    setSourcePayload(JSON.stringify(exampleSource, null, 2));
    setTargetPayload(JSON.stringify(exampleTarget, null, 2));
  };

  const handleAnalyzeComparison = async () => {
    setIsAnalyzing(true);
    setError(null);
    
    try {
      // Validar JSONs
      if (!sourcePayload.trim() || !targetPayload.trim()) {
        throw new Error('Ambos os payloads são obrigatórios');
      }

      const sourceParsed = JSON.parse(sourcePayload);
      const targetParsed = JSON.parse(targetPayload);

      console.log('📋 Iniciando equiparação de payloads...');
      console.log('📄 Source payload:', sourceParsed);
      console.log('🎯 Target payload:', targetParsed);

      const response = await fetch('/api/gemini/payload-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourcePayload: sourceParsed,
          targetPayload: targetParsed,
          sourceSystemId: 'gupy' // Para compatibilidade
        })
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Erro na API: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Erro desconhecido na equiparação');
      }

      console.log('✅ Equiparação concluída:', result);
      console.log(`🎯 ${result.mappings.length} mapeamentos gerados`);

      setResults(result.mappings);

    } catch (error) {
      console.error('❌ Erro na equiparação:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAcceptMappings = () => {
    if (results && results.length > 0) {
      console.log('🎉 Aceitando mapeamentos de equiparação:', results.length);
      onMappingsGenerated(results);
    }
  };

  const canAnalyze = sourcePayload.trim() && targetPayload.trim() && 
                    isValidJSON(sourcePayload) && isValidJSON(targetPayload) && 
                    !isAnalyzing;

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom>
        📋 Equiparação de Payloads
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Forneça payloads com <strong>os mesmos dados</strong> nos formatos da origem e do seu sistema 
        para detecção automática de transformações com ~99% de precisão.
      </Typography>

      <InfoBox title="Como Funciona a Equiparação">
        1. <strong>Payload Origem:</strong> Dados no formato original do sistema origem<br/>
        2. <strong>Payload Destino:</strong> Os mesmos dados no formato que seu sistema espera<br/>
        3. <strong>IA Compara:</strong> Identifica automaticamente como transformar cada campo<br/>
        4. <strong>Alta Precisão:</strong> ~99% de confiança na correspondência de campos
      </InfoBox>

      {!results && (
        <>
          <Box sx={{ mb: 3 }}>
            <Button 
              variant="outlined" 
              onClick={loadExamplePayloads}
              sx={{ mr: 2 }}
              size="small"
            >
              📄 Carregar Exemplo
            </Button>
            <Typography variant="caption" color="text.secondary">
              Carrega dados de exemplo para testar a funcionalidade
            </Typography>
          </Box>

          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={6}>
              <PayloadEditor 
                title="📄 Payload Sistema Origem"
                value={sourcePayload}
                onChange={setSourcePayload}
                placeholder={`{
  "body": {
    "data": {
      "candidate": {
        "name": "João Silva",
        "email": "joao@email.com",
        "identificationDocument": "123.456.789-00"
      }
    }
  }
}`}
                error={sourcePayload && !isValidJSON(sourcePayload) ? 'JSON inválido' : undefined}
              />
            </Grid>
            
            <Grid item xs={6}>
              <PayloadEditor 
                title="🎯 Payload Sistema Destino" 
                value={targetPayload}
                onChange={setTargetPayload}
                placeholder={`{
  "firstName": "João",
  "lastName": "Silva", 
  "email": "joao@email.com",
  "documentNumber": "12345678900"
}`}
                error={targetPayload && !isValidJSON(targetPayload) ? 'JSON inválido' : undefined}
              />
            </Grid>
          </Grid>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={onBack}
              disabled={isAnalyzing}
            >
              ← Voltar
            </Button>
            
            <Button 
              variant="contained" 
              onClick={handleAnalyzeComparison}
              disabled={!canAnalyze}
              sx={{ 
                bgcolor: '#ff6b35',
                minWidth: '200px',
                '&:hover': { bgcolor: '#e55a2b' }
              }}
              startIcon={isAnalyzing ? <CircularProgress size={20} color="inherit" /> : undefined}
            >
              {isAnalyzing ? 'Analisando...' : '🚀 ANALISAR EQUIPARAÇÃO'}
            </Button>
          </Box>
        </>
      )}

      {results && (
        <Box>
          <Alert severity="success" sx={{ mb: 3 }}>
            ✅ Equiparação concluída! {results.length} mapeamentos detectados com alta precisão
          </Alert>

          <Paper sx={{ p: 2, mb: 3, maxHeight: '400px', overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              🔗 Mapeamentos Detectados
            </Typography>
            
            <List dense>
              {results.map((mapping, index) => (
                <React.Fragment key={mapping.id || index}>
                  <ListItem>
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
                              color="success"
                              variant="outlined"
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
                              {mapping.reasoning}
                            </Typography>
                          )}
                        </Box>
                      }
                    />
                  </ListItem>
                  {index < results.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>

          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
            <Button
              variant="outlined"
              onClick={() => {
                setResults(null);
                setError(null);
              }}
            >
              🔄 Nova Equiparação
            </Button>
            
            <Button
              variant="contained"
              onClick={handleAcceptMappings}
              sx={{ bgcolor: '#4caf50' }}
            >
              ✅ Aceitar Mapeamentos ({results.length})
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
};

export default PayloadComparisonStep;
