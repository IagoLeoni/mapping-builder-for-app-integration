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
import { parseGupyPayload, parseGupyPayloadSync } from './utils/payloadParser';

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
    clientName: '',
    eventName: '',
    customerEmail: '',
    systemEndpoint: '',
    mappings: [],
    systemPayload: {}
  });
  const [activeField, setActiveField] = useState<PayloadField | null>(null);
  const [gupyFields, setGupyFields] = useState<PayloadField[]>([]);
  const [targetFields, setTargetFields] = useState<PayloadField[]>([]);

  React.useEffect(() => {
    const loadGupyPayload = async () => {
      try {
        console.log('🔄 Inicializando estrutura do payload Gupy...');
        const fields = await parseGupyPayload();
        console.log(`✅ Estrutura carregada no App: ${fields.length} campos de nível raiz`);
        setGupyFields(fields);
      } catch (error) {
        console.warn('⚠️ Erro ao carregar estrutura, usando sync fallback:', error);
        const fields = parseGupyPayloadSync();
        setGupyFields(fields);
      }
    };
    
    loadGupyPayload();
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
    console.log('🔄 handleAddMappings chamado com:', aiMappings.length, 'mapeamentos');
    console.log('📋 Mapeamentos recebidos:', aiMappings.map(m => `${m.sourceField.name} → ${m.targetPath}`));
    
    // Filtrar mapeamentos que já existem para evitar duplicatas
    const existingPaths = mappings.map(m => m.sourceField.path);
    console.log('📝 Paths existentes:', existingPaths);
    
    const newMappings = aiMappings.filter(mapping => 
      !existingPaths.includes(mapping.sourceField.path)
    );
    
    console.log('✅ Novos mapeamentos após filtro:', newMappings.length);
    console.log('📊 Detalhes dos novos mapeamentos:', newMappings.map(m => ({
      source: m.sourceField.path,
      target: m.targetPath,
      confidence: m.confidence
    })));
    
    if (newMappings.length > 0) {
      const updatedMappings = [...mappings, ...newMappings];
      console.log('🎯 Total de mapeamentos após atualização:', updatedMappings.length);
      setMappings(updatedMappings);
      updateSystemPayload(updatedMappings);
    } else {
      console.warn('⚠️ Nenhum mapeamento novo foi adicionado (todos eram duplicatas ou filtrados)');
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
        
        <Container maxWidth={false} sx={{ 
          mt: 2, 
          mb: 2,
          position: 'relative'
        }}>
          <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <Box ref={containerRef} sx={{ position: 'relative' }}>
              {/* Payload Tree - Fixed Floating Panel */}
              <Paper sx={{ 
                position: 'fixed',
                left: '16px',              // Margem da esquerda
                top: '80px',               // Altura AppBar + margem
                width: 'calc(25% - 32px)', // 25% menos margens
                height: 'calc(100vh - 100px)',
                zIndex: 1000,
                p: 2,
                display: 'flex',
                flexDirection: 'column',
                backgroundColor: 'white',
                boxShadow: 3,              // Sombra mais forte para destacar
                border: '1px solid #e0e0e0' // Borda sutil
              }}>
                <Typography variant="h6" gutterBottom sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 1,
                  borderBottom: '1px solid #f0f0f0',
                  pb: 1,
                  mb: 1
                }}>
                  📌 Gupy Payload (Fixo)
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <PayloadTree fields={gupyFields} />
                </Box>
              </Paper>

              {/* Layout ajustado para compensar painel fixo */}
              <Box sx={{ marginLeft: 'calc(25% + 16px)' }}>
                <Grid container spacing={2} sx={{ 
                  minHeight: 'calc(100vh - 120px)',
                  alignItems: 'flex-start'
                }}>
                  {/* Mapping Canvas - Center Panel (agora 75% da largura restante) */}
                  <Grid item xs={8}>
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
                  
                  {/* Config Panel - Right Panel (25% da largura restante) */}
                  <Grid item xs={4}>
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
