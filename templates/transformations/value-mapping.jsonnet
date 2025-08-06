local f = import "functions"; // Import additional functions

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformValue(value) = (
{{MAPPING_RULES}}
  else {{DEFAULT_VALUE}}
);

{
  {{VAR_NAME}}: transformValue(inputValue)
}
