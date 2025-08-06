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

  const handleDeploy = async () => {
    if (!config.customerEmail || !config.systemEndpoint) {
      alert('Please fill in all required fields');
      return;
    }

    setIsDeploying(true);
    setDeployStatus('idle');

    try {
      // Simulate API call to deploy integration
      const response = await fetch('/api/deploy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        setDeployStatus('success');
      } else {
        setDeployStatus('error');
      }
    } catch (error) {
      console.error('Deploy error:', error);
      setDeployStatus('error');
    } finally {
      setIsDeploying(false);
    }
  };

  const isValid = config.customerEmail && config.systemEndpoint && config.mappings.length > 0;

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
      <TextField
        label="Customer Email"
        type="email"
        value={config.customerEmail}
        onChange={(e) => onChange({ customerEmail: e.target.value })}
        fullWidth
        size="small"
        required
        helperText="Email for error notifications"
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
          Mappings: {config.mappings.length}
        </Typography>
        <Typography variant="body2" color="textSecondary">
          Valid: {isValid ? 'Yes' : 'No'}
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
          disabled={!isValid || isDeploying}
          size="large"
        >
          {isDeploying ? 'Deploying...' : 'Deploy Integration'}
        </Button>
      </Box>
    </Box>
  );
};

export default ConfigPanel;
