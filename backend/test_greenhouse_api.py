import httpx
import json

async def check_api():
    url = "https://boards-api.greenhouse.io/v1/boards/nubank/jobs?content=true"
    print(f"Fetching Greenhouse API for Nubank: {url}")
    async with httpx.AsyncClient(timeout=15) as client:
        resp = await client.get(url)
        print(f"Status Code: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"Keys in response: {list(data.keys())}")
            jobs = data.get("jobs", [])
            print(f"Total jobs in 'jobs' key: {len(jobs)}")
            if jobs:
                print("\nExample job structure:")
                print(json.dumps(jobs[0], indent=2)[:1500])
        else:
            print(f"Response Body: {resp.text[:500]}")

if __name__ == "__main__":
    import asyncio
    asyncio.run(check_api())
