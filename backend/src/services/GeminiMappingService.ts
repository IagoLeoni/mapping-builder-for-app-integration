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
   * Gera mapeamentos usando equiparação de payloads - VERSÃO ESCALÁVEL SEM LIMITAÇÕES
   */
  async generatePayloadComparisonMappings(gupyPayload: any, systemPayload: any): Promise<MappingConnection[]> {
    try {
      console.log('🚀 Iniciando equiparação de payloads ESCALÁVEL...');
      
      // Contar campos totais para processamento adaptativo
      const totalGupyFields = this.countFields(gupyPayload);
      const totalSystemFields = this.countFields(systemPayload);
      
      console.log(`📊 Análise inicial: ${totalGupyFields} campos Gupy, ${totalSystemFields} campos Sistema`);
      
      // Usar processamento adaptativo em lotes para payloads grandes
      if (totalSystemFields > 100 || totalGupyFields > 100) {
        console.log('🔄 Payload grande detectado - usando processamento adaptativo em lotes');
        return await this.processLargePayloadComparison(gupyPayload, systemPayload);
      }
      
      // Para payloads menores, usar método direto otimizado
      console.log('⚡ Payload médio - usando processamento direto otimizado');
      return await this.processSinglePayloadComparison(gupyPayload, systemPayload);
    } catch (error) {
      console.error('❌ Erro na equiparação de payloads:', error);
      throw error;
    }
  }

  /**
   * Processamento adaptativo em lotes para payloads grandes (NOVO)
   */
  private async processLargePayloadComparison(gupyPayload: any, systemPayload: any): Promise<MappingConnection[]> {
    const allMappings: MappingConnection[] = [];
    
    // Dividir payloads em seções lógicas
    const gupyFields = this.extractAllFieldPaths(gupyPayload);
    const systemFields = this.extractAllFieldPaths(systemPayload);
    
    console.log(`🔍 Extraídos ${gupyFields.length} campos Gupy e ${systemFields.length} campos Sistema`);
    
    // Configuração adaptativa
    let batchSize = Math.min(60, Math.floor(systemFields.length / 4)); // Começa com lotes de ~25% do total
    let processedFields = 0;
    let batchNumber = 1;
    let consecutiveSuccesses = 0;
    
    while (processedFields < systemFields.length) {
      const remainingFields = systemFields.length - processedFields;
      const currentBatchSize = Math.min(batchSize, remainingFields);
      
      console.log(`\n🔄 Lote ${batchNumber}: Processando campos ${processedFields + 1}-${processedFields + currentBatchSize} de ${systemFields.length}`);
      console.log(`📦 Tamanho do lote atual: ${currentBatchSize} campos`);
      
      try {
        // Criar sub-payloads para o lote atual
        const systemBatch = this.createFieldBatch(systemPayload, systemFields.slice(processedFields, processedFields + currentBatchSize));
        
        const prompt = this.buildOptimizedPayloadComparisonPrompt(gupyPayload, systemBatch, batchNumber, currentBatchSize);
        
        console.log(`📡 Enviando lote ${batchNumber} para Gemini (${prompt.length} caracteres)`);
        const startTime = Date.now();
        
        const response = await this.callGeminiAPI(prompt);
        
        const endTime = Date.now();
        console.log(`⏱️ Lote ${batchNumber} processado em ${endTime - startTime}ms`);
        console.log(`📄 Resposta recebida: ${response.length} caracteres`);
        
        // Parse com recuperação robusta
        const batchMappings = await this.parseResponseWithRecovery(response, batchNumber);
        
        if (batchMappings && batchMappings.length > 0) {
          allMappings.push(...batchMappings);
          processedFields += currentBatchSize;
          consecutiveSuccesses++;
          
          console.log(`✅ Lote ${batchNumber} sucesso: ${batchMappings.length} mapeamentos adicionados`);
          console.log(`📊 Progresso: ${allMappings.length} mapeamentos totais, ${processedFields}/${systemFields.length} campos processados (${Math.round(processedFields/systemFields.length*100)}%)`);
          
          // Otimização adaptativa: aumentar lote se está funcionando bem
          if (consecutiveSuccesses >= 2 && batchSize < 80) {
            batchSize = Math.min(batchSize + 10, 80);
            console.log(`🚀 Otimização: Aumentando lote para ${batchSize} campos`);
          }
        } else {
          throw new Error('Nenhum mapeamento válido no lote');
        }
        
        batchNumber++;
        
        // Pequeno delay para evitar rate limiting
        await this.sleep(500);
        
      } catch (error) {
        console.warn(`⚠️ Erro no lote ${batchNumber}:`, error);
        consecutiveSuccesses = 0;
        
        // Estratégia de recuperação: reduzir tamanho do lote
        if (batchSize > 20) {
          batchSize = Math.max(Math.floor(batchSize * 0.7), 20);
          console.log(`🔧 Reduzindo lote para ${batchSize} campos e tentando novamente...`);
          // Não incrementa processedFields - retry do mesmo lote
        } else {
          // Se mesmo com lote pequeno falhar, pular estes campos
          console.error(`❌ Falha crítica no lote ${batchNumber}, pulando ${currentBatchSize} campos`);
          processedFields += currentBatchSize;
          batchNumber++;
        }
      }
    }
    
    console.log(`\n🎉 Processamento adaptativo concluído!`);
    console.log(`📈 Resultados finais: ${allMappings.length} mapeamentos de ${systemFields.length} campos (${Math.round(allMappings.length/systemFields.length*100)}% cobertura)`);
    
    return this.deduplicateAndSort(allMappings);
  }

  /**
   * Processamento direto otimizado para payloads médios (NOVO)
   */
  private async processSinglePayloadComparison(gupyPayload: any, systemPayload: any): Promise<MappingConnection[]> {
    console.log('📡 Enviando payload completo para análise direta...');
    
    const prompt = this.buildOptimizedPayloadComparisonPrompt(gupyPayload, systemPayload, 1, this.countFields(systemPayload));
    const response = await this.callGeminiAPI(prompt);
    
    console.log(`📄 Resposta recebida: ${response.length} caracteres`);
    
    const mappings = await this.parseResponseWithRecovery(response, 1);
    
    console.log(`✅ Processamento direto gerou ${mappings.length} mapeamentos!`);
    return mappings;
  }

  /**
   * Constrói prompt especializado para equiparação de payloads
   */
  private buildPayloadComparisonPrompt(gupyPayload: any, systemPayload: any): string {
    return `
🎯 EQUIPARAÇÃO DE PAYLOADS - ANÁLISE COMPARATIVA

PAYLOAD GUPY (origem - dados reais):
${JSON.stringify(gupyPayload, null, 2)}

PAYLOAD SISTEMA (destino - mesmos dados transformados):
${JSON.stringify(systemPayload, null, 2)}

MISSÃO: Compare os payloads lado a lado e identifique EXATAMENTE como cada campo da Gupy se transformou no Sistema.

EXEMPLOS DE DETECÇÃO AUTOMÁTICA:
1. 📄 Formatação de Documentos:
   Gupy: "123.456.789-00" → Sistema: "12345678900" 
   = format_document (remove pontos e hífen)

2. 👤 Divisão de Nomes:
   Gupy: "João Silva" → Sistema: "firstName": "JOÃO", "lastName": "SILVA"
   = name_split + normalize (upper_case)

3. 📱 Divisão de Telefone:
   Gupy: "+5511999998888" → Sistema: "areaCode": "11", "number": "999998888"
   = phone_split (extrai partes)

4. 🗺️ Mapeamento de Códigos:
   Gupy: "Brasil" → Sistema: "BRA"
   = country_code (ISO conversion)

5. ⚧️ Códigos de Gênero:
   Gupy: "Male" → Sistema: "M"
   = gender_code (abreviação)

6. 📅 Formatação de Datas:
   Gupy: "2024-01-15T00:00:00.000Z" → Sistema: "2024-01-15"
   = format_date (ISO to date)

INSTRUÇÕES ESPECIAIS:
1. 🔍 Compare VALORES EXATOS: identifique os mesmos dados em formatos diferentes
2. 🎯 Confiança 99%: quando são claramente os mesmos dados transformados
3. 🔄 Detecte Transformação: analise que tipo de transformação foi aplicada
4. 💡 Reasoning Detalhado: explique como você identificou a correspondência

IMPORTANTE: 
- Use APENAS campos que existem nos payloads fornecidos
- Priorize correspondências com mesmos valores base
- Detecte padrões de transformação pelos exemplos dos valores
- Inclua transformation quando detectar conversão/formatação

FORMATO DE RESPOSTA (JSON válido - todos os mapeamentos detectados):
[
  {
    "sourceField": {
      "name": "identificationDocument",
      "path": "data.candidate.identificationDocument",
      "type": "string"
    },
    "targetPath": "employee.documentNumber",
    "confidence": 99,
    "reasoning": "CPF: '123.456.789-00' (Gupy) vs '12345678900' (Sistema) - mesmos dados, formatação removida",
    "transformation": {
      "type": "format_document",
      "operation": "remove_formatting",
      "pattern": "cpf",
      "preview": {
        "input": "123.456.789-00",
        "output": "12345678900"
      }
    }
  },
  {
    "sourceField": {
      "name": "name",
      "path": "data.candidate.name",
      "type": "string"
    },
    "targetPath": "employee.firstName",
    "confidence": 99,
    "reasoning": "Nome: 'João Silva' (Gupy) vs 'JOÃO' (Sistema) - primeiro nome extraído e convertido para maiúscula",
    "transformation": {
      "type": "name_split",
      "operation": "split_first_name",
      "preview": {
        "input": "João Silva",
        "output": "JOÃO"
      }
    }
  }
]

RETORNE TODOS OS MAPEAMENTOS DETECTADOS pela comparação dos valores!
`;
  }

  /**
   * Recupera JSON válido de resposta truncada do Gemini
   */
  private recoverTruncatedJson(truncatedJson: string): any[] {
    try {
      console.log('🔧 Tentando recuperar JSON truncado...');
      console.log('🔧 Tamanho da resposta:', truncatedJson.length, 'caracteres');
      
      // Estratégia 1: Tentar remover último objeto incompleto e fechar o array
      let cleanJson = truncatedJson.trim();
      
      if (cleanJson.startsWith('[')) {
        // Encontrar a última vírgula válida
        let lastCommaIndex = -1;
        let braceCount = 0;
        let inString = false;
        let escape = false;
        
        for (let i = cleanJson.length - 1; i >= 0; i--) {
          const char = cleanJson[i];
          
          if (escape) {
            escape = false;
            continue;
          }
          
          if (char === '\\') {
            escape = true;
            continue;
          }
          
          if (char === '"' && !escape) {
            inString = !inString;
            continue;
          }
          
          if (!inString) {
            if (char === '}') {
              braceCount++;
            } else if (char === '{') {
              braceCount--;
            } else if (char === ',' && braceCount === 0) {
              lastCommaIndex = i;
              break;
            }
          }
        }
        
        // Se encontrou uma vírgula válida, cortar até ela e fechar o array
        if (lastCommaIndex > 0) {
          const recoveredJson = cleanJson.substring(0, lastCommaIndex) + ']';
          console.log('🔧 Tentando parsing com JSON cortado na última vírgula válida...');
          
          try {
            const parsed = JSON.parse(recoveredJson);
            if (Array.isArray(parsed) && parsed.length > 0) {
              console.log(`✅ Recuperação bem-sucedida! ${parsed.length} objetos recuperados`);
              return parsed;
            }
          } catch (e) {
            const errorMessage = e instanceof Error ? e.message : 'Erro desconhecido';
            console.warn('⚠️ Falha no parsing do JSON cortado:', errorMessage);
          }
        }
        
        // Estratégia 2: Parser objeto por objeto
        console.log('🔧 Tentando recuperação objeto por objeto...');
        return this.parseObjectByObject(cleanJson);
      }
      
      return [];
    } catch (error) {
      console.warn('⚠️ Falha na recuperação de JSON:', error);
      return [];
    }
  }

  /**
   * Parser objeto por objeto para recuperação granular
   */
  private parseObjectByObject(jsonString: string): any[] {
    const validObjects: any[] = [];
    let currentObject = '';
    let braceCount = 0;
    let inString = false;
    let escape = false;
    let arrayStarted = false;
    
    for (let i = 0; i < jsonString.length; i++) {
      const char = jsonString[i];
      
      if (char === '[' && !arrayStarted && braceCount === 0 && !inString) {
        arrayStarted = true;
        continue;
      }
      
      if (!arrayStarted) continue;
      
      if (escape) {
        escape = false;
        currentObject += char;
        continue;
      }
      
      if (char === '\\' && inString) {
        escape = true;
        currentObject += char;
        continue;
      }
      
      if (char === '"' && !escape) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') {
          braceCount++;
        } else if (char === '}') {
          braceCount--;
        }
      }
      
      currentObject += char;
      
      // Se completou um objeto
      if (braceCount === 0 && currentObject.trim().startsWith('{') && currentObject.trim().endsWith('}')) {
        try {
          const parsed = JSON.parse(currentObject.trim());
          if (parsed.sourceField && parsed.targetPath) {
            validObjects.push(parsed);
            console.log(`✅ Objeto ${validObjects.length} recuperado: ${parsed.sourceField.name} → ${parsed.targetPath}`);
          }
        } catch (e) {
          console.warn('⚠️ Objeto inválido ignorado:', currentObject.substring(0, 50) + '...');
        }
        
        currentObject = '';
        
        // Pular vírgula e espaços
        while (i + 1 < jsonString.length && [',', ' ', '\n', '\t'].includes(jsonString[i + 1])) {
          i++;
        }
      }
    }
    
    console.log(`🔧 Parser granular recuperou ${validObjects.length} objetos válidos`);
    return validObjects;
  }

  /**
   * Extrai todos os caminhos de campos de um payload (NOVO)
   */
  private extractAllFieldPaths(obj: any, prefix = '', paths: string[] = []): string[] {
    if (typeof obj !== 'object' || obj === null) {
      return paths;
    }

    for (const [key, value] of Object.entries(obj)) {
      const currentPath = prefix ? `${prefix}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursão para objetos aninhados
        this.extractAllFieldPaths(value, currentPath, paths);
      } else {
        // Campo folha - adicionar aos paths
        paths.push(currentPath);
      }
    }
    
    return paths;
  }

  /**
   * Cria um sub-payload contendo apenas os campos especificados (NOVO)
   */
  private createFieldBatch(originalPayload: any, fieldPaths: string[]): any {
    const batchPayload: any = {};
    
    for (const fieldPath of fieldPaths) {
      const value = this.getValueByPath(originalPayload, fieldPath);
      if (value !== undefined) {
        this.setValueByPath(batchPayload, fieldPath, value);
      }
    }
    
    return batchPayload;
  }

  /**
   * Constrói prompt otimizado para equiparação com menos verbosidade (NOVO)
   */
  private buildOptimizedPayloadComparisonPrompt(gupyPayload: any, systemPayload: any, batchNumber: number, fieldCount: number): string {
    return `
🎯 EQUIPARAÇÃO LOTE ${batchNumber} - ${fieldCount} CAMPOS

GUPY (origem):
${JSON.stringify(gupyPayload, null, 1)}

SISTEMA (destino):
${JSON.stringify(systemPayload, null, 1)}

MISSÃO: Compare e identifique correspondências entre campos.

TRANSFORMAÇÕES COMUNS:
• 📄 format_document: Remove formatação (CPF, telefone)
• 👤 name_split: Divide nomes em partes  
• 📱 phone_split: Extrai área/número
• 🗺️ country_code: Converte país para código
• 🔤 normalize: Normaliza case/acentos

RESPOSTA JSON - TODOS OS MAPEAMENTOS:
[{"sourceField":{"name":"campo","path":"caminho","type":"string"},"targetPath":"destino","confidence":99,"reasoning":"explicação","transformation":{"type":"tipo","operation":"op","preview":{"input":"entrada","output":"saída"}}}]

IMPORTANTE: Inclua TODOS os mapeamentos detectados, não limite quantidade!
`;
  }

  /**
   * Parse de resposta com recuperação robusta (NOVO)
   */
  private async parseResponseWithRecovery(response: string, batchNumber: number): Promise<MappingConnection[]> {
    if (!response || response.trim() === '') {
      throw new Error(`Resposta vazia do Gemini para lote ${batchNumber}`);
    }
    
    let mappingsData: any[];
    
    try {
      // Tentar parse direto primeiro
      mappingsData = JSON.parse(response);
      console.log(`✅ Parse direto bem-sucedido: ${mappingsData.length} objetos`);
    } catch (parseError) {
      console.warn(`⚠️ Lote ${batchNumber} - JSON incompleto detectado, tentando recuperar...`);
      
      // Usar sistema de recuperação robusto
      const recovered = this.recoverTruncatedJson(response);
      if (recovered && recovered.length > 0) {
        mappingsData = recovered;
        console.log(`✅ Lote ${batchNumber} - Recuperados ${recovered.length} mapeamentos`);
      } else {
        throw new Error(`Lote ${batchNumber} - JSON inválido e não foi possível recuperar`);
      }
    }
    
    // Converter para formato interno
    const mappings: MappingConnection[] = mappingsData.map((mapping: any) => ({
      id: GeminiMappingService.generateId(),
      sourceField: {
        id: GeminiMappingService.generateId(),
        name: mapping.sourceField.name,
        type: mapping.sourceField.type || 'string',
        path: mapping.sourceField.path
      },
      targetPath: mapping.targetPath,
      confidence: mapping.confidence,
      reasoning: mapping.reasoning + ` (Equiparação Lote ${batchNumber})`,
      aiGenerated: true,
      transformation: mapping.transformation || undefined
    }));
    
    return mappings;
  }

  /**
   * Utilitário para delays entre chamadas (NOVO)
   */
  private async sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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

  /**
   * Gera schema assistido por IA baseado em descrição em linguagem natural
   */
  async generateSchemaFromDescription(description: string, targetFormat: string = 'detailed_payload'): Promise<any> {
    try {
      console.log('🤖 Gerando schema com IA a partir da descrição...');
      
      const prompt = this.buildSchemaGenerationPrompt(description, targetFormat);
      const response = await this.callGeminiAPI(prompt);
      
      console.log('🤖 Resposta bruta do Gemini:', response);
      
      // Parse da resposta do Gemini
      let schema;
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          schema = JSON.parse(jsonMatch[0]);
        } else {
          schema = JSON.parse(response);
        }
      } catch (parseError) {
        console.warn('⚠️ Erro no parsing, tentando recuperar JSON...');
        throw new Error(`Falha ao gerar schema: resposta inválida do AI`);
      }
      
      console.log('✅ Schema gerado com sucesso!');
      return schema;
    } catch (error) {
      console.error('Erro na geração de schema:', error);
      throw error;
    }
  }

  /**
   * Constrói prompt para geração de schema
   */
  private buildSchemaGenerationPrompt(description: string, targetFormat: string): string {
    return `
🤖 GERADOR DE SCHEMA - EXPERT EM SISTEMAS HR/ERP

DESCRIÇÃO DO SISTEMA:
${description}

FORMATO DESEJADO: ${targetFormat}

MISSÃO: Gere um schema/payload JSON realista e detalhado baseado na descrição.

INSTRUÇÕES:
1. 📋 Analise a descrição e identifique todos os campos mencionados
2. 🏗️ Crie estrutura hierárquica lógica (pessoa > endereço, empresa > departamento)
3. 📝 Use nomes de campos semânticos e padronizados
4. 💾 Inclua valores de exemplo realistas (não use placeholders genéricos)
5. 🌐 Para sistemas brasileiros, use dados BR (CPF, CEP, estados, etc.)
6. 🔢 Varie tipos de dados (string, number, boolean, objetos, arrays)

PADRÕES DE NOMENCLATURA:
- 👤 Pessoa: firstName, lastName, fullName, email, phone
- 🏢 Empresa: companyName, department, position, jobTitle
- 📍 Endereço: street, number, city, state, zipCode, country
- 📄 Documentos: documentNumber, taxId, nationalId
- 💰 Financeiro: salary, baseSalary, currency, benefits

EXEMPLO DE ESTRUTURA PARA HR:
{
  "employee": {
    "personalInfo": {
      "firstName": "Ana",
      "lastName": "Silva", 
      "fullName": "Ana Silva",
      "email": "ana.silva@empresa.com",
      "phone": "(11) 99999-8888",
      "documentNumber": "12345678900"
    },
    "address": {
      "street": "Rua das Flores",
      "number": "123",
      "city": "São Paulo",
      "state": "SP",
      "zipCode": "01234-567",
      "country": "Brasil"
    },
    "employment": {
      "jobTitle": "Analista de Marketing",
      "department": "Marketing",
      "startDate": "2023-01-15",
      "salary": 5500.00,
      "currency": "BRL",
      "status": "active"
    }
  }
}

IMPORTANTE:
- Use dados brasileiros realistas quando apropriado
- Evite campos genéricos como "field1", "customString", etc.
- Mantenha consistência na nomenclatura
- Inclua 15-25 campos no total para um schema rico
- Para sistemas internacionais, adapte os dados adequadamente

RETORNE APENAS O JSON DO SCHEMA (sem markdown ou explicações):
`;
  }
}
