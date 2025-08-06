import React, { useState, useRef } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { Box, Container, Grid, Paper, Typography, AppBar, Toolbar } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import PayloadTree from './components/PayloadTree/PayloadTree';
import MappingCanvas from './components/MappingCanvas/MappingCanvas';
import ConfigPanel from './components/ConfigPanel/ConfigPanel';
import DebugPanel from './components/DebugPanel/DebugPanel';

import { PayloadField, MappingConnection, IntegrationConfig } from './types';
import { parseGupyPayload } from './utils/payloadParser';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
});

function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mappings, setMappings] = useState<MappingConnection[]>([]);
  const [config, setConfig] = useState<IntegrationConfig>({
    customerEmail: '',
    systemEndpoint: '',
    mappings: [],
    systemPayload: {}
  });
  const [activeField, setActiveField] = useState<PayloadField | null>(null);
  const [gupyFields, setGupyFields] = useState<PayloadField[]>([]);
  const [targetFields, setTargetFields] = useState<PayloadField[]>([]);

  React.useEffect(() => {
    // Parse the Gupy payload from the integration example
    const fields = parseGupyPayload();
    setGupyFields(fields);
  }, []);

  const handleDragStart = (event: DragStartEvent) => {
    const findFieldById = (fields: PayloadField[], id: string): PayloadField | null => {
      for (const field of fields) {
        if (field.id === id) {
          return field;
        }
        if (field.children) {
          const found = findFieldById(field.children, id);
          if (found) return found;
        }
      }
      return null;
    };

    const field = findFieldById(gupyFields, event.active.id as string);
    setActiveField(field);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (over && active.id !== over.id) {
      const findFieldById = (fields: PayloadField[], id: string): PayloadField | null => {
        for (const field of fields) {
          if (field.id === id) {
            return field;
          }
          if (field.children) {
            const found = findFieldById(field.children, id);
            if (found) return found;
          }
        }
        return null;
      };

      const sourceField = findFieldById(gupyFields, active.id as string);
      if (sourceField) {
        const newMapping: MappingConnection = {
          id: `mapping-${Date.now()}`,
          sourceField,
          targetPath: over.id as string,
          transformation: undefined
        };
        
        setMappings(prev => [...prev, newMapping]);
        updateSystemPayload([...mappings, newMapping]);
      }
    }
    
    setActiveField(null);
  };

  const updateSystemPayload = (currentMappings: MappingConnection[]) => {
    const payload: any = {};
    
    currentMappings.forEach(mapping => {
      const pathParts = mapping.targetPath.split('.');
      let current = payload;
      
      for (let i = 0; i < pathParts.length - 1; i++) {
        if (!current[pathParts[i]]) {
          current[pathParts[i]] = {};
        }
        current = current[pathParts[i]];
      }
      
      const lastPart = pathParts[pathParts.length - 1];
      current[lastPart] = `$gupyPayload.${mapping.sourceField.path}$`;
    });
    
    setConfig(prev => ({
      ...prev,
      mappings: currentMappings,
      systemPayload: payload
    }));
  };

  const handleConfigChange = (newConfig: Partial<IntegrationConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const handleRemoveMapping = (mappingId: string) => {
    const newMappings = mappings.filter(m => m.id !== mappingId);
    setMappings(newMappings);
    updateSystemPayload(newMappings);
  };

  const handleUpdateMapping = (mappingId: string, transformation: any) => {
    const newMappings = mappings.map(mapping => 
      mapping.id === mappingId 
        ? { ...mapping, transformation }
        : mapping
    );
    setMappings(newMappings);
    updateSystemPayload(newMappings);
  };

  const handleTargetSchemaChange = (fields: PayloadField[]) => {
    setTargetFields(fields);
  };

  const handleAddMappings = (aiMappings: MappingConnection[]) => {
    // Filtrar mapeamentos que já existem para evitar duplicatas
    const existingPaths = mappings.map(m => m.sourceField.path);
    const newMappings = aiMappings.filter(mapping => 
      !existingPaths.includes(mapping.sourceField.path)
    );
    
    if (newMappings.length > 0) {
      const updatedMappings = [...mappings, ...newMappings];
      setMappings(updatedMappings);
      updateSystemPayload(updatedMappings);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              iPaaS Integration Builder
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth={false} sx={{ mt: 2, mb: 2 }}>
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Box ref={containerRef} sx={{ position: 'relative' }}>
              <Grid container spacing={2} sx={{ height: 'calc(100vh - 120px)' }}>
              {/* Payload Tree - Left Panel (Fixed) */}
              <Grid item xs={3}>
                <Paper sx={{ 
                  height: '100%', 
                  p: 2, 
                  position: 'sticky', 
                  top: 0,
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <Typography variant="h6" gutterBottom>
                    Gupy Payload
                  </Typography>
                  <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                    <PayloadTree fields={gupyFields} />
                  </Box>
                </Paper>
              </Grid>
              
              {/* Mapping Canvas - Center Panel */}
              <Grid item xs={6}>
                <Paper sx={{ height: '100%', p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Mapping Canvas
                  </Typography>
                  <MappingCanvas 
                    mappings={mappings}
                    onRemoveMapping={handleRemoveMapping}
                    onUpdateMapping={handleUpdateMapping}
                    onTargetSchemaChange={handleTargetSchemaChange}
                    onAddMappings={handleAddMappings}
                  />
                </Paper>
              </Grid>
              
              {/* Config Panel - Right Panel */}
              <Grid item xs={3}>
                <Paper sx={{ height: '100%', p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    Configuration
                  </Typography>
                  <ConfigPanel 
                    config={config}
                    onChange={handleConfigChange}
                  />
                </Paper>
              </Grid>
              </Grid>
            </Box>
            
            <DragOverlay>
              {activeField ? (
                <Box
                  sx={{
                    p: 1,
                    bgcolor: 'primary.main',
                    color: 'white',
                    borderRadius: 1,
                    fontSize: '0.875rem'
                  }}
                >
                  {activeField.name}
                </Box>
              ) : null}
            </DragOverlay>
          </DndContext>
          
          {/* Debug Panel - Bottom (Minimized by default) */}
          <DebugPanel config={config} mappings={mappings} />
        </Container>
      </Box>
    </ThemeProvider>
  );
}

export default App;
