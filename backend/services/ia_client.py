from typing import Optional
import httpx
from core.config import settings
from core.logger import logger


class IAClient:
    def __init__(self) -> None:
        self.base_url = settings.lm_studio_url.rstrip("/")

    async def complete(
        self, prompt: str, temperature: float = 0.1, max_tokens: int = 4096
    ) -> str:
        from ai.client import _call_with_retry

        messages = [{"role": "user", "content": prompt}]
        result = await _call_with_retry(
            messages, temperature=temperature, max_tokens=max_tokens, timeout=180
        )
        if result:
            return result
        raise RuntimeError(
            "Todos os provedores de IA falharam ao processar a requisiÃ§Ã£o."
        )

    async def analisar_vaga(self, titulo: str, descricao: str) -> Optional[dict]:
        prompt = (
            "VocÃª Ã© um analista de vagas de tecnologia. Analise a vaga abaixo e retorne APENAS "
            "um JSON vÃ¡lido sem formataÃ§Ã£o adicional, com estes campos:\n"
            "- `stack_principal`: lista das principais tecnologias exigidas\n"
            "- `nivel`: senioridade (junior/pleno/senior)\n"
            "- `fake_junior`: true se a vaga pede requisitos de senior mas se intitula junior\n"
            "- `salario_estimado_min`: salario minimo estimado ou null\n"
            "- `salario_estimado_max`: salario maximo estimado ou null\n"
            "- `resumo`: resumo de 1 linha da vaga\n\n"
            f"TÃ­tulo: {titulo}\n\nDescriÃ§Ã£o:\n{descricao[:3000]}"
        )

        payload = {
            "model": settings.lm_studio_model,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 1024,
        }

        try:
            async with httpx.AsyncClient(timeout=60) as client:
                resp = await client.post(
                    f"{self.base_url}/v1/chat/completions",
                    json=payload,
                )
                resp.raise_for_status()
                content = resp.json()["choices"][0]["message"]["content"]
                return self._parse(content)
        except Exception as e:
            logger.warning("ia_client.erro", error=str(e))
            return None

    def _parse(self, content: str) -> Optional[dict]:
        import json
        import re

        match = re.search(r"\{.*\}", content, re.DOTALL)
        if not match:
            return None
        try:
            return json.loads(match.group())
        except json.JSONDecodeError:
            return None


ia_client = IAClient()
