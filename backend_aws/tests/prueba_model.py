from anthropic import Anthropic

# Usa la clave moderna que creaste ("mi prueba")
CLAVE_REAL = "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" # Asegúrate de poner el token completo aquí

client = Anthropic(api_key=CLAVE_REAL)

try:
    print("Enviando mensaje a Claude...")
    response = client.messages.create(
        model="claude-sonnet-5-5",  # Este es el identificador oficial activo
        max_tokens=1024,
        messages=[
            {"role": "user", "content": "Hola Claude, confirma si la conexión es correcta."}
        ]
    )
    print("\n¡ÉXITO! Respuesta de Claude:")
    print(response.content.text)

except Exception as e:
    print(f"\nError de conexión: {e}")


