import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Stepper,
  Step,
  StepLabel,
  Typography
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

import { MappingConnection } from '../../types';
import MappingMethodSelector, { MappingMethod } from './MappingMethodSelector';
import AIMappingStep from './AIMappingStep';
import PayloadComparisonStep from './PayloadComparisonStep';

interface MappingWizardProps {
  open: boolean;
  onClose: () => void;
  onMappingsGenerated: (mappings: MappingConnection[]) => void;
  sourceFields?: any[];
}

type WizardStep = 'method-selection' | 'ai-mapping' | 'payload-comparison' | 'manual';

const MappingWizard: React.FC<MappingWizardProps> = ({
  open,
  onClose,
  onMappingsGenerated,
  sourceFields = []
}) => {
  const [currentStep, setCurrentStep] = useState<WizardStep>('method-selection');
  const [selectedMethod, setSelectedMethod] = useState<MappingMethod | null>(null);

  const handleMethodSelected = (method: MappingMethod) => {
    console.log(`🎯 Método selecionado no wizard: ${method}`);
    setSelectedMethod(method);
    
    if (method === 'manual') {
      // Para método manual, fechar o wizard e deixar o usuário usar drag & drop
      console.log('✋ Método manual selecionado - fechando wizard');
      handleClose();
      return;
    }
    
    // Para outros métodos, avançar para o step correspondente
    if (method === 'gemini-ai') {
      setCurrentStep('ai-mapping');
    } else if (method === 'payload-comparison') {
      setCurrentStep('payload-comparison');
    }
  };

  const handleMappingsGenerated = (mappings: MappingConnection[]) => {
    console.log('🎉 Mapeamentos gerados no wizard:', mappings.length);
    onMappingsGenerated(mappings);
    handleClose();
  };

  const handleBack = () => {
    setCurrentStep('method-selection');
    setSelectedMethod(null);
  };

  const handleClose = () => {
    setCurrentStep('method-selection');
    setSelectedMethod(null);
    onClose();
  };

  const getStepTitle = (): string => {
    switch (currentStep) {
      case 'method-selection':
        return 'Assistente de Mapeamento Automático';
      case 'ai-mapping':
        return 'Mapeamento com Gemini AI';
      case 'payload-comparison':
        return 'Equiparação de Payloads';
      default:
        return 'Assistente de Mapeamento';
    }
  };

  const getStepDescription = (): string => {
    switch (currentStep) {
      case 'method-selection':
        return 'Escolha como deseja mapear os campos entre sistemas';
      case 'ai-mapping':
        return 'Análise semântica com ~95% de precisão';
      case 'payload-comparison':
        return 'Comparação de dados reais com ~99% de precisão';
      default:
        return '';
    }
  };

  const steps = [
    { 
      id: 'method-selection', 
      label: 'Método', 
      active: currentStep === 'method-selection' 
    },
    { 
      id: 'mapping', 
      label: selectedMethod === 'gemini-ai' ? 'Gemini AI' : 
             selectedMethod === 'payload-comparison' ? 'Equiparação' : 'Mapeamento',
      active: currentStep !== 'method-selection' 
    }
  ];

  const activeStep = currentStep === 'method-selection' ? 0 : 1;

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { 
          height: '90vh', 
          maxHeight: '900px',
          display: 'flex',
          flexDirection: 'column'
        }
      }}
    >
      <DialogTitle sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        pb: 1
      }}>
        <Box>
          <Typography variant="h6" component="div">
            {getStepTitle()}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {getStepDescription()}
          </Typography>
        </Box>
        <IconButton 
          onClick={handleClose}
          size="small"
          sx={{ color: 'grey.500' }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      {/* Progress Stepper */}
      <Box sx={{ px: 3, pb: 2 }}>
        <Stepper activeStep={activeStep} alternativeLabel>
          {steps.map((step, index) => (
            <Step key={step.id} completed={index < activeStep}>
              <StepLabel>
                <Typography variant="caption">
                  {step.label}
                </Typography>
              </StepLabel>
            </Step>
          ))}
        </Stepper>
      </Box>

      <DialogContent sx={{ 
        flexGrow: 1, 
        overflow: 'auto',
        p: 0,
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Step Content */}
        {currentStep === 'method-selection' && (
          <MappingMethodSelector onMethodSelected={handleMethodSelected} />
        )}

        {currentStep === 'ai-mapping' && (
          <AIMappingStep
            onMappingsGenerated={handleMappingsGenerated}
            onBack={handleBack}
            sourceFields={sourceFields}
          />
        )}

        {currentStep === 'payload-comparison' && (
          <PayloadComparisonStep
            onMappingsGenerated={handleMappingsGenerated}
            onBack={handleBack}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default MappingWizard;
