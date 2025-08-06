import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  TextField,
  InputAdornment,
  Paper,
  Alert
} from '@mui/material';
import {
  Search,
  Business,
  Person,
  AccountBalance,
  Settings,
  CheckCircle
} from '@mui/icons-material';
import { SchemaData } from './MappingWizard';

interface SchemaTemplate {
  id: string;
  name: string;
  description: string;
  category: 'salesforce' | 'workday' | 'sap' | 'oracle' | 'generic';
  icon: string;
  popularity: 'high' | 'medium' | 'low';
  fieldCount: number;
  schema: any;
  tags: string[];
}

interface SchemaTemplateSelectorProps {
  onSchemaSelected: (data: SchemaData) => void;
  onBack: () => void;
}

const SchemaTemplateSelector: React.FC<SchemaTemplateSelectorProps> = ({
  onSchemaSelected,
  onBack
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates, setTemplates] = useState<SchemaTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const categories = [
    { id: 'all', name: 'Todos', icon: '📋' },
    { id: 'salesforce', name: 'Salesforce', icon: '☁️' },
    { id: 'workday', name: 'Workday', icon: '👥' },
    { id: 'sap', name: 'SAP', icon: '🏢' },
    { id: 'oracle', name: 'Oracle', icon: '🔶' },
    { id: 'generic', name: 'Genérico', icon: '⚙️' }
  ];

  // Templates pré-definidos (em produção viriam do backend)
  const defaultTemplates: SchemaTemplate[] = [
    {
      id: 'salesforce-contact',
      name: 'Salesforce Contact',
      description: 'Estrutura padrão de contatos do Salesforce CRM',
      category: 'salesforce',
      icon: '👤',
      popularity: 'high',
      fieldCount: 15,
      tags: ['crm', 'vendas', 'contatos'],
      schema: {
        FirstName: "João",
        LastName: "Silva",
        Email: "joao.silva@empresa.com",
        Phone: "(11) 99999-9999",
        Title: "Desenvolvedor Senior",
        Department: "Tecnologia",
        Account: {
          Name: "ACME Corp",
          Industry: "Technology"
        },
        MailingAddress: {
          Street: "Rua das Flores, 123",
          City: "São Paulo",
          State: "SP",
          PostalCode: "01234-567",
          Country: "Brasil"
        }
      }
    },
    {
      id: 'workday-employee',
      name: 'Workday Employee',
      description: 'Dados de funcionário no padrão Workday HCM',
      category: 'workday',
      icon: '👷',
      popularity: 'high',
      fieldCount: 20,
      tags: ['hcm', 'rh', 'funcionarios'],
      schema: {
        PersonalData: {
          FirstName: "Maria",
          LastName: "Santos",
          PreferredName: "Maria",
          DateOfBirth: "1990-05-15",
          Gender: "Female",
          MaritalStatus: "Single"
        },
        ContactData: {
          PrimaryEmail: "maria.santos@empresa.com",
          HomePhone: "(11) 3333-4444",
          MobilePhone: "(11) 99999-8888",
          Address: {
            AddressLine1: "Av. Paulista, 1000",
            City: "São Paulo",
            State: "SP",
            PostalCode: "01310-100",
            Country: "BR"
          }
        },
        EmploymentData: {
          EmployeeID: "EMP001234",
          HireDate: "2023-01-15",
          JobTitle: "Software Engineer",
          Department: "Engineering",
          Location: "São Paulo Office",
          Manager: "Carlos Oliveira",
          EmploymentStatus: "Active"
        },
        CompensationData: {
          BaseSalary: 8000.00,
          Currency: "BRL",
          PayGroup: "Monthly"
        }
      }
    },
    {
      id: 'sap-employee',
      name: 'SAP Employee Master',
      description: 'Estrutura de dados de funcionário SAP HR',
      category: 'sap',
      icon: '🏢',
      popularity: 'medium',
      fieldCount: 18,
      tags: ['erp', 'sap', 'recursos-humanos'],
      schema: {
        PersonnelNumber: "00001234",
        PersonalData: {
          FirstName: "Carlos",
          LastName: "Oliveira",
          DateOfBirth: "1985-03-20",
          Nationality: "BR",
          Gender: "M"
        },
        AddressData: {
          Street: "Rua dos Três Irmãos, 456",
          City: "São Paulo",
          PostalCode: "05435-070",
          State: "SP",
          Country: "BR"
        },
        OrganizationalData: {
          CompanyCode: "0001",
          PersonnelArea: "0001",
          PersonnelSubarea: "0001",
          EmployeeGroup: "1",
          EmployeeSubgroup: "A1",
          CostCenter: "CC001",
          Department: "IT"
        },
        ContractData: {
          StartDate: "2022-06-01",
          EndDate: "9999-12-31",
          PositionNumber: "50000001",
          JobCode: "DEV001"
        }
      }
    },
    {
      id: 'generic-hr-basic',
      name: 'Sistema HR Básico',
      description: 'Estrutura genérica para sistemas de RH simples',
      category: 'generic',
      icon: '👥',
      popularity: 'high',
      fieldCount: 12,
      tags: ['generico', 'simples', 'basico'],
      schema: {
        funcionario: {
          nome: "Ana Costa",
          sobrenome: "Silva",
          email: "ana.costa@empresa.com",
          cpf: "123.456.789-00",
          telefone: "(11) 98765-4321",
          endereco: {
            rua: "Rua Augusta, 789",
            numero: "789",
            cidade: "São Paulo",
            estado: "SP",
            cep: "01305-000"
          },
          dados_profissionais: {
            cargo: "Analista de Marketing",
            departamento: "Marketing",
            salario: 5500.00,
            data_admissao: "2023-03-01",
            status: "ativo"
          }
        }
      }
    },
    {
      id: 'generic-hr-advanced',
      name: 'Sistema HR Avançado',
      description: 'Estrutura genérica para sistemas de RH completos',
      category: 'generic',
      icon: '🎯',
      popularity: 'medium',
      fieldCount: 25,
      tags: ['generico', 'completo', 'avancado'],
      schema: {
        employee: {
          personalInfo: {
            employeeId: "EMP789",
            firstName: "Roberto",
            lastName: "Mendes",
            fullName: "Roberto Mendes",
            dateOfBirth: "1988-11-30",
            gender: "Male",
            maritalStatus: "Married",
            nationality: "Brazilian"
          },
          contactInfo: {
            primaryEmail: "roberto.mendes@empresa.com",
            secondaryEmail: "roberto.mendes@gmail.com",
            mobilePhone: "+5511987654321",
            homePhone: "+551133334444",
            address: {
              street: "Rua Vergueiro, 1000",
              number: "1000",
              complement: "Apto 101",
              neighborhood: "Vila Mariana",
              city: "São Paulo",
              state: "São Paulo",
              stateCode: "SP",
              zipCode: "04101-000",
              country: "Brasil"
            }
          },
          professionalInfo: {
            jobTitle: "Senior Developer",
            department: "Technology",
            team: "Backend Team",
            manager: "Fernanda Silva",
            hireDate: "2021-08-15",
            employmentType: "Full-time",
            workLocation: "Hybrid",
            costCenter: "TEC001",
            level: "Senior"
          },
          compensationInfo: {
            baseSalary: 12000.00,
            currency: "BRL",
            benefits: ["VR", "VT", "Plano Saude", "Dental"],
            bonusEligible: true
          }
        }
      }
    }
  ];

  useEffect(() => {
    // Simular carregamento de templates
    setIsLoading(true);
    setTimeout(() => {
      setTemplates(defaultTemplates);
      setIsLoading(false);
    }, 500);
  }, []);

  const getPopularityColor = (popularity: string) => {
    const colors: Record<string, string> = {
      high: '#4caf50',
      medium: '#ff9800',
      low: '#757575'
    };
    return colors[popularity] || '#757575';
  };

  const getPopularityLabel = (popularity: string) => {
    const labels: Record<string, string> = {
      high: 'Popular',
      medium: 'Comum',
      low: 'Específico'
    };
    return labels[popularity] || 'Desconhecido';
  };

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleTemplateSelect = (template: SchemaTemplate) => {
    const schemaData: SchemaData = {
      type: 'payload',
      content: JSON.stringify(template.schema, null, 2),
      isValid: true,
      parsedData: template.schema
    };

    onSchemaSelected(schemaData);
  };

  const TemplateCard: React.FC<{ template: SchemaTemplate }> = ({ template }) => (
    <Card 
      sx={{ 
        cursor: 'pointer',
        border: '1px solid #e0e0e0',
        '&:hover': { 
          boxShadow: 6,
          transform: 'translateY(-2px)',
          transition: 'all 0.2s ease-in-out'
        },
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
      onClick={() => handleTemplateSelect(template)}
    >
      <CardContent sx={{ 
        p: 3, 
        flexGrow: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ mr: 1 }}>
              {template.icon}
            </Typography>
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                {template.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {template.fieldCount} campos
              </Typography>
            </Box>
          </Box>
          
          <Typography variant="body2" sx={{ mb: 2, minHeight: '2.5rem' }}>
            {template.description}
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            {template.tags.slice(0, 3).map((tag) => (
              <Chip 
                key={tag}
                label={tag} 
                size="small" 
                variant="outlined"
                sx={{ mr: 0.5, mb: 0.5, fontSize: '0.7rem' }}
              />
            ))}
          </Box>
        </Box>
        
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Chip 
              label={getPopularityLabel(template.popularity)}
              size="small"
              sx={{ 
                bgcolor: getPopularityColor(template.popularity),
                color: 'white',
                fontSize: '0.7rem'
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase' }}>
              {template.category}
            </Typography>
          </Box>
          
          <Button
            variant="contained"
            fullWidth
            startIcon={<CheckCircle />}
            sx={{ bgcolor: '#4caf50', '&:hover': { bgcolor: '#45a049' } }}
          >
            Usar Template
          </Button>
        </Box>
      </CardContent>
    </Card>
  );

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        ⚡ Templates de Sistemas Prontos
      </Typography>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Escolha um template pré-configurado para sistemas populares. Todos os templates incluem 
        exemplos de dados reais para facilitar o mapeamento.
      </Typography>

      {/* Busca e Filtros */}
      <Box sx={{ mb: 4 }}>
        <TextField
          fullWidth
          placeholder="Buscar templates..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ mb: 2 }}
        />

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          {categories.map((category) => (
            <Chip
              key={category.id}
              label={`${category.icon} ${category.name}`}
              onClick={() => setSelectedCategory(category.id)}
              variant={selectedCategory === category.id ? 'filled' : 'outlined'}
              color={selectedCategory === category.id ? 'primary' : 'default'}
              sx={{ cursor: 'pointer' }}
            />
          ))}
        </Box>
      </Box>

      {/* Templates */}
      {isLoading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Carregando templates...</Typography>
        </Box>
      ) : filteredTemplates.length === 0 ? (
        <Alert severity="info">
          Nenhum template encontrado com os filtros aplicados.
        </Alert>
      ) : (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {filteredTemplates.map((template) => (
            <Grid item xs={12} sm={6} lg={4} key={template.id}>
              <TemplateCard template={template} />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Botão Voltar */}
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Button
          variant="outlined"
          onClick={onBack}
        >
          ← Voltar
        </Button>
      </Box>

      {/* Informações */}
      <Paper sx={{ p: 2, mt: 3, bgcolor: '#f8f9fa', border: '1px solid #e0e0e0' }}>
        <Typography variant="caption" color="text.secondary">
          <strong>💡 Sobre os Templates:</strong><br/>
          • Templates incluem dados de exemplo para facilitar o mapeamento<br/>
          • Você pode editar o schema após selecionar um template<br/>
          • Novos templates são adicionados regularmente<br/>
          • Sugestões de templates: entre em contato conosco
        </Typography>
      </Paper>
    </Box>
  );
};

export default SchemaTemplateSelector;
