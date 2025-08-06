local f = import "functions"; // Import additional functions

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformExpression(value) = (
  {{FORMULA}}
);

{
  {{VAR_NAME}}: transformExpression(inputValue)
}
