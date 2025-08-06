// Teste rápido da validação corrigida
const fetch = require('node-fetch');

async function testValidation() {
  try {
    console.log('🧪 Testando validação do schema Gupy corrigida...');
    
    const response = await fetch('http://localhost:8080/api/gemini/gupy-schema');
    const schemaData = await response.json();
    
    console.log('✅ Schema carregado com sucesso');
    console.log('📋 Chaves do schema:', Object.keys(schemaData));
    console.log('📦 RawSchema body properties:', Object.keys(schemaData.rawSchema?.properties?.body?.properties || {}));
    console.log('🎯 Data properties:', Object.keys(schemaData.rawSchema?.properties?.body?.properties?.data?.properties || {}));
    
    // Simular extração de campos como no frontend
    const fields = {};
    const bodyProps = schemaData.rawSchema.properties.body.properties;
    
    // Contar campos raiz
    Object.keys(bodyProps).forEach(key => {
      if (key !== 'data' && key !== 'user') {
        fields[key] = bodyProps[key].type || 'string';
      }
    });
    
    // Contar campos de data
    if (bodyProps.data && bodyProps.data.properties) {
      Object.keys(bodyProps.data.properties).forEach(key => {
        fields[`data.${key}`] = 'object';
        
        if (bodyProps.data.properties[key].properties) {
          Object.keys(bodyProps.data.properties[key].properties).forEach(subkey => {
            fields[`data.${key}.${subkey}`] = bodyProps.data.properties[key].properties[subkey].type || 'string';
          });
        }
      });
    }
    
    console.log(`🎉 VALIDAÇÃO FUNCIONANDO: ${Object.keys(fields).length} campos extraídos`);
    console.log('📝 Primeiros 10 campos:', Object.keys(fields).slice(0, 10));
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
  }
}

testValidation();
