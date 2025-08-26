// Template universal para formatação de documentos (CPF, CNPJ, etc.)
// Remove pontos, hífens e espaços - compatível com Application Integration
// Placeholders: {{SOURCE_PAYLOAD_VAR}}, {{INPUT_PATH}}, {{VAR_NAME}}

local {{SOURCE_PAYLOAD_VAR}} = std.extVar("{{SOURCE_PAYLOAD_VAR}}");
local inputValue = {{INPUT_PATH}};
{
  {{VAR_NAME}}: std.strReplace(std.strReplace(std.strReplace(inputValue, ".", ""), "-", ""), " ", "")
}
