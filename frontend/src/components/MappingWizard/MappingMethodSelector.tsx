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
      accuracy: '~95% accuracy',
      speed: '10-20 seconds',
      description: 'Semantic analysis based on schema/payload',
      color: '#1976d2'
    },
    {
      id: 'payload-comparison',
      icon: '📋', 
      title: 'Comparison',
      subtitle: 'Payload vs Payload',
      accuracy: '~99% accuracy',
      speed: '5-10 seconds', 
      description: 'Same data, different formats',
      highlight: true,
      color: '#ff6b35'
    },
    {
      id: 'manual',
      icon: '✋',
      title: 'Manual', 
      subtitle: 'Drag & Drop',
      accuracy: '100% control',
      speed: '5-15 minutes',
      description: 'Traditional drag and drop interface',
      color: '#666'
    }
  ];

  const handleMethodClick = (method: MappingMethod) => {
    console.log(`🎯 Method selected: ${method}`);
    onMethodSelected(method);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h5" gutterBottom sx={{ textAlign: 'center', mb: 3 }}>
        🚀 Choose the Mapping Method
      </Typography>
      
      <Typography variant="body1" color="text.secondary" sx={{ textAlign: 'center', mb: 4 }}>
        Select how you want to map fields between source and destination systems
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
                  label="RECOMMENDED" 
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
                  Select {method.title}
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Additional Information */}
      <Paper sx={{ mt: 4, p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
        <Typography variant="subtitle2" fontWeight="medium" gutterBottom>
          💡 Tip: Which method to choose?
        </Typography>
        <Typography variant="body2">
          • <strong>Comparison</strong>: Ideal when you have real data in both formats<br/>
          • <strong>Gemini AI</strong>: Perfect for schema and example-based mapping<br/>
          • <strong>Manual</strong>: Full control, ideal for very specific cases
        </Typography>
      </Paper>
    </Box>
  );
};

export default MappingMethodSelector;
