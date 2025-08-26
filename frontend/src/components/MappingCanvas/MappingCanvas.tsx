import React, { useState } from 'react';
import { 
  Box, 
  Typography,
  TextField,
  Button,
  Paper,
  Grid
} from '@mui/material';
import { MappingConnection, PayloadField, TransformationConfig } from '../../types';
import TargetFieldsTree from './TargetFieldsTree';
import PayloadTree from '../PayloadTree/PayloadTree';
import SourcePayloadInput from '../SourceInput/SourcePayloadInput';
import MappingWizard from '../MappingWizard/MappingWizard';

interface MappingCanvasProps {
  mappings: MappingConnection[];
  onRemoveMapping: (mappingId: string) => void;
  onUpdateMapping: (mappingId: string, transformation: TransformationConfig) => void;
  onTargetSchemaChange: (fields: PayloadField[]) => void;
  onSourceFieldsChange: (fields: PayloadField[]) => void;
  onAddMappings?: (mappings: MappingConnection[]) => void;
}

const MappingCanvas: React.FC<MappingCanvasProps> = ({ 
  mappings, 
  onRemoveMapping, 
  onUpdateMapping,
  onTargetSchemaChange,
  onSourceFieldsChange,
  onAddMappings
}) => {
  const [sourceFields, setSourceFields] = useState<PayloadField[]>([]);
  const [targetFields, setTargetFields] = useState<PayloadField[]>([]);
  const [schemaInput, setSchemaInput] = useState('');
  const [sourceSystemType, setSourceSystemType] = useState<string>('');
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleSourceProvided = (fields: PayloadField[], rawData: any, systemType: string) => {
    console.log('🔄 Source provided:', { fields: fields.length, systemType });
    setSourceFields(fields);
    setSourceSystemType(systemType);
    onSourceFieldsChange(fields);
  };

  const handleSourceCleared = () => {
    console.log('🧹 Source cleared');
    setSourceFields([]);
    setSourceSystemType('');
    onSourceFieldsChange([]);
  };

  const handleSchemaChange = (fields: PayloadField[]) => {
    setTargetFields(fields);
    onTargetSchemaChange(fields);
  };

  const handleSchemaSubmit = () => {
    try {
      const schema = JSON.parse(schemaInput);
      const fields = convertSchemaToFields(schema);
      handleSchemaChange(fields);
    } catch (error) {
      console.error('Invalid JSON schema:', error);
    }
  };

  const handleLaunchWizard = () => {
    console.log('🪄 Launching Mapping Wizard');
    setWizardOpen(true);
  };

  // Função para gerar targetFields automaticamente dos mapeamentos recebidos
  const generateTargetFieldsFromMappings = (mappings: MappingConnection[]): PayloadField[] => {
    console.log('🔧 Gerando targetFields dos mapeamentos:', mappings.length);
    
    // Extrair paths únicos dos mapeamentos
    const targetPaths = [...new Set(mappings.map(m => m.targetPath))];
    console.log('📍 Target paths únicos:', targetPaths);
    
    const fields: PayloadField[] = [];
    const fieldMap = new Map<string, PayloadField>();

    targetPaths.forEach(path => {
      const parts = path.split('.');
      let currentPath = '';
      
      parts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}.${part}` : part;
        
        if (!fieldMap.has(currentPath)) {
          const field: PayloadField = {
            id: currentPath.replace(/\./g, '-'),
            name: part,
            type: index === parts.length - 1 ? 'string' : 'object', // último nível é string, outros são object
            path: currentPath
          };
          
          fieldMap.set(currentPath, field);
          
          // Se é o primeiro nível, adicionar ao array principal
          if (index === 0) {
            fields.push(field);
          } else {
            // Caso contrário, adicionar como filho do pai
            const parentPath = currentPath.substring(0, currentPath.lastIndexOf('.'));
            const parent = fieldMap.get(parentPath);
            if (parent) {
              if (!parent.children) parent.children = [];
              parent.children.push(field);
            }
          }
        }
      });
    });

    console.log('✅ TargetFields gerados:', fields.length, 'campos raiz');
    return fields;
  };

  const handleWizardMappingsGenerated = (mappings: MappingConnection[]) => {
    console.log('🎉 Wizard generated mappings:', mappings.length);
    console.log('📋 Mapeamentos recebidos:', mappings.map(m => `${m.sourceField.name} → ${m.targetPath}`));
    
    // ✅ CORREÇÃO: Auto-gerar targetFields dos mapeamentos para popular a interface drag & drop
    const generatedTargetFields = generateTargetFieldsFromMappings(mappings);
    console.log('🎯 Auto-generated target fields:', generatedTargetFields.length);
    
    // Atualizar targetFields para popular a árvore de campos destino
    handleSchemaChange(generatedTargetFields);
    console.log('📝 Target fields atualizados no estado');
    
    if (onAddMappings) {
      onAddMappings(mappings);
    }
    setWizardOpen(false);
  };

  const handleWizardClose = () => {
    console.log('❌ Wizard closed');
    setWizardOpen(false);
  };

  // Função para converter schema do wizard em PayloadFields
  const convertSchemaToFields = (schema: any, parentPath: string = '', parentId: string = ''): PayloadField[] => {
    const fields: PayloadField[] = [];
    
    Object.entries(schema).forEach(([key, value]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const id = parentId ? `${parentId}-${key}` : key;
      
      let type: PayloadField['type'] = 'string';
      let children: PayloadField[] | undefined;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        type = 'object';
        children = convertSchemaToFields(value, path, id);
      } else if (Array.isArray(value)) {
        type = 'array';
        if (value.length > 0 && typeof value[0] === 'object') {
          children = convertSchemaToFields(value[0], path, id);
        }
      } else if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      }
      
      // Adicionar campo se tem filhos ou é primitivo
      if (children && children.length > 0) {
        fields.push({
          id,
          name: key,
          type,
          path,
          children
        });
      } else if (!children && ['string', 'number', 'boolean'].includes(type)) {
        fields.push({
          id,
          name: key,
          type,
          path
        });
      }
    });
    
    return fields;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Source System Input */}
      <SourcePayloadInput 
        onSourceProvided={handleSourceProvided}
        onSourceCleared={handleSourceCleared}
      />

      {/* Main Layout: Source + Target Side by Side */}
      <Grid container spacing={2} sx={{ flexGrow: 1, minHeight: 0 }}>
        {/* Source Fields - Left Panel */}
        <Grid item xs={6}>
          <Paper sx={{ 
            height: '100%', 
            p: 2, 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: '500px'
          }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              📄 Source System Fields
              {sourceSystemType && (
                <Typography variant="caption" sx={{ 
                  bgcolor: 'primary.main', 
                  color: 'white', 
                  px: 1, 
                  py: 0.5, 
                  borderRadius: 1 
                }}>
                  {sourceSystemType}
                </Typography>
              )}
            </Typography>
            
            {sourceFields.length > 0 ? (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Drag fields to target system →
                </Typography>
                <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                  <PayloadTree fields={sourceFields} />
                </Box>
              </>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexGrow: 1,
                bgcolor: 'grey.50',
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: 1,
                p: 3,
                textAlign: 'center'
              }}>
                <Typography variant="body2" color="text.secondary">
                  Configure your source system above to see fields here
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Target Fields - Right Panel */}
        <Grid item xs={6}>
          <Paper sx={{ 
            height: '100%', 
            p: 2, 
            display: 'flex', 
            flexDirection: 'column',
            minHeight: '500px'
          }}>
            <Typography variant="h6" gutterBottom>
              🎯 Target System Fields
            </Typography>

            {/* Target Schema Input Section */}
            {targetFields.length === 0 && (
              <Box sx={{ mb: 2 }}>
                {/* Smart Mapping Wizard Button */}
                <Box sx={{ mb: 2, textAlign: 'center' }}>
                  <Button 
                    variant="contained" 
                    color="primary"
                    onClick={handleLaunchWizard}
                    startIcon={<span>🪄</span>}
                    size="large"
                    sx={{ 
                      mb: 2,
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                      boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)'
                    }}
                  >
                    Smart Mapping Wizard
                  </Button>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Use AI to automatically map fields, or manually paste schema below
                  </Typography>
                </Box>

                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  variant="outlined"
                  label="Paste your target system schema (JSON)"
                  placeholder='{"name": "string", "email": "string", "department": {"name": "string"}}'
                  value={schemaInput}
                  onChange={(e) => setSchemaInput(e.target.value)}
                  sx={{ mb: 2 }}
                />
                <Button 
                  variant="outlined" 
                  onClick={handleSchemaSubmit}
                  disabled={!schemaInput.trim()}
                  size="small"
                >
                  Load Target Schema
                </Button>
              </Box>
            )}

            {/* Target Schema Status */}
            {targetFields.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Paper sx={{ p: 1.5, bgcolor: 'success.light', color: 'success.contrastText' }}>
                  <Typography variant="body2" fontWeight="medium">
                    ✅ Target Schema Loaded ({targetFields.length} fields)
                  </Typography>
                </Paper>
              </Box>
            )}

            {/* Target Fields Tree */}
            {targetFields.length > 0 ? (
              <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
                <TargetFieldsTree 
                  fields={targetFields}
                  mappings={mappings}
                  onRemoveMapping={onRemoveMapping}
                  onUpdateMapping={onUpdateMapping}
                />
              </Box>
            ) : (
              <Box sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                flexGrow: 1,
                bgcolor: 'grey.50',
                border: '2px dashed',
                borderColor: 'grey.300',
                borderRadius: 1,
                p: 3,
                textAlign: 'center'
              }}>
                <Typography variant="body2" color="text.secondary">
                  Paste your target system schema above to see mapping targets
                </Typography>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Mappings Summary */}
      {mappings.length > 0 && (
        <Paper sx={{ mt: 2, p: 2, bgcolor: 'info.light', color: 'info.contrastText' }}>
          <Typography variant="subtitle2" fontWeight="medium">
            🔗 Active Mappings: {mappings.length}
          </Typography>
        </Paper>
      )}

      {/* Mapping Wizard Dialog */}
      <MappingWizard
        open={wizardOpen}
        onClose={handleWizardClose}
        onMappingsGenerated={handleWizardMappingsGenerated}
      />
    </Box>
  );
};

export default MappingCanvas;
