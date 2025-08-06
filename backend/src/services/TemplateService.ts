import * as fs from 'fs';
import * as path from 'path';
import { TransformationEngine, TransformationConfig } from './TransformationEngine';

export class TemplateService {
  private static templatesPath = path.join(__dirname, '../../../templates');

  // Carregar template de arquivo
  private static loadTemplate(templatePath: string): string {
    try {
      const fullPath = path.join(this.templatesPath, templatePath);
      return fs.readFileSync(fullPath, 'utf-8');
    } catch (error) {
      console.error(`Error loading template ${templatePath}:`, error);
      throw new Error(`Failed to load template: ${templatePath}`);
    }
  }

  // Substituir placeholders no template
  private static replacePlaceholders(template: string, replacements: Record<string, any>): string {
    let result = template;
    for (const [key, value] of Object.entries(replacements)) {
      const quotedPlaceholder = `"{{${key}}}"`;
      const unquotedPlaceholder = `{{${key}}}`;
      let replacement: string;
      
      if (typeof value === 'string') {
        // Se já é uma string JSON válida (array ou objeto), usar sem aspas
        if (value.startsWith('[') || value.startsWith('{')) {
          replacement = value;
          // Para arrays/objetos, usar o placeholder sem aspas
          result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        } else {
          // Para strings simples, manter as aspas
          replacement = JSON.stringify(value);
          result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
        }
      } else {
        // Para outros tipos (arrays, objetos), serializar como JSON sem aspas extras
        replacement = JSON.stringify(value);
        result = result.replace(new RegExp(quotedPlaceholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replacement);
      }
    }
    return result;
  }

  // Gerar integração com transformações automáticas
  static generateIntegrationWithTransformations(config: {
    integrationName: string;
    customerEmail: string;
    systemEndpoint: string;
    mappings: Array<{
      sourceField: { path: string; type: string; name: string };
      targetPath: string;
      confidence?: number;
      transformation?: TransformationConfig;
    }>;
  }): any {
    // Aplicar transformações automaticamente no systemPayload
    const transformedPayload = this.applyTransformationsToPayload(config.mappings);
    
    return this.generateIntegration({
      integrationName: config.integrationName,
      customerEmail: config.customerEmail,
      systemEndpoint: config.systemEndpoint,
      systemPayload: transformedPayload,
      transformationTasks: this.generateTransformationTasks(config.mappings),
      transformationVariables: []
    });
  }

  // Gerar integração completa (versão hardcoded para evitar problemas de template)
  static generateIntegration(config: {
    integrationName: string;
    customerEmail: string;
    systemEndpoint: string;
    systemPayload: any;
    transformationTasks: any[];
    transformationVariables: any[];
  }): any {
    const timestamp = new Date().toISOString();
    const integrationId = `int-${Date.now()}`;
    const versionId = this.generateUUID();
    
    // Gerar tarefas usando métodos diretos
    const taskConfigs = [
      ...config.transformationTasks,
      this.generateFieldMappingTask(),
      this.generateRestTask(),
      this.generateEmailTaskHardcoded(config.customerEmail),
      this.generateSuccessOutputTaskHardcoded()
    ];

    // Determinar tarefas iniciais
    const startTasks = config.transformationTasks.length > 0 
      ? config.transformationTasks.map(task => ({ "taskId": task.taskId }))
      : [{ "taskId": "1" }];

    // Retornar JSON direto sem usar templates
    return {
      "name": `projects/160372229474/locations/us-central1/integrations/${integrationId}/versions/${versionId}`,
      "updateTime": timestamp,
      "createTime": timestamp,
      "triggerConfigs": [{
        "label": "API Trigger",
        "startTasks": startTasks,
        "properties": {
          "Trigger name": `${integrationId}_API_1`
        },
        "triggerType": "API",
        "triggerNumber": "2",
        "triggerId": `api_trigger/${integrationId}_API_1`,
        "position": { "x": 140, "y": 45 },
        "inputVariables": {},
        "outputVariables": {
          "names": ["Output"]
        }
      }],
      "taskConfigs": taskConfigs,
      "integrationParameters": [
        {
          "key": "Output",
          "dataType": "JSON_VALUE",
          "defaultValue": {
            "jsonValue": JSON.stringify({ "Status": "Success" })
          },
          "displayName": "Output",
          "inputOutputType": "OUT"
        },
        {
          "key": "systemPayload",
          "dataType": "JSON_VALUE",
          "defaultValue": {},
          "displayName": "systemPayload"
        },
        {
          "key": "customerEmail",
          "dataType": "STRING_VALUE",
          "defaultValue": {},
          "displayName": "customerEmail"
        },
        {
          "key": "systemEndpoint",
          "dataType": "STRING_VALUE",
          "defaultValue": {},
          "displayName": "systemEndpoint"
        },
        {
          "key": "gupyPayload",
          "dataType": "JSON_VALUE",
          "defaultValue": {
            "jsonValue": JSON.stringify({
              "companyName": "ACME",
              "id": "sample-id",
              "event": "pre-employee.moved",
              "date": "2019-06-19T23:48:46.952Z",
              "data": {
                "candidate": {
                  "name": "John",
                  "lastName": "Doe",
                  "email": "john.doe@example.com"
                }
              }
            })
          },
          "displayName": "gupyPayload"
        },
        ...config.transformationVariables
      ],
      "errorCatcherConfigs": [],
      "integrationConfigParameters": [
        {
          "parameter": {
            "key": "`CONFIG_systemPayload`",
            "dataType": "JSON_VALUE",
            "defaultValue": {
              "jsonValue": JSON.stringify(config.systemPayload)
            },
            "displayName": "`CONFIG_systemPayload`"
          }
        },
        {
          "parameter": {
            "key": "`CONFIG_customerEmail`",
            "dataType": "STRING_VALUE",
            "defaultValue": {
              "stringValue": config.customerEmail || ""
            },
            "displayName": "`CONFIG_customerEmail`"
          }
        },
        {
          "parameter": {
            "key": "`CONFIG_systemEndpoint`",
            "dataType": "STRING_VALUE",
            "defaultValue": {
              "stringValue": config.systemEndpoint || ""
            },
            "displayName": "`CONFIG_systemEndpoint`"
          }
        }
      ]
    };
  }

  // Gerar tarefa de mapeamento de campos
  private static generateFieldMappingTask(): any {
    // Retornar objeto hardcoded para evitar problemas de template
    return {
      "task": "FieldMappingTask",
      "taskId": "1",
      "parameters": {
        "FieldMappingConfigTaskParameterKey": {
          "key": "FieldMappingConfigTaskParameterKey",
          "value": {
            "jsonValue": JSON.stringify({
              "@type": "type.googleapis.com/enterprise.crm.eventbus.proto.FieldMappingConfig",
              "mappedFields": [
                {
                  "inputField": {
                    "fieldType": "JSON_VALUE",
                    "transformExpression": {
                      "initialValue": {
                        "referenceValue": "$`CONFIG_systemPayload`$"
                      },
                      "transformationFunctions": [{
                        "functionType": {
                          "jsonFunction": {
                            "functionName": "RESOLVE_TEMPLATE"
                          }
                        }
                      }]
                    }
                  },
                  "outputField": {
                    "referenceKey": "$systemPayload$",
                    "fieldType": "JSON_VALUE",
                    "cardinality": "OPTIONAL"
                  }
                },
                {
                  "inputField": {
                    "fieldType": "STRING_VALUE",
                    "transformExpression": {
                      "initialValue": {
                        "referenceValue": "$`CONFIG_systemEndpoint`$"
                      }
                    }
                  },
                  "outputField": {
                    "referenceKey": "$systemEndpoint$",
                    "fieldType": "STRING_VALUE",
                    "cardinality": "OPTIONAL"
                  }
                }
              ]
            })
          }
        }
      },
      "nextTasks": [{ "taskId": "2" }],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": "Data Mapping",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "140", "y": "181" }
    };
  }

  // Gerar tarefa REST (versão hardcoded para evitar problemas de parsing)
  private static generateRestTask(): any {
    return {
      "task": "GenericRestV2Task",
      "taskId": "2",
      "parameters": {
        "throwError": {
          "key": "throwError",
          "value": {
            "booleanValue": true
          }
        },
        "responseBody": {
          "key": "responseBody",
          "value": {
            "stringArray": {
              "stringValues": ["$`Task_2_responseBody`$"]
            }
          }
        },
        "disableSSLValidation": {
          "key": "disableSSLValidation",
          "value": {
            "booleanValue": false
          }
        },
        "httpParams": {
          "key": "httpParams"
        },
        "authConfigName": {
          "key": "authConfigName",
          "value": {
            "stringValue": ""
          }
        },
        "responseHeader": {
          "key": "responseHeader",
          "value": {
            "stringArray": {
              "stringValues": ["$`Task_2_responseHeader`$"]
            }
          }
        },
        "userAgent": {
          "key": "userAgent",
          "value": {
            "stringValue": ""
          }
        },
        "httpMethod": {
          "key": "httpMethod",
          "value": {
            "stringValue": "POST"
          }
        },
        "responseStatus": {
          "key": "responseStatus",
          "value": {
            "stringArray": {
              "stringValues": ["$`Task_2_responseStatus`$"]
            }
          }
        },
        "timeout": {
          "key": "timeout",
          "value": {
            "intValue": "0"
          }
        },
        "url": {
          "key": "url",
          "value": {
            "stringValue": "$systemEndpoint$"
          }
        },
        "useSSL": {
          "key": "useSSL",
          "value": {
            "booleanValue": false
          }
        },
        "urlFetchingService": {
          "key": "urlFetchingService",
          "value": {
            "stringValue": "HARPOON"
          }
        },
        "urlQueryStrings": {
          "key": "urlQueryStrings"
        },
        "requestorId": {
          "key": "requestorId",
          "value": {
            "stringValue": ""
          }
        },
        "jsonAdditionalHeaders": {
          "key": "jsonAdditionalHeaders",
          "value": {
            "jsonValue": JSON.stringify({
              "Content-Type": "application/json",
              "X-Integration-Source": "iPaaS-Builder"
            })
          }
        },
        "requestBody": {
          "key": "requestBody",
          "value": {
            "stringValue": "$systemPayload$"
          }
        },
        "followRedirects": {
          "key": "followRedirects",
          "value": {
            "booleanValue": true
          }
        },
        "additionalHeaders": {
          "key": "additionalHeaders"
        }
      },
      "nextTasks": [
        { "taskId": "5", "condition": "$`Task_2_responseStatus`$ = \"200 OK\"" },
        { "taskId": "4", "condition": "$`Task_2_responseStatus`$ != \"200 OK\"" }
      ],
      "taskExecutionStrategy": "WHEN_ANY_SUCCEED",
      "displayName": "Call Customer Endpoint",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "140", "y": "317" },
      "conditionalFailurePolicies": {
        "defaultFailurePolicy": {
          "retryStrategy": "IGNORE"
        }
      }
    };
  }

  // Gerar tarefa de email (versão hardcoded)
  private static generateEmailTaskHardcoded(customerEmail: string): any {
    return {
      "task": "EmailTask",
      "taskId": "4",
      "parameters": {
        "to": {
          "key": "to",
          "value": {
            "stringValue": customerEmail || "customer@example.com"
          }
        },
        "subject": {
          "key": "subject",
          "value": {
            "stringValue": "Integration Error Notification"
          }
        },
        "body": {
          "key": "body",
          "value": {
            "stringValue": "There was an error processing your integration. Please check your system."
          }
        }
      },
      "nextTasks": [],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": "Send Error Email",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "620", "y": "181" }
    };
  }

  // Gerar tarefa de output de sucesso (versão hardcoded)
  private static generateSuccessOutputTaskHardcoded(): any {
    return {
      "task": "FieldMappingTask",
      "taskId": "5",
      "parameters": {
        "FieldMappingConfigTaskParameterKey": {
          "key": "FieldMappingConfigTaskParameterKey",
          "value": {
            "jsonValue": JSON.stringify({
              "@type": "type.googleapis.com/enterprise.crm.eventbus.proto.FieldMappingConfig",
              "mappedFields": [{
                "inputField": {
                  "fieldType": "JSON_VALUE",
                  "transformExpression": {
                    "initialValue": {
                      "referenceValue": "$Output$"
                    }
                  }
                },
                "outputField": {
                  "referenceKey": "$Output$",
                  "fieldType": "JSON_VALUE",
                  "cardinality": "OPTIONAL"
                }
              }]
            })
          }
        }
      },
      "nextTasks": [],
      "taskExecutionStrategy": "WHEN_ALL_SUCCEED",
      "displayName": "Success Output",
      "externalTaskType": "NORMAL_TASK",
      "position": { "x": "146", "y": "504" }
    };
  }

  // Gerar tarefa de email (versão com template - mantida para compatibilidade)
  private static generateEmailTask(customerEmail: string): any {
    const template = this.loadTemplate('integration/tasks/email-task.json');
    
    const replacements = {
      TASK_ID: "4",
      EMAIL_TO: customerEmail || "customer@example.com",
      EMAIL_SUBJECT: "Integration Error Notification",
      EMAIL_BODY: "There was an error processing your integration. Please check your system.",
      DISPLAY_NAME: "Send Error Email",
      POSITION_X: "620",
      POSITION_Y: "181"
    };

    const result = this.replacePlaceholders(template, replacements);
    return JSON.parse(result);
  }

  // Gerar tarefa de output de sucesso (versão com template - mantida para compatibilidade)
  private static generateSuccessOutputTask(): any {
    const template = this.loadTemplate('integration/tasks/field-mapping-task.json');
    
    const mappingConfig = {
      "@type": "type.googleapis.com/enterprise.crm.eventbus.proto.FieldMappingConfig",
      "mappedFields": [{
        "inputField": {
          "fieldType": "JSON_VALUE",
          "transformExpression": {
            "initialValue": {
              "referenceValue": "$Output$"
            }
          }
        },
        "outputField": {
          "referenceKey": "$Output$",
          "fieldType": "JSON_VALUE",
          "cardinality": "OPTIONAL"
        }
      }]
    };

    const replacements = {
      TASK_ID: "5",
      MAPPING_CONFIG: JSON.stringify(mappingConfig),
      NEXT_TASKS: JSON.stringify([]),
      DISPLAY_NAME: "Success Output",
      POSITION_X: "146",
      POSITION_Y: "504"
    };

    const result = this.replacePlaceholders(template, replacements);
    return JSON.parse(result);
  }

  // Gerar tarefa JsonnetMapperTask
  static generateJsonnetMapperTask(
    taskId: string,
    jsonnetTemplate: string,
    displayName: string,
    positionX: number,
    positionY: number
  ): any {
    const template = this.loadTemplate('integration/tasks/jsonnet-mapper-task.json');
    
    const replacements = {
      TASK_ID: taskId,
      JSONNET_TEMPLATE: jsonnetTemplate,
      NEXT_TASKS: JSON.stringify([{ "taskId": "1" }]),
      DISPLAY_NAME: displayName,
      POSITION_X: positionX.toString(),
      POSITION_Y: positionY.toString()
    };

    const result = this.replacePlaceholders(template, replacements);
    return JSON.parse(result);
  }

  // Gerar UUID simples
  private static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  // Aplicar transformações automaticamente no payload
  private static applyTransformationsToPayload(mappings: Array<{
    sourceField: { path: string; type: string; name: string };
    targetPath: string;
    confidence?: number;
    transformation?: TransformationConfig;
  }>): any {
    const transformedPayload: any = {};
    
    // Payload de exemplo da Gupy para aplicar transformações
    const gupyExamplePayload = {
      companyName: "ACME",
      data: {
        candidate: {
          name: "John",
          lastName: "Doe",
          email: "john.doe177@gmail.com",
          identificationDocument: "25272626207",
          mobileNumber: "+5511999990000",
          addressCity: "São Paulo",
          addressState: "São Paulo",
          addressCountry: "Brasil",
          addressZipCode: "01414-905",
          gender: "Male"
        },
        admission: {
          hiringDate: "2019-06-19T00:00:00.000Z",
          position: {
            salary: { value: 1250.5 }
          }
        }
      }
    };

    for (const mapping of mappings) {
      try {
        // Obter valor do campo fonte
        const sourceValue = this.getValueByPath(gupyExamplePayload, mapping.sourceField.path);
        
        if (sourceValue !== undefined) {
          let transformedValue = sourceValue;
          
          // Aplicar transformação apenas se confiança ≥80%
          if (mapping.transformation && (mapping.confidence || 0) >= 80) {
            transformedValue = TransformationEngine.applyTransformation(sourceValue, mapping.transformation);
            console.log(`🔄 Transformação aplicada (confiança ${mapping.confidence}%): ${mapping.sourceField.path} -> ${mapping.targetPath}`, {
              original: sourceValue,
              transformed: transformedValue,
              transformation: mapping.transformation.type
            });
          } else if (mapping.transformation && (mapping.confidence || 0) < 80) {
            console.log(`⚠️ Transformação ignorada (confiança ${mapping.confidence}% < 80%): ${mapping.sourceField.path} -> ${mapping.targetPath}`);
          }
          
          // Definir valor no payload transformado
          this.setValueByPath(transformedPayload, mapping.targetPath, transformedValue);
        }
      } catch (error) {
        console.warn(`Erro ao aplicar transformação para ${mapping.sourceField.path}:`, error);
      }
    }

    return transformedPayload;
  }

  // Gerar tarefas de transformação baseadas nos mapeamentos
  private static generateTransformationTasks(mappings: Array<{
    sourceField: { path: string; type: string; name: string };
    targetPath: string;
    confidence?: number;
    transformation?: TransformationConfig;
  }>): any[] {
    const transformationTasks: any[] = [];
    let taskIdCounter = 10;

    // Filtrar apenas mapeamentos com transformações
    const transformationMappings = mappings.filter(m => m.transformation && m.transformation.type);

    for (const mapping of transformationMappings) {
      try {
        const varName = this.generateVariableName(mapping.sourceField.name);
        const inputPath = this.generateJsonnetPath(mapping.sourceField.path);
        
        // Gerar template Jsonnet AUTO-CONTIDO (sem imports externos)
        const jsonnetTemplate = this.generateInlineJsonnetTemplate(
          inputPath,
          varName,
          mapping.transformation!
        );

        // Criar tarefa usando o método público
        const task = this.generateJsonnetMapperTask(
          taskIdCounter.toString(),
          jsonnetTemplate,
          `Transform ${mapping.sourceField.name} (${mapping.transformation!.type})`,
          140 + (taskIdCounter - 10) * 200,
          100
        );

        transformationTasks.push(task);
        taskIdCounter++;
        
        console.log(`✅ Gerada tarefa Jsonnet para ${mapping.sourceField.name}: ${mapping.transformation!.type}`);
      } catch (error) {
        console.error(`❌ Erro ao gerar tarefa para ${mapping.sourceField.name}:`, error);
      }
    }

    console.log(`📝 Geradas ${transformationTasks.length} tarefas de transformação Jsonnet`);
    return transformationTasks;
  }

  // Mapear tipo de transformação para função da biblioteca
  private static getTransformationFunction(transformation: TransformationConfig): string {
    switch (transformation.type) {
      case 'format_document': return 'formatDocument';
      case 'phone_split': return 'splitPhone';
      case 'name_split': return 'splitName';
      case 'normalize': return 'normalizeCase';
      case 'country_code': return 'convertCountryCode';
      case 'gender_code': return 'convertGenderCode';
      case 'code_lookup': return 'lookupCode';
      case 'concat': return 'concat';
      case 'split': return 'splitString';
      case 'convert': return 'convertType';
      case 'format_date': return 'formatDate';
      default: return 'identity';
    }
  }

  // Gerar nome de variável para transformação
  private static generateVariableName(fieldName: string): string {
    const normalizedName = fieldName.toLowerCase().replace(/[^a-z0-9]/g, '_');
    return `transformed_mapping_${normalizedName}`;
  }

  // Gerar path Jsonnet
  private static generateJsonnetPath(fieldPath: string): string {
    const pathParts = fieldPath.split('.');
    let jsonnetPath = 'gupyPayload';
    pathParts.forEach(part => {
      jsonnetPath += `["${part}"]`;
    });
    return jsonnetPath;
  }

  // Gerar template Jsonnet inline auto-contido (SEM imports externos)
  private static generateInlineJsonnetTemplate(
    inputPath: string,
    targetVariable: string,
    transformation: TransformationConfig
  ): string {
    const gupyPayloadVar = 'local gupyPayload = std.extVar("gupyPayload");';
    const inputVar = `local inputValue = ${inputPath};`;

    switch (transformation.type) {
      case 'format_document':
        // Remove pontos, hífens e espaços
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.strReplace(std.strReplace(std.strReplace(inputValue, ".", ""), "-", ""), " ", "") }`;

      case 'name_split':
        if (transformation.operation === 'split_first_name') {
          return `${gupyPayloadVar} ${inputVar} local parts = std.split(inputValue, " "); { ${targetVariable}: if std.length(parts) > 0 then parts[0] else "" }`;
        } else if (transformation.operation === 'split_last_name') {
          return `${gupyPayloadVar} ${inputVar} local parts = std.split(inputValue, " "); { ${targetVariable}: if std.length(parts) > 1 then std.join(" ", parts[1:]) else "" }`;
        }
        break;

      case 'phone_split':
        if (transformation.operation === 'extract_area_code') {
          return `${gupyPayloadVar} ${inputVar} local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", ""); { ${targetVariable}: std.substr(cleanPhone, 0, 2) }`;
        } else if (transformation.operation === 'extract_phone_number') {
          return `${gupyPayloadVar} ${inputVar} local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", ""); { ${targetVariable}: std.substr(cleanPhone, 2, std.length(cleanPhone)) }`;
        }
        break;

      case 'normalize':
        if (transformation.operation === 'upper_case') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.asciiUpper(inputValue) }`;
        } else if (transformation.operation === 'lower_case') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.asciiLower(inputValue) }`;
        }
        break;

      case 'country_code':
        // Conversão Brasil -> BRA
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: if inputValue == "Brasil" then "BRA" else if inputValue == "Brazil" then "BRA" else inputValue }`;

      case 'gender_code':
        // Conversão Male/Female -> M/F
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: if inputValue == "Male" then "M" else if inputValue == "Female" then "F" else inputValue }`;

      case 'concat':
        const separator = transformation.parameters?.separator || ' ';
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.join("${separator}", if std.isArray(inputValue) then inputValue else [inputValue]) }`;

      case 'convert':
        if (transformation.operation === 'string_to_number') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.parseJson(inputValue) }`;
        } else if (transformation.operation === 'number_to_string') {
          return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: std.toString(inputValue) }`;
        }
        break;

      default:
        // Transformação identidade (passthrough)
        return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: inputValue }`;
    }

    // Fallback para transformação identidade
    return `${gupyPayloadVar} ${inputVar} { ${targetVariable}: inputValue }`;
  }

  // Gerar template Jsonnet para um tipo específico de transformação
  private static generateJsonnetForTransformationType(
    transformationType: string, 
    mappings: Array<{
      sourceField: { path: string; type: string; name: string };
      targetPath: string;
      transformation?: TransformationConfig;
    }>
  ): string {
    // Template Jsonnet simples que aplica transformações
    const transformationRules = mappings.map(mapping => {
      const transformation = mapping.transformation!;
      const sourcePath = mapping.sourceField.path;
      
      // Escapar caracteres especiais no path
      const escapedTargetPath = mapping.targetPath.replace(/\./g, '_');
      
      // Gerar regra de transformação baseada no tipo
      switch (transformation.type) {
        case 'format_document':
          return `"${escapedTargetPath}": std.strReplace(std.strReplace(gupyPayload.${sourcePath}, ".", ""), "-", "")`;
        
        case 'normalize':
          if (transformation.operation === 'upper_case') {
            return `"${escapedTargetPath}": std.asciiUpper(gupyPayload.${sourcePath})`;
          }
          return `"${escapedTargetPath}": gupyPayload.${sourcePath}`;
          
        case 'phone_split':
          return `"${escapedTargetPath}": std.substr(std.strReplace(gupyPayload.${sourcePath}, "+55", ""), 0, 2)`;
          
        default:
          return `"${escapedTargetPath}": gupyPayload.${sourcePath}`;
      }
    }).filter(rule => rule).join(', ');

    // Template Jsonnet válido sem quebras de linha problemáticas
    return `local gupyPayload = std.extVar('gupyPayload'); { ${transformationRules} }`;
  }

  // Utilitários para manipular objetos por path
  private static getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  private static setValueByPath(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!current[key]) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  // Validar se todos os templates existem
  static validateTemplates(): boolean {
    const requiredTemplates = [
      'integration/base-integration.json',
      'integration/tasks/field-mapping-task.json',
      'integration/tasks/rest-task.json',
      'integration/tasks/email-task.json',
      'integration/tasks/jsonnet-mapper-task.json',
      'transformations/value-mapping.jsonnet',
      'transformations/date-format.jsonnet',
      'transformations/expression.jsonnet',
      'transformations/conditional.jsonnet'
    ];

    for (const template of requiredTemplates) {
      try {
        this.loadTemplate(template);
      } catch (error) {
        console.error(`Missing template: ${template}`);
        return false;
      }
    }

    return true;
  }
}
