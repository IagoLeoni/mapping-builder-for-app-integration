import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Alert,
  Divider,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  LinearProgress
} from '@mui/material';
import {
  CheckCircle,
  Edit,
  Refresh,
  ExpandMore,
  TrendingUp,
  Psychology,
  Speed,
  Visibility
} from '@mui/icons-material';
import { MappingConnection } from '../../types';

interface AIMappingResultsProps {
  mappings: MappingConnection[];
  onAccept: () => void;
  onEdit: () => void;
  onRetry: () => void;
}

const AIMappingResults: React.FC<AIMappingResultsProps> = ({
  mappings,
  onAccept,
  onEdit,
  onRetry
}) => {
  const [selectedMapping, setSelectedMapping] = useState<string | null>(null);

  // Filtrar apenas mapeamentos com transformações que tenham confiança ≥80%
  const filteredMappings = mappings.filter(mapping => {
    // Se não tem transformação, mostrar sempre
    if (!mapping.transformation) {
      return true;
    }
    // Se tem transformação, mostrar apenas se confiança ≥80%
    return (mapping.confidence || 0) >= 80;
  });

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'default';
    if (confidence >= 95) return 'success';
    if (confidence >= 85) return 'warning';
    return 'error';
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return 'Baixa';
    if (confidence >= 95) return 'Muito Alta';
    if (confidence >= 85) return 'Alta';
    return 'Média';
  };

  const averageConfidence = filteredMappings.length > 0 
    ? filteredMappings.reduce((sum, m) => sum + (m.confidence || 0), 0) / filteredMappings.length 
    : 0;

  const highConfidenceMappings = filteredMappings.filter(m => (m.confidence || 0) >= 90).length;

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        ✨ Mapeamentos Gerados pela IA
      </Typography>

      {/* Resumo dos Resultados */}
      <Alert severity="success" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" gutterBottom>
          🎉 {filteredMappings.length} mapeamento(s) exibido(s) com transformações válidas (confiança ≥80%)!
        </Typography>
        <Typography variant="body2">
          Confiança média: {averageConfidence.toFixed(1)}% • 
          {highConfidenceMappings} mapeamento(s) com confiança ≥ 90%
        </Typography>
        {mappings.length > filteredMappings.length && (
          <Typography variant="body2" color="warning.main" sx={{ mt: 1 }}>
            ⚠️ {mappings.length - filteredMappings.length} mapeamento(s) com transformações de baixa confiança (&lt;80%) foram ocultados
          </Typography>
        )}
      </Alert>

      {/* Estatísticas */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="primary">
              {mappings.length}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Mapeamentos
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="success.main">
              {averageConfidence.toFixed(0)}%
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Confiança Média
            </Typography>
          </Card>
        </Grid>
        <Grid item xs={4}>
          <Card sx={{ textAlign: 'center', p: 2 }}>
            <Typography variant="h4" color="warning.main">
              {highConfidenceMappings}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Alta Confiança
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {/* Lista de Mapeamentos */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Psychology fontSize="small" />
            Mapeamentos Detectados:
          </Typography>
          
          <List dense>
            {filteredMappings.map((mapping, index) => (
              <React.Fragment key={mapping.id}>
                <ListItem
                  sx={{ 
                    cursor: 'pointer',
                    borderRadius: 1,
                    '&:hover': { bgcolor: '#f5f5f5' },
                    bgcolor: selectedMapping === mapping.id ? '#e3f2fd' : 'transparent'
                  }}
                  onClick={() => setSelectedMapping(
                    selectedMapping === mapping.id ? null : mapping.id
                  )}
                >
                  <ListItemIcon>
                    <CheckCircle color="success" fontSize="small" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {mapping.sourceField.path}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          →
                        </Typography>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {mapping.targetPath}
                        </Typography>
                        <Chip
                          label={`${mapping.confidence}%`}
                          size="small"
                          color={getConfidenceColor(mapping.confidence)}
                          variant="outlined"
                        />
                        {mapping.transformation && (
                          <Chip
                            label="🔄 Transformação"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      selectedMapping === mapping.id && mapping.reasoning && (
                        <Box sx={{ mt: 1, p: 1, bgcolor: '#f8f9fa', borderRadius: 1 }}>
                          <Typography variant="caption" color="text.secondary">
                            💡 {mapping.reasoning}
                          </Typography>
                          {mapping.transformation && (
                            <Typography variant="caption" color="warning.main" sx={{ display: 'block', mt: 0.5 }}>
                              🔄 Transformação: {mapping.transformation.type} (Confiança ≥80%)
                            </Typography>
                          )}
                        </Box>
                      )
                    }
                  />
                </ListItem>
                {index < filteredMappings.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        </CardContent>
      </Card>

      {/* Detalhes Expandíveis */}
      <Accordion sx={{ mb: 3 }}>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Visibility fontSize="small" />
            <Typography variant="subtitle2">
              Ver Análise Detalhada da IA
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Distribuição de Confiança:
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Muito Alta (≥95%)</Typography>
                  <Typography variant="caption">
                    {mappings.filter(m => (m.confidence || 0) >= 95).length}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(mappings.filter(m => (m.confidence || 0) >= 95).length / mappings.length) * 100}
                  color="success"
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Alta (85-94%)</Typography>
                  <Typography variant="caption">
                    {mappings.filter(m => (m.confidence || 0) >= 85 && (m.confidence || 0) < 95).length}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(mappings.filter(m => (m.confidence || 0) >= 85 && (m.confidence || 0) < 95).length / mappings.length) * 100}
                  color="warning"
                  sx={{ mb: 1 }}
                />
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption">Média (&lt;85%)</Typography>
                  <Typography variant="caption">
                    {mappings.filter(m => (m.confidence || 0) < 85).length}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={(mappings.filter(m => (m.confidence || 0) < 85).length / mappings.length) * 100}
                  color="error"
                />
              </Box>
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Typography variant="caption" color="text.secondary" gutterBottom>
                Tipos de Análise Utilizados:
              </Typography>
              <List dense>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Psychology fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Análise Semântica"
                    secondary="Comparação de significados"
                    primaryTypographyProps={{ variant: 'caption' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <TrendingUp fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Padrões Hierárquicos"
                    secondary="Contexto de estruturas"
                    primaryTypographyProps={{ variant: 'caption' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
                <ListItem sx={{ px: 0 }}>
                  <ListItemIcon sx={{ minWidth: 32 }}>
                    <Speed fontSize="small" color="primary" />
                  </ListItemIcon>
                  <ListItemText 
                    primary="Tags Semânticas"
                    secondary="Variações de nomenclatura"
                    primaryTypographyProps={{ variant: 'caption' }}
                    secondaryTypographyProps={{ variant: 'caption' }}
                  />
                </ListItem>
              </List>
            </Grid>
          </Grid>
        </AccordionDetails>
      </Accordion>

      {/* Ações */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          <Button
            variant="contained"
            fullWidth
            startIcon={<CheckCircle />}
            onClick={onAccept}
            size="large"
          >
            Aceitar Todos
          </Button>
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            variant="outlined"
            fullWidth
            startIcon={<Edit />}
            onClick={onEdit}
            size="large"
          >
            Aceitar e Ajustar
          </Button>
        </Grid>
        <Grid item xs={12} md={4}>
          <Button
            variant="text"
            fullWidth
            startIcon={<Refresh />}
            onClick={onRetry}
            size="large"
          >
            Tentar Novamente
          </Button>
        </Grid>
      </Grid>

      {/* Dica */}
      <Box sx={{ mt: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
        <Typography variant="caption" color="text.secondary">
          💡 <strong>Dica:</strong> Você pode aceitar os mapeamentos e depois ajustá-los manualmente, 
          ou tentar novamente se não estiver satisfeito com os resultados. 
          Mapeamentos com confiança ≥ 90% geralmente são muito precisos.
        </Typography>
      </Box>
    </Box>
  );
};

export default AIMappingResults;
