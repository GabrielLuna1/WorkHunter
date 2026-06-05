import httpx
from collections import Counter

r = httpx.get("http://localhost:8070/api/v1/vagas/?limit=100", timeout=10)
data = r.json()
print(f"Total: {data['total']}")
fontes = Counter(v.get("fonte", "?") for v in data["data"])
print(f"\nFontes:")
for f, c in fontes.most_common():
    print(f"  {f}: {c}")
locs = Counter((v.get("localizacao") or "(vazio)") for v in data["data"])
print(f"\nLocais (top 15):")
for l, c in locs.most_common(15):
    print(f"  {c:4d}x | {l}")
