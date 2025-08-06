import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  Chip,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert
} from '@mui/material';
import {
  Add,
  Delete,
  ExpandMore,
  Code,
  SwapHoriz,
  DateRange,
  Rule
} from '@mui/icons-material';
import { TransformationConfig, ValueMappingConfig, DateFormatConfig, ExpressionConfig, ConditionalConfig } from '../../types';

interface TransformationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (transformation: TransformationConfig) => void;
  initialTransformation?: TransformationConfig;
  sourceFieldName: string;
  targetFieldName: string;
}

const TransformationModal: React.FC<TransformationModalProps> = ({
  open,
  onClose,
  onSave,
  initialTransformation,
  sourceFieldName,
  targetFieldName
}) => {
  const [transformationType, setTransformationType] = useState<TransformationConfig['type']>('format_document');
  const [config, setConfig] = useState<any>({});
  const [testValue, setTestValue] = useState('');
  const [testResult, setTestResult] = useState<any>(null);

  useEffect(() => {
    console.log('🔍 DEBUG: TransformationModal useEffect triggered:', { initialTransformation, open });
    
    if (initialTransformation && open) {
      console.log('🔍 DEBUG: Setting transformation from initial:', initialTransformation);
      setTransformationType(initialTransformation.type);
      
      // Para transformações da IA, preservar toda a configuração original
      if (['format_document', 'phone_split', 'name_split', 'normalize', 'country_code', 'gender_code', 'code_lookup', 'concat', 'split', 'convert', 'format_date'].includes(initialTransformation.type)) {
        setConfig(initialTransformation);
      } else {
        // Para transformações manuais, usar config padrão e mesclar
        const defaultConfig = getDefaultConfig(initialTransformation.type);
        setConfig({ ...defaultConfig, ...initialTransformation });
      }
    } else if (open) {
      // Reset to default apenas quando abrir modal sem transformação inicial
      console.log('🔍 DEBUG: Resetting to default valueMapping');
      setTransformationType('valueMapping');
      setConfig(getDefaultConfig('valueMapping'));
    }
    
    // Reset test values when opening
    if (open) {
      setTestValue('');
      setTestResult(null);
    }
  }, [initialTransformation, open]);

  const handleTypeChange = (type: TransformationConfig['type']) => {
    setTransformationType(type);
    setConfig(getDefaultConfig(type));
    setTestResult(null);
  };

  const getDefaultConfig = (type: TransformationConfig['type']) => {
    switch (type) {
      case 'valueMapping':
        return {
          type: 'valueMapping',
          rules: {},
          caseSensitive: true
        };
      case 'dateFormat':
        return {
          type: 'dateFormat',
          fromFormat: 'DD/MM/YYYY',
          toFormat: 'YYYY-MM-DD'
        };
      case 'expression':
        return {
          type: 'expression',
          formula: 'UPPER(value)'
        };
      case 'conditional':
        return {
          type: 'conditional',
          conditions: []
        };
      // Tipos específicos gerados pela IA - manter configuração original se existir
      case 'format_document':
        return {
          type: 'format_document',
          operation: 'remove_format',
          pattern: 'document'
        };
      case 'phone_split':
        return {
          type: 'phone_split',
          operation: 'split_phone',
          pattern: 'brazil'
        };
      case 'name_split':
        return {
          type: 'name_split',
          operation: 'extract_first_name'
        };
      case 'normalize':
        return {
          type: 'normalize',
          operation: 'lowercase_no_accents'
        };
      case 'country_code':
        return {
          type: 'country_code',
          operation: 'country_to_code'
        };
      case 'gender_code':
        return {
          type: 'gender_code',
          operation: 'gender_to_code'
        };
      case 'code_lookup':
        return {
          type: 'code_lookup',
          operation: 'lookup_company_code'
        };
      case 'concat':
        return {
          type: 'concat',
          operation: 'concatenate',
          separator: ' '
        };
      case 'split':
        return {
          type: 'split',
          operation: 'split_string',
          separator: ' '
        };
      case 'convert':
        return {
          type: 'convert',
          operation: 'string_conversion'
        };
      case 'format_date':
        return {
          type: 'format_date',
          fromFormat: 'YYYY-MM-DD',
          toFormat: 'DD/MM/YYYY'
        };
      default:
        return { type: 'valueMapping', rules: {}, caseSensitive: true };
    }
  };

  const handleSave = () => {
    // Garantir que o type seja sempre incluído no config final
    const finalConfig = {
      ...config,
      type: transformationType
    };
    console.log('🔍 DEBUG: Saving transformation config:', finalConfig);
    onSave(finalConfig);
    onClose();
  };

  const testTransformation = () => {
    try {
      let result;
      switch (transformationType) {
        case 'valueMapping':
          const rules = config.rules || {};
          result = rules[testValue] || config.defaultValue || testValue;
          break;
        case 'dateFormat':
          result = `Formatted date (${config.toFormat})`;
          break;
        case 'expression':
          result = `Expression result: ${config.formula}`;
          break;
        case 'conditional':
          result = 'Conditional result';
          break;
        default:
          result = testValue;
      }
      setTestResult(result);
    } catch (error) {
      setTestResult(`Error: ${error}`);
    }
  };

  const renderValueMappingConfig = () => {
    const rules = config.rules || {};
    
    const addRule = () => {
      const key = prompt('Enter source value:');
      const value = prompt('Enter target value:');
      if (key && value) {
        setConfig({
          ...config,
          type: transformationType,
          rules: { ...rules, [key]: value }
        });
      }
    };

    const removeRule = (key: string) => {
      const newRules = { ...rules };
      delete newRules[key];
      setConfig({ ...config, type: transformationType, rules: newRules });
    };

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2">Value Mappings</Typography>
          <Button startIcon={<Add />} onClick={addRule} size="small">
            Add Rule
          </Button>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          {Object.entries(rules).map(([key, value]) => (
            <Box key={key} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip label={key} color="primary" variant="outlined" />
              <SwapHoriz />
              <Chip label={value as string} color="secondary" variant="outlined" />
              <IconButton size="small" onClick={() => removeRule(key)}>
                <Delete />
              </IconButton>
            </Box>
          ))}
        </Box>

        <TextField
          fullWidth
          label="Default Value (optional)"
          value={config.defaultValue || ''}
          onChange={(e) => setConfig({ ...config, type: transformationType, defaultValue: e.target.value })}
          sx={{ mb: 2 }}
        />

        <FormControl fullWidth>
          <InputLabel>Case Sensitive</InputLabel>
          <Select
            value={config.caseSensitive ? 'true' : 'false'}
            onChange={(e) => setConfig({ ...config, type: transformationType, caseSensitive: e.target.value === 'true' })}
          >
            <MenuItem value="true">Yes</MenuItem>
            <MenuItem value="false">No</MenuItem>
          </Select>
        </FormControl>
      </Box>
    );
  };

  const renderDateFormatConfig = () => (
    <Box>
      <TextField
        fullWidth
        label="From Format"
        value={config.fromFormat || ''}
        onChange={(e) => setConfig({ ...config, type: transformationType, fromFormat: e.target.value })}
        placeholder="DD/MM/YYYY"
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="To Format"
        value={config.toFormat || ''}
        onChange={(e) => setConfig({ ...config, type: transformationType, toFormat: e.target.value })}
        placeholder="YYYY-MM-DD"
        sx={{ mb: 2 }}
      />
      <TextField
        fullWidth
        label="Timezone (optional)"
        value={config.timezone || ''}
        onChange={(e) => setConfig({ ...config, type: transformationType, timezone: e.target.value })}
        placeholder="America/Sao_Paulo"
      />
    </Box>
  );

  const renderExpressionConfig = () => (
    <Box>
      <TextField
        fullWidth
        multiline
        rows={4}
        label="Expression Formula"
        value={config.formula || ''}
        onChange={(e) => setConfig({ ...config, type: transformationType, formula: e.target.value })}
        placeholder="UPPER(value)"
        sx={{ mb: 2 }}
      />
      <Alert severity="info">
        Available functions: UPPER, LOWER, SUBSTRING, CONCAT, IF
        <br />
        Use 'value' to reference the source field value
      </Alert>
    </Box>
  );

  const renderConditionalConfig = () => {
    const conditions = config.conditions || [];
    
    const addCondition = () => {
      setConfig({
        ...config,
        type: transformationType,
        conditions: [...conditions, { if: '', then: '' }]
      });
    };

    const updateCondition = (index: number, field: 'if' | 'then', value: string) => {
      const newConditions = [...conditions];
      newConditions[index][field] = value;
      setConfig({ ...config, type: transformationType, conditions: newConditions });
    };

    const removeCondition = (index: number) => {
      const newConditions = conditions.filter((_: any, i: number) => i !== index);
      setConfig({ ...config, type: transformationType, conditions: newConditions });
    };

    return (
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="subtitle2">Conditions</Typography>
          <Button startIcon={<Add />} onClick={addCondition} size="small">
            Add Condition
          </Button>
        </Box>

        {conditions.map((condition: any, index: number) => (
          <Box key={index} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2, mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2">IF</Typography>
              <TextField
                size="small"
                placeholder="value === 'FEMININO'"
                value={condition.if}
                onChange={(e) => updateCondition(index, 'if', e.target.value)}
                sx={{ flexGrow: 1 }}
              />
              <IconButton size="small" onClick={() => removeCondition(index)}>
                <Delete />
              </IconButton>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="body2">THEN</Typography>
              <TextField
                size="small"
                placeholder="F"
                value={condition.then}
                onChange={(e) => updateCondition(index, 'then', e.target.value)}
                sx={{ flexGrow: 1 }}
              />
            </Box>
          </Box>
        ))}

        <TextField
          fullWidth
          label="Default Value (ELSE)"
          value={config.defaultValue || ''}
          onChange={(e) => setConfig({ ...config, type: transformationType, defaultValue: e.target.value })}
        />
      </Box>
    );
  };

  const renderAITransformationConfig = () => {
    return (
      <Box>
        <Alert severity="info" sx={{ mb: 2 }}>
          Esta transformação foi gerada automaticamente pela IA. Você pode visualizar e ajustar os parâmetros.
        </Alert>
        
        {config.operation && (
          <TextField
            fullWidth
            label="Operation"
            value={config.operation}
            onChange={(e) => setConfig({ ...config, type: transformationType, operation: e.target.value })}
            sx={{ mb: 2 }}
          />
        )}
        
        {config.pattern && (
          <TextField
            fullWidth
            label="Pattern"
            value={config.pattern}
            onChange={(e) => setConfig({ ...config, type: transformationType, pattern: e.target.value })}
            sx={{ mb: 2 }}
          />
        )}
        
        {config.separator && (
          <TextField
            fullWidth
            label="Separator"
            value={config.separator}
            onChange={(e) => setConfig({ ...config, type: transformationType, separator: e.target.value })}
            sx={{ mb: 2 }}
          />
        )}
        
        {config.parameters && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Parâmetros:</Typography>
            <Box sx={{ p: 2, bgcolor: 'grey.100', borderRadius: 1, fontFamily: 'monospace', fontSize: '0.875rem' }}>
              {JSON.stringify(config.parameters, null, 2)}
            </Box>
          </Box>
        )}
        
        {config.preview && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>Preview da Transformação:</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Input:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{config.preview.input}</Typography>
              </Box>
              <SwapHoriz color="primary" />
              <Box sx={{ flex: 1 }}>
                <Typography variant="caption" color="text.secondary">Output:</Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{config.preview.output}</Typography>
              </Box>
            </Box>
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary">
          <strong>Tipo:</strong> {transformationType}
        </Typography>
      </Box>
    );
  };

  const getTransformationIcon = (type: TransformationConfig['type']) => {
    switch (type) {
      case 'valueMapping': return <SwapHoriz />;
      case 'dateFormat': return <DateRange />;
      case 'expression': return <Code />;
      case 'conditional': return <Rule />;
      default: return <SwapHoriz />;
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Configure Transformation
        <Typography variant="body2" color="textSecondary">
          {sourceFieldName} → {targetFieldName}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <FormControl fullWidth sx={{ mb: 3 }}>
          <InputLabel>Transformation Type</InputLabel>
          <Select
            value={transformationType}
            onChange={(e) => handleTypeChange(e.target.value as TransformationConfig['type'])}
          >
            <MenuItem value="valueMapping">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SwapHoriz />
                Value Mapping
              </Box>
            </MenuItem>
            <MenuItem value="dateFormat">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <DateRange />
                Date Format
              </Box>
            </MenuItem>
            <MenuItem value="expression">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Code />
                Expression
              </Box>
            </MenuItem>
            <MenuItem value="conditional">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Rule />
                Conditional
              </Box>
            </MenuItem>
            <MenuItem value="format_document">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📄 Document Format
              </Box>
            </MenuItem>
            <MenuItem value="phone_split">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                📱 Phone Split
              </Box>
            </MenuItem>
            <MenuItem value="name_split">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                👥 Name Split
              </Box>
            </MenuItem>
            <MenuItem value="normalize">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🔤 Normalize Text
              </Box>
            </MenuItem>
            <MenuItem value="country_code">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                🌍 Country Code
              </Box>
            </MenuItem>
            <MenuItem value="gender_code">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                👤 Gender Code
              </Box>
            </MenuItem>
          </Select>
        </FormControl>

        {transformationType === 'valueMapping' && renderValueMappingConfig()}
        {transformationType === 'dateFormat' && renderDateFormatConfig()}
        {transformationType === 'expression' && renderExpressionConfig()}
        {transformationType === 'conditional' && renderConditionalConfig()}
        
        {/* Renderizador para transformações geradas pela IA */}
        {['format_document', 'phone_split', 'name_split', 'normalize', 'country_code', 'gender_code', 'code_lookup', 'concat', 'split', 'convert', 'format_date'].includes(transformationType) && renderAITransformationConfig()}

        <Accordion sx={{ mt: 3 }}>
          <AccordionSummary expandIcon={<ExpandMore />}>
            <Typography>Test Transformation</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <TextField
                label="Test Value"
                value={testValue}
                onChange={(e) => setTestValue(e.target.value)}
                size="small"
              />
              <Button onClick={testTransformation} variant="outlined">
                Test
              </Button>
            </Box>
            {testResult !== null && (
              <Box sx={{ mt: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2">
                  Result: <strong>{String(testResult)}</strong>
                </Typography>
              </Box>
            )}
          </AccordionDetails>
        </Accordion>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleSave} variant="contained">
          Save Transformation
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TransformationModal;
