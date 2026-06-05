from abc import ABC, abstractmethod
from typing import List
from models.vaga import VagaBruta


class BaseCollector(ABC):
    def __init__(self, nome: str) -> None:
        self.nome = nome

    @abstractmethod
    async def coletar(self) -> List[VagaBruta]:
        ...
