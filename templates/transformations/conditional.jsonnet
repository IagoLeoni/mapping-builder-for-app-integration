local f = import "functions"; // Import additional functions

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformConditional(value) = (
{{CONDITIONS}}
  else {{DEFAULT_VALUE}}
);

{
  {{VAR_NAME}}: transformConditional(inputValue)
}
