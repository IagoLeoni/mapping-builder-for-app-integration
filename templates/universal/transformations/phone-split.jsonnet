// Template universal para divisão de telefones
// Extrai código de área ou número do telefone
// Placeholders: {{SOURCE_PAYLOAD_VAR}}, {{INPUT_PATH}}, {{VAR_NAME}}, {{OPERATION}}

local {{SOURCE_PAYLOAD_VAR}} = std.extVar("{{SOURCE_PAYLOAD_VAR}}");
local inputValue = {{INPUT_PATH}};
local cleanPhone = std.strReplace(std.strReplace(inputValue, "+55", ""), " ", "");
{
  {{VAR_NAME}}: if "{{OPERATION}}" == "area_code" then 
                  std.substr(cleanPhone, 0, 2)
                else if "{{OPERATION}}" == "phone_number" then
                  std.substr(cleanPhone, 2, 9)
                else inputValue
}
