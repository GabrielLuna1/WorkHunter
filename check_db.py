import sys; sys.path.insert(0, "backend")
from core.database import database
import asyncio

async def check():
    await database.connect()
    db = database.get_db()
    pipe = [{"$group": {"_id": "$fonte", "count": {"$sum": 1}}}]
    results = await db["vagas"].aggregate(pipe).to_list(100)
    for r in results:
        print(f'{r["_id"]}: {r["count"]}')
    await database.close()

asyncio.run(check())
