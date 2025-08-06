import { SchemaManagerService } from './SchemaManagerService';
import { GoogleGenerativeAI } from '@google/generative-ai';
import 'cross-fetch/polyfill';

interface MappingConnection {
  id: string;
  sourceField: {
    id: string;
    name: string;
    type: string;
    path: string;
  };
  targetPath: string;
  confidence?: number;
  reasoning?: string;
  aiGenerated?: boolean;
  transformation?: {
    type: 'format_document' | 'concat' | 'split' | 'convert' | 'normalize' | 'format_date';
    operation: string;
    pattern?: string;
    parameters?: any;
    preview?: {
      input: string;
      output: string;
    };
  };
}

export class GeminiMappingService {
  private static generateId(): string {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Gera mapeamentos automáticos usando Gemini AI
   */
  async generateMappings(clientSchema: any, inputType: 'schema' | 'payload' = 'schema'): Promise<MappingConnection[]> {
    try {
      // Validar schema do cliente
      const validation = SchemaManagerService.validateClientSchema(clientSchema);
      if (!validation.valid) {
        throw new Error(`Schema inválido: ${validation.errors.join(', ')}`);
      }

      // Carregar schemas de referência
      const gupySchema = await SchemaManagerService.loadGupySchema();
      const gupyExamplePayload = await SchemaManagerService.loadGupyExamplePayload();
      const semanticPatterns = await SchemaManagerService.loadSemanticPatterns();

      // Extrair caminhos dos schemas
      const gupyPaths = SchemaManagerService.extractFieldPaths(gupySchema.schema);
      const clientPaths = SchemaManagerService.extractFieldPaths(clientSchema);

      console.log('🤖 Gupy paths:', gupyPaths);
      console.log('🤖 Client paths:', clientPaths);

      // Tentar usar Gemini API se disponível, senão usar algoritmo simples
      if (process.env.GEMINI_API_KEY) {
        console.log('🤖 Usando Gemini API para gerar mapeamentos...');
        try {
          const mappings = await this.generateGeminiMappings(gupySchema, gupyExamplePayload, clientSchema, semanticPatterns);
          return mappings;
        } catch (geminiError) {
          console.warn('⚠️ Falha no Gemini API, usando algoritmo simples:', geminiError);
          // Fallback para algoritmo simples
        }
      } else {
        console.log('🤖 GEMINI_API_KEY não configurada, usando algoritmo simples...');
      }

      const mappings = this.generateSimpleMappings(gupySchema.schema, clientPaths, semanticPatterns);
      return mappings;
    } catch (error) {
      console.error('Error generating mappings:', error);
      throw new Error(`Failed to generate mappings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Gera mapeamentos usando lógica simples (fallback enquanto não temos Gemini)
   */
  private generateSimpleMappings(
    gupySchema: any, 
    clientPaths: string[], 
    semanticPatterns: any
  ): MappingConnection[] {
    const mappings: MappingConnection[] = [];

    // Mapear cada campo do schema Gupy
    for (const [gupyFieldPath, gupyFieldInfo] of Object.entries(gupySchema)) {
      const fieldInfo = gupyFieldInfo as any;
      const semanticTags = fieldInfo.semanticTags || [];

      // Procurar correspondências nos caminhos do cliente
      for (const clientPath of clientPaths) {
        const confidence = this.calculateConfidence(gupyFieldPath, clientPath, semanticTags, semanticPatterns);
        
        if (confidence >= semanticPatterns.confidence_rules.minimum_confidence) {
          mappings.push({
            id: GeminiMappingService.generateId(),
            sourceField: {
              id: GeminiMappingService.generateId(),
              name: gupyFieldPath.split('.').pop() || gupyFieldPath,
              type: fieldInfo.type || 'string',
              path: gupyFieldPath
            },
            targetPath: clientPath,
            confidence,
            reasoning: this.generateReasoning(gupyFieldPath, clientPath, confidence),
            aiGenerated: true
          });
        }
      }
    }

    // Ordenar por confiança (maior primeiro) e remover duplicatas
    return mappings
      .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
      .filter((mapping, index, arr) => 
        arr.findIndex(m => m.sourceField.path === mapping.sourceField.path) === index
      );
  }

  /**
   * Calcula a confiança de um mapeamento
   */
  private calculateConfidence(
    gupyPath: string, 
    clientPath: string, 
    semanticTags: string[], 
    patterns: any
  ): number {
    const gupyField = gupyPath.split('.').pop()?.toLowerCase() || '';
    const clientField = clientPath.split('.').pop()?.toLowerCase() || '';

    // Match exato
    if (gupyField === clientField) {
      return patterns.confidence_rules.exact_match;
    }

    // Match por semantic tags
    for (const tag of semanticTags) {
      if (clientField.includes(tag.toLowerCase()) || tag.toLowerCase().includes(clientField)) {
        return patterns.confidence_rules.semantic_tag_match;
      }
    }

    // Match por padrões semânticos
    for (const [patternName, variations] of Object.entries(patterns.patterns)) {
      const variationList = variations as string[];
      const gupyInPattern = variationList.some(v => v.toLowerCase() === gupyField);
      const clientInPattern = variationList.some(v => v.toLowerCase() === clientField);
      
      if (gupyInPattern && clientInPattern) {
        return patterns.confidence_rules.similar_name;
      }
    }

    // Match hierárquico (ex: candidate.name → person.nome)
    for (const [containerType, containers] of Object.entries(patterns.hierarchical_patterns)) {
      const containerList = containers as string[];
      const gupyContainer = gupyPath.split('.').find(part => 
        containerList.some(c => c.toLowerCase() === part.toLowerCase())
      );
      const clientContainer = clientPath.split('.').find(part => 
        containerList.some(c => c.toLowerCase() === part.toLowerCase())
      );
      
      if (gupyContainer && clientContainer) {
        // Se estão no mesmo tipo de container, aumenta a confiança
        for (const [patternName, variations] of Object.entries(patterns.patterns)) {
          const variationList = variations as string[];
          const gupyInPattern = variationList.some(v => gupyField.includes(v.toLowerCase()));
          const clientInPattern = variationList.some(v => clientField.includes(v.toLowerCase()));
          
          if (gupyInPattern && clientInPattern) {
            return patterns.confidence_rules.hierarchical_match;
          }
        }
      }
    }

    // Match parcial (substring)
    if (gupyField.includes(clientField) || clientField.includes(gupyField)) {
      return patterns.confidence_rules.partial_match;
    }

    return 0;
  }

  /**
   * Gera explicação do mapeamento
   */
  private generateReasoning(gupyPath: string, clientPath: string, confidence: number): string {
    const gupyField = gupyPath.split('.').pop() || gupyPath;
    const clientField = clientPath.split('.').pop() || clientPath;

    if (confidence >= 95) {
      return `Match semântico forte: "${gupyField}" → "${clientField}"`;
    } else if (confidence >= 85) {
      return `Match semântico: "${gupyField}" → "${clientField}" (padrão reconhecido)`;
    } else if (confidence >= 80) {
      return `Match hierárquico: "${gupyPath}" → "${clientPath}" (mesmo contexto)`;
    } else {
      return `Match parcial: "${gupyField}" → "${clientField}" (similaridade detectada)`;
    }
  }

  /**
   * Gera mapeamentos usando Gemini 2.0 Flash - Single Shot para todos os campos
   */
  private async generateGeminiMappings(
    gupySchema: any,
    gupyExamplePayload: any,
    clientSchema: any,
    semanticPatterns: any
  ): Promise<MappingConnection[]> {
    try {
      const clientFieldCount = this.countFields(clientSchema);
      console.log(`🚀 Gemini 2.0 Flash - Processando TODOS os ${clientFieldCount} campos em uma única chamada!`);
      
      // Com Gemini 2.0 Flash (1M tokens input), processamos tudo de uma vez
      const prompt = this.buildComprehensivePrompt(gupySchema, gupyExamplePayload, clientSchema, semanticPatterns);
      const response = await this.callGeminiAPI(prompt);
      
      // Parse da resposta do Gemini
      const mappingsData = JSON.parse(response);
      
      // Converter para formato interno com suporte a transformações
      const mappings: MappingConnection[] = mappingsData.map((mapping: any) => ({
        id: GeminiMappingService.generateId(),
        sourceField: {
          id: GeminiMappingService.generateId(),
          name: mapping.sourceField.name,
          type: mapping.sourceField.type,
          path: mapping.sourceField.path
        },
        targetPath: mapping.targetPath,
        confidence: mapping.confidence,
        reasoning: mapping.reasoning + ' (Gemini 2.0 Flash)',
        aiGenerated: true,
        transformation: mapping.transformation || undefined
      }));

      console.log(`✅ Gemini 2.0 Flash gerou ${mappings.length} mapeamentos!`);
      return mappings;
    } catch (error) {
      console.error('Erro no Gemini 2.0 Flash:', error);
      throw error;
    }
  }

  /**
   * Processa payloads grandes em lotes menores
   */
  private async processLargeMappings(
    gupySchema: any,
    gupyExamplePayload: any,
    clientSchema: any,
    semanticPatterns: any
  ): Promise<MappingConnection[]> {
    const allMappings: MappingConnection[] = [];
    
    // Dividir o schema do cliente em grupos por categoria
    const categorizedSchema = this.categorizeClientSchema(clientSchema);
    
    // Processar cada categoria separadamente
    for (const [category, categorySchema] of Object.entries(categorizedSchema)) {
      console.log(`🤖 Processando categoria: ${category}`);
      
      try {
        const prompt = this.buildGeminiPrompt(gupySchema, gupyExamplePayload, categorySchema, semanticPatterns);
        const response = await this.callGeminiAPI(prompt);
        const mappingsData = JSON.parse(response);
        
        const categoryMappings: MappingConnection[] = mappingsData.map((mapping: any) => ({
          id: GeminiMappingService.generateId(),
          sourceField: {
            id: GeminiMappingService.generateId(),
            name: mapping.sourceField.name,
            type: mapping.sourceField.type,
            path: mapping.sourceField.path
          },
          targetPath: mapping.targetPath,
          confidence: mapping.confidence,
          reasoning: mapping.reasoning + ` (Gemini AI - ${category})`,
          aiGenerated: true
        }));
        
        allMappings.push(...categoryMappings);
        
        // Pequeno delay entre chamadas para evitar rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
        
      } catch (error) {
        console.warn(`⚠️ Erro ao processar categoria ${category}:`, error);
        // Continuar com outras categorias mesmo se uma falhar
      }
    }
    
    // Remover duplicatas e ordenar por confiança
    return this.deduplicateAndSort(allMappings);
  }

  /**
   * Categoriza o schema do cliente em grupos lógicos
   */
  private categorizeClientSchema(clientSchema: any): Record<string, any> {
    const categories: Record<string, any> = {
      personal: {},
      employment: {},
      documents: {},
      contact: {},
      relationships: {},
      other: {}
    };
    
    for (const [key, value] of Object.entries(clientSchema)) {
      const lowerKey = key.toLowerCase();
      
      if (lowerKey.includes('person') || lowerKey.includes('user') || lowerKey.includes('individual')) {
        categories.personal[key] = value;
      } else if (lowerKey.includes('emp') || lowerKey.includes('job') || lowerKey.includes('work') || lowerKey.includes('pay')) {
        categories.employment[key] = value;
      } else if (lowerKey.includes('permit') || lowerKey.includes('document') || lowerKey.includes('id') || lowerKey.includes('national')) {
        categories.documents[key] = value;
      } else if (lowerKey.includes('email') || lowerKey.includes('phone') || lowerKey.includes('address')) {
        categories.contact[key] = value;
      } else if (lowerKey.includes('relationship') || lowerKey.includes('family') || lowerKey.includes('dependent')) {
        categories.relationships[key] = value;
      } else {
        categories.other[key] = value;
      }
    }
    
    // Remover categorias vazias
    return Object.fromEntries(
      Object.entries(categories).filter(([_, value]) => Object.keys(value).length > 0)
    );
  }

  /**
   * Remove duplicatas e ordena mapeamentos
   */
  private deduplicateAndSort(mappings: MappingConnection[]): MappingConnection[] {
    // Remover duplicatas baseado no sourceField.path
    const uniqueMappings = mappings.filter((mapping, index, arr) => 
      arr.findIndex(m => m.sourceField.path === mapping.sourceField.path) === index
    );
    
    // Ordenar por confiança (maior primeiro)
    return uniqueMappings.sort((a, b) => (b.confidence || 0) - (a.confidence || 0));
  }

  /**
   * Integração com Gemini API
   */
  private async callGeminiAPI(prompt: string): Promise<string> {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY não configurada');
    }

    try {
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Atualizado para Gemini 2.0 Flash - capacidade massiva de 1M tokens input
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
      
      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();
      
      // Extrair JSON da resposta (remover markdown se houver)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return jsonMatch[0];
      }
      
      return text;
    } catch (error) {
      console.error('Erro na chamada do Gemini API:', error);
      throw new Error(`Falha na API do Gemini: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  }

  /**
   * Constrói prompt comprehensivo para Gemini 2.0 Flash - Single Shot
   */
  private buildComprehensivePrompt(gupySchema: any, gupyExamplePayload: any, clientSchema: any, patterns: any): string {
    const isPayload = this.hasConcreteValues(clientSchema);
    const clientFieldCount = this.countFields(clientSchema);
    
    return `
🚀 GEMINI 2.0 FLASH - MAPEAMENTO COMPLETO DE ${clientFieldCount} CAMPOS

CONTEXTO COMPLETO:

GUPY SCHEMA COMPLETO (origem - sempre fixo - USAR APENAS ESTES CAMPOS):
${JSON.stringify(gupySchema.schema, null, 2)}

GUPY PAYLOAD DE EXEMPLO (contexto dos valores reais - USAR APENAS ESTES CAMPOS):
${JSON.stringify(gupyExamplePayload, null, 2)}

⚠️ IMPORTANTE: Use APENAS os campos listados acima. NÃO invente campos como "customString26" ou similares.

CLIENTE ${isPayload ? 'PAYLOAD COMPLETO' : 'SCHEMA COMPLETO'} (destino - ${clientFieldCount} campos):
${JSON.stringify(clientSchema, null, 2)}

PADRÕES SEMÂNTICOS COMPLETOS:
${JSON.stringify(patterns, null, 2)}

MISSÃO: Mapear TODOS os ${clientFieldCount} campos possíveis com:
✅ Confiança ≥70% para mapeamentos simples
✅ Confiança ≥80% para aplicar transformações automáticas
✅ Transformações automáticas detectadas para boa confiança
✅ Reasoning detalhado para cada mapeamento
✅ Cobertura máxima - não deixe campos para trás!

TRANSFORMAÇÕES AUTOMÁTICAS A DETECTAR:
1. 📄 Formatação Documentos: "269.622.778-06" → "26962277806" (remover pontos/hífens)
2. 👥 Concatenação: nome + sobrenome → nome_completo
3. 📱 Divisão Telefone: "+5511999990000" → areaCode:"55" + phoneNumber:"11999990000"
4. 🔢 Conversão Tipos: "1250.50" → 1250.50 (string para number)
5. 📅 Formatação Datas: "2025-06-30" → "30/06/2025"
6. 🔤 Normalização: "ERICA" → "Erica" (case normalization)
7. 🏢 Códigos: "ACME" → "1000" (nome para código)

INSTRUÇÕES ESPECIAIS PARA TRANSFORMAÇÕES:
- SEMPRE inclua campo "transformation" quando detectar necessidade
- Compare valores de exemplo: Gupy vs Cliente para identificar padrões
- Exemplo: "25272626207" (Gupy) vs "269.622.778-06" (Cliente) = ambos CPF, mas formatos diferentes
- Exemplo: "John" + "Doe" (Gupy) vs "ERICA BRUGOGNOLLE" (Cliente) = concatenação vs nome completo

INSTRUÇÕES GERAIS:
1. 🔍 Compare valores reais dos exemplos para identificar correspondências
2. 📊 Use contexto semântico: "John"→"ERICA" = ambos são nomes de pessoa
3. 🎯 Priorize campos essenciais: nomes, emails, documentos, telefones, endereços
4. 🧠 ${isPayload ? 'Analise VALORES concretos primeiro, depois nomes dos campos' : 'Analise nomes dos campos e tipos de dados'}
5. 📈 Atribua confiança baseada na similaridade semântica e contextual
6. 💡 Inclua reasoning explicando o mapeamento e transformação
7. 🎯 Meta: 100-150+ mapeamentos para payload de ${clientFieldCount} campos

FORMATO DE RESPOSTA (JSON válido - TODOS os mapeamentos encontrados):
[
  {
    "sourceField": {
      "name": "identificationDocument",
      "path": "data.candidate.identificationDocument", 
      "type": "string"
    },
    "targetPath": "PerNationalId.nationalId",
    "confidence": 95,
    "reasoning": "CPF: '25272626207' (Gupy) vs '269.622.778-06' (Cliente) - ambos documentos de identificação brasileiros",
    "transformation": {
      "type": "format_document",
      "operation": "removeFormatting",
      "pattern": "cpf",
      "preview": {
        "input": "269.622.778-06",
        "output": "26962277806"
      }
    }
  },
  {
    "sourceField": {
      "name": "name",
      "path": "data.candidate.name",
      "type": "string"
    },
    "targetPath": "PerPersonal.firstName", 
    "confidence": 90,
    "reasoning": "Nome: 'John' (Gupy) vs 'ERICA' (Cliente) - ambos são primeiros nomes de pessoa"
  }
]

IMPORTANTE: Retorne TODOS os mapeamentos possíveis, não limite a quantidade!
`;
  }

  /**
   * Constrói prompt para Gemini (método legado para compatibilidade)
   */
  private buildGeminiPrompt(gupySchema: any, gupyExamplePayload: any, clientSchema: any, patterns: any): string {
    const isPayload = this.hasConcreteValues(clientSchema);
    
    // Otimizar payload da Gupy - apenas campos essenciais para contexto
    const optimizedGupyPayload = this.optimizeGupyPayloadForPrompt(gupyExamplePayload);
    
    // Contar campos do cliente para ajustar estratégia
    const clientFieldCount = this.countFields(clientSchema);
    const isLargePayload = clientFieldCount > 50;
    
    return `
Especialista em mapeamento Gupy. ${isLargePayload ? 'PAYLOAD GRANDE DETECTADO - PRIORIZE OS MELHORES MAPEAMENTOS.' : ''}

GUPY SCHEMA (origem):
${JSON.stringify(this.getEssentialGupyFields(gupySchema.schema), null, 2)}

GUPY EXEMPLO (contexto):
${JSON.stringify(optimizedGupyPayload, null, 2)}

CLIENTE ${isPayload ? 'PAYLOAD' : 'SCHEMA'} (destino):
${JSON.stringify(clientSchema, null, 2)}

PADRÕES:
${JSON.stringify(this.getEssentialPatterns(patterns), null, 2)}

INSTRUÇÕES:
1. Compare valores reais: "John"→"ERICA", "25272626207"→"269.622.778-06" (ambos CPF)
2. ${isLargePayload ? 'FOQUE nos 20-30 MELHORES mapeamentos com confiança ≥80' : 'Encontre todos os mapeamentos com confiança ≥70'}
3. Priorize: nomes, emails, documentos, telefones, endereços, dados pessoais
4. Use contexto dos valores para identificar correspondências
5. ${isPayload ? 'Analise VALORES concretos primeiro, depois nomes dos campos' : 'Analise nomes dos campos e tipos'}

RESPOSTA JSON (${isLargePayload ? 'máximo 30 mapeamentos' : 'todos os mapeamentos'}):
[{"sourceField":{"name":"campo","path":"caminho","tipo":"tipo"},"targetPath":"destino","confidence":95,"reasoning":"explicação"}]
`;
  }

  /**
   * Otimiza payload da Gupy para reduzir tamanho do prompt
   */
  private optimizeGupyPayloadForPrompt(payload: any): any {
    return {
      companyName: payload.companyName,
      data: {
        candidate: {
          name: payload.data?.candidate?.name,
          lastName: payload.data?.candidate?.lastName,
          email: payload.data?.candidate?.email,
          identificationDocument: payload.data?.candidate?.identificationDocument,
          mobileNumber: payload.data?.candidate?.mobileNumber,
          addressCity: payload.data?.candidate?.addressCity,
          addressState: payload.data?.candidate?.addressState,
          addressZipCode: payload.data?.candidate?.addressZipCode
        },
        job: {
          name: payload.data?.job?.name,
          department: payload.data?.job?.department,
          role: payload.data?.job?.role
        },
        admission: {
          position: {
            salary: payload.data?.admission?.position?.salary,
            department: payload.data?.admission?.position?.department,
            role: payload.data?.admission?.position?.role
          }
        }
      }
    };
  }

  /**
   * Extrai campos essenciais do schema Gupy
   */
  private getEssentialGupyFields(schema: any): any {
    const essential: any = {};
    
    // Campos mais importantes para mapeamento
    const importantPaths = [
      'companyName', 'data.candidate.name', 'data.candidate.lastName', 
      'data.candidate.email', 'data.candidate.identificationDocument',
      'data.candidate.mobileNumber', 'data.candidate.addressCity',
      'data.candidate.addressState', 'data.candidate.addressZipCode',
      'data.job.name', 'data.job.department.name', 'data.job.role.name',
      'data.admission.position.salary.value', 'data.admission.position.department.name',
      'data.admission.position.role.name'
    ];
    
    for (const path of importantPaths) {
      const value = this.getValueByPath(schema, path);
      if (value) {
        this.setValueByPath(essential, path, value);
      }
    }
    
    return essential;
  }

  /**
   * Extrai padrões essenciais
   */
  private getEssentialPatterns(patterns: any): any {
    return {
      patterns: {
        name_variations: patterns.patterns?.name_variations || [],
        email_variations: patterns.patterns?.email_variations || [],
        document_variations: patterns.patterns?.document_variations || [],
        phone_variations: patterns.patterns?.phone_variations || [],
        company_variations: patterns.patterns?.company_variations || []
      },
      hierarchical_patterns: {
        person_containers: patterns.hierarchical_patterns?.person_containers || [],
        company_containers: patterns.hierarchical_patterns?.company_containers || []
      }
    };
  }

  /**
   * Conta o número total de campos em um objeto
   */
  private countFields(obj: any, depth = 0): number {
    if (depth > 10 || typeof obj !== 'object' || obj === null) return 0;
    
    let count = 0;
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        count += this.countFields(value, depth + 1);
      } else {
        count += 1;
      }
    }
    return count;
  }

  /**
   * Obtém valor por caminho
   */
  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Define valor por caminho
   */
  private setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Verifica se o objeto tem valores concretos (é um payload)
   */
  private hasConcreteValues(obj: any): boolean {
    if (typeof obj !== 'object' || obj === null) {
      return typeof obj === 'string' && obj !== 'string' && obj !== 'number' && obj !== 'boolean';
    }

    for (const value of Object.values(obj)) {
      if (typeof value === 'string' && !['string', 'number', 'boolean', 'object', 'array'].includes(value)) {
        return true;
      }
      if (typeof value === 'object' && this.hasConcreteValues(value)) {
        return true;
      }
    }
    return false;
  }
}
