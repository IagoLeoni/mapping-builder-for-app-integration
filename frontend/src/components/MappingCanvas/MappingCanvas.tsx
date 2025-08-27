import React, { useState } from 'react';
import { 
  Box, 
  Typography,
  TextField,
  Button,
  Paper
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

  // Function to automatically generate targetFields from received mappings
  const generateTargetFieldsFromMappings = (mappings: MappingConnection[]): PayloadField[] => {
    console.log('🔧 Generating targetFields from mappings:', mappings.length);
    
    // Extract unique paths from mappings
    const targetPaths = [...new Set(mappings.map(m => m.targetPath))];
    console.log('📍 Unique target paths:', targetPaths);
    
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
            type: index === parts.length - 1 ? 'string' : 'object', // last level is string, others are object
            path: currentPath
          };
          
          fieldMap.set(currentPath, field);
          
          // If it's the first level, add to main array
          if (index === 0) {
            fields.push(field);
            } else {
              // Otherwise, add as child of parent
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

    console.log('✅ TargetFields generated:', fields.length, 'root fields');
    return fields;
  };

  const handleWizardMappingsGenerated = (mappings: MappingConnection[]) => {
    console.log('🎉 Wizard generated mappings:', mappings.length);
    console.log('📋 Received mappings:', mappings.map(m => `${m.sourceField.name} → ${m.targetPath}`));
    
    // ✅ CORRECTION: Auto-generate targetFields from mappings to populate drag & drop interface
    const generatedTargetFields = generateTargetFieldsFromMappings(mappings);
    console.log('🎯 Auto-generated target fields:', generatedTargetFields.length);
    
    // Update targetFields to populate destination fields tree
    handleSchemaChange(generatedTargetFields);
    console.log('📝 Target fields updated in state');
    
    if (onAddMappings) {
      onAddMappings(mappings);
    }
    setWizardOpen(false);
  };

  const handleWizardClose = () => {
    console.log('❌ Wizard closed');
    setWizardOpen(false);
  };

  // Function to convert wizard schema to PayloadFields
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
      
      // Add field if it has children or is primitive
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

      {/* Layout with Responsive Grid */}
      <Box sx={{ display: 'flex', gap: 2, flexGrow: 1, minHeight: 0 }}>
        
        {/* Source Fields - Sticky Left Panel */}
        <Box sx={{ width: '30%' }}>
          <Paper sx={{ 
            position: 'sticky',
            top: '80px', // Stick below AppBar
            height: 'calc(100vh - 160px)', // Full viewport height minus header/footer
            p: 2,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 2
          }}>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              📌 Source System Fields
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
                  Drag fields to destination system →
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
        </Box>

        {/* Target Fields - Main Scrollable Panel */}
        <Box sx={{ width: '70%' }}>
          <Paper sx={{ 
            minHeight: 'calc(100vh - 160px)',
            p: 2, 
            display: 'flex', 
            flexDirection: 'column'
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
              <Box sx={{ flexGrow: 1, mb: 2 }}>
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
                minHeight: '400px',
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

            {/* Active Mappings Summary */}
            {mappings.length > 0 && (
              <Box sx={{ mt: 'auto', pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                <Paper sx={{ p: 1.5, bgcolor: 'info.light', color: 'info.contrastText' }}>
                  <Typography variant="subtitle2" fontWeight="medium">
                    🔗 Active Mappings: {mappings.length}
                  </Typography>
                </Paper>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* Mappings Summary - Moved inside the main container */}

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
