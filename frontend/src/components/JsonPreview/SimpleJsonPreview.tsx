import React, { useMemo } from 'react';
import { 
  Box, 
  Typography,
  Paper,
  IconButton,
  Tooltip
} from '@mui/material';
import { ContentCopy, Download } from '@mui/icons-material';
import { IntegrationConfig, MappingConnection } from '../../types';
import { MappingConfigService } from '../../services/MappingConfigService';

interface SimpleJsonPreviewProps {
  config: IntegrationConfig;
  mappings: MappingConnection[];
}

const SimpleJsonPreview: React.FC<SimpleJsonPreviewProps> = ({ config, mappings }) => {
  const mappingConfig = useMemo(() => {
    return MappingConfigService.generateMappingConfig(mappings, config);
  }, [mappings, config]);

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
      
      {/* JSON Preview */}
      <Paper 
        sx={{ 
          flexGrow: 1, 
          p: 1, 
          overflow: 'auto',
          bgcolor: '#f5f5f5',
          fontFamily: 'monospace',
          minHeight: 0
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

export default SimpleJsonPreview;
