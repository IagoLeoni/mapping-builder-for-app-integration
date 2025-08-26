import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Alert,
  Chip,
  SelectChangeEvent
} from '@mui/material';
import { PayloadField } from '../../types';

interface SourcePayloadInputProps {
  onSourceProvided: (fields: PayloadField[], rawData: any, systemType: string) => void;
  onSourceCleared: () => void;
}

type InputType = 'json-payload' | 'json-schema' | 'auto-detect';

const SourcePayloadInput: React.FC<SourcePayloadInputProps> = ({
  onSourceProvided,
  onSourceCleared
}) => {
  const [inputValue, setInputValue] = useState('');
  const [inputType, setInputType] = useState<InputType>('auto-detect');
  const [error, setError] = useState<string | null>(null);
  const [detectedType, setDetectedType] = useState<string | null>(null);
  const [sourceFields, setSourceFields] = useState<PayloadField[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const detectInputType = (jsonData: any): 'json-payload' | 'json-schema' => {
    // Check for JSON Schema indicators
    if (jsonData.$schema || jsonData.type || jsonData.properties) {
      return 'json-schema';
    }
    
    // Otherwise assume it's a payload
    return 'json-payload';
  };

  const convertPayloadToFields = (data: any, parentPath: string = '', parentId: string = ''): PayloadField[] => {
    const fields: PayloadField[] = [];
    
    if (typeof data !== 'object' || data === null) {
      return fields;
    }

    Object.entries(data).forEach(([key, value]) => {
      const path = parentPath ? `${parentPath}.${key}` : key;
      const id = parentId ? `${parentId}-${key}` : key;
      
      let type: PayloadField['type'] = 'string';
      let children: PayloadField[] | undefined;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        type = 'object';
        children = convertPayloadToFields(value, path, id);
      } else if (Array.isArray(value)) {
        type = 'array';
        if (value.length > 0 && typeof value[0] === 'object') {
          children = convertPayloadToFields(value[0], path, id);
        }
      } else if (typeof value === 'number') {
        type = 'number';
      } else if (typeof value === 'boolean') {
        type = 'boolean';
      }
      
      fields.push({
        id,
        name: key,
        type,
        path,
        children
      });
    });
    
    return fields;
  };

  const convertSchemaToFields = (schema: any, parentPath: string = '', parentId: string = ''): PayloadField[] => {
    const fields: PayloadField[] = [];
    
    // Handle JSON Schema format
    if (schema.properties) {
      Object.entries(schema.properties).forEach(([key, propSchema]: [string, any]) => {
        const path = parentPath ? `${parentPath}.${key}` : key;
        const id = parentId ? `${parentId}-${key}` : key;
        
        let type: PayloadField['type'] = propSchema.type || 'string';
        let children: PayloadField[] | undefined;
        
        if (propSchema.type === 'object' && propSchema.properties) {
          children = convertSchemaToFields(propSchema, path, id);
        } else if (propSchema.type === 'array' && propSchema.items?.properties) {
          children = convertSchemaToFields(propSchema.items, path, id);
        }
        
        fields.push({
          id,
          name: key,
          type,
          path,
          children
        });
      });
    }
    
    return fields;
  };

  const handleInputTypeChange = (event: SelectChangeEvent<InputType>) => {
    setInputType(event.target.value as InputType);
    setDetectedType(null);
  };

  const handleLoad = () => {
    try {
      setError(null);
      
      if (!inputValue.trim()) {
        setError('Please provide input data');
        return;
      }

      const jsonData = JSON.parse(inputValue);
      
      let actualType = inputType;
      if (inputType === 'auto-detect') {
        actualType = detectInputType(jsonData);
        setDetectedType(actualType === 'json-schema' ? 'JSON Schema' : 'JSON Payload');
      }

      let fields: PayloadField[];
      if (actualType === 'json-schema') {
        fields = convertSchemaToFields(jsonData);
      } else {
        fields = convertPayloadToFields(jsonData);
      }

      if (fields.length === 0) {
        setError('No valid fields found in the provided data');
        return;
      }

      setSourceFields(fields);
      setIsLoaded(true);
      onSourceProvided(fields, jsonData, actualType);

    } catch (error) {
      setError('Invalid JSON format. Please check your input.');
    }
  };

  const handleClear = () => {
    setInputValue('');
    setSourceFields([]);
    setIsLoaded(false);
    setError(null);
    setDetectedType(null);
    onSourceCleared();
  };

  const loadSampleData = (sampleType: 'gupy' | 'salesforce' | 'workday') => {
    const samples = {
      gupy: {
        "body": {
          "companyName": "Example Corp",
          "event": "pre-employee.moved",
          "data": {
            "candidate": {
              "name": "John Doe",
              "email": "john@example.com",
              "phone": "+5511999999999"
            },
            "job": {
              "title": "Software Engineer",
              "department": "Technology"
            }
          }
        }
      },
      salesforce: {
        "Id": "003XX000004TMM2",
        "FirstName": "John",
        "LastName": "Doe", 
        "Email": "john@example.com",
        "Phone": "+5511999999999",
        "Account": {
          "Name": "Example Corp",
          "Industry": "Technology"
        }
      },
      workday: {
        "Worker": {
          "WorkerID": "12345",
          "PersonalData": {
            "FirstName": "John",
            "LastName": "Doe",
            "EmailAddress": "john@example.com"
          },
          "PositionData": {
            "JobTitle": "Software Engineer",
            "Department": "Technology"
          }
        }
      }
    };

    setInputValue(JSON.stringify(samples[sampleType], null, 2));
  };

  return (
    <Paper sx={{ p: 2, mb: 2 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        📄 Source System Configuration
      </Typography>

      {!isLoaded ? (
        <>
          <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={{ mr: 1 }}>Quick samples:</Typography>
            <Chip
              label="Gupy HR"
              size="small"
              onClick={() => loadSampleData('gupy')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Salesforce"
              size="small"
              onClick={() => loadSampleData('salesforce')}
              sx={{ cursor: 'pointer' }}
            />
            <Chip
              label="Workday"
              size="small"
              onClick={() => loadSampleData('workday')}
              sx={{ cursor: 'pointer' }}
            />
          </Box>

          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Input Type</InputLabel>
              <Select
                value={inputType}
                label="Input Type"
                onChange={handleInputTypeChange}
              >
                <MenuItem value="auto-detect">Auto-detect</MenuItem>
                <MenuItem value="json-payload">JSON Payload</MenuItem>
                <MenuItem value="json-schema">JSON Schema</MenuItem>
              </Select>
            </FormControl>
            
            {detectedType && (
              <Chip
                label={`Detected: ${detectedType}`}
                size="small"
                color="primary"
                variant="outlined"
              />
            )}
          </Box>

          <TextField
            fullWidth
            multiline
            rows={8}
            variant="outlined"
            label="Paste your source system payload or schema"
            placeholder={inputType === 'json-schema' 
              ? '{\n  "$schema": "http://json-schema.org/draft-07/schema#",\n  "type": "object",\n  "properties": {\n    "name": { "type": "string" },\n    "email": { "type": "string" }\n  }\n}'
              : '{\n  "name": "John Doe",\n  "email": "john@example.com",\n  "department": {\n    "name": "Technology"\n  }\n}'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            sx={{ mb: 2 }}
          />

          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Button
            variant="contained"
            onClick={handleLoad}
            disabled={!inputValue.trim()}
            sx={{ mr: 1 }}
          >
            Load Source Data
          </Button>
        </>
      ) : (
        <Box>
          <Alert severity="success" sx={{ mb: 2 }}>
            ✅ Source loaded successfully: {sourceFields.length} fields detected
            {detectedType && ` (${detectedType})`}
          </Alert>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={handleClear}
            >
              Clear & Change Source
            </Button>
          </Box>
        </Box>
      )}
    </Paper>
  );
};

export default SourcePayloadInput;
