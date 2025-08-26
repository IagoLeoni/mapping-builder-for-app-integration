// Template universal para conversão de códigos de país
// Converte nomes de países para códigos ISO ou vice-versa
// Placeholders: {{SOURCE_PAYLOAD_VAR}}, {{INPUT_PATH}}, {{VAR_NAME}}

local {{SOURCE_PAYLOAD_VAR}} = std.extVar("{{SOURCE_PAYLOAD_VAR}}");
local inputValue = {{INPUT_PATH}};
{
  {{VAR_NAME}}: if inputValue == "Brasil" then "BRA"
                else if inputValue == "Brazil" then "BRA"
                else if inputValue == "Estados Unidos" then "USA"
                else if inputValue == "United States" then "USA"
                else if inputValue == "Argentina" then "ARG"
                else if inputValue == "Chile" then "CHL"
                else if inputValue == "México" then "MEX"
                else if inputValue == "Mexico" then "MEX"
                else inputValue
}
