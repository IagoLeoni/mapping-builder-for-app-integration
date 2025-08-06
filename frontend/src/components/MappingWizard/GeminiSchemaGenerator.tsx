import React, { useState } from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  Paper,
  Alert,
  CircularProgress,
  Chip,
  Grid,
  Divider
} from '@mui/material';
import {
  AutoAwesome,
  Preview,
  CheckCircle,
  Error as ErrorIcon
} from '@mui/icons-material';
import { SchemaData } from './MappingWizard';

interface GeminiSchemaGeneratorProps {
  onSchemaGenerated: (data: SchemaData) => void;
  onBack: () => void;
}

interface ExamplePrompt {
  title: string;
  description: string;
  prompt: string;
  category: 'hr' | 'finance' | 'sales' | 'custom';
}

const GeminiSchemaGenerator: React.FC<GeminiSchemaGeneratorProps> = ({
  onSchemaGenerated,
  onBack
}) => {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchema, setGeneratedSchema] = useState<any>(null);
  const [error, setError] = useState<string>('');

  const examplePrompts: ExamplePrompt[] = [
    {
      title: 'Sistema HR Básico',
      description: 'Funcionários com dados pessoais e profissionais',
      prompt: 'Sistema de RH com funcionários contendo nome completo, CPF, email, telefone, endereço completo (rua, número, cidade, estado, CEP), data de nascimento, gênero, cargo, departamento, salário e data de admissão.',
      category: 'hr'
    },
    {
      title: 'Salesforce Contact',
      description: 'Estrutura padrão de contatos do Salesforce',
      prompt: 'Sistema Salesforce com contatos contendo FirstName, LastName, Email, Phone, Account (Name, Industry), MailingAddress (Street, City, State, PostalCode, Country), Title, Department e campos customizados.',
      category: 'sales'
    },
    {
      title: 'Sistema Financeiro',
      description: 'Colaboradores com informações financeiras',
      prompt: 'Sistema financeiro com colaboradores contendo dados pessoais (nome, documento, email), informações bancárias (banco, agência, conta), salário, benefícios, centro de custo e histórico de pagamentos.',
      category: 'finance'
    },
    {
      title: 'ERP Personalizado',
      description: 'Sistema empresarial com estrutura complexa',
      prompt: 'ERP empresarial com funcionários organizados por filiais, contendo informações pessoais, profissionais (cargo, nível, gestor), contratuais (tipo de contrato, jornada) e organizacionais (centro de custo, projeto).',
      category: 'custom'
    }
  ];

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      hr: '#2196f3',
      finance: '#4caf50',
      sales: '#ff9800',
      custom: '#9c27b0'
    };
    return colors[category] || '#666';
  };

  const handleExampleSelect = (prompt: string) => {
    setDescription(prompt);
  };

  const handleGenerate = async () => {
    if (!description.trim()) return;

    setIsGenerating(true);
    setError('');
    setGeneratedSchema(null);

    try {
      const response = await fetch('http://localhost:8080/api/gemini/generate-schema', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          description: description.trim(),
          targetFormat: 'detailed_payload'
        })
      });

      if (!response.ok) {
        throw new Error('Erro ao gerar schema com IA');
      }

      const result = await response.json();
      
      if (result.success && result.schema) {
        setGeneratedSchema(result.schema);
      } else {
        throw new Error(result.error || 'Schema não foi gerado corretamente');
      }
    } catch (error) {
      console.error('Erro na geração de schema:', error);
      setError(error instanceof Error ? error.message : 'Erro desconhecido ao gerar schema');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptSchema = () => {
    if (!generatedSchema) return;

    const schemaData: SchemaData = {
      type: 'payload',
      content: JSON.stringify(generatedSchema, null, 2),
      isValid: true,
      parsedData: generatedSchema
    };

    onSchemaGenerated(schemaData);
  };

  const handleRegenerateSchema = () => {
    setGeneratedSchema(null);
    setError('');
  };

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        🤖 Gerador de Schema com IA
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Descreva seu sistema destino em linguagem natural e a IA Gemini gerará automaticamente 
        um schema detalhado com exemplos de dados.
      </Typography>

      {/* Exemplos Rápidos */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 'bold' }}>
          💡 Exemplos Rápidos:
        </Typography>
        <Grid container spacing={2}>
          {examplePrompts.map((example, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Paper
                sx={{
                  p: 2,
                  cursor: 'pointer',
                  border: '1px solid #e0e0e0',
                  '&:hover': {
                    bgcolor: '#f5f5f5',
                    borderColor: getCategoryColor(example.category)
                  },
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column'
                }}
                onClick={() => handleExampleSelect(example.prompt)}
              >
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1 }}>
                    {example.title}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ mb: 2 }}>
                    {example.description}
                  </Typography>
                </Box>
                <Chip 
                  label={example.category.toUpperCase()} 
                  size="small"
                  sx={{ 
                    bgcolor: getCategoryColor(example.category),
                    color: 'white',
                    fontSize: '0.7rem',
                    alignSelf: 'flex-start'
                  }}
                />
              </Paper>
            </Grid>
          ))}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Campo de Descrição */}
      <TextField
        multiline
        rows={6}
        fullWidth
        label="Descreva seu sistema destino"
        placeholder="Ex: Sistema de RH da empresa com funcionários contendo nome completo, CPF, email, telefone celular e fixo, endereço completo (rua, número, bairro, cidade, estado, CEP), data de nascimento, gênero, estado civil, cargo atual, departamento, salário base, data de admissão, status (ativo/inativo) e centro de custo."
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        sx={{ mb: 3 }}
        helperText="Seja específico sobre os campos que você precisa. Quanto mais detalhes, melhor será o schema gerado."
      />

      {/* Botões de Ação */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Button
          variant="outlined"
          onClick={onBack}
          disabled={isGenerating}
        >
          ← Voltar
        </Button>
        
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!description.trim() || isGenerating}
          startIcon={isGenerating ? <CircularProgress size={20} /> : <AutoAwesome />}
          sx={{ bgcolor: '#ff6b35', '&:hover': { bgcolor: '#e55a2b' } }}
        >
          {isGenerating ? 'Gerando Schema...' : 'Gerar Schema com IA'}
        </Button>

        {generatedSchema && (
          <Button
            variant="outlined"
            onClick={handleRegenerateSchema}
            startIcon={<AutoAwesome />}
          >
            Gerar Novamente
          </Button>
        )}
      </Box>

      {/* Erros */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} icon={<ErrorIcon />}>
          {error}
        </Alert>
      )}

      {/* Schema Gerado */}
      {generatedSchema && (
        <Paper sx={{ p: 3, mb: 3, bgcolor: '#f8f9fa' }}>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Preview /> Schema Gerado pela IA
          </Typography>
          
          <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
            ✅ Schema gerado com sucesso! Revise a estrutura abaixo e clique em "Aceitar" se estiver correto.
          </Alert>

          <TextField
            multiline
            rows={12}
            fullWidth
            value={JSON.stringify(generatedSchema, null, 2)}
            InputProps={{ readOnly: true }}
            sx={{ 
              mb: 2,
              '& .MuiInputBase-input': {
                fontFamily: 'monospace',
                fontSize: '0.875rem'
              }
            }}
          />

          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="contained"
              onClick={handleAcceptSchema}
              startIcon={<CheckCircle />}
              sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
            >
              ✅ Aceitar Schema
            </Button>
            
            <Button
              variant="outlined"
              onClick={handleRegenerateSchema}
            >
              Gerar Novamente
            </Button>
          </Box>
        </Paper>
      )}

      {/* Dicas */}
      <Paper sx={{ p: 2, bgcolor: '#e3f2fd', border: '1px solid #bbdefb' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>💡 Dicas para melhor resultado:</strong><br/>
          • Mencione todos os campos necessários<br/>
          • Especifique tipos de dados (textos, números, datas)<br/>
          • Descreva estruturas aninhadas (endereços, departamentos)<br/>
          • Inclua validações especiais (CPF, email, telefone)
        </Typography>
      </Paper>
    </Box>
  );
};

export default GeminiSchemaGenerator;
