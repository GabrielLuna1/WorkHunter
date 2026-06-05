import asyncio, json
from core.database import database

async def main():
    await database.connect()
    db = database.get_db()["curriculo_versoes"]
    doc = await db.find_one({"ativo": True})
    if doc:
        doc["_id"] = str(doc["_id"])
        doc.pop("tipTapJson", None)
        doc.pop("texto_bruto", None)
        print(json.dumps(doc, default=str, indent=2))
    else:
        print("No active resume found")
    await database.close()

asyncio.run(main())
