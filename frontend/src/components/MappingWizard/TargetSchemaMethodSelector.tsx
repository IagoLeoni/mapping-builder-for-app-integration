import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip
} from '@mui/material';

export type TargetSchemaMethod = 'manual' | 'gemini-assisted' | 'template';

interface MethodOption {
  type: TargetSchemaMethod;
  icon: string;
  title: string;
  subtitle: string;
  description: string;
  difficulty: string;
  time: string;
  color: string;
  recommended?: boolean;
}

interface TargetSchemaMethodSelectorProps {
  onMethodSelect: (method: TargetSchemaMethod) => void;
}

const TargetSchemaMethodSelector: React.FC<TargetSchemaMethodSelectorProps> = ({
  onMethodSelect
}) => {
  const methods: MethodOption[] = [
    {
      type: 'manual',
      icon: '📝',
      title: 'Inserção Manual',
      subtitle: 'Cole JSON/Schema',
      description: 'Você já tem um schema ou exemplo JSON do seu sistema destino',
      difficulty: 'Fácil',
      time: '1-2 minutos',
      color: '#1976d2'
    },
    {
      type: 'gemini-assisted',
      icon: '🤖',
      title: 'Assistido por IA',
      subtitle: 'Descreva seu Sistema',
      description: 'Descreva seu sistema e a IA gera o schema automaticamente',
      difficulty: 'Muito Fácil',
      time: '30 segundos',
      color: '#ff6b35',
      recommended: true
    },
    {
      type: 'template',
      icon: '⚡',
      title: 'Templates Prontos',
      subtitle: 'Sistemas Populares',
      description: 'Escolha entre templates de sistemas HR/ERP conhecidos',
      difficulty: 'Instantâneo',
      time: '10 segundos',
      color: '#4caf50'
    }
  ];

  const MethodCard: React.FC<{ method: MethodOption }> = ({ method }) => (
    <Card 
      sx={{ 
        cursor: 'pointer',
        border: method.recommended ? '2px solid #ff6b35' : '1px solid #ddd',
        position: 'relative',
        '&:hover': { 
          boxShadow: 6,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={() => onMethodSelect(method.type)}
    >
      {method.recommended && (
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
            fontWeight: 'bold',
            fontSize: '0.7rem'
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
          
          <Typography variant="body2" sx={{ mb: 3, minHeight: '3rem' }}>
            {method.description}
          </Typography>
        </Box>
        
        <Box>
          <Box sx={{ mb: 2 }}>
            <Chip 
              label={method.difficulty} 
              variant="outlined" 
              size="small" 
              sx={{ mr: 1, mb: 1 }} 
            />
            <Chip 
              label={method.time} 
              variant="outlined" 
              size="small" 
            />
          </Box>
          
          <Button
            variant="contained"
            fullWidth
            sx={{ 
              bgcolor: method.color,
              '&:hover': { 
                bgcolor: method.color,
                filter: 'brightness(0.9)'
              }
            }}
          >
            Escolher Método
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🎯 Como você quer definir o Schema do Sistema Destino?
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        Primeiro, precisamos entender a estrutura do seu sistema destino. 
        Escolha o método que for mais conveniente para você:
      </Typography>

      <Grid container spacing={3}>
        {methods.map((method) => (
          <Grid item xs={12} md={4} key={method.type}>
            <MethodCard method={method} />
          </Grid>
        ))}
      </Grid>

      <Box sx={{ mt: 4, p: 3, bgcolor: '#f8f9fa', borderRadius: 2 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
          💡 Qual método escolher?
        </Typography>
        <Typography variant="body2" color="text.secondary">
          • <strong>Manual:</strong> Se você já tem o schema/JSON do seu sistema<br/>
          • <strong>IA Assistida:</strong> Se você quer descrever seu sistema em linguagem natural<br/>
          • <strong>Templates:</strong> Se seu sistema é um dos populares (Salesforce, Workday, etc.)
        </Typography>
      </Box>
    </Box>
  );
};

export default TargetSchemaMethodSelector;
