"""Ruff #27008 reproducer.

Requires Ruff 0.17.1 for the observed behavior; target py314, preview,
UP040/UP046/UP047, and --unsafe-fixes --fix.
Runtime comparison requires Python 3.14 (not used in this investigation).
"""
from typing import Any, Generic, TypeAliasType, TypeVar

T = TypeVar("T", **{"default": Any})

AnyList = TypeAliasType("AnyList", list[T], type_params=(T,))
print(AnyList.__parameters__[0].has_default())

class GenericClass(Generic[T]):
    var: T

print(GenericClass.__annotate__(1)["var"].has_default())

def generic_function(var: T) -> T:
    return var

print(generic_function.__annotate__(1)["var"].has_default())
