{
  // Formatação de documentos (CPF, CNPJ, telefone, etc.)
  formatDocument(value, config)::
    if config.pattern == 'cpf' then
      // Remove pontos, hífens e espaços do CPF
      std.strReplace(std.strReplace(std.strReplace(value, '.', ''), '-', ''), ' ', '')
    else if config.pattern == 'cnpj' then
      // Remove pontos, hífens, barras e espaços do CNPJ
      std.strReplace(std.strReplace(std.strReplace(std.strReplace(value, '.', ''), '-', ''), '/', ''), ' ', '')
    else if config.pattern == 'phone' then
      // Remove símbolos do telefone
      std.strReplace(std.strReplace(std.strReplace(std.strReplace(value, ' ', ''), '-', ''), '(', ''), ')', '')
    else if config.pattern == 'cep' then
      // Remove hífens do CEP
      std.strReplace(value, '-', '')
    else
      // Formatação genérica - remove pontos e hífens
      std.strReplace(std.strReplace(value, '.', ''), '-', ''),

  // Normalização de texto
  normalizeCase(value, config)::
    if config.operation == 'upper_case' then
      std.asciiUpper(value)
    else if config.operation == 'lower_case' then
      std.asciiLower(value)
    else if config.operation == 'title_case' then
      // Implementação básica de title case
      std.join(' ', [
        std.asciiUpper(std.substr(word, 0, 1)) + std.asciiLower(std.substr(word, 1, std.length(word)))
        for word in std.split(value, ' ')
      ])
    else
      value,

  // Concatenação de campos
  concat(values, separator)::
    if std.isArray(values) then
      std.join(separator, [v for v in values if v != null && v != ''])
    else
      values,

  // Divisão de telefone brasileiro
  splitPhone(value, config)::
    local cleanPhone = std.strReplace(std.strReplace(std.strReplace(value, ' ', ''), '-', ''), '+', '');
    if config.operation == 'extract_area_code' then
      // Extrair código de área (primeiros 2 dígitos após código do país)
      if std.startsWith(cleanPhone, '55') then
        std.substr(cleanPhone, 2, 2)
      else
        std.substr(cleanPhone, 0, 2)
    else if config.operation == 'extract_phone_number' then
      // Extrair número do telefone (após código de área)
      if std.startsWith(cleanPhone, '55') then
        std.substr(cleanPhone, 4, std.length(cleanPhone))
      else
        std.substr(cleanPhone, 2, std.length(cleanPhone))
    else
      cleanPhone,

  // Divisão de nome
  splitName(value, config)::
    local parts = std.split(std.strip(value), ' ');
    if config.operation == 'split_first_name' then
      if std.length(parts) > 0 then parts[0] else ''
    else if config.operation == 'split_last_name' then
      if std.length(parts) > 1 then
        std.join(' ', parts[1:])
      else ''
    else
      value,

  // Conversão de códigos de país
  convertCountryCode(value, mapping)::
    if std.objectHas(mapping, value) then
      mapping[value]
    else
      value,

  // Conversão de códigos de gênero
  convertGenderCode(value, mapping)::
    if std.objectHas(mapping, value) then
      mapping[value]
    else
      value,

  // Lookup de códigos genérico
  lookupCode(value, mapping)::
    if std.objectHas(mapping, value) then
      mapping[value]
    else
      value,

  // Formatação de datas
  formatDate(value, config)::
    // Implementação básica - Application Integration tem funções nativas melhores
    if config.outputFormat == 'yyyy-MM-dd' then
      // Assumir que value já está em formato ISO
      std.substr(value, 0, 10)
    else
      value,

  // Conversão de tipos
  convertType(value, config)::
    if config.operation == 'string_to_number' then
      std.parseJson(value)
    else if config.operation == 'number_to_string' then
      std.toString(value)
    else
      value,

  // Aplicar transformação baseada no tipo
  apply(value, transformation)::
    if transformation.type == 'format_document' then
      self.formatDocument(value, transformation)
    else if transformation.type == 'normalize' then
      self.normalizeCase(value, transformation)
    else if transformation.type == 'concat' then
      self.concat(value, transformation.separator || ' ')
    else if transformation.type == 'phone_split' then
      self.splitPhone(value, transformation)
    else if transformation.type == 'name_split' then
      self.splitName(value, transformation)
    else if transformation.type == 'country_code' then
      self.convertCountryCode(value, transformation.mapping || {})
    else if transformation.type == 'gender_code' then
      self.convertGenderCode(value, transformation.mapping || {})
    else if transformation.type == 'code_lookup' then
      self.lookupCode(value, transformation.mapping || {})
    else if transformation.type == 'format_date' then
      self.formatDate(value, transformation)
    else if transformation.type == 'convert' then
      self.convertType(value, transformation)
    else
      value,

  // Aplicar múltiplas transformações em sequência
  applyMultiple(value, transformations)::
    std.foldl(
      function(currentValue, transformation) self.apply(currentValue, transformation),
      transformations,
      value
    ),

  // Transformações específicas para mapeamento Gupy
  gupyTransformations:: {
    // CPF: remover formatação
    cpfToRaw(value)::
      $.formatDocument(value, { pattern: 'cpf' }),

    // Telefone: extrair código de área
    phoneToAreaCode(value)::
      $.splitPhone(value, { operation: 'extract_area_code' }),

    // Telefone: extrair número
    phoneToNumber(value)::
      $.splitPhone(value, { operation: 'extract_phone_number' }),

    // Nome completo para primeiro nome
    nameToFirstName(value)::
      $.splitName(value, { operation: 'split_first_name' }),

    // Nome completo para sobrenome
    nameToLastName(value)::
      $.splitName(value, { operation: 'split_last_name' }),

    // País para código ISO
    countryToISO(value)::
      $.convertCountryCode(value, {
        'Brasil': 'BRA',
        'Brazil': 'BRA',
        'BR': 'BRA'
      }),

    // Gênero para código
    genderToCode(value)::
      $.convertGenderCode(value, {
        'Male': 'M',
        'Female': 'F',
        'Masculino': 'M',
        'Feminino': 'F'
      }),

    // Texto para maiúsculo
    toUpperCase(value)::
      $.normalizeCase(value, { operation: 'upper_case' }),

    // Texto para minúsculo
    toLowerCase(value)::
      $.normalizeCase(value, { operation: 'lower_case' }),

    // Texto para title case
    toTitleCase(value)::
      $.normalizeCase(value, { operation: 'title_case' })
  }
}
