import React, { useState } from 'react';
import { 
  Box, 
  TextField, 
  Button, 
  Typography,
  Paper,
  Alert,
  Tabs,
  Tab
} from '@mui/material';
import { Upload, Code, ExpandLess, ExpandMore, Edit } from '@mui/icons-material';
import { PayloadField } from '../../types';

interface TargetSchemaInputProps {
  onSchemaChange: (fields: PayloadField[]) => void;
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
      id={`schema-tabpanel-${index}`}
      aria-labelledby={`schema-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const TargetSchemaInput: React.FC<TargetSchemaInputProps> = ({ onSchemaChange }) => {
  const [tabValue, setTabValue] = useState(0);
  const [jsonInput, setJsonInput] = useState('');
  const [manualFields, setManualFields] = useState<string[]>(['']);
  const [error, setError] = useState<string>('');
  const [isMinimized, setIsMinimized] = useState(false);
  const [hasSchema, setHasSchema] = useState(false);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
    setError('');
  };

  const parseJsonToFields = (jsonString: string): PayloadField[] => {
    try {
      const parsed = JSON.parse(jsonString);
      
      // Check if it's a JSON Schema with properties at root level
      if (parsed.properties && typeof parsed.properties === 'object') {
        return parseObjectToFields(parsed.properties);
      }
      
      // Otherwise parse as regular object
      return parseObjectToFields(parsed);
    } catch (err) {
      throw new Error('Invalid JSON format');
    }
  };

  // Fields that should not be mapped (schema metadata)
  const NON_MAPPABLE_FIELDS = [
    '$schema', 'title', 'description', 'required', 'type', 'properties', 'items',
    'format', 'default', 'enum', 'minimum', 'maximum', 'minLength', 'maxLength',
    'pattern', 'additionalProperties', 'definitions', '$ref', '$id', 'examples',
    'const', 'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else'
  ];

  const parseObjectToFields = (obj: any, parentPath: string = '', parentId: string = ''): PayloadField[] => {
    const fields: PayloadField[] = [];
    
    Object.entries(obj).forEach(([key, value]) => {
      // Skip schema metadata fields
      if (NON_MAPPABLE_FIELDS.includes(key)) {
        return;
      }

      const path = parentPath ? `${parentPath}.${key}` : key;
      const id = parentId ? `${parentId}-${key}` : key;
      
      let type: PayloadField['type'] = 'string';
      let children: PayloadField[] | undefined;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        const valueObj = value as any;
        
        // Check if it's a schema definition with properties
        if (valueObj.properties && typeof valueObj.properties === 'object') {
          type = 'object';
          children = parseObjectToFields(valueObj.properties, path, id);
        } 
        // Check if it's a schema definition with type object and properties
        else if (valueObj.type === 'object' && valueObj.properties) {
          type = 'object';
          children = parseObjectToFields(valueObj.properties, path, id);
        } 
        // Check if it's a schema definition with type array and items
        else if (valueObj.type === 'array' && valueObj.items) {
          type = 'array';
          if (valueObj.items.properties) {
            children = parseObjectToFields(valueObj.items.properties, path, id);
          } else if (valueObj.items.type) {
            // Array of primitives - create a single field for the array
            fields.push({
              id,
              name: key,
              type: 'array',
              path
            });
            return;
          }
        }
        // Check if it has a type property (schema field definition)
        else if (valueObj.type && typeof valueObj.type === 'string') {
          // If it's a primitive type, create a leaf field
          if (['string', 'number', 'boolean'].includes(valueObj.type)) {
            type = valueObj.type as PayloadField['type'];
            fields.push({
              id,
              name: key,
              type,
              path
            });
            return;
          }
          // If it's an object type without properties, skip it (no drop area)
          else if (valueObj.type === 'object' && !valueObj.properties) {
            return; // Skip objects without defined properties
          }
          // If it's an array type without items.properties, skip it
          else if (valueObj.type === 'array' && (!valueObj.items || !valueObj.items.properties)) {
            return; // Skip arrays without defined item properties
          }
        }
        // Regular object without schema properties
        else {
          type = 'object';
          children = parseObjectToFields(value, path, id);
        }
      } 
      else if (Array.isArray(value)) {
        type = 'array';
        if (value.length > 0 && typeof value[0] === 'object') {
          children = parseObjectToFields(value[0], path, id);
        }
      } 
      else if (typeof value === 'number') {
        type = 'number';
      } 
      else if (typeof value === 'boolean') {
        type = 'boolean';
      }
      else if (typeof value === 'string') {
        type = 'string';
      }
      
      // Add field if it has children (but no drop area for containers)
      if (children && children.length > 0) {
        fields.push({
          id,
          name: key,
          type,
          path,
          children
        });
      } 
      // Only add leaf fields (primitives) with drop areas
      else if (!children && ['string', 'number', 'boolean'].includes(type)) {
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

  const handleJsonSubmit = () => {
    try {
      setError('');
      const fields = parseJsonToFields(jsonInput);
      onSchemaChange(fields);
      setHasSchema(true);
      setIsMinimized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error parsing JSON');
    }
  };

  const handleManualFieldChange = (index: number, value: string) => {
    const newFields = [...manualFields];
    newFields[index] = value;
    setManualFields(newFields);
  };

  const addManualField = () => {
    setManualFields([...manualFields, '']);
  };

  const removeManualField = (index: number) => {
    if (manualFields.length > 1) {
      const newFields = manualFields.filter((_, i) => i !== index);
      setManualFields(newFields);
    }
  };

  const handleManualSubmit = () => {
    try {
      setError('');
      const validFields = manualFields.filter(field => field.trim() !== '');
      
      if (validFields.length === 0) {
        setError('Please add at least one field');
        return;
      }

      const fields: PayloadField[] = validFields.map((fieldPath, index) => {
        const parts = fieldPath.split('.');
        const name = parts[parts.length - 1];
        
        return {
          id: `manual-${index}`,
          name,
          type: 'string',
          path: fieldPath
        };
      });

      onSchemaChange(fields);
      setHasSchema(true);
      setIsMinimized(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating fields');
    }
  };

  // Minimized view when schema is already set
  if (isMinimized && hasSchema) {
    return (
      <Paper sx={{ p: 2, mb: 2, bgcolor: 'success.light', color: 'success.contrastText' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle1" fontWeight="medium">
              ✓ Target Schema Configured
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<Edit />}
              onClick={() => setIsMinimized(false)}
              sx={{ color: 'success.contrastText', borderColor: 'success.contrastText' }}
            >
              Edit Schema
            </Button>
            <Button
              size="small"
              onClick={() => setIsMinimized(false)}
              sx={{ color: 'success.contrastText' }}
            >
              {isMinimized ? <ExpandMore /> : <ExpandLess />}
            </Button>
          </Box>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Target System Schema
        </Typography>
        {hasSchema && (
          <Button
            size="small"
            onClick={() => setIsMinimized(true)}
            startIcon={<ExpandLess />}
          >
            Minimize
          </Button>
        )}
      </Box>
      
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="JSON Schema" icon={<Code />} />
          <Tab label="Manual Fields" icon={<Upload />} />
        </Tabs>
      </Box>

      <TabPanel value={tabValue} index={0}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Paste your target system's JSON schema or example payload:
        </Typography>
        <TextField
          multiline
          rows={8}
          fullWidth
          value={jsonInput}
          onChange={(e) => setJsonInput(e.target.value)}
          placeholder={`{
  "employee": {
    "personalInfo": {
      "name": "string",
      "email": "string",
      "phone": "string"
    },
    "position": {
      "title": "string",
      "department": "string",
      "salary": "number"
    }
  }
}`}
          sx={{ mb: 2 }}
        />
        <Button
          variant="contained"
          onClick={handleJsonSubmit}
          disabled={!jsonInput.trim()}
          startIcon={<Upload />}
        >
          Parse JSON Schema
        </Button>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Add target fields manually (use dot notation for nested fields):
        </Typography>
        {manualFields.map((field, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 1, mb: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={field}
              onChange={(e) => handleManualFieldChange(index, e.target.value)}
              placeholder="e.g., employee.personalInfo.name"
            />
            <Button
              variant="outlined"
              size="small"
              onClick={() => removeManualField(index)}
              disabled={manualFields.length === 1}
            >
              Remove
            </Button>
          </Box>
        ))}
        <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
          <Button variant="outlined" onClick={addManualField}>
            Add Field
          </Button>
          <Button
            variant="contained"
            onClick={handleManualSubmit}
            disabled={manualFields.every(f => f.trim() === '')}
          >
            Create Schema
          </Button>
        </Box>
      </TabPanel>

      {error && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      )}
    </Paper>
  );
};

export default TargetSchemaInput;
