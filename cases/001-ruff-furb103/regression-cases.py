"""Proposed FURB103 regression fixtures. These are inputs, not a Ruff test runner."""

# No autofix: a conditional write cannot be made unconditional.
flag = False
with open("example.txt", "w") as f:
    flag and f.write("hello")

# No autofix: preserve the print and write() return value.
with open("example.txt", "w") as f:
    print(f.write("abc"))

# No autofix: expression wrapping a write must be preserved.
with open("example.txt", "w") as f:
    f.write("abc") if flag else None

# Autofix remains available: the whole expression is the write call.
with open("example.txt", "w") as f:
    f.write("abc")
