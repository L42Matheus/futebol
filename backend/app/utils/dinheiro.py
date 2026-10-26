def formatar_reais(centavos: int | None) -> str:
    """Formata centavos no padrão brasileiro: 123456 -> "R$ 1.234,56"."""
    valor = f"{(centavos or 0) / 100:,.2f}"
    return "R$ " + valor.replace(",", "_").replace(".", ",").replace("_", ".")
