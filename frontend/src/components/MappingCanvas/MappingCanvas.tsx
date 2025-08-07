import React, { useState } from 'react';
import { 
  Box, 
  Typography,
  Divider,
  Paper
} from '@mui/material';
import { MappingConnection, PayloadField, TransformationConfig } from '../../types';
import TargetFieldsTree from './TargetFieldsTree';
import MappingWizard from '../MappingWizard/MappingWizard';

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
  const [wizardCompleted, setWizardCompleted] = useState(false);
  const [clientSchemaFromWizard, setClientSchemaFromWizard] = useState<any>(null);

  const handleSchemaChange = (fields: PayloadField[]) => {
    setTargetFields(fields);
    onTargetSchemaChange(fields);
  };

  const handleAIMappingsGenerated = (aiMappings: MappingConnection[]) => {
    if (onAddMappings) {
      onAddMappings(aiMappings);
    }
    setWizardCompleted(true);
  };

  const handleManualMappingSelected = () => {
    setWizardCompleted(true);
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

  // Quando o wizard é completado e temos um schema, converter automaticamente
  React.useEffect(() => {
    if (wizardCompleted && clientSchemaFromWizard && targetFields.length === 0) {
      const fields = convertSchemaToFields(clientSchemaFromWizard);
      handleSchemaChange(fields);
    }
  }, [wizardCompleted, clientSchemaFromWizard, targetFields.length]);

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* AI Mapping Wizard */}
      <MappingWizard 
        onMappingsGenerated={handleAIMappingsGenerated}
        onManualMappingSelected={handleManualMappingSelected}
        onSchemaProvided={(schema) => {
          setClientSchemaFromWizard(schema);
        }}
      />

      {/* Schema Status quando wizard completado */}
      {wizardCompleted && targetFields.length > 0 && (
        <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle1" fontWeight="medium">
              ✅ Schema Configurado via Wizard ({targetFields.length} campos)
            </Typography>
            <Typography variant="body2">
              Arraste campos da Gupy para os campos do seu sistema abaixo ↓
            </Typography>
          </Box>
        </Paper>
      )}

      {wizardCompleted && <Divider sx={{ mb: 2 }} />}

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
