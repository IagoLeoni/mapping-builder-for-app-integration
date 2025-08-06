import React, { useState } from 'react';
import { validateGupyPayload, getGupyExamplePayload, GupyValidationResult } from '../../utils/gupyValidator';
import {
  Box,
  Typography,
  Button,
  Grid,
  Paper,
  TextField,
  Alert,
  Chip,
  Divider,
  Card,
  CardContent,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Compare,
  CheckCircle,
  Error,
  ContentCopy,
  Refresh,
  Info
} from '@mui/icons-material';

interface PayloadComparisonStepProps {
  onPayloadsSubmit: (gupyPayload: any, systemPayload: any) => void;
}

const PayloadComparisonStep: React.FC<PayloadComparisonStepProps> = ({
  onPayloadsSubmit
}) => {
  const [gupyPayload, setGupyPayload] = useState('');
  const [systemPayload, setSystemPayload] = useState('');
  const [gupyValid, setGupyValid] = useState<boolean | null>(null);
  const [systemValid, setSystemValid] = useState<boolean | null>(null);
  const [gupyParsed, setGupyParsed] = useState<any>(null);
  const [systemParsed, setSystemParsed] = useState<any>(null);
  const [gupyValidation, setGupyValidation] = useState<GupyValidationResult | null>(null);

  const validateJSON = (jsonString: string, setter: (valid: boolean | null) => void, parsedSetter: (data: any) => void) => {
    if (!jsonString.trim()) {
      setter(null);
      parsedSetter(null);
      return;
    }

    try {
      const parsed = JSON.parse(jsonString);
      setter(true);
      parsedSetter(parsed);
    } catch (error) {
      setter(false);
      parsedSetter(null);
    }
  };

  const handleGupyChange = async (value: string) => {
    setGupyPayload(value);
    validateJSON(value, setGupyValid, setGupyParsed);
    
    // Validar contra schema Gupy se o JSON é válido
    if (value.trim()) {
      try {
        const parsed = JSON.parse(value);
        const validation = await validateGupyPayload(parsed);
        setGupyValidation(validation);
      } catch (error) {
        console.error('Erro na validação Gupy:', error);
        setGupyValidation(null);
      }
    } else {
      setGupyValidation(null);
    }
  };

  const handleSystemChange = (value: string) => {
    setSystemPayload(value);
    validateJSON(value, setSystemValid, setSystemParsed);
  };

  const handleSubmit = () => {
    if (gupyValid && systemValid && gupyParsed && systemParsed) {
      onPayloadsSubmit(gupyParsed, systemParsed);
    }
  };

  const loadExamplePayloads = () => {
    const exampleGupy = {
      "companyName": "ACME Corp",
      "data": {
        "candidate": {
          "name": "João Silva",
          "lastName": "Santos",
          "email": "joao.silva@email.com",
          "identificationDocument": "123.456.789-00",
          "mobileNumber": "+5511999998888",
          "addressCity": "São Paulo",
          "addressState": "São Paulo",
          "addressCountry": "Brasil",
          "addressZipCode": "01310-100",
          "gender": "Male"
        },
        "admission": {
          "hiringDate": "2024-01-15T00:00:00.000Z",
          "position": {
            "salary": { "value": 8500.50 }
          }
        }
      }
    };

    const exampleSystem = {
      "employee": {
        "firstName": "JOÃO",
        "lastName": "SILVA SANTOS", 
        "email": "joao.silva@email.com",
        "documentNumber": "12345678900",
        "phone": {
          "areaCode": "11",
          "number": "999998888"
        },
        "address": {
          "city": "SÃO PAULO",
          "state": "SP",
          "country": "BRA",
          "zipCode": "01310100"
        },
        "gender": "M",
        "startDate": "2024-01-15",
        "salary": 8500.50
      }
    };

    setGupyPayload(JSON.stringify(exampleGupy, null, 2));
    setSystemPayload(JSON.stringify(exampleSystem, null, 2));
    handleGupyChange(JSON.stringify(exampleGupy, null, 2));
    handleSystemChange(JSON.stringify(exampleSystem, null, 2));
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getValidationIcon = (valid: boolean | null) => {
    if (valid === null) return null;
    return valid ? <CheckCircle color="success" /> : <Error color="error" />;
  };

  const canSubmit = gupyValid && systemValid && gupyParsed && systemParsed;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📋 Equiparação de Payloads
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Forneça payloads com <strong>os mesmos dados</strong> nos formatos da Gupy e do seu sistema para detecção automática de transformações.
      </Typography>

      {/* Informações e exemplo */}
      <Card sx={{ mb: 3, bgcolor: '#f0f7ff' }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
            <Info color="primary" />
            <Typography variant="subtitle2" color="primary">
              Como Funciona a Equiparação
            </Typography>
          </Box>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            1. <strong>Payload Gupy:</strong> Dados no formato original da Gupy<br/>
            2. <strong>Payload Sistema:</strong> Os mesmos dados no formato que seu sistema espera<br/>
            3. <strong>IA Compara:</strong> Identifica automaticamente como transformar cada campo
          </Typography>

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Refresh />}
              onClick={loadExamplePayloads}
            >
              Carregar Exemplo
            </Button>
            <Chip 
              label="Exemplo: CPF '123.456.789-00' → '12345678900'" 
              size="small" 
              color="primary" 
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>

      <Grid container spacing={3}>
        {/* Payload Gupy */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#1976d2' }}>
                🏢 Payload Gupy (Origem)
              </Typography>
              {getValidationIcon(gupyValid)}
              <Tooltip title="Copiar JSON">
                <IconButton 
                  size="small" 
                  onClick={() => copyToClipboard(gupyPayload)}
                  disabled={!gupyPayload}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              multiline
              rows={16}
              fullWidth
              value={gupyPayload}
              onChange={(e) => handleGupyChange(e.target.value)}
              placeholder="Cole aqui o payload da Gupy com dados mockados..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  bgcolor: gupyValid === false ? '#ffebee' : gupyValid === true ? '#e8f5e8' : 'white'
                }
              }}
            />

            {gupyValid === false && (
              <Alert severity="error" sx={{ mt: 1 }}>
                JSON inválido. Verifique a sintaxe.
              </Alert>
            )}

            {gupyValid === true && gupyParsed && (
              <Alert severity="success" sx={{ mt: 1 }}>
                ✅ JSON válido - {Object.keys(gupyParsed).length} propriedades raiz detectadas
              </Alert>
            )}

            {/* Validação contra Schema Gupy */}
            {gupyValidation && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
                  🔍 Validação contra Schema Gupy:
                </Typography>
                
                {gupyValidation.confidence >= 70 ? (
                  <Alert severity="success" sx={{ mb: 2 }}>
                    ✅ Payload compatível com Gupy ({gupyValidation.confidence}% confiança)
                  </Alert>
                ) : gupyValidation.confidence >= 50 ? (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    ⚠️ Payload parcialmente compatível ({gupyValidation.confidence}% confiança)
                  </Alert>
                ) : (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    ❌ Payload não parece ser da Gupy ({gupyValidation.confidence}% confiança)
                  </Alert>
                )}

                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Chip 
                    label={`${gupyValidation.fieldCount.valid} campos válidos`} 
                    size="small" 
                    color="success" 
                    variant="outlined"
                  />
                  {gupyValidation.fieldCount.invalid > 0 && (
                    <Chip 
                      label={`${gupyValidation.fieldCount.invalid} erros de tipo`} 
                      size="small" 
                      color="error" 
                      variant="outlined"
                    />
                  )}
                  {gupyValidation.warnings.length > 0 && (
                    <Chip 
                      label={`${gupyValidation.warnings.length} avisos`} 
                      size="small" 
                      color="warning" 
                      variant="outlined"
                    />
                  )}
                </Box>

                {gupyValidation.suggestions.length > 0 && (
                  <Box sx={{ mt: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      💡 <strong>Sugestões:</strong>
                    </Typography>
                    {gupyValidation.suggestions.slice(0, 2).map((suggestion, index) => (
                      <Typography key={index} variant="caption" display="block" color="text.secondary" sx={{ ml: 1 }}>
                        • {suggestion}
                      </Typography>
                    ))}
                  </Box>
                )}
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Payload Sistema */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#ff6b35' }}>
                🎯 Payload Sistema (Destino)
              </Typography>
              {getValidationIcon(systemValid)}
              <Tooltip title="Copiar JSON">
                <IconButton 
                  size="small" 
                  onClick={() => copyToClipboard(systemPayload)}
                  disabled={!systemPayload}
                >
                  <ContentCopy fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <TextField
              multiline
              rows={16}
              fullWidth
              value={systemPayload}
              onChange={(e) => handleSystemChange(e.target.value)}
              placeholder="Cole aqui o payload do seu sistema com os mesmos dados transformados..."
              variant="outlined"
              sx={{
                '& .MuiOutlinedInput-root': {
                  fontFamily: 'monospace',
                  fontSize: '0.75rem',
                  bgcolor: systemValid === false ? '#ffebee' : systemValid === true ? '#fff3e0' : 'white'
                }
              }}
            />

            {systemValid === false && (
              <Alert severity="error" sx={{ mt: 1 }}>
                JSON inválido. Verifique a sintaxe.
              </Alert>
            )}

            {systemValid === true && systemParsed && (
              <Alert severity="success" sx={{ mt: 1 }}>
                ✅ JSON válido - {Object.keys(systemParsed).length} propriedades raiz detectadas
              </Alert>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Preview de comparação */}
      {canSubmit && (
        <Paper sx={{ p: 2, mb: 3, bgcolor: '#f9f9f9' }}>
          <Typography variant="subtitle2" gutterBottom>
            🔍 Preview da Comparação:
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Typography variant="caption" color="primary">
                <strong>Gupy:</strong> {JSON.stringify(gupyParsed).length} caracteres
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <Typography variant="caption" sx={{ color: '#ff6b35' }}>
                <strong>Sistema:</strong> {JSON.stringify(systemParsed).length} caracteres
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      )}

      {/* Botão de análise */}
      <Box sx={{ textAlign: 'center' }}>
        <Button
          variant="contained"
          size="large"
          startIcon={<Compare />}
          onClick={handleSubmit}
          disabled={!canSubmit}
          sx={{
            bgcolor: '#ff6b35',
            '&:hover': { bgcolor: '#e55a2b' },
            '&:disabled': { bgcolor: '#ccc' }
          }}
        >
          {canSubmit ? 'Analisar Equiparação com IA' : 'Aguardando Payloads Válidos'}
        </Button>

        {canSubmit && (
          <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>
            🚀 A IA comparará os dados e criará mapeamentos com transformações automáticas
          </Typography>
        )}
      </Box>
    </Box>
  );
};

export default PayloadComparisonStep;
