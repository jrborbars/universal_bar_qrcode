from __future__ import annotations

import re


def _only_digits(value: str) -> str:
    return re.sub(r"\D+", "", value or "")


def is_valid_cnpj(value: str) -> bool:
    cnpj = _only_digits(value)
    if len(cnpj) != 14:
        return False
    if cnpj == cnpj[0] * 14:
        return False

    def calc_digit(base: str, weights: list[int]) -> str:
        total = sum(int(d) * w for d, w in zip(base, weights, strict=True))
        mod = total % 11
        digit = 0 if mod < 2 else 11 - mod
        return str(digit)

    w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
    w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]

    d1 = calc_digit(cnpj[:12], w1)
    d2 = calc_digit(cnpj[:12] + d1, w2)
    return cnpj[-2:] == d1 + d2


def normalize_cnpj(value: str) -> str:
    return _only_digits(value)
