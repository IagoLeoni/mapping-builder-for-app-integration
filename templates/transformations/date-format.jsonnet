local f = import "functions"; // Import additional functions

local gupyPayload = f.extVar("gupyPayload");
local inputValue = {{INPUT_PATH}};

local transformDate(dateStr) = (
  f.dateFormat(f.parseDate(dateStr, "{{FROM_FORMAT}}"), "{{TO_FORMAT}}")
);

{
  {{VAR_NAME}}: transformDate(inputValue)
}
