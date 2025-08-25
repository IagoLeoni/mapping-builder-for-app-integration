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

interface MappingCanvasProps {
  mappings: MappingConnection[];
  onRemoveMapping: (mappingId: string) => void;
  onUpdateMapping: (mappingId: string, transformation: TransformationConfig) => void;
  onTargetSchemaChange: (fields: PayloadField[]) => void;
  onAddMappings?: (mappings: MappingConnection[]) => void;
}

const MappingCanvas: React.FC<MappingCanvasProps> = ({ 
  mappings, 
  onRemoveMapping, 
  onUpdateMapping,
  onTargetSchemaChange,
  onAddMappings
}) => {
  const [targetFields, setTargetFields] = useState<PayloadField[]>([]);
  const [schemaInput, setSchemaInput] = useState('');

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
      {/* Schema Input Section */}
      {targetFields.length === 0 && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6" gutterBottom>
            Target Schema Configuration
          </Typography>
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
            variant="contained" 
            onClick={handleSchemaSubmit}
            disabled={!schemaInput.trim()}
          >
            Load Schema
          </Button>
        </Paper>
      )}

      {/* Schema Status */}
      {targetFields.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              ✅ Schema Loaded ({targetFields.length} fields)
            </Typography>
            <Typography variant="body2">
              Drag fields from Gupy payload to your system fields below ↓
            </Typography>
          </Box>
        </Paper>
      )}

      {/* Target fields tree */}
      <Box sx={{ flexGrow: 1, overflow: 'auto' }}>
        <Typography variant="subtitle2" gutterBottom>
          Target System Fields
        </Typography>
        
        <TargetFieldsTree 
          fields={targetFields}
          mappings={mappings}
          onRemoveMapping={onRemoveMapping}
          onUpdateMapping={onUpdateMapping}
        />
      </Box>

      {/* Mappings summary */}
      {mappings.length > 0 && (
        <Box sx={{ mt: 2, pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom>
            Active Mappings: {mappings.length}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default MappingCanvas;
