import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Collapse,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import {
  ExpandLess,
  ExpandMore,
  BugReport,
  Code,
  CloudUpload,
  Settings
} from '@mui/icons-material';
import { IntegrationConfig, MappingConnection } from '../../types';
import SimpleJsonPreview from '../JsonPreview/SimpleJsonPreview';
import IntegrationJsonPreview from '../JsonPreview/IntegrationJsonPreview';

interface DebugPanelProps {
  config: IntegrationConfig;
  mappings: MappingConnection[];
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`debug-tabpanel-${index}`}
      aria-labelledby={`debug-tab-${index}`}
      {...other}
      style={{ height: '100%' }}
    >
      {value === index && (
        <Box sx={{ height: '100%' }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const DebugPanel: React.FC<DebugPanelProps> = ({ config, mappings }) => {
  const [expanded, setExpanded] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Box sx={{ 
      position: 'fixed', 
      bottom: 0, 
      left: 0, 
      right: 0, 
      zIndex: 500, // ✅ Reduzido de 1000 para 500 para não cobrir botão deploy
      bgcolor: 'background.paper',
      borderTop: 1,
      borderColor: 'divider'
    }}>
      {/* Header - Always visible */}
      <Paper 
        elevation={3}
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          p: 1,
          bgcolor: 'grey.100',
          cursor: 'pointer'
        }}
        onClick={handleToggle}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <BugReport color="action" fontSize="small" />
          <Typography variant="body2" color="textSecondary">
            Debug Panel
          </Typography>
          <Chip 
            label={`${mappings.length} mappings`} 
            size="small" 
            variant="outlined"
            color="primary"
          />
          {mappings.filter(m => m.transformation).length > 0 && (
            <Chip 
              label={`${mappings.filter(m => m.transformation).length} transformations`} 
              size="small" 
              variant="outlined"
              color="secondary"
            />
          )}
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="caption" color="textSecondary">
            {expanded ? 'Click to minimize' : 'Click to expand JSON preview'}
          </Typography>
          <IconButton size="small">
            {expanded ? <ExpandMore /> : <ExpandLess />}
          </IconButton>
        </Box>
      </Paper>

      {/* Expandable Content */}
      <Collapse in={expanded}>
        <Paper 
          sx={{ 
            maxHeight: '50vh', 
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Debug Info Header */}
          <Box sx={{ 
            p: 2, 
            bgcolor: 'grey.50',
            borderBottom: 1,
            borderColor: 'divider'
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Code fontSize="small" />
              <Typography variant="subtitle2">
                Integration Configuration Debug
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip 
                label={`Email: ${config.customerEmail || 'Not set'}`}
                size="small"
                color={config.customerEmail ? 'success' : 'error'}
                variant="outlined"
              />
              <Chip 
                label={`Endpoint: ${config.systemEndpoint || 'Not set'}`}
                size="small"
                color={config.systemEndpoint ? 'success' : 'error'}
                variant="outlined"
              />
              <Chip 
                label={`Mappings: ${mappings.length}`}
                size="small"
                color={mappings.length > 0 ? 'success' : 'warning'}
                variant="outlined"
              />
            </Box>
          </Box>

          {/* Tabs */}
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs 
              value={tabValue} 
              onChange={handleTabChange} 
              aria-label="debug tabs"
              variant="fullWidth"
            >
              <Tab 
                icon={<Settings fontSize="small" />}
                label="Mapping Config" 
                id="debug-tab-0"
                aria-controls="debug-tabpanel-0"
                sx={{ minHeight: 48 }}
              />
              <Tab 
                icon={<CloudUpload fontSize="small" />}
                label="Application Integration" 
                id="debug-tab-1"
                aria-controls="debug-tabpanel-1"
                sx={{ minHeight: 48 }}
              />
            </Tabs>
          </Box>

          {/* Tab Panels */}
          <Box sx={{ flexGrow: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <TabPanel value={tabValue} index={0}>
              <Box sx={{ p: 2, height: 'calc(50vh - 200px)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <SimpleJsonPreview config={config} mappings={mappings} />
              </Box>
            </TabPanel>
            <TabPanel value={tabValue} index={1}>
              <Box sx={{ p: 2, height: 'calc(50vh - 200px)', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <IntegrationJsonPreview config={config} mappings={mappings} />
              </Box>
            </TabPanel>
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default DebugPanel;
