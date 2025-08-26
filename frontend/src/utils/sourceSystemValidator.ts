// Schema oficial do sistema de origem - carregado dinamicamente do backend
let SOURCE_SCHEMA_CACHE: Record<string, { type: string; required: boolean }> | null = null;

// Fallback schema (versão simplificada para casos offline)
const FALLBACK_SOURCE_SCHEMA: Record<string, { type: string; required: boolean }> = {
  companyName: { type: 'string', required: false },
  id: { type: 'string', required: true },
  event: { type: 'string', required: true },
  date: { type: 'string', required: true },
  'data.job.id': { type: 'number', required: false },
  'data.job.name': { type: 'string', required: false },
  'data.candidate.id': { type: 'number', required: false },
  'data.candidate.name': { type: 'string', required: false },
  'data.candidate.lastName': { type: 'string', required: false },
  'data.candidate.email': { type: 'string', required: false },
  'data.candidate.identificationDocument': { type: 'string', required: false },
  'data.candidate.mobileNumber': { type: 'string', required: false },
  'data.candidate.addressCity': { type: 'string', required: false },
  'data.candidate.addressState': { type: 'string', required: false },
  'data.admission.hiringDate': { type: 'string', required: false },
  'data.admission.position.salary.value': { type: 'number', required: false }
};

/**
 * Carrega o schema oficial do sistema de origem do backend
 */
async function loadSourceSchema(): Promise<Record<string, { type: string; required: boolean }>> {
  if (SOURCE_SCHEMA_CACHE) {
    return SOURCE_SCHEMA_CACHE;
  }

  try {
    console.log('🔍 Carregando schema oficial do sistema de origem...');
    const response = await fetch('http://localhost:8080/api/gemini/source-schema');
    
    if (!response.ok) {
      throw new Error(`Erro ao carregar schema: ${response.status}`);
    }
    
    const schemaData = await response.json();
    
    // Extrair campos do schema oficial em formato de paths
    const extractedSchema = extractSchemaFields(schemaData);
    
    SOURCE_SCHEMA_CACHE = extractedSchema;
    console.log(`✅ Schema oficial carregado: ${Object.keys(extractedSchema).length} campos`);
    
    return extractedSchema;
  } catch (error) {
    console.warn('⚠️ Falha ao carregar schema oficial, usando fallback:', error);
    return FALLBACK_SOURCE_SCHEMA;
  }
}

/**
 * Extrai campos do schema oficial do sistema de origem para formato de paths planos
 */
function extractSchemaFields(schemaData: any): Record<string, { type: string; required: boolean }> {
  const fields: Record<string, { type: string; required: boolean }> = {};
  
  // SchemaManagerService retorna { rawSchema, schema }. Para validação, usamos rawSchema
  const schema = schemaData.rawSchema || schemaData;
  
  console.log('🔍 Extraindo campos do schema oficial...');
  
  if (schema.properties?.body?.properties) {
    const bodyProps = schema.properties.body.properties;
    const requiredFields = schema.properties.body.required || [];
    
    console.log('📋 Processando body.properties:', Object.keys(bodyProps));
    
    // Campos raiz (considerando tanto body.field quanto field direto)
    Object.entries(bodyProps).forEach(([key, value]: [string, any]) => {
      if (key !== 'data' && key !== 'user') {
        // Adicionar tanto para body.field quanto field direto
        fields[`body.${key}`] = {
          type: value.type || 'string',
          required: requiredFields.includes(key)
        };
        fields[key] = {
          type: value.type || 'string',
          required: requiredFields.includes(key)
        };
      }
    });
    
    // Campos de data (estrutura aninhada)
    if (bodyProps.data?.properties) {
      extractDataFields(bodyProps.data.properties, 'body.data', fields);
      extractDataFields(bodyProps.data.properties, 'data', fields); // Também sem body prefix
    }
    
    // Campos de user
    if (bodyProps.user?.properties) {
      extractDataFields(bodyProps.user.properties, 'body.user', fields);
      extractDataFields(bodyProps.user.properties, 'user', fields); // Também sem body prefix
    }
  } else {
    console.warn('⚠️ Schema não possui estrutura body.properties esperada');
  }
  
  console.log(`✅ Extração concluída: ${Object.keys(fields).length} campos`);
  
  return fields;
}

/**
 * Extrai campos aninhados recursivamente
 */
function extractDataFields(properties: any, prefix: string, fields: Record<string, { type: string; required: boolean }>) {
  Object.entries(properties).forEach(([key, value]: [string, any]) => {
    const fullPath = `${prefix}.${key}`;
    
    if (value.type === 'object' && value.properties) {
      // Recursivo para objetos aninhados
      extractDataFields(value.properties, fullPath, fields);
    } else {
      // Campo final
      fields[fullPath] = {
        type: value.type || 'string',
        required: false // Para simplificar, consideramos todos opcionais exceto raiz
      };
    }
  });
}

export interface SourceSystemValidationError {
  field: string;
  error: 'missing' | 'wrong_type' | 'invalid_format';
  expected?: string;
  received?: string;
  message: string;
}

export interface SourceSystemValidationResult {
  isValid: boolean;
  errors: SourceSystemValidationError[];
  warnings: SourceSystemValidationError[];
  missingFields: string[];
  extraFields: string[];
  fieldCount: {
    total: number;
    valid: number;
    invalid: number;
    missing: number;
  };
  suggestions: string[];
  confidence: number; // 0-100%
}

export async function validateSourceSystemPayload(payload: any): Promise<SourceSystemValidationResult> {
  const errors: SourceSystemValidationError[] = [];
  const warnings: SourceSystemValidationError[] = [];
  const missingFields: string[] = [];
  const extraFields: string[] = [];
  
  let validFields = 0;
  let invalidFields = 0;

  // Carregar schema oficial
  const SOURCE_SCHEMA = await loadSourceSchema();

  // Helper para obter valor de path aninhado
  const getNestedValue = (obj: any, path: string): any => {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj);
  };

  // Helper para verificar se um path existe no objeto
  const hasNestedPath = (obj: any, path: string): boolean => {
    const value = getNestedValue(obj, path);
    return value !== undefined && value !== null;
  };

  // Verificar campos obrigatórios
  Object.entries(SOURCE_SCHEMA).forEach(([fieldPath, schema]) => {
    const value = getNestedValue(payload, fieldPath);
    const hasValue = value !== undefined && value !== null;

    if (schema.required && !hasValue) {
      missingFields.push(fieldPath);
      errors.push({
        field: fieldPath,
        error: 'missing',
        expected: schema.type,
        message: `Campo obrigatório '${fieldPath}' está ausente`
      });
      invalidFields++;
    } else if (hasValue) {
      // Verificar tipo
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      const expectedType = schema.type;

      if (actualType !== expectedType) {
        // Exceções especiais para tipos compatíveis
        const isCompatible = 
          (expectedType === 'string' && (actualType === 'number' || actualType === 'boolean')) ||
          (expectedType === 'number' && actualType === 'string' && !isNaN(Number(value)));

        if (!isCompatible) {
          errors.push({
            field: fieldPath,
            error: 'wrong_type',
            expected: expectedType,
            received: actualType,
            message: `Campo '${fieldPath}' deveria ser ${expectedType}, mas é ${actualType}`
          });
          invalidFields++;
        } else {
          validFields++;
        }
      } else {
        validFields++;
      }

      // Validações específicas de formato
      if (fieldPath.includes('email') && typeof value === 'string') {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
          warnings.push({
            field: fieldPath,
            error: 'invalid_format',
            message: `Campo '${fieldPath}' não parece ser um email válido`
          });
        }
      }

      if (fieldPath.includes('date') && typeof value === 'string') {
        const isValidDate = !isNaN(Date.parse(value));
        if (!isValidDate) {
          warnings.push({
            field: fieldPath,
            error: 'invalid_format',
            message: `Campo '${fieldPath}' não parece ser uma data válida`
          });
        }
      }
    }
  });

  // Identificar campos extras (não presentes no schema)
  const findExtraFields = (obj: any, prefix = ''): void => {
    Object.keys(obj).forEach(key => {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        findExtraFields(value, fullPath);
      } else {
        if (!(fullPath in SOURCE_SCHEMA)) {
          extraFields.push(fullPath);
        }
      }
    });
  };

  findExtraFields(payload);

  // Gerar sugestões
  const suggestions: string[] = [];
  
  if (missingFields.length > 0) {
    suggestions.push(`Adicione os campos obrigatórios: ${missingFields.slice(0, 3).join(', ')}`);
  }
  
  if (errors.some(e => e.error === 'wrong_type')) {
    suggestions.push('Verifique os tipos de dados - alguns campos estão com tipos incorretos');
  }
  
  if (extraFields.length > 5) {
    suggestions.push('Muitos campos extras detectados - verifique se está usando o payload correto da Gupy');
  }
  
  if (!hasNestedPath(payload, 'data.candidate')) {
    suggestions.push('Estrutura de candidato não encontrada - verifique se é um webhook da Gupy');
  }
  
  if (!hasNestedPath(payload, 'event') || !payload.event.includes('.')) {
    suggestions.push('Campo "event" deve seguir padrão Gupy (ex: "pre-employee.moved")');
  }

  // Calcular confiança de forma inteligente
  // Se payload tem wrapper 'body', priorizar campos com prefixo body.
  const hasBodyWrapper = payload.body !== undefined;
  
  let relevantFields = 0;
  let foundFields = 0;
  
  Object.entries(SOURCE_SCHEMA).forEach(([fieldPath, schema]) => {
    // Se payload tem body wrapper, só contar campos body.*
    // Se não tem, só contar campos sem body.*
    if (hasBodyWrapper && fieldPath.startsWith('body.')) {
      relevantFields++;
      const value = getNestedValue(payload, fieldPath);
      if (value !== undefined && value !== null) {
        foundFields++;
      }
    } else if (!hasBodyWrapper && !fieldPath.startsWith('body.')) {
      relevantFields++;
      const value = getNestedValue(payload, fieldPath);
      if (value !== undefined && value !== null) {
        foundFields++;
      }
    }
  });

  const confidence = relevantFields > 0 ? Math.round((foundFields / relevantFields) * 100) : 0;

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingFields,
    extraFields,
    fieldCount: {
      total: relevantFields,
      valid: validFields,
      invalid: invalidFields,
      missing: missingFields.length
    },
    suggestions,
    confidence
  };
}

export function getSourceSystemExamplePayload(): any {
  return {
    companyName: "ACME",
    id: "24e99765-8583-4be5-87ae-489c86642964",
    event: "pre-employee.moved",
    date: "2019-06-19T23:48:46.952Z",
    data: {
      job: {
        id: 19139,
        code: "code-19139",
        name: "Developer",
        department: {
          id: 45,
          code: "45124",
          name: "App Development"
        },
        role: {
          id: 56,
          name: "Developer"
        },
        branch: {
          id: 1895,
          name: "GUPY > BRANCH 1"
        }
      },
      application: {
        id: 2937132,
        score: 71.570454783086,
        currentStep: {
          id: 86547,
          name: "Pré-contratação"
        }
      },
      user: {
        id: 1215163,
        name: "Janaina Silva",
        email: "janaina.silva@email.com.br"
      },
      candidate: {
        id: 1999450,
        name: "John",
        lastName: "Doe",
        email: "john.doe177@gmail.com",
        identificationDocument: "25272626207",
        countryOfOrigin: "Brasil",
        birthdate: "1994-11-16",
        addressZipCode: "01414-905",
        addressStreet: "Rua Haddock Lobo",
        addressNumber: "595 - 10º andar",
        addressCity: "São Paulo",
        addressState: "São Paulo",
        addressStateShortName: "SP",
        addressCountry: "Brasil",
        mobileNumber: "+5511999990000",
        phoneNumber: "+551130000000",
        schooling: "technical_course",
        schoolingStatus: "complete",
        disabilities: false,
        gender: "Male"
      },
      admission: {
        status: "SIGNING_CONTRACT",
        admissionDeadline: "2019-06-26T00:00:00.000",
        hiringDate: "2019-06-19T00:00:00.000Z",
        position: {
          salary: {
            value: 1250.5,
            currency: "R$"
          },
          department: {
            id: 1,
            name: "Development"
          },
          role: {
            id: 523,
            name: "Developer"
          },
          branch: {
            id: 3321,
            label: "BRANCH > BRANCH 1"
          },
          costCenter: {
            id: 448,
            code: "CODCENCOST",
            name: "NomeCentroCustoXYZ"
          },
          workShift: {
            id: 3,
            name: "Teste Turno",
            workload: "180"
          }
        }
      }
    }
  };
}
