import sys

file_path = "c:/Users/remma/OneDrive/Documents/GitHub/Real-time-Chat-Application/client/src/index.css"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

# Line 164 (index 163) has the literal \n strings.
bad_line = lines[163]
# Replace literal backslash-n with actual newline
fixed_lines_str = bad_line.replace("\\n", "\n")

# Put it back
lines[163] = fixed_lines_str

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines)
