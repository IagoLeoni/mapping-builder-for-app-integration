import React from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography,
  Alert,
  Divider
} from '@mui/material';
import { Send, CloudUpload } from '@mui/icons-material';
import { IntegrationConfig } from '../../types';

interface ConfigPanelProps {
  config: IntegrationConfig;
  onChange: (config: Partial<IntegrationConfig>) => void;
}

const ConfigPanel: React.FC<ConfigPanelProps> = ({ config, onChange }) => {
  const [isDeploying, setIsDeploying] = React.useState(false);
  const [deployStatus, setDeployStatus] = React.useState<'idle' | 'success' | 'error'>('idle');

  // CLIENT-SPECIFIC NORMALIZATION (all together)
  const normalizeClientName = (value: string): string => {
    if (!value) return '';
    
    return value
      .toLowerCase()                    // Convert to lowercase
      .replace(/[^a-z0-9]/g, '')       // Remove ALL special characters and spaces
      .replace(/^-+|-+$/g, '');        // Remove hyphens from edges
  };

  // EVENT-SPECIFIC NORMALIZATION (hyphen only for dots)
  const normalizeEventName = (value: string): string => {
    if (!value) return '';
    
    return value
      .toLowerCase()                    // Convert to lowercase
      .replace(/\./g, '-')             // Replace ONLY dots with hyphen
      .replace(/-+/g, '-')             // Remove duplicate hyphens
      .replace(/^-+|-+$/g, '');        // Remove hyphens from edges
  };

  // FINAL INTEGRATION NAME GENERATION
  const generateIntegrationName = (): string => {
    if (!config.clientName || !config.eventName) return '';
    
    const normalizedClient = normalizeClientName(config.clientName);
    const normalizedEvent = normalizeEventName(config.eventName);
    
    return `${normalizedClient}-${normalizedEvent}`;
  };

  // REAL-TIME PREVIEW
  const [clientNamePreview, setClientNamePreview] = React.useState('');
  const [eventNamePreview, setEventNamePreview] = React.useState('');

  const handleClientNameChange = (value: string) => {
    onChange({ clientName: value });
    setClientNamePreview(normalizeClientName(value));
  };

  const handleEventNameChange = (value: string) => {
    onChange({ eventName: value });
    setEventNamePreview(normalizeEventName(value));
  };

  const handleDeploy = async () => {
    if (!config.customerEmail || !config.systemEndpoint) {
      alert('Please fill in all required fields');
      return;
    }

    if (!config.clientName || !config.eventName) {
      alert('Please fill in Client Name and Event Name');
      return;
    }

    setIsDeploying(true);
    setDeployStatus('idle');

    try {
      console.log('🚀 Sending deployment request:', config);
      
      // API call to deploy integration
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('✅ Deployment result:', result);
        setDeployStatus('success');
      } else {
        const errorData = await response.text();
        console.error('❌ Deployment failed:', response.status, errorData);
        alert(`Deployment failed: ${response.status} - ${errorData}`);
        setDeployStatus('error');
      }
    } catch (error) {
      console.error('❌ Deploy error:', error);
      alert(`Network error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setDeployStatus('error');
    } finally {
      setIsDeploying(false);
    }
  };

  const isValidConfig = (): boolean => {
    return !!(
      config.clientName && 
      config.eventName &&
      config.customerEmail && 
      config.systemEndpoint && 
      config.mappings.length > 0
    );
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* CLIENT NAME FIELD WITH PREVIEW */}
      <Box>
        <TextField
          label="Client Name"
          value={config.clientName || ''}
          onChange={(e) => handleClientNameChange(e.target.value)}
          fullWidth
          size="small"
          required
          helperText="Client name (will be joined without spaces)"
          placeholder="Minerva Foods"
        />
        {config.clientName && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'primary.main', 
              fontFamily: 'monospace',
              display: 'block',
              mt: 0.5,
              fontWeight: 'bold'
            }}
          >
            ➜ {clientNamePreview}
          </Typography>
        )}
      </Box>

      {/* EVENT NAME FIELD WITH PREVIEW */}
      <Box>
        <TextField
          label="Event Name"
          value={config.eventName || ''}
          onChange={(e) => handleEventNameChange(e.target.value)}
          fullWidth
          size="small"
          required
          helperText="Event name (only dots become hyphens)"
          placeholder="pre-employee.moved"
        />
        {config.eventName && (
          <Typography 
            variant="caption" 
            sx={{ 
              color: 'secondary.main',
              fontFamily: 'monospace',
              display: 'block',
              mt: 0.5,
              fontWeight: 'bold'
            }}
          >
            ➜ {eventNamePreview}
          </Typography>
        )}
      </Box>

      {/* FINAL INTEGRATION NAME PREVIEW */}
      {config.clientName && config.eventName && (
        <Box sx={{ 
          p: 2, 
          bgcolor: 'success.50', 
          borderRadius: 1,
          border: '2px solid',
          borderColor: 'success.main'
        }}>
          <Typography variant="subtitle2" gutterBottom color="success.main">
            🎯 Final Integration Name:
          </Typography>
          <Typography 
            variant="h6" 
            sx={{ 
              fontFamily: 'monospace', 
              fontWeight: 'bold',
              color: 'success.dark',
              wordBreak: 'break-all',
              backgroundColor: 'white',
              padding: 1,
              borderRadius: 0.5,
              border: '1px solid',
              borderColor: 'success.light'
            }}
          >
            {generateIntegrationName()}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            • Client: <strong>{clientNamePreview}</strong> (all together)<br/>
            • Event: <strong>{eventNamePreview}</strong> (dots → hyphens)
          </Typography>
        </Box>
      )}

      <Divider />

      <TextField
        label="Customer Email"
        type="email"
        value={config.customerEmail}
        onChange={(e) => onChange({ customerEmail: e.target.value })}
        fullWidth
        size="small"
        required
        helperText="Email for notifications"
      />

      <TextField
        label="System Endpoint"
        type="url"
        value={config.systemEndpoint}
        onChange={(e) => onChange({ systemEndpoint: e.target.value })}
        fullWidth
        size="small"
        required
        helperText="Your system's callback URL"
        placeholder="https://your-system.com/webhook"
      />

      <Divider />

      <Box>
        <Typography variant="subtitle2" gutterBottom>
          Integration Status
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Name: {generateIntegrationName() || 'Not configured'}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Mappings: {config.mappings.length}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Valid: {isValidConfig() ? 'Yes' : 'No'}
        </Typography>
      </Box>

      {deployStatus === 'success' && (
        <Alert severity="success">
          Integration deployed successfully!
        </Alert>
      )}

      {deployStatus === 'error' && (
        <Alert severity="error">
          Failed to deploy integration. Please try again.
        </Alert>
      )}

      <Box sx={{ mt: 'auto' }}>
        <Button
          variant="contained"
          fullWidth
          startIcon={<CloudUpload />}
          onClick={handleDeploy}
          disabled={!isValidConfig() || isDeploying}
          size="large"
          sx={{ fontFamily: 'monospace' }}
        >
          {isDeploying 
            ? 'Deploying...' 
            : generateIntegrationName() 
              ? `Deploy: ${generateIntegrationName()}`
              : 'Deploy Integration'
          }
        </Button>
      </Box>
    </Box>
  );
};

export default ConfigPanel;
