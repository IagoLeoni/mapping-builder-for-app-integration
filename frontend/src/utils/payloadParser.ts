import { PayloadField } from '../types';

export const parseGupyPayload = (): PayloadField[] => {
  // Sample Gupy payload structure based on the integration example
  const gupyPayloadStructure = {
    companyName: "string",
    id: "string",
    event: "string",
    date: "string",
    data: {
      job: {
        id: "number",
        code: "string",
        name: "string",
        department: {
          id: "number",
          code: "string",
          name: "string",
          similarity: "string"
        },
        role: {
          id: "number",
          code: "string",
          name: "string",
          similarity: "string"
        },
        branch: {
          id: "number",
          code: "string",
          name: "string"
        },
        customFields: "array"
      },
      application: {
        id: "number",
        score: "number",
        preHiringInformation: "object",
        tags: "array",
        currentStep: {
          id: "number",
          name: "string"
        }
      },
      user: {
        id: "number",
        name: "string",
        email: "string"
      },
      candidate: {
        id: "number",
        name: "string",
        lastName: "string",
        email: "string",
        identificationDocument: "string",
        countryOfOrigin: "string",
        birthdate: "string",
        addressZipCode: "string",
        addressStreet: "string",
        addressNumber: "string",
        addressCity: "string",
        addressState: "string",
        addressStateShortName: "string",
        addressCountry: "string",
        addressCountryShortName: "string",
        mobileNumber: "string",
        phoneNumber: "string",
        schooling: "string",
        schoolingStatus: "string",
        disabilities: "boolean",
        gender: "string"
      },
      admission: {
        status: "string",
        admissionDeadline: "string",
        hiringDate: "string",
        position: {
          positionId: "number",
          integratingAgent: "string",
          contractEndDate: "string",
          paymentRecurrence: "string",
          registration: "string",
          salary: {
            value: "number",
            currency: "string"
          },
          department: {
            id: "number",
            code: "string",
            name: "string"
          },
          role: {
            id: "number",
            code: "string",
            name: "string"
          },
          branch: {
            id: "number",
            code: "string",
            label: "string"
          },
          customFields: "array",
          costCenter: {
            id: "number",
            code: "string",
            name: "string"
          },
          workShift: {
            id: "number",
            code: "string",
            name: "string",
            description: "string",
            workload: "string",
            letter: "string"
          }
        }
      }
    }
  };

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

  return parseObject(gupyPayloadStructure);
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
