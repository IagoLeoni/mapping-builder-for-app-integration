import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Chip,
  Button,
  Paper
} from '@mui/material';

export type MappingMethod = 'gemini-ai' | 'payload-comparison' | 'manual';

interface MappingMethodProps {
  onMethodSelected: (method: MappingMethod) => void;
}

interface MethodInfo {
  id: MappingMethod;
  icon: string;
  title: string;
  subtitle: string;
  accuracy: string;
  speed: string;
  description: string;
  color: string;
  highlight?: boolean;
}

const MappingMethodSelector: React.FC<MappingMethodProps> = ({ onMethodSelected }) => {
  const methods: MethodInfo[] = [
    {
      id: 'gemini-ai',
      icon: '🤖',
      title: 'Gemini AI',
      subtitle: 'Schema/Payload', 
      accuracy: '~95% precisão',
      speed: '10-20 segundos',
      description: 'Análise semântica baseado em schema/payload',
      color: '#1976d2'
    },
    {
      id: 'payload-comparison',
      icon: '📋', 
      title: 'Equiparação',
      subtitle: 'Payload vs Payload',
      accuracy: '~99% precisão',
      speed: '5-10 segundos', 
      description: 'Mesmos dados, formatos diferentes',
      highlight: true,
      color: '#ff6b35'
    },
    {
      id: 'manual',
      icon: '✋',
      title: 'Manual', 
      subtitle: 'Drag & Drop',
      accuracy: '100% controle',
      speed: '5-15 minutos',
      description: 'Interface tradicional arrastar e soltar',
      color: '#666'
    }
  ];

  const handleMethodClick = (method: MappingMethod) => {
    console.log(`🎯 Método selecionado: ${method}`);
    onMethodSelected(method);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        🚀 Escolha o Método de Mapeamento
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
        Selecione como deseja mapear os campos entre sistemas origem e destino
      </Typography>

      <Grid container spacing={3}>
        {methods.map((method) => (
          <Grid item xs={12} md={4} key={method.id}>
            <Card 
              sx={{ 
                cursor: 'pointer',
                border: method.highlight ? '2px solid #ff6b35' : '1px solid #ddd',
                position: 'relative',
                height: '280px',
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.3s ease',
                '&:hover': { 
                  boxShadow: 6,
                  transform: 'translateY(-4px)'
                }
              }}
              onClick={() => handleMethodClick(method.id)}
            >
              {method.highlight && (
                <Chip 
                  label="RECOMENDADO" 
                  color="primary" 
                  size="small"
                  sx={{ 
                    position: 'absolute', 
                    top: 8, 
                    right: 8,
                    bgcolor: '#ff6b35',
                    color: 'white',
                    fontWeight: 'bold'
                  }}
                />
              )}
              
              <CardContent sx={{ 
                textAlign: 'center', 
                p: 3, 
                flexGrow: 1,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}>
                <Box>
                  <Typography variant="h2" sx={{ mb: 1, fontSize: '3rem' }}>
                    {method.icon}
                  </Typography>
                  
                  <Typography variant="h6" sx={{ mb: 1, fontWeight: 'bold' }}>
                    {method.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {method.subtitle}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Chip 
                      label={method.accuracy} 
                      variant="outlined" 
                      size="small" 
                      sx={{ mr: 1, mb: 1 }} 
                    />
                    <Chip 
                      label={method.speed} 
                      variant="outlined" 
                      size="small" 
                    />
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                    {method.description}
                  </Typography>
                </Box>
                
                <Button
                  variant="contained"
                  fullWidth
                  sx={{ 
                    bgcolor: method.color,
                    '&:hover': {
                      bgcolor: method.color,
                      opacity: 0.9
                    }
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMethodClick(method.id);
                  }}
                >
                  Selecionar {method.title}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Informações Adicionais */}
      <Paper sx={{ mt: 4, p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
          💡 Dica: Qual método escolher?
        </Typography>
        <Typography variant="body2">
          • <strong>Equiparação</strong>: Ideal quando você tem dados reais nos dois formatos<br/>
          • <strong>Gemini AI</strong>: Perfeito para mapeamento baseado em schemas e exemplos<br/>
          • <strong>Manual</strong>: Total controle, ideal para casos muito específicos
        </Typography>
      </Paper>
    </Box>
  );
};

export default MappingMethodSelector;
