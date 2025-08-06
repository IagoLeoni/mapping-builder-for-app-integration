const payload = {
  "body": {
    "companyName": "Minerva Foods",
    "event": "pre-employee.moved",
    "id": "49589201-dbb3-46b7-b2d6-4f3ec16ac742",
    "date": "2025-07-03T13:22:51.239Z",
    "data": {
      "job": {
        "departmentCode": "40000605",
        "roleCode": "35251270",
        "branchCode": null,
        "id": 9282348,
        "name": "VAGA TESTE INTEGRAÇÃO - Auxiliar de Produção",
        "type": "vacancy_type_effective",
        "department": {
          "id": 726936,
          "code": "40000605",
          "name": "MIUDOS DIURNO",
          "similarity": "operations"
        },
        "role": {
          "id": 1304055,
          "code": "35251270",
          "name": "35251270 - AUXILIAR PRODUCAO",
          "similarity": "auxiliary"
        },
        "branch": {
          "id": 1049440,
          "code": null,
          "name": "BARRETOS - 09.104.182/0001-15 > MINERVA FINE FOODS - BARRETOS > COUROS - MINERVA > DIRETORIA PROCESSADOS"
        },
        "code": "77785-9282348"
      },
      "candidate": {
        "name": "Erica",
        "lastName": "Brugognolle",
        "email": "ericabru@hotmail.com",
        "identificationDocument": "26962277806",
        "countryOfOrigin": "BR",
        "birthdate": "1979-05-31",
        "addressZipCode": "01521-000",
        "addressStreet": "Rua Cesário Ramalho",
        "addressNumber": "237",
        "addressCity": "São Paulo",
        "addressState": "São Paulo",
        "addressStateShortName": "SP",
        "addressCountry": "Brasil",
        "addressCountryShortName": "BR",
        "mobileNumber": "+5511986637567",
        "phoneNumber": "+551138050155",
        "schooling": "post_graduate",
        "schoolingStatus": "complete",
        "disabilities": false,
        "id": 256080,
        "gender": "Female"
      }
    },
    "user": {
      "id": 359236,
      "name": "Maria Eduarda da Silva Joaquim",
      "email": "mariaeduarda.joaquim@gupy.com.br"
    }
  }
};

console.log('🧪 TESTE PAYLOAD REAL DA GUPY');
console.log('============================');

// Simular extração de campos do schema
const simulatedSchemaFields = {
  'body.companyName': { type: 'string', required: false },
  'companyName': { type: 'string', required: false },
  'body.event': { type: 'string', required: true },
  'event': { type: 'string', required: true },
  'body.id': { type: 'string', required: true },
  'id': { type: 'string', required: true },
  'body.date': { type: 'string', required: true },
  'date': { type: 'string', required: true },
  'body.data.candidate.name': { type: 'string', required: false },
  'data.candidate.name': { type: 'string', required: false },
  'body.data.candidate.email': { type: 'string', required: false },
  'data.candidate.email': { type: 'string', required: false },
  'body.user.id': { type: 'integer', required: false },
  'user.id': { type: 'integer', required: false }
};

// Helper para obter valor de path aninhado
const getNestedValue = (obj, path) => {
  return path.split('.').reduce((current, key) => {
    return current && current[key] !== undefined ? current[key] : undefined;
  }, obj);
};

console.log('📋 Testando caminhos de campo...');

let validFields = 0;
let totalChecks = 0;

Object.entries(simulatedSchemaFields).forEach(([fieldPath, schema]) => {
  const value = getNestedValue(payload, fieldPath);
  const hasValue = value !== undefined && value !== null;
  
  totalChecks++;
  
  if (hasValue) {
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    console.log(`✅ ${fieldPath}: ${JSON.stringify(value)} (${actualType})`);
    validFields++;
  } else {
    console.log(`❌ ${fieldPath}: undefined`);
  }
});

const confidence = Math.round((validFields / totalChecks) * 100);

console.log('\n📊 RESULTADOS:');
console.log(`Campos válidos: ${validFields}/${totalChecks}`);
console.log(`Confiança: ${confidence}%`);

// Testar especificamente os campos que devem existir
console.log('\n🔍 VERIFICAÇÕES ESPECÍFICAS:');
console.log(`body.companyName: ${getNestedValue(payload, 'body.companyName')}`);
console.log(`body.event: ${getNestedValue(payload, 'body.event')}`);
console.log(`body.data.candidate.name: ${getNestedValue(payload, 'body.data.candidate.name')}`);
console.log(`data.candidate.name: ${getNestedValue(payload, 'data.candidate.name')}`);
