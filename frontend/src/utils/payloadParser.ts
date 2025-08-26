import { PayloadField } from '../types';

// Cache da estrutura carregada (agora por sistema)
let sourceSystemCache: Map<string, PayloadField[]> = new Map();

// Interface para configuração do sistema
interface SourceSystemConfig {
  systemId: string;
  apiEndpoint: string;
  fallbackStructure?: any;
}

// Configurações de sistemas suportados
const SYSTEM_CONFIGS: Record<string, SourceSystemConfig> = {
  gupy: {
    systemId: 'gupy',
    apiEndpoint: '/api/gemini/gupy-payload-structure',
    fallbackStructure: getGupyFallbackStructure()
  },
  // Futuros sistemas serão adicionados aqui
  salesforce: {
    systemId: 'salesforce', 
    apiEndpoint: '/api/systems/salesforce/payload-structure',
    fallbackStructure: getSalesforceFallbackStructure()
  },
  workday: {
    systemId: 'workday',
    apiEndpoint: '/api/systems/workday/payload-structure', 
    fallbackStructure: getWorkdayFallbackStructure()
  }
};

// ===== FUNÇÕES UNIVERSAIS PARA QUALQUER SISTEMA =====

export const parseSourceSystemPayload = async (systemId: string = 'gupy'): Promise<PayloadField[]> => {
  // Verificar cache primeiro
  if (sourceSystemCache.has(systemId)) {
    console.log(`📦 Usando estrutura ${systemId} do cache`);
    const cached = sourceSystemCache.get(systemId)!;
    console.log('📊 Cache contém:', cached.length, 'campos de nível raiz');
    logStructureDetails(cached, `CACHE-${systemId.toUpperCase()}`);
    return cached;
  }

  const config = SYSTEM_CONFIGS[systemId];
  if (!config) {
    throw new Error(`Sistema "${systemId}" não suportado. Sistemas disponíveis: ${Object.keys(SYSTEM_CONFIGS).join(', ')}`);
  }

  try {
    console.log(`🌐 Carregando estrutura oficial do payload ${systemId.toUpperCase()}...`);
    console.log(`📡 Fazendo request para: http://localhost:8080${config.apiEndpoint}`);
    
    const response = await fetch(`http://localhost:8080${config.apiEndpoint}`);
    
    console.log('📨 Response status:', response.status);
    console.log('📨 Response ok:', response.ok);
    
    if (!response.ok) {
      throw new Error(`Erro ao carregar estrutura: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('📦 Data recebida:', {
      success: data.success,
      fieldCount: data.fieldCount,
      source: data.source,
      structureKeys: Object.keys(data.payloadStructure || {})
    });
    
    if (!data.success) {
      throw new Error(data.error || 'Falha ao carregar estrutura');
    }
    
    console.log(`✅ Estrutura oficial carregada: ${data.fieldCount} campos do ${data.source}`);
    console.log('🏗️ Convertendo estrutura para PayloadFields...');
    
    // Converter estrutura para PayloadFields
    const fields = parseObject(data.payloadStructure);
    
    console.log('🎯 Conversão concluída:', fields.length, 'campos de nível raiz');
    logStructureDetails(fields, `OFICIAL-${systemId.toUpperCase()}`);
    
    // Cachear resultado
    sourceSystemCache.set(systemId, fields);
    
    return fields;
  } catch (error) {
    console.error(`❌ ERRO DETALHADO ao carregar estrutura oficial ${systemId}:`, error);
    console.warn('⚠️ Usando fallback hardcoded devido ao erro acima');
    
    // Fallback para estrutura hardcoded do sistema
    const fallbackStructure = config.fallbackStructure || getGupyFallbackStructure();
    const fields = parseObject(fallbackStructure);
    
    console.log('🔄 Fallback gerou:', fields.length, 'campos de nível raiz');
    logStructureDetails(fields, `FALLBACK-${systemId.toUpperCase()}`);
    
    // Não cachear fallback para tentar novamente depois
    return fields;
  }
};

export const parseSourceSystemPayloadSync = (systemId: string = 'gupy'): PayloadField[] => {
  if (sourceSystemCache.has(systemId)) {
    return sourceSystemCache.get(systemId)!;
  }
  
  console.warn(`⚠️ Cache não disponível para ${systemId}, usando estrutura básica`);
  const config = SYSTEM_CONFIGS[systemId];
  const fallbackStructure = config?.fallbackStructure || getGupyFallbackStructure();
  return parseObject(fallbackStructure);
};

// ===== FUNÇÕES LEGACY PARA COMPATIBILIDADE =====

export const parseGupyPayload = async (): Promise<PayloadField[]> => {
  return parseSourceSystemPayload('gupy');
};

export const parseGupyPayloadSync = (): PayloadField[] => {
  return parseSourceSystemPayloadSync('gupy');
};

// ===== ESTRUTURAS DE FALLBACK POR SISTEMA =====

function getGupyFallbackStructure() {
  return {
    companyName: "string",
    id: "string", 
    event: "string",
    date: "string",
    data: {
      candidate: {
        name: "string",
        lastName: "string",
        email: "string",
        identificationDocument: "string",
        mobileNumber: "string",
        addressCity: "string",
        addressState: "string",
        addressZipCode: "string",
        birthdate: "string",
        gender: "string"
      },
      job: {
        name: "string",
        departmentCode: "string",
        roleCode: "string",
        department: {
          name: "string",
          code: "string"
        },
        role: {
          name: "string",
          code: "string"
        }
      },
      admission: {
        hiringDate: "string",
        position: {
          salary: {
            value: "number",
            currency: "string"
          }
        }
      }
    }
  };
}

function getSalesforceFallbackStructure() {
  return {
    Id: "string",
    Name: "string",
    Email: "string",
    Phone: "string",
    Account: {
      Id: "string",
      Name: "string"
    },
    Contact: {
      FirstName: "string",
      LastName: "string",
      Email: "string"
    }
  };
}

function getWorkdayFallbackStructure() {
  return {
    Worker_ID: "string",
    Personal_Data: {
      Name_Data: {
        Legal_Name: {
          Name_Detail_Data: {
            First_Name: "string",
            Last_Name: "string"
          }
        }
      },
      Contact_Data: {
        Email_Address_Data: {
          Email_Address: "string"
        }
      }
    },
    Employment_Data: {
      Position_Data: {
        Job_Profile_Summary_Data: {
          Job_Profile_Name: "string"
        }
      }
    }
  };
}

// ===== FUNÇÕES AUXILIARES =====

// Função auxiliar para logar detalhes da estrutura
function logStructureDetails(fields: PayloadField[], source: string) {
  console.log(`📋 === ESTRUTURA ${source} ===`);
  console.log(`📊 Campos de nível raiz: ${fields.length}`);
  
  let totalFields = 0;
  const countAllFields = (fieldList: PayloadField[]) => {
    fieldList.forEach(field => {
      totalFields++;
      if (field.children) {
        countAllFields(field.children);
      }
    });
  };
  countAllFields(fields);
  
  console.log(`📊 Total de campos (incluindo aninhados): ${totalFields}`);
  console.log('📋 Campos principais:', fields.map(f => f.name).slice(0, 10).join(', '));
  
  // Mostrar estrutura específica baseada no sistema (compatibilidade Gupy)
  const dataField = fields.find(f => f.name === 'data');
  if (dataField && dataField.children) {
    const candidateField = dataField.children.find(c => c.name === 'candidate');
    if (candidateField && candidateField.children) {
      console.log('👤 Campos candidate:', candidateField.children.length, 'campos');
      console.log('👤 Exemplos candidate:', candidateField.children.slice(0, 5).map(c => c.name).join(', '));
    }
  }
  
  console.log(`📋 === FIM ESTRUTURA ${source} ===`);
}

const parseObject = (obj: any, parentPath: string = '', parentId: string = ''): PayloadField[] => {
  const fields: PayloadField[] = [];
  
  Object.entries(obj).forEach(([key, value], index) => {
    const path = parentPath ? `${parentPath}.${key}` : key;
    const id = parentId ? `${parentId}-${key}` : key;
    
    let type: PayloadField['type'] = 'string';
    let children: PayloadField[] | undefined;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      type = 'object';
      children = parseObject(value, path, id);
    } else if (Array.isArray(value) || value === 'array') {
      type = 'array';
    } else if (value === 'number') {
      type = 'number';
    } else if (value === 'boolean') {
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

export const flattenFields = (fields: PayloadField[]): PayloadField[] => {
  const flattened: PayloadField[] = [];
  
  const flatten = (fieldList: PayloadField[]) => {
    fieldList.forEach(field => {
      flattened.push(field);
      if (field.children) {
        flatten(field.children);
      }
    });
  };
  
  flatten(fields);
  return flattened;
};

// ===== UTILITÁRIOS PARA CONFIGURAÇÃO DE SISTEMAS =====

export const getSupportedSystems = (): string[] => {
  return Object.keys(SYSTEM_CONFIGS);
};

export const addSystemConfig = (systemId: string, config: SourceSystemConfig): void => {
  SYSTEM_CONFIGS[systemId] = config;
};

export const clearSourceSystemCache = (systemId?: string): void => {
  if (systemId) {
    sourceSystemCache.delete(systemId);
  } else {
    sourceSystemCache.clear();
  }
};
