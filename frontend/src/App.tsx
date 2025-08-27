import React, { useState } from 'react';
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent } from '@dnd-kit/core';
import { Box, Container, Grid, Paper, Typography, AppBar, Toolbar } from '@mui/material';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

import MappingCanvas from './components/MappingCanvas/MappingCanvas';
import ConfigPanel from './components/ConfigPanel/ConfigPanel';
import DebugPanel from './components/DebugPanel/DebugPanel';

import { PayloadField, MappingConnection, IntegrationConfig } from './types';

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
  const [mappings, setMappings] = useState<MappingConnection[]>([]);
  const [config, setConfig] = useState<IntegrationConfig>({
    clientName: '',
    eventName: '',
    customerEmail: '',
    systemEndpoint: '',
    mappings: [],
    systemPayload: {}
  });
  const [activeField, setActiveField] = useState<PayloadField | null>(null);
  const [sourceFields, setSourceFields] = useState<PayloadField[]>([]);

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

    const field = findFieldById(sourceFields, event.active.id as string);
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

      const sourceField = findFieldById(sourceFields, active.id as string);
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
      current[lastPart] = `$sourceSystemPayload.${mapping.sourceField.path}$`;
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

  const handleSourceFieldsChange = (fields: PayloadField[]) => {
    console.log('🔄 Source fields changed:', fields.length);
    setSourceFields(fields);
  };

  const handleTargetSchemaChange = (fields: PayloadField[]) => {
    // Target fields are now managed internally by MappingCanvas
    console.log('🎯 Target schema changed:', fields.length);
  };

  const handleAddMappings = (aiMappings: MappingConnection[]) => {
    console.log('🔄 handleAddMappings called with:', aiMappings.length, 'mappings');
    console.log('📋 Received mappings:', aiMappings.map(m => `${m.sourceField.name} → ${m.targetPath}`));
    
    // Filter mappings that already exist to avoid duplicates
    const existingPaths = mappings.map(m => m.sourceField.path);
    console.log('📝 Existing paths:', existingPaths);
    
    const newMappings = aiMappings.filter(mapping => 
      !existingPaths.includes(mapping.sourceField.path)
    );
    
    console.log('✅ New mappings after filter:', newMappings.length);
    console.log('📊 Details of new mappings:', newMappings.map(m => ({
      source: m.sourceField.path,
      target: m.targetPath,
      confidence: m.confidence
    })));
    
    if (newMappings.length > 0) {
      const updatedMappings = [...mappings, ...newMappings];
      console.log('🎯 Total mappings after update:', updatedMappings.length);
      setMappings(updatedMappings);
      updateSystemPayload(updatedMappings);
    } else {
      console.warn('⚠️ No new mappings were added (all were duplicates or filtered)');
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Mapping Builder for Application Integration
            </Typography>
          </Toolbar>
        </AppBar>
        
        <Container maxWidth={false} sx={{ mt: 2, mb: 12, pb: 4 }}>
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Grid container spacing={2} sx={{ minHeight: 'calc(100vh - 120px)' }}>
              {/* Mapping Canvas - Main Panel */}
              <Grid item xs={8}>
                <Paper sx={{ height: '100%', p: 2 }}>
                  <Typography variant="h6" gutterBottom>
                    🔗 Universal Integration Mapper
                  </Typography>
                  <MappingCanvas 
                    mappings={mappings}
                    onRemoveMapping={handleRemoveMapping}
                    onUpdateMapping={handleUpdateMapping}
                    onTargetSchemaChange={handleTargetSchemaChange}
                    onSourceFieldsChange={handleSourceFieldsChange}
                    onAddMappings={handleAddMappings}
                  />
                </Paper>
              </Grid>
              
              {/* Config Panel - Right Panel */}
              <Grid item xs={4}>
                <Paper sx={{ height: '100%', p: 2, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" gutterBottom>
                    ⚙️ Configuration
                  </Typography>
                  <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                    <ConfigPanel 
                      config={config}
                      onChange={handleConfigChange}
                    />
                  </Box>
                </Paper>
              </Grid>
            </Grid>
            
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
