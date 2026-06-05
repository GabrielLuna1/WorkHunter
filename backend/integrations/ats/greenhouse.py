import hashlib
from typing import List

import httpx

from integrations.ats.base_ats import ATSIntegrador
from core.logger import logger
from models.vaga import VagaBruta


class GreenhouseIntegrador(ATSIntegrador):
    nome = "greenhouse"
    prioridade = 100

    @property
    def empresas(self) -> dict[str, dict]:
        return {
            "Nubank": {
                "token": "nubank",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 100,
            },
            "PicPay": {
                "token": "picpay",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 100,
            },
            "C6 Bank": {
                "token": "c6bank",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 100,
            },
            "CI&T": {
                "token": "cit",
                "pais": "BR",
                "categoria": "tech",
                "prioridade": 100,
            },
            "Zup": {
                "token": "zup",
                "pais": "BR",
                "categoria": "tech",
                "prioridade": 100,
            },
            "Alice": {
                "token": "alice",
                "pais": "BR",
                "categoria": "healthtech",
                "prioridade": 90,
            },
            "Pismo": {
                "token": "pismo",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 90,
            },
            "Cora": {
                "token": "cora",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 90,
            },
            "Conta Simples": {
                "token": "contasimples",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 85,
            },
            "CloudWalk": {
                "token": "cloudwalk",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 85,
            },
            "Dock": {
                "token": "dock",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 80,
            },
            "Celcoin": {
                "token": "celcoin",
                "pais": "BR",
                "categoria": "fintech",
                "prioridade": 80,
            },
        }

    async def extrair_vagas(self, empresa: str, config: dict) -> List[VagaBruta]:
        token = config["token"]
        url = f"https://boards-api.greenhouse.io/v1/boards/{token}/jobs"
        vagas: List[VagaBruta] = []

        async with httpx.AsyncClient(timeout=self.TIMEOUT) as client:
            resp = await client.get(url, params={"content": "true"})
            resp.raise_for_status()
            data = resp.json()

        total_api = len(data.get("jobs", []))
        parsed = 0
        filtered = 0

        for idx, job in enumerate(data.get("jobs", [])):
            try:
                titulo = (job.get("title") or "").strip()
                if not titulo:
                    if idx < 3:
                        logger.warning("greenhouse.debug_titulo_vazio", idx=idx)
                    continue

                job_id = str(job.get("id", ""))
                id_externo = hashlib.md5(
                    f"greenhouse:{token}:{job_id}".encode()
                ).hexdigest()[:16]

                offices = job.get("offices", [{}])
                localizacao = offices[0].get("name") if offices else None

                metadata = job.get("metadata") or []
                salario_min = salario_max = None
                tipo_contrato = None
                for meta in metadata:
                    name = (meta.get("name") or "").lower()
                    value = meta.get("value")
                    if "compensation" in name or "salary" in name or "salÃ¡rio" in name:
                        salario_min, salario_max = self._parse_salary(value)
                    if "employment" in name or "type" in name or "tipo" in name:
                        tipo_contrato = str(value) if value else None

                absolute_url = job.get("absolute_url") or ""
                if not absolute_url:
                    absolute_url = f"https://boards.greenhouse.io/{token}/jobs/{job_id}"

                descricao_raw = job.get("content") or ""
                if descricao_raw:
                    import re

                    descricao = re.sub(r"<[^>]+>", " ", descricao_raw)
                    descricao = " ".join(descricao.split()).strip()
                else:
                    descricao = f"Vaga em {empresa}"

                vaga = self._montar_vaga(
                    empresa=empresa,
                    config=config,
                    titulo=titulo,
                    descricao=descricao[:5000],
                    localizacao=localizacao,
                    url=absolute_url,
                    id_externo=id_externo,
                    salario_min=salario_min,
                    salario_max=salario_max,
                    tipo_contrato=tipo_contrato,
                    fonte="greenhouse",
                )

                if vaga is not None:
                    vagas.append(vaga)
                    parsed += 1
                else:
                    filtered += 1
                    if idx < 3:
                        logger.warning(
                            "greenhouse.filtrado", empresa=empresa, titulo=titulo
                        )

            except Exception as e:
                if idx < 3:
                    logger.warning(
                        "greenhouse.erro_parse_job",
                        empresa=empresa,
                        job_idx=idx,
                        error=str(e),
                    )

        logger.info(
            "greenhouse.extraidas",
            empresa=empresa,
            total_api=total_api,
            parsed=parsed,
            filtered=filtered,
        )
        return vagas

    @staticmethod
    def _parse_salary(value) -> tuple:
        if not value:
            return None, None
        import re

        nums = re.findall(r"[\d.]+", str(value).replace(",", "."))
        if len(nums) >= 2:
            return float(nums[0]), float(nums[1])
        if len(nums) == 1:
            return float(nums[0]), None
        return None, None
