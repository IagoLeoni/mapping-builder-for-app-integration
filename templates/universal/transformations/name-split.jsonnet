// Template universal para divisão de nomes
// Divide nome completo em primeira parte (nome) ou última parte (sobrenome)
// Placeholders: {{SOURCE_PAYLOAD_VAR}}, {{INPUT_PATH}}, {{VAR_NAME}}, {{OPERATION}}

local {{SOURCE_PAYLOAD_VAR}} = std.extVar("{{SOURCE_PAYLOAD_VAR}}");
local inputValue = {{INPUT_PATH}};
local parts = std.split(inputValue, " ");
{
  {{VAR_NAME}}: if "{{OPERATION}}" == "first_name" then 
                  (if std.length(parts) > 0 then parts[0] else "")
                else if "{{OPERATION}}" == "last_name" then
                  (if std.length(parts) > 1 then std.join(" ", parts[1:]) else "")
                else inputValue
}
