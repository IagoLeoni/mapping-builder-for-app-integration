import { PayloadField } from '../types';

// Cache da estrutura carregada
let gupyStructureCache: PayloadField[] | null = null;

export const parseGupyPayload = async (): Promise<PayloadField[]> => {
  // Se já temos cache, retornar imediatamente
  if (gupyStructureCache) {
    console.log('📦 Usando estrutura Gupy do cache');
    console.log('📊 Cache contém:', gupyStructureCache.length, 'campos de nível raiz');
    logStructureDetails(gupyStructureCache, 'CACHE');
    return gupyStructureCache;
  }

  try {
    console.log('🌐 Carregando estrutura oficial do payload Gupy...');
    console.log('📡 Fazendo request para: http://localhost:8080/api/gemini/gupy-payload-structure');
    
    const response = await fetch('http://localhost:8080/api/gemini/gupy-payload-structure');
    
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
    logStructureDetails(fields, 'OFICIAL');
    
    // Cachear resultado
    gupyStructureCache = fields;
    
    return fields;
  } catch (error) {
    console.error('❌ ERRO DETALHADO ao carregar estrutura oficial:', error);
    console.warn('⚠️ Usando fallback hardcoded devido ao erro acima');
    
    // Fallback para estrutura hardcoded (básica)
    const fallbackStructure = getFallbackStructure();
    const fields = parseObject(fallbackStructure);
    
    console.log('🔄 Fallback gerou:', fields.length, 'campos de nível raiz');
    logStructureDetails(fields, 'FALLBACK');
    
    // Não cachear fallback para tentar novamente depois
    return fields;
  }
};

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
  
  // Mostrar estrutura de data.candidate se existe
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

// Função parseGupyPayload síncrona para compatibilidade (usa cache se disponível)
export const parseGupyPayloadSync = (): PayloadField[] => {
  if (gupyStructureCache) {
    return gupyStructureCache;
  }
  
  console.warn('⚠️ Cache não disponível, usando estrutura básica');
  return parseObject(getFallbackStructure());
};

// Estrutura básica de fallback
const getFallbackStructure = () => ({
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
      addressZipCode: "string"
    },
    job: {
      name: "string",
      department: {
        name: "string"
      },
      role: {
        name: "string"
      }
    },
    admission: {
      position: {
        salary: {
          value: "number",
          currency: "string"
        }
      }
    }
  }
});

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
