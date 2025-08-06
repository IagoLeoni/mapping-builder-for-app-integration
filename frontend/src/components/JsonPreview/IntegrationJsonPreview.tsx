import React, { useMemo, useState, useEffect } from 'react';
import { 
  Box, 
  Typography,
  Paper,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert
} from '@mui/material';
import { ContentCopy, Download, Refresh } from '@mui/icons-material';
import { IntegrationConfig, MappingConnection } from '../../types';

interface IntegrationJsonPreviewProps {
  config: IntegrationConfig;
  mappings: MappingConnection[];
}

const IntegrationJsonPreview: React.FC<IntegrationJsonPreviewProps> = ({ config, mappings }) => {
  const [integrationJson, setIntegrationJson] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Função para buscar o JSON do backend
  const fetchIntegrationJson = async () => {
    console.log('🔍 DEBUG: fetchIntegrationJson called with:', {
      hasCustomerEmail: !!config.customerEmail,
      hasSystemEndpoint: !!config.systemEndpoint,
      mappingsCount: mappings.length,
      mappingsWithTransformations: mappings.filter(m => m.transformation).length,
      hasSystemPayload: !!config.systemPayload
    });

    // Validação mais flexível - permitir geração mesmo com dados incompletos para debug
    if (!config.customerEmail && !config.systemEndpoint && mappings.length === 0) {
      console.log('⚠️ DEBUG: No data available for integration generation, skipping...');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const requestData = {
        customerEmail: config.customerEmail || '',
        systemEndpoint: config.systemEndpoint || '',
        mappings: mappings,
        systemPayload: config.systemPayload || {}
      };

      console.log('🚀 DEBUG: Calling backend preview endpoint with:', {
        customerEmail: requestData.customerEmail,
        systemEndpoint: requestData.systemEndpoint,
        mappingsCount: requestData.mappings.length,
        mappingsWithTransformations: requestData.mappings.filter(m => m.transformation).length,
        systemPayload: Object.keys(requestData.systemPayload).length + ' keys'
      });

      const response = await fetch('http://localhost:8080/api/transformations/preview-integration', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      console.log('📡 DEBUG: Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ DEBUG: HTTP error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('✅ DEBUG: Backend response received:', {
        success: data.success,
        hasIntegrationJson: !!data.integrationJson,
        summary: data.summary,
        transformationsCount: data.transformations?.length || 0,
        errorMessage: data.error
      });

      if (data.success && data.integrationJson) {
        setIntegrationJson(data.integrationJson);
        console.log('🎉 DEBUG: Integration JSON set successfully! TaskConfigs:', data.integrationJson.taskConfigs?.length || 0);
      } else {
        throw new Error(data.error || 'Failed to generate integration - no JSON returned');
      }
    } catch (err) {
      console.error('💥 DEBUG: Error in fetchIntegrationJson:', err);
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar quando os dados mudarem
  useEffect(() => {
    fetchIntegrationJson();
  }, [config, mappings]);

  const jsonString = integrationJson ? JSON.stringify(integrationJson, null, 2) : '';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonString);
      // Could add a toast notification here
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleDownload = () => {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `application-integration-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle2">
          Application Integration JSON
        </Typography>
        <Box>
          <Tooltip title="Copy to clipboard">
            <IconButton size="small" onClick={handleCopy}>
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Download JSON">
            <IconButton size="small" onClick={handleDownload} disabled={!integrationJson}>
              <Download fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Refresh">
            <IconButton size="small" onClick={fetchIntegrationJson} disabled={loading}>
              <Refresh fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      
      <Paper 
        sx={{ 
          flexGrow: 1, 
          p: 1, 
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          fontFamily: 'monospace',
          minHeight: 0,
          display: 'flex',
          alignItems: loading || error ? 'center' : 'flex-start',
          justifyContent: loading || error ? 'center' : 'flex-start'
        }}
      >
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
            <CircularProgress size={24} />
            <Typography variant="body2" color="text.secondary">
              Generating integration JSON...
            </Typography>
          </Box>
        ) : error ? (
          <Alert severity="error" sx={{ width: '100%' }}>
            <Typography variant="body2">
              Error: {error}
            </Typography>
          </Alert>
        ) : (
          <pre style={{ 
            margin: 0, 
            fontSize: '0.75rem',
            lineHeight: 1.4,
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            width: '100%'
          }}>
            {jsonString}
          </pre>
        )}
      </Paper>
    </Box>
  );
};

export default IntegrationJsonPreview;
