import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Grid,
  Chip,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Divider
} from '@mui/material';
import {
  AutoAwesome,
  Edit,
  CheckCircle,
  Speed,
  Psychology,
  Tune,
  TouchApp,
  Compare,
  TrendingUp,
  Insights
} from '@mui/icons-material';
import { SchemaData } from './MappingWizard';

interface MappingMethodSelectorProps {
  schemaData: SchemaData;
  onMethodSelect: (method: 'ai' | 'manual' | 'payload-comparison') => void;
}

const MappingMethodSelector: React.FC<MappingMethodSelectorProps> = ({
  schemaData,
  onMethodSelect
}) => {
  const [selectedMethod, setSelectedMethod] = useState<'ai' | 'manual' | 'payload-comparison' | null>(null);

  const handleMethodSelect = (method: 'ai' | 'manual' | 'payload-comparison') => {
    setSelectedMethod(method);
    // Pequeno delay para mostrar a seleção
    setTimeout(() => {
      onMethodSelect(method);
    }, 300);
  };

  const getSchemaPreview = () => {
    const preview = JSON.stringify(schemaData.parsedData, null, 2);
    if (preview.length > 200) {
      return preview.substring(0, 200) + '...';
    }
    return preview;
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🤖 Como Você Quer Criar os Mapeamentos?
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Escolha como mapear os campos da Gupy para o seu sistema. Recomendamos usar a IA para maior precisão e velocidade.
      </Typography>

      {/* Preview do Schema */}
      <Paper sx={{ p: 2, mb: 3, bgcolor: '#f8f9fa' }}>
        <Typography variant="subtitle2" gutterBottom>
          📋 Estrutura Detectada ({schemaData.type === 'payload' ? 'Payload' : 'Schema'}):
        </Typography>
        <Box sx={{ 
          fontFamily: 'monospace', 
          fontSize: '0.75rem', 
          bgcolor: 'white', 
          p: 1, 
          borderRadius: 1,
          border: '1px solid #e0e0e0',
          maxHeight: 150,
          overflow: 'auto'
        }}>
          <pre style={{ margin: 0 }}>{getSchemaPreview()}</pre>
        </Box>
      </Paper>

      <Grid container spacing={3}>
        {/* Opção IA */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              border: selectedMethod === 'ai' ? '2px solid #1976d2' : '1px solid #e0e0e0',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => handleMethodSelect('ai')}
          >
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <AutoAwesome color="primary" />
                <Typography variant="h6" color="primary">
                  Gemini AI
                </Typography>
                <Chip label="Rápido" color="primary" size="small" />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                IA analisa estrutura e cria mapeamentos automáticos.
              </Typography>

              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Psychology color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Análise semântica"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Speed color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="10-20 segundos"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="~95% precisão"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>

              <Box sx={{ mt: 2, p: 1, bgcolor: '#e3f2fd', borderRadius: 1 }}>
                <Typography variant="caption" color="primary">
                  💡 Baseado em schema/payload
                </Typography>
              </Box>
            </CardContent>

            <CardActions sx={{ pt: 0 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<AutoAwesome />}
                disabled={selectedMethod === 'ai'}
                sx={{ 
                  opacity: selectedMethod === 'ai' ? 0.7 : 1,
                  transform: selectedMethod === 'ai' ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                {selectedMethod === 'ai' ? 'Selecionado!' : 'Gerar com IA'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Opção Equiparação de Payload - NOVA */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              border: selectedMethod === 'payload-comparison' ? '2px solid #ff6b35' : '1px solid #e0e0e0',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => handleMethodSelect('payload-comparison')}
          >
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Compare sx={{ color: '#ff6b35' }} />
                <Typography variant="h6" sx={{ color: '#ff6b35' }}>
                  Equiparação
                </Typography>
                <Chip label="Máxima Precisão" sx={{ bgcolor: '#ff6b35', color: 'white' }} size="small" />
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Compare payload Gupy vs Sistema com mesmos dados mockados.
              </Typography>

              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TrendingUp sx={{ color: '#ff6b35' }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Comparação lado a lado"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Insights sx={{ color: '#ff6b35' }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Detecta transformações"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle sx={{ color: '#ff6b35' }} fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="~99% precisão"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>

              <Box sx={{ mt: 2, p: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                <Typography variant="caption" sx={{ color: '#ff6b35' }}>
                  🎯 Mesmos dados, formatos diferentes
                </Typography>
              </Box>
            </CardContent>

            <CardActions sx={{ pt: 0 }}>
              <Button
                variant="contained"
                fullWidth
                startIcon={<Compare />}
                disabled={selectedMethod === 'payload-comparison'}
                sx={{ 
                  bgcolor: selectedMethod === 'payload-comparison' ? '#ff6b35' : '#ff6b35',
                  '&:hover': { bgcolor: '#e55a2b' },
                  opacity: selectedMethod === 'payload-comparison' ? 0.7 : 1,
                  transform: selectedMethod === 'payload-comparison' ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                {selectedMethod === 'payload-comparison' ? 'Selecionado!' : 'Equiparar Payloads'}
              </Button>
            </CardActions>
          </Card>
        </Grid>

        {/* Opção Manual */}
        <Grid item xs={12} md={4}>
          <Card 
            sx={{ 
              height: '100%',
              cursor: 'pointer',
              border: selectedMethod === 'manual' ? '2px solid #1976d2' : '1px solid #e0e0e0',
              transition: 'all 0.3s ease',
              '&:hover': {
                boxShadow: 3,
                transform: 'translateY(-2px)'
              }
            }}
            onClick={() => handleMethodSelect('manual')}
          >
            <CardContent sx={{ pb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                <Edit color="action" />
                <Typography variant="h6">
                  Mapeamento Manual
                </Typography>
              </Box>

              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Controle total sobre os mapeamentos usando drag & drop tradicional.
              </Typography>

              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Tune color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Controle total sobre mapeamentos"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TouchApp color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Interface drag & drop"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <CheckCircle color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Para casos específicos"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Edit color="action" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Transformações personalizadas"
                    primaryTypographyProps={{ variant: 'body2' }}
                  />
                </ListItem>
              </List>

              <Box sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                <Typography variant="caption" color="text.secondary">
                  ⚡ Ideal para integrações complexas que requerem lógica específica de negócio.
                </Typography>
              </Box>
            </CardContent>

            <CardActions sx={{ pt: 0 }}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Edit />}
                disabled={selectedMethod === 'manual'}
                sx={{ 
                  opacity: selectedMethod === 'manual' ? 0.7 : 1,
                  transform: selectedMethod === 'manual' ? 'scale(0.98)' : 'scale(1)'
                }}
              >
                {selectedMethod === 'manual' ? 'Selecionado!' : 'Mapear Manualmente'}
              </Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      <Divider sx={{ my: 3 }} />

      {/* Comparação */}
      <Paper sx={{ p: 2, bgcolor: '#fafafa' }}>
        <Typography variant="subtitle2" gutterBottom>
          📊 Comparação Rápida:
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              <strong>🤖 Gemini AI:</strong> ~95% precisão, 10-20 segundos
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" sx={{ color: '#ff6b35' }}>
              <strong>📋 Equiparação:</strong> ~99% precisão, 5-10 segundos
            </Typography>
          </Grid>
          <Grid item xs={4}>
            <Typography variant="caption" color="text.secondary">
              <strong>✋ Manual:</strong> 100% controle, 5-15 minutos
            </Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default MappingMethodSelector;
