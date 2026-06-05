from fastapi import Header, HTTPException


DEFAULT_USER = "default"


async def get_user_id(x_user_id: str = Header(default=DEFAULT_USER)) -> str:
    if not x_user_id:
        raise HTTPException(400, "user_id header required")
    return x_user_id
