import React, { useState } from 'react';
import {
  Box,
  Stepper,
  Step,
  StepLabel,
  Paper,
  Typography
} from '@mui/material';
import TargetSchemaMethodSelector from './TargetSchemaMethodSelector';
import GeminiSchemaGenerator from './GeminiSchemaGenerator';
import SchemaTemplateSelector from './SchemaTemplateSelector';
import SchemaDefinitionStep from './SchemaDefinitionStep';
import MappingMethodSelector from './MappingMethodSelector';
import PayloadComparisonStep from './PayloadComparisonStep';
import AIMappingResults from './AIMappingResults';
import { MappingConnection } from '../../types';

export type SchemaData = {
  type: 'schema' | 'payload';
  content: string;
  isValid: boolean;
  parsedData?: any;
};

export type MappingFlowState = 
  | 'target-schema-method'
  | 'target-schema-definition'
  | 'mapping-method-selection'
  | 'payload-comparison'
  | 'ai-processing'
  | 'ai-results'
  | 'comparison-processing'
  | 'comparison-results'
  | 'manual-mapping'
  | 'completed';

export type TargetSchemaMethod = 'manual' | 'gemini-assisted' | 'template';

interface MappingWizardProps {
  onMappingsGenerated: (mappings: MappingConnection[]) => void;
  onManualMappingSelected: () => void;
  onSchemaProvided?: (schema: any) => void;
}

const steps = [
  'Definir Estrutura',
  'Escolher Método',
  'Gerar Mapeamentos'
];

const MappingWizard: React.FC<MappingWizardProps> = ({
  onMappingsGenerated,
  onManualMappingSelected,
  onSchemaProvided
}) => {
  const [currentState, setCurrentState] = useState<MappingFlowState>('target-schema-method');
  const [schemaData, setSchemaData] = useState<SchemaData | null>(null);
  const [generatedMappings, setGeneratedMappings] = useState<MappingConnection[]>([]);
  const [activeStep, setActiveStep] = useState(0);

  const handleSchemaSubmit = (data: SchemaData) => {
    setSchemaData(data);
    setCurrentState('mapping-method-selection');
    setActiveStep(1);
    
    // Notificar o schema para o componente pai
    if (onSchemaProvided && data.parsedData) {
      onSchemaProvided(data.parsedData);
    }
  };

  const handleMethodSelect = async (method: 'ai' | 'manual' | 'payload-comparison') => {
    if (method === 'manual') {
      // Notificar o schema antes de chamar manual mapping
      if (onSchemaProvided && schemaData?.parsedData) {
        onSchemaProvided(schemaData.parsedData);
      }
      onManualMappingSelected();
      return;
    }

    if (method === 'payload-comparison') {
      // Ir para a interface de equiparação de payloads
      setCurrentState('payload-comparison');
      setActiveStep(2);
      return;
    }

    // Usar IA tradicional
    setCurrentState('ai-processing');
    setActiveStep(2);

    try {
      const response = await fetch('http://localhost:8080/api/gemini/generate-mappings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          clientSchema: schemaData?.parsedData,
          inputType: schemaData?.type 
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar mapeamentos');
      }

      const { mappings } = await response.json();
      setGeneratedMappings(mappings);
      setCurrentState('ai-results');
    } catch (error) {
      console.error('Erro na geração de mapeamentos:', error);
      // TODO: Mostrar erro para o usuário
    }
  };

  const handlePayloadComparison = async (gupyPayload: any, systemPayload: any) => {
    setCurrentState('comparison-processing');

    try {
      const response = await fetch('http://localhost:8080/api/gemini/payload-comparison', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          gupyPayload,
          systemPayload
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao analisar equiparação');
      }

      const { mappings } = await response.json();
      setGeneratedMappings(mappings);
      setCurrentState('comparison-results');
    } catch (error) {
      console.error('Erro na análise de equiparação:', error);
      // TODO: Mostrar erro para o usuário
    }
  };

  const handleAcceptMappings = () => {
    console.log('🎉 handleAcceptMappings - Enviando mapeamentos:', generatedMappings.length);
    console.log('📋 Mapeamentos sendo enviados:', generatedMappings.map(m => ({
      id: m.id,
      source: m.sourceField.name,
      sourcePath: m.sourceField.path,
      target: m.targetPath,
      confidence: m.confidence
    })));
    
    onMappingsGenerated(generatedMappings);
    setCurrentState('completed');
  };

  const handleRetryMapping = () => {
    setCurrentState('mapping-method-selection');
    setActiveStep(1);
  };

  const handleEditMappings = () => {
    // Aceitar mapeamentos e permitir edição manual
    onMappingsGenerated(generatedMappings);
    setCurrentState('completed');
  };

  const getStepContent = () => {
    switch (currentState) {
      case 'target-schema-method':
        return (
          <TargetSchemaMethodSelector
            onMethodSelect={(method) => {
              setCurrentState('target-schema-definition');
              setActiveStep(1);
            }}
          />
        );
      
      case 'target-schema-definition':
        return (
          <SchemaDefinitionStep 
            onSchemaSubmit={handleSchemaSubmit}
          />
        );
      
      case 'mapping-method-selection':
        return (
          <MappingMethodSelector
            schemaData={schemaData!}
            onMethodSelect={handleMethodSelect}
          />
        );
      
      case 'payload-comparison':
        return (
          <PayloadComparisonStep
            onPayloadsSubmit={handlePayloadComparison}
          />
        );
      
      case 'ai-processing':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              🤖 Analisando com Gemini AI...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Gerando mapeamentos inteligentes baseados na sua estrutura
            </Typography>
          </Box>
        );
      
      case 'comparison-processing':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="h6" gutterBottom>
              📋 Comparando Payloads com IA...
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Analisando as diferenças e detectando transformações automáticas
            </Typography>
          </Box>
        );
      
      case 'ai-results':
      case 'comparison-results':
        return (
          <AIMappingResults
            mappings={generatedMappings}
            onAccept={handleAcceptMappings}
            onEdit={handleEditMappings}
            onRetry={handleRetryMapping}
          />
        );
      
      default:
        return null;
    }
  };

  if (currentState === 'completed') {
    return null; // Wizard completo, volta para interface normal
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🧙‍♂️ Assistente de Mapeamento
      </Typography>
      
      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {getStepContent()}
    </Paper>
  );
};

export default MappingWizard;
