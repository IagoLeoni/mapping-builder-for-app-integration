import React, { useMemo } from 'react';
import { 
  Box, 
  Typography,
  Paper,
  Button,
  IconButton,
  Tooltip,
  Alert,
  Chip
} from '@mui/material';
import { ContentCopy, Download, CloudUpload } from '@mui/icons-material';
import { IntegrationConfig, MappingConnection } from '../../types';
import { MappingConfigService } from '../../services/MappingConfigService';

interface JsonPreviewProps {
  config: IntegrationConfig;
  mappings?: MappingConnection[];
}

const JsonPreview: React.FC<JsonPreviewProps> = ({ config, mappings = [] }) => {
  const mappingConfig = useMemo(() => {
    return MappingConfigService.generateMappingConfig(mappings, config);
  }, [mappings, config]);

  const validation = useMemo(() => {
    return MappingConfigService.validateMappingConfig(mappingConfig);
  }, [mappingConfig]);

  const summary = useMemo(() => {
    return MappingConfigService.generateIntegrationSummary(mappingConfig);
  }, [mappingConfig]);

  const jsonString = JSON.stringify(mappingConfig, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    MappingConfigService.downloadMappingConfig(mappingConfig);
  };

  const handleDeploy = async () => {
    if (!validation.isValid) {
      alert('Please fix validation errors before deploying');
      return;
    }

    try {
      // Here you would call your backend API to trigger the Cloud Build pipeline
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: jsonString,
      });

      if (response.ok) {
        alert('Integration deployment started successfully!');
      } else {
        alert('Failed to start deployment');
      }
    } catch (error) {
      console.error('Deployment error:', error);
      alert('Failed to start deployment');
    }
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      {/* Header with actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          Mapping Configuration
        </Typography>
        <Box>
          <Tooltip title="Copy to clipboard">
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download JSON">
            <IconButton size="small" onClick={handleDownload}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Summary */}
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`${summary.totalMappings} Mappings`} 
            size="small" 
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`${summary.transformationsCount} Transformations`} 
            size="small" 
            color="secondary" 
            variant="outlined"
          />
          {Object.entries(summary.transformationTypes).map(([type, count]) => (
            <Chip 
              key={type}
              label={`${count} ${type}`} 
              size="small" 
              color="warning" 
              variant="outlined"
            />
          ))}
        </Box>

        {/* Validation */}
        {!validation.isValid && (
          <Alert severity="error" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">Validation Errors:</Typography>
            <ul style={{ margin: 0, paddingLeft: '20px' }}>
              {validation.errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </Alert>
        )}

        {summary.missingRequiredFields.length > 0 && (
          <Alert severity="warning" sx={{ mb: 1 }}>
            <Typography variant="body2" fontWeight="bold">Missing Required Fields:</Typography>
            <Typography variant="body2">
              {summary.missingRequiredFields.join(', ')}
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Deploy button */}
      <Button
        variant="contained"
        startIcon={<CloudUpload />}
        onClick={handleDeploy}
        disabled={!validation.isValid}
        sx={{ mb: 2 }}
        fullWidth
      >
        Deploy to Cloud Build
      </Button>
      
      {/* JSON Preview */}
      <Paper 
        sx={{ 
          flexGrow: 1, 
          p: 1, 
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          fontFamily: 'monospace'
        }}
      >
        <pre style={{ 
          margin: 0, 
          fontSize: '0.75rem',
          lineHeight: 1.4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word'
        }}>
          {jsonString}
        </pre>
      </Paper>
    </Box>
  );
};

export default JsonPreview;
